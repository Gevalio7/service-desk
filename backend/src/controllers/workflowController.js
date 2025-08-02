const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { logger } = require('../../config/database');
const workflowService = require('../services/workflowService');
const {
  WorkflowType,
  WorkflowStatus,
  WorkflowTransition,
  WorkflowCondition,
  WorkflowAction,
  WorkflowVersion,
  WorkflowExecutionLog,
  User
} = require('../models');

/**
 * Получить все типы workflow
 */
exports.getWorkflowTypes = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    
    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { 'displayName.ru': { [Op.iLike]: `%${search}%` } },
        { 'displayName.en': { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const offset = (page - 1) * limit;
    
    const { count, rows: workflowTypes } = await WorkflowType.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      workflowTypes,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting workflow types:', error);
    res.status(500).json({
      message: 'Error getting workflow types',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Получить тип workflow по ID
 */
exports.getWorkflowTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const workflowType = await WorkflowType.findByPk(id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: WorkflowStatus,
          where: { isActive: true },
          required: false,
          order: [['sortOrder', 'ASC']]
        },
        {
          model: WorkflowTransition,
          where: { isActive: true },
          required: false,
          include: [
            {
              model: WorkflowStatus,
              as: 'fromStatus',
              attributes: ['id', 'name', 'displayName']
            },
            {
              model: WorkflowStatus,
              as: 'toStatus',
              attributes: ['id', 'name', 'displayName']
            }
          ],
          order: [['sortOrder', 'ASC']]
        }
      ]
    });

    if (!workflowType) {
      return res.status(404).json({ message: 'Workflow type not found' });
    }

    res.status(200).json({ workflowType });
  } catch (error) {
    logger.error('Error getting workflow type:', error);
    res.status(500).json({
      message: 'Error getting workflow type',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Создать новый тип workflow
 */
exports.createWorkflowType = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const workflowType = await workflowService.createWorkflowType(req.body, req.user.id);

    res.status(201).json({
      message: 'Workflow type created successfully',
      workflowType
    });
  } catch (error) {
    logger.error('Error creating workflow type:', error);
    res.status(500).json({
      message: 'Error creating workflow type',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Обновить тип workflow
 */
exports.updateWorkflowType = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const workflowType = await WorkflowType.findByPk(id);

    if (!workflowType) {
      return res.status(404).json({ message: 'Workflow type not found' });
    }

    await workflowType.update({
      ...req.body,
      updatedById: req.user.id
    });

    res.status(200).json({
      message: 'Workflow type updated successfully',
      workflowType
    });
  } catch (error) {
    logger.error('Error updating workflow type:', error);
    res.status(500).json({
      message: 'Error updating workflow type',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Получить статусы для типа workflow
 */
exports.getWorkflowStatuses = async (req, res) => {
  try {
    const { workflowTypeId } = req.params;
    const { includeInactive = false } = req.query;

    const where = { workflowTypeId };
    if (!includeInactive) {
      where.isActive = true;
    }

    const statuses = await WorkflowStatus.findAll({
      where,
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
    });

    res.status(200).json({ statuses });
  } catch (error) {
    logger.error('Error getting workflow statuses:', error);
    res.status(500).json({
      message: 'Error getting workflow statuses',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Создать новый статус
 */
exports.createWorkflowStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { workflowTypeId } = req.params;
    
    const status = await WorkflowStatus.create({
      ...req.body,
      workflowTypeId,
      createdById: req.user.id
    });

    res.status(201).json({
      message: 'Workflow status created successfully',
      status
    });
  } catch (error) {
    logger.error('Error creating workflow status:', error);
    res.status(500).json({
      message: 'Error creating workflow status',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Обновить статус
 */
exports.updateWorkflowStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { statusId } = req.params;
    const status = await WorkflowStatus.findByPk(statusId);

    if (!status) {
      return res.status(404).json({ message: 'Workflow status not found' });
    }

    await status.update({
      ...req.body,
      updatedById: req.user.id
    });

    res.status(200).json({
      message: 'Workflow status updated successfully',
      status
    });
  } catch (error) {
    logger.error('Error updating workflow status:', error);
    res.status(500).json({
      message: 'Error updating workflow status',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Получить переходы для типа workflow
 */
exports.getWorkflowTransitions = async (req, res) => {
  try {
    const { workflowTypeId } = req.params;
    const { includeInactive = false } = req.query;

    const where = { workflowTypeId };
    if (!includeInactive) {
      where.isActive = true;
    }

    const transitions = await WorkflowTransition.findAll({
      where,
      include: [
        {
          model: WorkflowStatus,
          as: 'fromStatus',
          attributes: ['id', 'name', 'displayName', 'color']
        },
        {
          model: WorkflowStatus,
          as: 'toStatus',
          attributes: ['id', 'name', 'displayName', 'color']
        },
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
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']]
    });

    res.status(200).json({ transitions });
  } catch (error) {
    logger.error('Error getting workflow transitions:', error);
    res.status(500).json({
      message: 'Error getting workflow transitions',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Создать новый переход
 */
exports.createWorkflowTransition = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { workflowTypeId } = req.params;
    
    const transition = await WorkflowTransition.create({
      ...req.body,
      workflowTypeId,
      createdById: req.user.id
    });

    res.status(201).json({
      message: 'Workflow transition created successfully',
      transition
    });
  } catch (error) {
    logger.error('Error creating workflow transition:', error);
    res.status(500).json({
      message: 'Error creating workflow transition',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Выполнить переход статуса тикета
 */
exports.executeTransition = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { ticketId, transitionId } = req.params;
    const { comment, assigneeId, context } = req.body;

    const result = await workflowService.executeTransition(
      ticketId,
      transitionId,
      req.user.id,
      { comment, assigneeId, context }
    );

    res.status(200).json({
      message: 'Transition executed successfully',
      ...result
    });
  } catch (error) {
    logger.error('Error executing transition:', error);
    res.status(400).json({
      message: 'Error executing transition',
      error: error.message
    });
  }
};

/**
 * Получить доступные переходы для тикета
 */
exports.getAvailableTransitions = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const transitions = await workflowService.getAvailableTransitions(ticketId, req.user.id);

    res.status(200).json({ transitions });
  } catch (error) {
    logger.error('Error getting available transitions:', error);
    res.status(500).json({
      message: 'Error getting available transitions',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Получить статистику workflow
 */
exports.getWorkflowStats = async (req, res) => {
  try {
    const { workflowTypeId } = req.params;
    const { startDate, endDate } = req.query;

    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const stats = await workflowService.getWorkflowStats(workflowTypeId, dateRange);

    res.status(200).json({ stats });
  } catch (error) {
    logger.error('Error getting workflow stats:', error);
    res.status(500).json({
      message: 'Error getting workflow stats',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Экспорт конфигурации workflow
 */
exports.exportWorkflowConfiguration = async (req, res) => {
  try {
    const { workflowTypeId } = req.params;

    const configuration = await workflowService.exportWorkflowConfiguration(workflowTypeId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="workflow-${workflowTypeId}.json"`);
    res.status(200).json(configuration);
  } catch (error) {
    logger.error('Error exporting workflow configuration:', error);
    res.status(500).json({
      message: 'Error exporting workflow configuration',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Импорт конфигурации workflow
 */
exports.importWorkflowConfiguration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const workflowType = await workflowService.importWorkflowConfiguration(req.body, req.user.id);

    res.status(201).json({
      message: 'Workflow configuration imported successfully',
      workflowType
    });
  } catch (error) {
    logger.error('Error importing workflow configuration:', error);
    res.status(500).json({
      message: 'Error importing workflow configuration',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Получить версии workflow
 */
exports.getWorkflowVersions = async (req, res) => {
  try {
    const { workflowTypeId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: versions } = await WorkflowVersion.findAndCountAll({
      where: { workflowTypeId },
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['versionNumber', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      versions,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting workflow versions:', error);
    res.status(500).json({
      message: 'Error getting workflow versions',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Создать новую версию workflow
 */
exports.createWorkflowVersion = async (req, res) => {
  try {
    const { workflowTypeId } = req.params;
    const { description } = req.body;

    const version = await WorkflowVersion.createNewVersion(workflowTypeId, req.user.id, description);

    res.status(201).json({
      message: 'Workflow version created successfully',
      version
    });
  } catch (error) {
    logger.error('Error creating workflow version:', error);
    res.status(500).json({
      message: 'Error creating workflow version',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Активировать версию workflow
 */
exports.activateWorkflowVersion = async (req, res) => {
  try {
    const { versionId } = req.params;

    const version = await WorkflowVersion.findByPk(versionId);
    if (!version) {
      return res.status(404).json({ message: 'Workflow version not found' });
    }

    await version.activate();

    res.status(200).json({
      message: 'Workflow version activated successfully',
      version
    });
  } catch (error) {
    logger.error('Error activating workflow version:', error);
    res.status(500).json({
      message: 'Error activating workflow version',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Получить лог выполнения workflow для тикета
 */
exports.getTicketWorkflowHistory = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { page = 1, limit = 20, includeDetails = false } = req.query;

    const offset = (page - 1) * limit;

    const history = await WorkflowExecutionLog.getTicketHistory(ticketId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      includeDetails: includeDetails === 'true'
    });

    res.status(200).json({ history });
  } catch (error) {
    logger.error('Error getting ticket workflow history:', error);
    res.status(500).json({
      message: 'Error getting ticket workflow history',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

module.exports = exports;