const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const WorkflowStatus = sequelize.define('WorkflowStatus', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      is: /^[a-zA-Z0-9_]+$/
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
    defaultValue: 'circle'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#6c757d',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  },
  category: {
    type: DataTypes.ENUM('open', 'active', 'pending', 'resolved', 'closed'),
    defaultValue: 'active'
  },
  isInitial: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isFinal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  slaHours: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  responseHours: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    }
  },
  autoAssign: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  notifyOnEnter: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notifyOnExit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  tableName: 'workflow_statuses',
  indexes: [
    {
      unique: true,
      fields: ['workflowTypeId', 'name']
    },
    {
      fields: ['workflowTypeId']
    },
    {
      fields: ['category']
    },
    {
      fields: ['sortOrder']
    }
  ],
  hooks: {
    beforeUpdate: (status) => {
      status.updatedAt = new Date();
    },
    beforeValidate: async (status) => {
      // Ensure only one initial status per workflow type
      if (status.isInitial) {
        const existingInitial = await WorkflowStatus.findOne({
          where: {
            workflowTypeId: status.workflowTypeId,
            isInitial: true,
            id: { [sequelize.Sequelize.Op.ne]: status.id }
          }
        });
        if (existingInitial) {
          throw new Error('Only one initial status is allowed per workflow type');
        }
      }
    }
  }
});

// Instance methods
WorkflowStatus.prototype.getDisplayName = function(locale = 'ru') {
  return this.displayName[locale] || this.displayName.ru || this.displayName.en || this.name;
};

WorkflowStatus.prototype.getDescription = function(locale = 'ru') {
  if (!this.description) return null;
  return this.description[locale] || this.description.ru || this.description.en || null;
};

WorkflowStatus.prototype.canTransitionTo = async function(targetStatusId, userRole = null) {
  const WorkflowTransition = require('./WorkflowTransition');
  
  const transition = await WorkflowTransition.findOne({
    where: {
      workflowTypeId: this.workflowTypeId,
      fromStatusId: this.id,
      toStatusId: targetStatusId,
      isActive: true
    }
  });
  
  if (!transition) return false;
  
  // Check role permissions
  if (userRole && transition.allowedRoles && transition.allowedRoles.length > 0) {
    return transition.allowedRoles.includes(userRole);
  }
  
  return true;
};

module.exports = WorkflowStatus;