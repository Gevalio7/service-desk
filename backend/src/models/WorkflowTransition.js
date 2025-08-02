const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const WorkflowTransition = sequelize.define('WorkflowTransition', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  workflowTypeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'workflow_types',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  fromStatusId: {
    type: DataTypes.UUID,
    allowNull: true, // null означает переход из любого статуса
    references: {
      model: 'workflow_statuses',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  toStatusId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'workflow_statuses',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  displayName: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      isValidDisplayName(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('Display name must be a valid JSON object');
        }
        if (!value.ru && !value.en) {
          throw new Error('Display name must contain at least ru or en translation');
        }
      }
    }
  },
  description: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'arrow-right'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#007bff',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  },
  isAutomatic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  requiresComment: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  requiresAssignment: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  allowedRoles: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    validate: {
      isValidRoles(value) {
        if (!Array.isArray(value)) {
          throw new Error('Allowed roles must be an array');
        }
        const validRoles = ['admin', 'agent', 'client', 'system'];
        for (const role of value) {
          if (!validRoles.includes(role)) {
            throw new Error(`Invalid role: ${role}. Valid roles are: ${validRoles.join(', ')}`);
          }
        }
      }
    }
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  updatedById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  tableName: 'workflow_transitions',
  indexes: [
    {
      fields: ['workflowTypeId']
    },
    {
      fields: ['fromStatusId']
    },
    {
      fields: ['toStatusId']
    },
    {
      fields: ['isAutomatic']
    },
    {
      fields: ['sortOrder']
    }
  ],
  hooks: {
    beforeUpdate: (transition) => {
      transition.updatedAt = new Date();
    },
    beforeValidate: async (transition) => {
      // Validate that fromStatus and toStatus belong to the same workflow type
      if (transition.fromStatusId) {
        const WorkflowStatus = require('./WorkflowStatus');
        const fromStatus = await WorkflowStatus.findByPk(transition.fromStatusId);
        if (fromStatus && fromStatus.workflowTypeId !== transition.workflowTypeId) {
          throw new Error('From status must belong to the same workflow type');
        }
      }
      
      const WorkflowStatus = require('./WorkflowStatus');
      const toStatus = await WorkflowStatus.findByPk(transition.toStatusId);
      if (toStatus && toStatus.workflowTypeId !== transition.workflowTypeId) {
        throw new Error('To status must belong to the same workflow type');
      }
    }
  }
});

// Instance methods
WorkflowTransition.prototype.getDisplayName = function(locale = 'ru') {
  return this.displayName[locale] || this.displayName.ru || this.displayName.en || this.name;
};

WorkflowTransition.prototype.getDescription = function(locale = 'ru') {
  if (!this.description) return null;
  return this.description[locale] || this.description.ru || this.description.en || null;
};

WorkflowTransition.prototype.canExecute = function(userRole, ticket = null) {
  // Check if user role is allowed
  if (this.allowedRoles && this.allowedRoles.length > 0) {
    if (!this.allowedRoles.includes(userRole)) {
      return { allowed: false, reason: 'insufficient_permissions' };
    }
  }
  
  // Check if assignment is required
  if (this.requiresAssignment && ticket && !ticket.assignedToId) {
    return { allowed: false, reason: 'assignment_required' };
  }
  
  return { allowed: true };
};

WorkflowTransition.prototype.getConditions = async function() {
  const WorkflowCondition = require('./WorkflowCondition');
  return await WorkflowCondition.findAll({
    where: {
      transitionId: this.id,
      isActive: true
    },
    order: [['conditionGroup', 'ASC']]
  });
};

WorkflowTransition.prototype.getActions = async function() {
  const WorkflowAction = require('./WorkflowAction');
  return await WorkflowAction.findAll({
    where: {
      transitionId: this.id,
      isActive: true
    },
    order: [['executionOrder', 'ASC']]
  });
};

module.exports = WorkflowTransition;