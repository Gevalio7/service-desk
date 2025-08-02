const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const { logger } = require('../../config/database');
const {
  WorkflowType,
  WorkflowStatus,
  WorkflowTransition,
  WorkflowCondition,
  WorkflowAction,
  WorkflowVersion,
  WorkflowExecutionLog,
  Ticket,
  User
} = require('../models');

class WorkflowService {
  /**
   * Выполнить переход статуса тикета
   */
  async executeTransition(ticketId, transitionId, userId, options = {}) {
    const startTime = Date.now();
    const { comment, assigneeId, context = {} } = options;

    const transaction = await sequelize.transaction();

    try {
      // Получаем тикет с текущим статусом
      const ticket = await Ticket.findByPk(ticketId, {
        include: [
          {
            model: WorkflowStatus,
            as: 'currentStatus'
          },
          {
            model: WorkflowType
          }
        ],
        transaction
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Получаем переход
      const transition = await WorkflowTransition.findByPk(transitionId, {
        include: [
          {
            model: WorkflowCondition,
            where: { isActive: true },
            required: false
          },
          {
            model: WorkflowAction,
            where: { isActive: true },
            required: false,
            order: [['executionOrder', 'ASC']]
          },
          {
            model: WorkflowStatus,
            as: 'fromStatus'
          },
          {
            model: WorkflowStatus,
            as: 'toStatus'
          }
        ],
        transaction
      });

      if (!transition) {
        throw new Error('Transition not found');
      }

      // Получаем пользователя
      const user = userId ? await User.findByPk(userId, { transaction }) : null;

      // Проверяем права на выполнение перехода
      const permissionCheck = transition.canExecute(user?.role, ticket);
      if (!permissionCheck.allowed) {
        throw new Error(`Transition not allowed: ${permissionCheck.reason}`);
      }

      // Проверяем, что переход возможен из текущего статуса
      if (transition.fromStatusId && ticket.currentStatusId !== transition.fromStatusId) {
        throw new Error(`Invalid transition from current status`);
      }

      // Проверяем обязательные поля
      if (transition.requiresComment && !comment) {
        throw new Error('Comment is required for this transition');
      }

      if (transition.requiresAssignment && !assigneeId && !ticket.assignedToId) {
        throw new Error('Assignment is required for this transition');
      }

      // Оцениваем условия
      const conditionsResult = await this.evaluateConditions(
        transition.WorkflowConditions || [],
        ticket,
        user,
        context
      );

      if (!conditionsResult.passed) {
        throw new Error(`Conditions not met: ${conditionsResult.failedConditions.join(', ')}`);
      }

      // Сохраняем старый статус для логирования
      const oldStatusId = ticket.currentStatusId;

      // Обновляем статус тикета
      ticket.currentStatusId = transition.toStatusId;
      
      // Обновляем назначение если указано
      if (assigneeId) {
        ticket.assignedToId = assigneeId;
      }

      await ticket.save({ transaction });

      // Выполняем действия
      const actionsResult = await this.executeActions(
        transition.WorkflowActions || [],
        ticket,
        user,
        { ...context, comment, assigneeId }
      );

      // Создаем запись в истории тикета
      if (comment) {
        const Comment = require('../models/Comment');
        await Comment.create({
          content: comment,
          isInternal: false,
          ticketId: ticket.id,
          userId: user?.id
        }, { transaction });
      }

      // Логируем выполнение
      const executionDuration = Date.now() - startTime;
      await WorkflowExecutionLog.logExecution({
        ticketId: ticket.id,
        workflowTypeId: ticket.workflowTypeId,
        fromStatusId: oldStatusId,
        toStatusId: transition.toStatusId,
        transitionId: transition.id,
        userId: user?.id,
        executionDuration,
        conditionsResult: conditionsResult.details,
        actionsResult: actionsResult.details,
        metadata: {
          comment: !!comment,
          assigneeChanged: !!assigneeId,
          context
        }
      });

      await transaction.commit();

      logger.info('Workflow transition executed successfully', {
        ticketId,
        transitionId,
        fromStatus: oldStatusId,
        toStatus: transition.toStatusId,
        userId,
        duration: executionDuration
      });

      return {
        success: true,
        ticket: await this.getTicketWithWorkflowData(ticketId),
        transition: transition.toJSON(),
        executionTime: executionDuration,
        conditionsResult,
        actionsResult
      };

    } catch (error) {
      await transaction.rollback();

      // Логируем ошибку
      const executionDuration = Date.now() - startTime;
      await WorkflowExecutionLog.logExecution({
        ticketId,
        workflowTypeId: null,
        fromStatusId: null,
        toStatusId: null,
        transitionId,
        userId,
        executionDuration,
        errorMessage: error.message,
        metadata: { context }
      });

      logger.error('Workflow transition failed', {
        ticketId,
        transitionId,
        userId,
        error: error.message,
        duration: executionDuration
      });

      throw error;
    }
  }

  /**
   * Получить доступные переходы для тикета
   */
  async getAvailableTransitions(ticketId, userId) {
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: WorkflowStatus,
          as: 'currentStatus'
        },
        {
          model: WorkflowType
        }
      ]
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const user = userId ? await User.findByPk(userId) : null;

    // Получаем все возможные переходы из текущего статуса
    const transitions = await WorkflowTransition.findAll({
      where: {
        workflowTypeId: ticket.workflowTypeId,
        [Op.or]: [
          { fromStatusId: ticket.currentStatusId },
          { fromStatusId: null } // Переходы из любого статуса
        ],
        isActive: true
      },
      include: [
        {
          model: WorkflowStatus,
          as: 'fromStatus'
        },
        {
          model: WorkflowStatus,
          as: 'toStatus'
        },
        {
          model: WorkflowCondition,
          where: { isActive: true },
          required: false
        }
      ],
      order: [['sortOrder', 'ASC']]
    });

    // Фильтруем переходы по правам и условиям
    const availableTransitions = [];

    for (const transition of transitions) {
      // Проверяем права
      const permissionCheck = transition.canExecute(user?.role, ticket);
      if (!permissionCheck.allowed) {
        continue;
      }

      // Проверяем условия (только базовые, без выполнения действий)
      const conditionsResult = await this.evaluateConditions(
        transition.WorkflowConditions || [],
        ticket,
        user,
        {},
        true // quickCheck - не выполнять сложные проверки
      );

      if (conditionsResult.passed) {
        availableTransitions.push({
          ...transition.toJSON(),
          canExecute: true,
          requiresComment: transition.requiresComment,
          requiresAssignment: transition.requiresAssignment
        });
      }
    }

    return availableTransitions;
  }

  /**
   * Оценить условия перехода
   */
  async evaluateConditions(conditions, ticket, user, context, quickCheck = false) {
    if (!conditions || conditions.length === 0) {
      return { passed: true, details: {}, failedConditions: [] };
    }

    const result = {
      passed: true,
      details: {},
      failedConditions: []
    };

    // Группируем условия по группам (для OR логики между группами)
    const conditionGroups = {};
    for (const condition of conditions) {
      const group = condition.conditionGroup || 1;
      if (!conditionGroups[group]) {
        conditionGroups[group] = [];
      }
      conditionGroups[group].push(condition);
    }

    // Проверяем каждую группу (AND между группами, OR внутри группы)
    for (const [groupId, groupConditions] of Object.entries(conditionGroups)) {
      let groupPassed = false;

      for (const condition of groupConditions) {
        try {
          const conditionResult = condition.evaluate(ticket, user, context);
          result.details[condition.id] = conditionResult;

          if (conditionResult) {
            groupPassed = true; // Достаточно одного true в группе
          }
        } catch (error) {
          result.details[condition.id] = false;
          if (!quickCheck) {
            logger.error('Error evaluating workflow condition', {
              conditionId: condition.id,
              error: error.message
            });
          }
        }
      }

      if (!groupPassed) {
        result.passed = false;
        result.failedConditions.push(`Group ${groupId}`);
      }
    }

    return result;
  }

  /**
   * Выполнить действия перехода
   */
  async executeActions(actions, ticket, user, context) {
    if (!actions || actions.length === 0) {
      return { success: true, details: {} };
    }

    const result = {
      success: true,
      details: {},
      errors: []
    };

    // Сортируем действия по порядку выполнения
    const sortedActions = actions.sort((a, b) => a.executionOrder - b.executionOrder);

    for (const action of sortedActions) {
      try {
        const actionResult = await action.execute(ticket, user, context);
        result.details[action.id] = actionResult;

        if (!actionResult.success) {
          result.errors.push({
            actionId: action.id,
            actionType: action.actionType,
            error: actionResult.message
          });
        }
      } catch (error) {
        result.success = false;
        result.details[action.id] = {
          success: false,
          message: error.message,
          error: error.stack
        };
        result.errors.push({
          actionId: action.id,
          actionType: action.actionType,
          error: error.message
        });

        logger.error('Error executing workflow action', {
          actionId: action.id,
          actionType: action.actionType,
          ticketId: ticket.id,
          error: error.message
        });
      }
    }

    return result;
  }

  /**
   * Получить тикет с данными workflow
   */
  async getTicketWithWorkflowData(ticketId) {
    return await Ticket.findByPk(ticketId, {
      include: [
        {
          model: WorkflowType
        },
        {
          model: WorkflowStatus,
          as: 'currentStatus'
        },
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });
  }

  /**
   * Создать новый тип workflow
   */
  async createWorkflowType(data, createdById) {
    const transaction = await sequelize.transaction();

    try {
      const workflowType = await WorkflowType.create({
        ...data,
        createdById
      }, { transaction });

      // Создаем начальную версию
      const version = await WorkflowVersion.create({
        workflowTypeId: workflowType.id,
        versionNumber: 1,
        description: 'Initial version',
        configuration: { statuses: [], transitions: [] },
        createdById
      }, { transaction });

      await transaction.commit();

      logger.info('Workflow type created', {
        workflowTypeId: workflowType.id,
        name: workflowType.name,
        createdById
      });

      return workflowType;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Получить статистику workflow
   */
  async getWorkflowStats(workflowTypeId, dateRange = {}) {
    const stats = await WorkflowExecutionLog.getWorkflowStats(workflowTypeId, dateRange);
    const performance = await WorkflowExecutionLog.getPerformanceMetrics(workflowTypeId, dateRange);

    // Получаем статистику по статусам
    const statusStats = await WorkflowStatus.findAll({
      where: { workflowTypeId, isActive: true },
      include: [
        {
          model: Ticket,
          as: 'ticketsInStatus',
          attributes: [],
          required: false
        }
      ],
      attributes: [
        'id',
        'name',
        'displayName',
        'color',
        [sequelize.fn('COUNT', sequelize.col('ticketsInStatus.id')), 'ticketCount']
      ],
      group: ['WorkflowStatus.id'],
      raw: false
    });

    return {
      performance,
      transitionStats: stats,
      statusDistribution: statusStats.map(status => ({
        ...status.toJSON(),
        ticketCount: parseInt(status.dataValues.ticketCount) || 0
      }))
    };
  }

  /**
   * Экспорт конфигурации workflow
   */
  async exportWorkflowConfiguration(workflowTypeId) {
    const workflowType = await WorkflowType.findByPk(workflowTypeId);
    if (!workflowType) {
      throw new Error('Workflow type not found');
    }

    const statuses = await WorkflowStatus.findAll({
      where: { workflowTypeId, isActive: true },
      order: [['sortOrder', 'ASC']]
    });

    const transitions = await WorkflowTransition.findAll({
      where: { workflowTypeId, isActive: true },
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

    return {
      workflowType: workflowType.toJSON(),
      statuses: statuses.map(s => s.toJSON()),
      transitions: transitions.map(t => t.toJSON()),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Импорт конфигурации workflow
   */
  async importWorkflowConfiguration(configData, userId) {
    const transaction = await sequelize.transaction();

    try {
      // Создаем или обновляем тип workflow
      let workflowType = await WorkflowType.findOne({
        where: { name: configData.workflowType.name },
        transaction
      });

      if (workflowType) {
        await workflowType.update({
          ...configData.workflowType,
          updatedById: userId
        }, { transaction });
      } else {
        workflowType = await WorkflowType.create({
          ...configData.workflowType,
          createdById: userId
        }, { transaction });
      }

      // Создаем статусы
      const statusMapping = {};
      for (const statusData of configData.statuses) {
        const status = await WorkflowStatus.create({
          ...statusData,
          workflowTypeId: workflowType.id,
          createdById: userId
        }, { transaction });
        statusMapping[statusData.id] = status.id;
      }

      // Создаем переходы
      for (const transitionData of configData.transitions) {
        const transition = await WorkflowTransition.create({
          ...transitionData,
          workflowTypeId: workflowType.id,
          fromStatusId: transitionData.fromStatusId ? statusMapping[transitionData.fromStatusId] : null,
          toStatusId: statusMapping[transitionData.toStatusId],
          createdById: userId
        }, { transaction });

        // Создаем условия
        if (transitionData.WorkflowConditions) {
          for (const conditionData of transitionData.WorkflowConditions) {
            await WorkflowCondition.create({
              ...conditionData,
              transitionId: transition.id
            }, { transaction });
          }
        }

        // Создаем действия
        if (transitionData.WorkflowActions) {
          for (const actionData of transitionData.WorkflowActions) {
            await WorkflowAction.create({
              ...actionData,
              transitionId: transition.id
            }, { transaction });
          }
        }
      }

      // Создаем версию
      await WorkflowVersion.create({
        workflowTypeId: workflowType.id,
        description: `Imported configuration`,
        configuration: configData,
        createdById: userId
      }, { transaction });

      await transaction.commit();

      logger.info('Workflow configuration imported', {
        workflowTypeId: workflowType.id,
        statusesCount: configData.statuses.length,
        transitionsCount: configData.transitions.length,
        userId
      });

      return workflowType;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new WorkflowService();