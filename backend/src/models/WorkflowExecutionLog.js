const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const WorkflowExecutionLog = sequelize.define('WorkflowExecutionLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Tickets',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  workflowTypeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'workflow_types',
      key: 'id'
    }
  },
  fromStatusId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'workflow_statuses',
      key: 'id'
    }
  },
  toStatusId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'workflow_statuses',
      key: 'id'
    }
  },
  transitionId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'workflow_transitions',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  executionTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  executionDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Execution duration in milliseconds'
  },
  conditionsResult: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Result of condition evaluations'
  },
  actionsResult: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Result of action executions'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata about the execution'
  }
}, {
  timestamps: false, // Используем executionTime вместо стандартных timestamps
  tableName: 'workflow_execution_log',
  indexes: [
    {
      fields: ['ticketId']
    },
    {
      fields: ['workflowTypeId']
    },
    {
      fields: ['executionTime']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['fromStatusId']
    },
    {
      fields: ['toStatusId']
    }
  ]
});

// Static methods
WorkflowExecutionLog.logExecution = async function(params) {
  const {
    ticketId,
    workflowTypeId,
    fromStatusId,
    toStatusId,
    transitionId,
    userId,
    executionDuration,
    conditionsResult,
    actionsResult,
    errorMessage,
    metadata
  } = params;

  return await this.create({
    ticketId,
    workflowTypeId,
    fromStatusId,
    toStatusId,
    transitionId,
    userId,
    executionTime: new Date(),
    executionDuration,
    conditionsResult,
    actionsResult,
    errorMessage,
    metadata
  });
};

WorkflowExecutionLog.getTicketHistory = async function(ticketId, options = {}) {
  const { limit = 50, offset = 0, includeDetails = false } = options;

  const includeModels = [];
  
  if (includeDetails) {
    const WorkflowStatus = require('./WorkflowStatus');
    const WorkflowTransition = require('./WorkflowTransition');
    const User = require('./User');

    includeModels.push(
      {
        model: WorkflowStatus,
        as: 'fromStatus',
        attributes: ['id', 'name', 'displayName', 'color', 'icon']
      },
      {
        model: WorkflowStatus,
        as: 'toStatus',
        attributes: ['id', 'name', 'displayName', 'color', 'icon']
      },
      {
        model: WorkflowTransition,
        as: 'transition',
        attributes: ['id', 'name', 'displayName', 'icon']
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName', 'email']
      }
    );
  }

  return await this.findAll({
    where: { ticketId },
    include: includeModels,
    order: [['executionTime', 'DESC']],
    limit,
    offset
  });
};

WorkflowExecutionLog.getWorkflowStats = async function(workflowTypeId, dateRange = {}) {
  const { startDate, endDate } = dateRange;
  const whereClause = { workflowTypeId };

  if (startDate || endDate) {
    whereClause.executionTime = {};
    if (startDate) whereClause.executionTime[sequelize.Sequelize.Op.gte] = startDate;
    if (endDate) whereClause.executionTime[sequelize.Sequelize.Op.lte] = endDate;
  }

  const stats = await this.findAll({
    where: whereClause,
    attributes: [
      'toStatusId',
      [sequelize.fn('COUNT', '*'), 'transitionCount'],
      [sequelize.fn('AVG', sequelize.col('executionDuration')), 'avgDuration'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "errorMessage" IS NOT NULL THEN 1 END')), 'errorCount']
    ],
    group: ['toStatusId'],
    raw: true
  });

  return stats;
};

WorkflowExecutionLog.getPerformanceMetrics = async function(workflowTypeId, dateRange = {}) {
  const { startDate, endDate } = dateRange;
  const whereClause = { workflowTypeId };

  if (startDate || endDate) {
    whereClause.executionTime = {};
    if (startDate) whereClause.executionTime[sequelize.Sequelize.Op.gte] = startDate;
    if (endDate) whereClause.executionTime[sequelize.Sequelize.Op.lte] = endDate;
  }

  const metrics = await this.findOne({
    where: whereClause,
    attributes: [
      [sequelize.fn('COUNT', '*'), 'totalExecutions'],
      [sequelize.fn('AVG', sequelize.col('executionDuration')), 'avgDuration'],
      [sequelize.fn('MIN', sequelize.col('executionDuration')), 'minDuration'],
      [sequelize.fn('MAX', sequelize.col('executionDuration')), 'maxDuration'],
      [sequelize.fn('COUNT', sequelize.literal('CASE WHEN "errorMessage" IS NOT NULL THEN 1 END')), 'errorCount'],
      [sequelize.literal('COUNT(*) - COUNT(CASE WHEN "errorMessage" IS NOT NULL THEN 1 END)'), 'successCount']
    ],
    raw: true
  });

  // Вычисляем процент успешности
  if (metrics && metrics.totalExecutions > 0) {
    metrics.successRate = (metrics.successCount / metrics.totalExecutions) * 100;
    metrics.errorRate = (metrics.errorCount / metrics.totalExecutions) * 100;
  }

  return metrics;
};

// Instance methods
WorkflowExecutionLog.prototype.wasSuccessful = function() {
  return !this.errorMessage;
};

WorkflowExecutionLog.prototype.getExecutionSummary = function() {
  const summary = {
    successful: this.wasSuccessful(),
    duration: this.executionDuration,
    executedAt: this.executionTime
  };

  if (this.conditionsResult) {
    summary.conditionsEvaluated = Object.keys(this.conditionsResult).length;
    summary.conditionsPassed = Object.values(this.conditionsResult).filter(Boolean).length;
  }

  if (this.actionsResult) {
    summary.actionsExecuted = Object.keys(this.actionsResult).length;
    summary.actionsSuccessful = Object.values(this.actionsResult)
      .filter(result => result && result.success).length;
  }

  if (this.errorMessage) {
    summary.error = this.errorMessage;
  }

  return summary;
};

module.exports = WorkflowExecutionLog;