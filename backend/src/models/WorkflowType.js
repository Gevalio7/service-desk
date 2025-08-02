const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const WorkflowType = sequelize.define('WorkflowType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
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
    defaultValue: 'ticket'
  },
  color: {
    type: DataTypes.STRING(7),
    allowNull: false,
    defaultValue: '#007bff',
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
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
  tableName: 'workflow_types',
  hooks: {
    beforeUpdate: (workflowType) => {
      workflowType.updatedAt = new Date();
    }
  }
});

// Instance methods
WorkflowType.prototype.getDisplayName = function(locale = 'ru') {
  return this.displayName[locale] || this.displayName.ru || this.displayName.en || this.name;
};

WorkflowType.prototype.getDescription = function(locale = 'ru') {
  if (!this.description) return null;
  return this.description[locale] || this.description.ru || this.description.en || null;
};

module.exports = WorkflowType;