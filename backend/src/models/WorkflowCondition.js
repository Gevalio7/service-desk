const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const WorkflowCondition = sequelize.define('WorkflowCondition', {
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
  conditionType: {
    type: DataTypes.ENUM('field', 'role', 'time', 'custom', 'sla', 'assignment'),
    allowNull: false
  },
  fieldName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isValidFieldName(value) {
        if (this.conditionType === 'field' && !value) {
          throw new Error('Field name is required for field conditions');
        }
      }
    }
  },
  operator: {
    type: DataTypes.ENUM(
      'equals', 'not_equals', 'greater_than', 'less_than', 
      'greater_or_equal', 'less_or_equal', 'contains', 'not_contains',
      'starts_with', 'ends_with', 'is_empty', 'is_not_empty',
      'in', 'not_in', 'between', 'regex'
    ),
    allowNull: false
  },
  expectedValue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  conditionGroup: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'workflow_conditions',
  indexes: [
    {
      fields: ['transitionId']
    },
    {
      fields: ['conditionType']
    },
    {
      fields: ['conditionGroup']
    }
  ]
});

// Instance methods
WorkflowCondition.prototype.evaluate = function(ticket, user, context = {}) {
  try {
    switch (this.conditionType) {
      case 'field':
        return this.evaluateFieldCondition(ticket, context);
      case 'role':
        return this.evaluateRoleCondition(user);
      case 'time':
        return this.evaluateTimeCondition(ticket, context);
      case 'sla':
        return this.evaluateSlaCondition(ticket);
      case 'assignment':
        return this.evaluateAssignmentCondition(ticket);
      case 'custom':
        return this.evaluateCustomCondition(ticket, user, context);
      default:
        return false;
    }
  } catch (error) {
    console.error('Error evaluating workflow condition:', error);
    return false;
  }
};

WorkflowCondition.prototype.evaluateFieldCondition = function(ticket, context) {
  const fieldValue = this.getFieldValue(ticket, this.fieldName, context);
  const expectedValue = this.parseExpectedValue();
  
  switch (this.operator) {
    case 'equals':
      return fieldValue == expectedValue;
    case 'not_equals':
      return fieldValue != expectedValue;
    case 'greater_than':
      return Number(fieldValue) > Number(expectedValue);
    case 'less_than':
      return Number(fieldValue) < Number(expectedValue);
    case 'greater_or_equal':
      return Number(fieldValue) >= Number(expectedValue);
    case 'less_or_equal':
      return Number(fieldValue) <= Number(expectedValue);
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
    case 'starts_with':
      return String(fieldValue).toLowerCase().startsWith(String(expectedValue).toLowerCase());
    case 'ends_with':
      return String(fieldValue).toLowerCase().endsWith(String(expectedValue).toLowerCase());
    case 'is_empty':
      return !fieldValue || fieldValue === '' || fieldValue === null || fieldValue === undefined;
    case 'is_not_empty':
      return fieldValue && fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
    case 'in':
      return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
    case 'not_in':
      return Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
    case 'regex':
      const regex = new RegExp(expectedValue);
      return regex.test(String(fieldValue));
    default:
      return false;
  }
};

WorkflowCondition.prototype.evaluateRoleCondition = function(user) {
  if (!user || !user.role) return false;
  const expectedRoles = this.parseExpectedValue();
  
  switch (this.operator) {
    case 'equals':
      return user.role === expectedRoles;
    case 'in':
      return Array.isArray(expectedRoles) && expectedRoles.includes(user.role);
    case 'not_in':
      return Array.isArray(expectedRoles) && !expectedRoles.includes(user.role);
    default:
      return false;
  }
};

WorkflowCondition.prototype.evaluateTimeCondition = function(ticket, context) {
  const now = new Date();
  const fieldValue = this.getFieldValue(ticket, this.fieldName || 'createdAt', context);
  const fieldDate = new Date(fieldValue);
  const expectedMinutes = Number(this.expectedValue);
  
  switch (this.operator) {
    case 'greater_than':
      return (now - fieldDate) / (1000 * 60) > expectedMinutes;
    case 'less_than':
      return (now - fieldDate) / (1000 * 60) < expectedMinutes;
    default:
      return false;
  }
};

WorkflowCondition.prototype.evaluateSlaCondition = function(ticket) {
  const now = new Date();
  
  switch (this.operator) {
    case 'equals':
      return ticket.slaBreach === (this.expectedValue === 'true');
    case 'greater_than':
      return ticket.slaDeadline && now > new Date(ticket.slaDeadline);
    case 'less_than':
      return ticket.slaDeadline && now < new Date(ticket.slaDeadline);
    default:
      return false;
  }
};

WorkflowCondition.prototype.evaluateAssignmentCondition = function(ticket) {
  switch (this.operator) {
    case 'is_empty':
      return !ticket.assignedToId;
    case 'is_not_empty':
      return !!ticket.assignedToId;
    case 'equals':
      return ticket.assignedToId === this.expectedValue;
    default:
      return false;
  }
};

WorkflowCondition.prototype.evaluateCustomCondition = function(ticket, user, context) {
  // Для пользовательских условий можно использовать JavaScript код
  // Это требует осторожности с безопасностью
  try {
    const customFunction = new Function('ticket', 'user', 'context', this.expectedValue);
    return Boolean(customFunction(ticket, user, context));
  } catch (error) {
    console.error('Error in custom condition:', error);
    return false;
  }
};

WorkflowCondition.prototype.getFieldValue = function(ticket, fieldName, context) {
  // Поддержка вложенных полей через точечную нотацию
  const fields = fieldName.split('.');
  let value = ticket;
  
  for (const field of fields) {
    if (value && typeof value === 'object') {
      value = value[field];
    } else {
      return undefined;
    }
  }
  
  // Проверяем контекст для дополнительных данных
  if (value === undefined && context[fieldName]) {
    value = context[fieldName];
  }
  
  return value;
};

WorkflowCondition.prototype.parseExpectedValue = function() {
  if (!this.expectedValue) return null;
  
  try {
    // Пытаемся распарсить как JSON для массивов и объектов
    return JSON.parse(this.expectedValue);
  } catch {
    // Если не JSON, возвращаем как строку
    return this.expectedValue;
  }
};

module.exports = WorkflowCondition;