const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const WorkflowVersion = sequelize.define('WorkflowVersion', {
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
  versionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  versionName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  configuration: {
    type: DataTypes.JSONB,
    allowNull: false,
    validate: {
      isValidConfiguration(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('Configuration must be a valid JSON object');
        }
        
        // Базовая валидация структуры конфигурации
        if (!value.statuses || !Array.isArray(value.statuses)) {
          throw new Error('Configuration must contain statuses array');
        }
        
        if (!value.transitions || !Array.isArray(value.transitions)) {
          throw new Error('Configuration must contain transitions array');
        }
      }
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isDraft: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  tableName: 'workflow_versions',
  indexes: [
    {
      unique: true,
      fields: ['workflowTypeId', 'versionNumber']
    },
    {
      fields: ['workflowTypeId']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['isDraft']
    }
  ],
  hooks: {
    beforeCreate: async (version) => {
      // Автоматически устанавливаем номер версии
      if (!version.versionNumber) {
        const lastVersion = await WorkflowVersion.findOne({
          where: { workflowTypeId: version.workflowTypeId },
          order: [['versionNumber', 'DESC']]
        });
        version.versionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;
      }
    },
    beforeUpdate: async (version) => {
      // При активации версии деактивируем все остальные
      if (version.isActive && version.changed('isActive')) {
        await WorkflowVersion.update(
          { isActive: false },
          {
            where: {
              workflowTypeId: version.workflowTypeId,
              id: { [sequelize.Sequelize.Op.ne]: version.id }
            }
          }
        );
      }
      
      // При публикации устанавливаем дату
      if (!version.isDraft && version.changed('isDraft') && !version.publishedAt) {
        version.publishedAt = new Date();
      }
    }
  }
});

// Instance methods
WorkflowVersion.prototype.publish = async function() {
  this.isDraft = false;
  this.publishedAt = new Date();
  await this.save();
  return this;
};

WorkflowVersion.prototype.activate = async function() {
  if (this.isDraft) {
    throw new Error('Cannot activate draft version');
  }
  
  this.isActive = true;
  await this.save();
  return this;
};

WorkflowVersion.prototype.createSnapshot = async function() {
  const WorkflowType = require('./WorkflowType');
  const WorkflowStatus = require('./WorkflowStatus');
  const WorkflowTransition = require('./WorkflowTransition');
  const WorkflowCondition = require('./WorkflowCondition');
  const WorkflowAction = require('./WorkflowAction');

  // Получаем полную конфигурацию workflow
  const workflowType = await WorkflowType.findByPk(this.workflowTypeId);
  
  const statuses = await WorkflowStatus.findAll({
    where: { workflowTypeId: this.workflowTypeId, isActive: true },
    order: [['sortOrder', 'ASC']]
  });

  const transitions = await WorkflowTransition.findAll({
    where: { workflowTypeId: this.workflowTypeId, isActive: true },
    include: [
      {
        model: WorkflowCondition,
        where: { isActive: true },
        required: false
      },
      {
        model: WorkflowAction,
        where: { isActive: true },
        required: false
      }
    ],
    order: [['sortOrder', 'ASC']]
  });

  const configuration = {
    workflowType: workflowType.toJSON(),
    statuses: statuses.map(s => s.toJSON()),
    transitions: transitions.map(t => t.toJSON()),
    createdAt: new Date().toISOString(),
    version: this.versionNumber
  };

  this.configuration = configuration;
  await this.save();
  
  return configuration;
};

WorkflowVersion.prototype.restoreFromSnapshot = async function() {
  if (!this.configuration) {
    throw new Error('No configuration snapshot available');
  }

  const WorkflowStatus = require('./WorkflowStatus');
  const WorkflowTransition = require('./WorkflowTransition');
  const WorkflowCondition = require('./WorkflowCondition');
  const WorkflowAction = require('./WorkflowAction');

  const transaction = await sequelize.transaction();

  try {
    // Деактивируем текущие элементы
    await WorkflowStatus.update(
      { isActive: false },
      { where: { workflowTypeId: this.workflowTypeId }, transaction }
    );
    
    await WorkflowTransition.update(
      { isActive: false },
      { where: { workflowTypeId: this.workflowTypeId }, transaction }
    );

    // Восстанавливаем статусы
    for (const statusData of this.configuration.statuses) {
      const existingStatus = await WorkflowStatus.findOne({
        where: { workflowTypeId: this.workflowTypeId, name: statusData.name },
        transaction
      });

      if (existingStatus) {
        await existingStatus.update({ ...statusData, isActive: true }, { transaction });
      } else {
        await WorkflowStatus.create({ ...statusData, workflowTypeId: this.workflowTypeId }, { transaction });
      }
    }

    // Восстанавливаем переходы
    for (const transitionData of this.configuration.transitions) {
      const existingTransition = await WorkflowTransition.findOne({
        where: { 
          workflowTypeId: this.workflowTypeId, 
          name: transitionData.name,
          fromStatusId: transitionData.fromStatusId,
          toStatusId: transitionData.toStatusId
        },
        transaction
      });

      let transition;
      if (existingTransition) {
        await existingTransition.update({ ...transitionData, isActive: true }, { transaction });
        transition = existingTransition;
      } else {
        transition = await WorkflowTransition.create({ 
          ...transitionData, 
          workflowTypeId: this.workflowTypeId 
        }, { transaction });
      }

      // Восстанавливаем условия
      if (transitionData.WorkflowConditions) {
        await WorkflowCondition.destroy({
          where: { transitionId: transition.id },
          transaction
        });

        for (const conditionData of transitionData.WorkflowConditions) {
          await WorkflowCondition.create({
            ...conditionData,
            transitionId: transition.id
          }, { transaction });
        }
      }

      // Восстанавливаем действия
      if (transitionData.WorkflowActions) {
        await WorkflowAction.destroy({
          where: { transitionId: transition.id },
          transaction
        });

        for (const actionData of transitionData.WorkflowActions) {
          await WorkflowAction.create({
            ...actionData,
            transitionId: transition.id
          }, { transaction });
        }
      }
    }

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// Static methods
WorkflowVersion.getActiveVersion = async function(workflowTypeId) {
  return await this.findOne({
    where: {
      workflowTypeId,
      isActive: true,
      isDraft: false
    }
  });
};

WorkflowVersion.createNewVersion = async function(workflowTypeId, createdById, description = null) {
  const activeVersion = await this.getActiveVersion(workflowTypeId);
  
  const newVersion = await this.create({
    workflowTypeId,
    description: description || `Version created from active configuration`,
    configuration: activeVersion ? activeVersion.configuration : { statuses: [], transitions: [] },
    createdById
  });

  // Создаем снимок текущего состояния
  await newVersion.createSnapshot();
  
  return newVersion;
};

module.exports = WorkflowVersion;