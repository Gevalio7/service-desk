const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const moment = require('moment');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticketNumber: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    unique: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('technical', 'billing', 'general', 'feature_request'),
    defaultValue: 'general'
  },
  type: {
    type: DataTypes.ENUM('incident', 'service_request', 'change_request'),
    defaultValue: 'incident',
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed'),
    defaultValue: 'new'
  },
  slaDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  responseDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  firstResponseTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolutionTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  slaBreach: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  responseBreach: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  source: {
    type: DataTypes.ENUM('web', 'email', 'telegram', 'api'),
    defaultValue: 'web'
  },
  telegramMessageId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  assignedToId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  workflowTypeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'workflow_types',
      key: 'id'
    }
  },
  currentStatusId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'workflow_statuses',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (ticket) => {
      // Set default workflow if not specified
      if (!ticket.workflowTypeId) {
        const { WorkflowType, WorkflowStatus } = require('./index');
        const defaultWorkflow = await WorkflowType.findOne({
          where: { name: 'default_support', isActive: true }
        });
        
        if (defaultWorkflow) {
          ticket.workflowTypeId = defaultWorkflow.id;
          
          // Set initial status
          const initialStatus = await WorkflowStatus.findOne({
            where: {
              workflowTypeId: defaultWorkflow.id,
              isInitial: true,
              isActive: true
            }
          });
          
          if (initialStatus) {
            ticket.currentStatusId = initialStatus.id;
          }
        }
      }

      // Calculate SLA deadlines based on type and priority
      const now = moment();
      
      // Base SLA times by type
      let baseSlaHours, baseResponseMinutes;
      
      switch(ticket.type) {
        case 'incident':
          // Инциденты - критичные, быстрое реагирование
          baseSlaHours = 4;
          baseResponseMinutes = 30;
          break;
        case 'service_request':
          // Запросы на обслуживание - стандартное время
          baseSlaHours = 24;
          baseResponseMinutes = 120; // 2 часа
          break;
        case 'change_request':
          // Запросы на изменения - требуют планирования
          baseSlaHours = 72;
          baseResponseMinutes = 240; // 4 часа
          break;
        default:
          baseSlaHours = 24;
          baseResponseMinutes = 120;
      }
      
      // Adjust based on priority
      let priorityMultiplier = 1;
      switch(ticket.priority) {
        case 'urgent':
          priorityMultiplier = 0.25; // 25% от базового времени
          break;
        case 'high':
          priorityMultiplier = 0.5; // 50% от базового времени
          break;
        case 'medium':
          priorityMultiplier = 1; // 100% от базового времени
          break;
        case 'low':
          priorityMultiplier = 2; // 200% от базового времени
          break;
      }
      
      // Calculate final deadlines
      const finalSlaHours = Math.max(1, baseSlaHours * priorityMultiplier);
      const finalResponseMinutes = Math.max(15, baseResponseMinutes * priorityMultiplier);
      
      ticket.responseDeadline = now.clone().add(finalResponseMinutes, 'minutes').toDate();
      ticket.slaDeadline = now.clone().add(finalSlaHours, 'hours').toDate();
    },
    beforeUpdate: (ticket) => {
      // Update SLA if priority or type changes
      if (ticket.changed('priority') || ticket.changed('type')) {
        const now = moment();
        
        // Base SLA times by type
        let baseSlaHours;
        
        switch(ticket.type) {
          case 'incident':
            baseSlaHours = 4;
            break;
          case 'service_request':
            baseSlaHours = 24;
            break;
          case 'change_request':
            baseSlaHours = 72;
            break;
          default:
            baseSlaHours = 24;
        }
        
        // Adjust based on priority
        let priorityMultiplier = 1;
        switch(ticket.priority) {
          case 'urgent':
            priorityMultiplier = 0.25;
            break;
          case 'high':
            priorityMultiplier = 0.5;
            break;
          case 'medium':
            priorityMultiplier = 1;
            break;
          case 'low':
            priorityMultiplier = 2;
            break;
        }
        
        const finalSlaHours = Math.max(1, baseSlaHours * priorityMultiplier);
        ticket.slaDeadline = now.clone().add(finalSlaHours, 'hours').toDate();
      }
      
      // Set resolution time when status changes to resolved
      if (ticket.changed('status') && ticket.status === 'resolved' && !ticket.resolutionTime) {
        ticket.resolutionTime = new Date();
        
        // Check if SLA was breached
        if (moment().isAfter(ticket.slaDeadline)) {
          ticket.slaBreach = true;
        }
      }
      
      // Set first response time when status changes from new to anything else
      if (ticket.changed('status') && 
          ticket.previous('status') === 'new' && 
          ticket.status !== 'new' && 
          !ticket.firstResponseTime) {
        ticket.firstResponseTime = new Date();
        
        // Check if response SLA was breached
        if (moment().isAfter(ticket.responseDeadline)) {
          ticket.responseBreach = true;
        }
      }
    }
  }
});

// Instance methods for workflow
Ticket.prototype.getAvailableTransitions = async function(userId) {
  const workflowService = require('../services/workflowService');
  return await workflowService.getAvailableTransitions(this.id, userId);
};

Ticket.prototype.executeTransition = async function(transitionId, userId, options = {}) {
  const workflowService = require('../services/workflowService');
  return await workflowService.executeTransition(this.id, transitionId, userId, options);
};

Ticket.prototype.getCurrentStatusName = function(locale = 'ru') {
  if (this.currentStatus) {
    return this.currentStatus.getDisplayName(locale);
  }
  return this.status; // fallback to old status field
};

Ticket.prototype.getWorkflowTypeName = function(locale = 'ru') {
  if (this.WorkflowType) {
    return this.WorkflowType.getDisplayName(locale);
  }
  return null;
};

Ticket.prototype.canTransitionTo = async function(targetStatusId, userRole = null) {
  if (!this.currentStatus) return false;
  return await this.currentStatus.canTransitionTo(targetStatusId, userRole);
};

// Static method to get tickets with workflow data
Ticket.getWithWorkflowData = async function(where = {}, options = {}) {
  const { WorkflowType, WorkflowStatus, User } = require('./index');
  
  return await this.findAll({
    where,
    include: [
      {
        model: WorkflowType,
        required: false
      },
      {
        model: WorkflowStatus,
        as: 'currentStatus',
        required: false
      },
      {
        model: User,
        as: 'createdBy',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      },
      {
        model: User,
        as: 'assignedTo',
        attributes: ['id', 'firstName', 'lastName', 'email'],
        required: false
      },
      ...(options.include || [])
    ],
    ...options
  });
};

module.exports = Ticket;