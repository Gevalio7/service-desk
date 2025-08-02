const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const WorkflowAction = sequelize.define('WorkflowAction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  transitionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'workflow_transitions',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  actionType: {
    type: DataTypes.ENUM(
      'assign', 'notify', 'update_field', 'webhook', 'script', 
      'create_comment', 'send_email', 'send_telegram', 'escalate',
      'create_subtask', 'update_sla', 'log_event'
    ),
    allowNull: false
  },
  actionConfig: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      isValidConfig(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('Action config must be a valid JSON object');
        }
        
        // Валидация конфигурации в зависимости от типа действия
        switch (this.actionType) {
          case 'assign':
            if (!value.assigneeId && !value.assigneeRule) {
              throw new Error('Assign action requires assigneeId or assigneeRule');
            }
            break;
          case 'notify':
            if (!value.recipients || !Array.isArray(value.recipients)) {
              throw new Error('Notify action requires recipients array');
            }
            break;
          case 'update_field':
            if (!value.fieldName || value.fieldValue === undefined) {
              throw new Error('Update field action requires fieldName and fieldValue');
            }
            break;
          case 'webhook':
            if (!value.url) {
              throw new Error('Webhook action requires url');
            }
            break;
        }
      }
    }
  },
  executionOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'workflow_actions',
  indexes: [
    {
      fields: ['transitionId']
    },
    {
      fields: ['actionType']
    },
    {
      fields: ['executionOrder']
    }
  ]
});

// Instance methods
WorkflowAction.prototype.execute = async function(ticket, user, context = {}) {
  const executionResult = {
    success: false,
    message: '',
    data: null,
    executedAt: new Date()
  };

  try {
    switch (this.actionType) {
      case 'assign':
        executionResult = await this.executeAssignAction(ticket, user, context);
        break;
      case 'notify':
        executionResult = await this.executeNotifyAction(ticket, user, context);
        break;
      case 'update_field':
        executionResult = await this.executeUpdateFieldAction(ticket, user, context);
        break;
      case 'webhook':
        executionResult = await this.executeWebhookAction(ticket, user, context);
        break;
      case 'script':
        executionResult = await this.executeScriptAction(ticket, user, context);
        break;
      case 'create_comment':
        executionResult = await this.executeCreateCommentAction(ticket, user, context);
        break;
      case 'send_email':
        executionResult = await this.executeSendEmailAction(ticket, user, context);
        break;
      case 'send_telegram':
        executionResult = await this.executeSendTelegramAction(ticket, user, context);
        break;
      case 'escalate':
        executionResult = await this.executeEscalateAction(ticket, user, context);
        break;
      case 'update_sla':
        executionResult = await this.executeUpdateSlaAction(ticket, user, context);
        break;
      case 'log_event':
        executionResult = await this.executeLogEventAction(ticket, user, context);
        break;
      default:
        executionResult.message = `Unknown action type: ${this.actionType}`;
    }
  } catch (error) {
    executionResult.success = false;
    executionResult.message = error.message;
    executionResult.error = error.stack;
  }

  return executionResult;
};

WorkflowAction.prototype.executeAssignAction = async function(ticket, user, context) {
  const config = this.actionConfig;
  let assigneeId = null;

  if (config.assigneeId) {
    assigneeId = config.assigneeId;
  } else if (config.assigneeRule) {
    assigneeId = await this.resolveAssigneeByRule(config.assigneeRule, ticket, user, context);
  }

  if (assigneeId) {
    const User = require('./User');
    const assignee = await User.findByPk(assigneeId);
    
    if (assignee) {
      ticket.assignedToId = assigneeId;
      await ticket.save();
      
      return {
        success: true,
        message: `Ticket assigned to ${assignee.firstName} ${assignee.lastName}`,
        data: { assigneeId, assigneeName: `${assignee.firstName} ${assignee.lastName}` }
      };
    }
  }

  return {
    success: false,
    message: 'Could not resolve assignee'
  };
};

WorkflowAction.prototype.executeNotifyAction = async function(ticket, user, context) {
  const config = this.actionConfig;
  const notificationService = require('../services/notificationService');
  
  const results = [];
  for (const recipient of config.recipients) {
    try {
      await notificationService.sendWorkflowNotification(ticket, recipient, config.template || {});
      results.push({ recipient, success: true });
    } catch (error) {
      results.push({ recipient, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  return {
    success: successCount > 0,
    message: `Sent ${successCount}/${results.length} notifications`,
    data: results
  };
};

WorkflowAction.prototype.executeUpdateFieldAction = async function(ticket, user, context) {
  const config = this.actionConfig;
  const oldValue = ticket[config.fieldName];
  
  // Поддержка динамических значений
  let newValue = config.fieldValue;
  if (typeof newValue === 'string' && newValue.startsWith('{{') && newValue.endsWith('}}')) {
    newValue = this.resolveDynamicValue(newValue, ticket, user, context);
  }

  ticket[config.fieldName] = newValue;
  await ticket.save();

  return {
    success: true,
    message: `Updated ${config.fieldName} from "${oldValue}" to "${newValue}"`,
    data: { fieldName: config.fieldName, oldValue, newValue }
  };
};

WorkflowAction.prototype.executeWebhookAction = async function(ticket, user, context) {
  const config = this.actionConfig;
  const axios = require('axios');

  const payload = {
    ticket: ticket.toJSON(),
    user: user ? { id: user.id, email: user.email, role: user.role } : null,
    context,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await axios.post(config.url, payload, {
      headers: config.headers || { 'Content-Type': 'application/json' },
      timeout: config.timeout || 10000
    });

    return {
      success: true,
      message: `Webhook called successfully (${response.status})`,
      data: { status: response.status, response: response.data }
    };
  } catch (error) {
    return {
      success: false,
      message: `Webhook failed: ${error.message}`,
      data: { error: error.message }
    };
  }
};

WorkflowAction.prototype.executeScriptAction = async function(ticket, user, context) {
  const config = this.actionConfig;
  
  try {
    // Выполнение пользовательского JavaScript кода
    // ВНИМАНИЕ: Это потенциально небезопасно, нужна песочница
    const scriptFunction = new Function('ticket', 'user', 'context', 'require', config.script);
    const result = await scriptFunction(ticket, user, context, require);

    return {
      success: true,
      message: 'Script executed successfully',
      data: result
    };
  } catch (error) {
    return {
      success: false,
      message: `Script execution failed: ${error.message}`,
      data: { error: error.message }
    };
  }
};

WorkflowAction.prototype.executeCreateCommentAction = async function(ticket, user, context) {
  const config = this.actionConfig;
  const Comment = require('./Comment');

  let content = config.content;
  if (typeof content === 'string') {
    content = this.resolveDynamicValue(content, ticket, user, context);
  }

  const comment = await Comment.create({
    content,
    isInternal: config.isInternal || false,
    ticketId: ticket.id,
    userId: user ? user.id : null
  });

  return {
    success: true,
    message: 'Comment created successfully',
    data: { commentId: comment.id, content }
  };
};

WorkflowAction.prototype.executeLogEventAction = async function(ticket, user, context) {
  const config = this.actionConfig;
  const { logger } = require('../../config/database');

  const logData = {
    ticketId: ticket.id,
    userId: user ? user.id : null,
    event: config.event || 'workflow_action',
    message: config.message || 'Workflow action executed',
    data: config.data || {},
    context
  };

  logger.info('Workflow action executed', logData);

  return {
    success: true,
    message: 'Event logged successfully',
    data: logData
  };
};

// Вспомогательные методы
WorkflowAction.prototype.resolveAssigneeByRule = async function(rule, ticket, user, context) {
  const User = require('./User');
  
  switch (rule) {
    case 'round_robin':
      // Простая реализация round robin
      const agents = await User.findAll({
        where: { role: 'agent', isActive: true },
        order: [['lastLogin', 'ASC']]
      });
      return agents.length > 0 ? agents[0].id : null;
      
    case 'least_assigned':
      // Назначить агенту с наименьшим количеством активных тикетов
      const Ticket = require('./Ticket');
      const agentStats = await User.findAll({
        where: { role: 'agent', isActive: true },
        include: [{
          model: Ticket,
          as: 'assignedTickets',
          where: { status: { [sequelize.Sequelize.Op.notIn]: ['resolved', 'closed'] } },
          required: false
        }]
      });
      
      const leastBusy = agentStats.reduce((min, agent) => 
        agent.assignedTickets.length < min.assignedTickets.length ? agent : min
      );
      
      return leastBusy ? leastBusy.id : null;
      
    case 'creator':
      return ticket.createdById;
      
    case 'current_user':
      return user ? user.id : null;
      
    default:
      return null;
  }
};

WorkflowAction.prototype.resolveDynamicValue = function(template, ticket, user, context) {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    try {
      // Простая замена переменных
      const parts = expression.trim().split('.');
      let value = null;
      
      if (parts[0] === 'ticket') {
        value = ticket;
        for (let i = 1; i < parts.length; i++) {
          value = value ? value[parts[i]] : null;
        }
      } else if (parts[0] === 'user') {
        value = user;
        for (let i = 1; i < parts.length; i++) {
          value = value ? value[parts[i]] : null;
        }
      } else if (parts[0] === 'context') {
        value = context;
        for (let i = 1; i < parts.length; i++) {
          value = value ? value[parts[i]] : null;
        }
      } else if (parts[0] === 'now') {
        value = new Date().toISOString();
      }
      
      return value !== null ? String(value) : match;
    } catch (error) {
      return match;
    }
  });
};

module.exports = WorkflowAction;