const { Op } = require('sequelize');
const moment = require('moment');
const { validationResult } = require('express-validator');
const {
  Ticket,
  User,
  Comment,
  Attachment,
  TicketHistory,
  TicketContact
} = require('../models');
const { logger } = require('../../config/database');
const notificationService = require('../services/notificationService');

/**
 * Create a new ticket
 */
exports.createTicket = async (req, res) => {
  try {
    logger.info('🎫 СОЗДАНИЕ ЗАЯВКИ - Начало процесса', {
      userId: req.user?.id,
      userEmail: req.user?.email,
      requestBody: req.body
    });

    const {
      title,
      description,
      category,
      priority,
      type,
      tags,
      source,
      telegramMessageId,
      createdById
    } = req.body;
    
    // Валидация обязательных полей
    if (!title || !description) {
      logger.error('❌ СОЗДАНИЕ ЗАЯВКИ - Отсутствуют обязательные поля', {
        title: !!title,
        description: !!description,
        userId: req.user?.id
      });
      return res.status(400).json({
        message: 'Title and description are required',
        missingFields: {
          title: !title,
          description: !description
        }
      });
    }

    // Определяем createdById: если req.user.id null (service token), используем createdById из body
    const finalCreatedById = req.user?.id || createdById;
    
    if (!finalCreatedById) {
      logger.error('❌ СОЗДАНИЕ ЗАЯВКИ - Не указан создатель заявки', {
        reqUserId: req.user?.id,
        bodyCreatedById: createdById,
        source: source
      });
      return res.status(400).json({
        message: 'Creator ID is required',
        error: 'No valid createdById found'
      });
    }

    logger.info('✅ СОЗДАНИЕ ЗАЯВКИ - Валидация пройдена, создаем заявку', {
      title,
      category: category || 'request',
      priority: priority || 'P3',
      userId: req.user?.id,
      finalCreatedById: finalCreatedById,
      source: source
    });
    
    // Create ticket
    const ticket = await Ticket.create({
      title,
      description,
      category: category || 'general',
      priority: priority || 'medium',
      type: type || 'incident',
      status: 'new',
      tags: tags || [],
      source: source || 'web',
      telegramMessageId,
      createdById: finalCreatedById
    });
    
    logger.info('🎉 СОЗДАНИЕ ЗАЯВКИ - Заявка успешно создана', {
      ticketId: ticket.id,
      title: ticket.title,
      status: ticket.status,
      createdById: ticket.createdById,
      userId: req.user.id
    });

    // Create ticket history entry - temporarily disabled due to DB schema issues
    // await TicketHistory.create({
    //   ticketId: ticket.id,
    //   userId: req.user.id,
    //   field: 'status',
    //   newValue: 'new',
    //   action: 'create'
    // });
    
    // Send new ticket notification
    try {
      await notificationService.sendNewTicketNotification(ticket);
      logger.info('📧 СОЗДАНИЕ ЗАЯВКИ - Уведомления отправлены', {
        ticketId: ticket.id
      });
    } catch (notificationError) {
      logger.error('❌ СОЗДАНИЕ ЗАЯВКИ - Ошибка отправки уведомлений:', {
        ticketId: ticket.id,
        error: notificationError.message
      });
      // Не прерываем процесс создания заявки из-за ошибки уведомлений
    }
    
    res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    logger.error('❌ СОЗДАНИЕ ЗАЯВКИ - Критическая ошибка:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      requestBody: req.body
    });
    res.status(500).json({
      message: 'Error creating ticket',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Get all tickets with filtering
 */
exports.getTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      type,
      assignedToId,
      createdById,
      startDate,
      endDate,
      search,
      tags,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    // Build filter conditions
    const where = {};
    
    // Filter by status
    if (status) {
      where.status = status;
    }
    
    // Filter by priority
    if (priority) {
      where.priority = priority;
    }
    
    // Filter by category
    if (category) {
      where.category = category;
    }
    
    // Filter by type
    if (type) {
      where.type = type;
    }
    
    // Filter by assigned user
    if (assignedToId) {
      where.assignedToId = assignedToId;
    }
    
    // Filter by created user
    if (createdById) {
      where.createdById = createdById;
    }
    
    // Filter by date range
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [
          moment(startDate).startOf('day').toDate(),
          moment(endDate).endOf('day').toDate()
        ]
      };
    } else if (startDate) {
      where.createdAt = {
        [Op.gte]: moment(startDate).startOf('day').toDate()
      };
    } else if (endDate) {
      where.createdAt = {
        [Op.lte]: moment(endDate).endOf('day').toDate()
      };
    }
    
    // Filter by search term (title or description)
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',');
      where.tags = {
        [Op.overlap]: tagArray
      };
    }
    
    // Role-based access control
    if (req.user.role === 'client') {
      // Clients can only see their own tickets
      where.createdById = req.user.id;
    } else if (req.user.role === 'system') {
      // System requests (like from Telegram bot) can filter by createdById parameter
      // This allows the bot to get tickets for specific users
      // The createdById parameter should be provided in the query
    }
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get tickets with pagination
    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      tickets,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (error) {
    logger.error('Error in getTickets controller:', error);
    res.status(500).json({ 
      message: 'Error getting tickets',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Get ticket by ID
 */
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('🔍 ПОЛУЧЕНИЕ ТИКЕТА - Запрос деталей тикета', {
      ticketId: id,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    
    // Get ticket with related data
    const ticket = await Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: Comment,
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'firstName', 'lastName']
            },
            {
              model: Attachment
            }
          ],
          order: [['createdAt', 'ASC']]
        },
        {
          model: Attachment
        },
        {
          model: TicketHistory,
          include: [
            {
              model: User,
              attributes: ['id', 'username', 'firstName', 'lastName']
            }
          ],
          order: [['createdAt', 'DESC']]
        },
        {
          model: TicketContact,
          include: [
            {
              model: User,
              as: 'contactUser',
              attributes: ['id', 'username', 'firstName', 'lastName', 'email']
            },
            {
              model: User,
              as: 'addedBy',
              attributes: ['id', 'username', 'firstName', 'lastName']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });
    
    if (!ticket) {
      logger.warn('❌ ПОЛУЧЕНИЕ ТИКЕТА - Тикет не найден', {
        ticketId: id,
        userId: req.user?.id
      });
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'client' && ticket.createdById !== req.user.id) {
      logger.warn('❌ ПОЛУЧЕНИЕ ТИКЕТА - Доступ запрещен', {
        ticketId: id,
        userId: req.user?.id,
        userRole: req.user?.role,
        ticketCreatedById: ticket.createdById
      });
      return res.status(403).json({ message: 'Access denied' });
    } else if (req.user.role === 'system') {
      // System requests (like from Telegram bot) have full access to all tickets
      logger.info('🤖 ПОЛУЧЕНИЕ ТИКЕТА - Системный запрос, полный доступ', {
        ticketId: id,
        userRole: req.user?.role
      });
    }
    
    logger.info('✅ ПОЛУЧЕНИЕ ТИКЕТА - Тикет успешно найден', {
      ticketId: ticket.id,
      title: ticket.title,
      status: ticket.status,
      commentsCount: ticket.Comments?.length || 0,
      userId: req.user?.id
    });
    
    res.status(200).json({ ticket });
  } catch (error) {
    logger.error('❌ ПОЛУЧЕНИЕ ТИКЕТА - Ошибка получения тикета:', {
      ticketId: req.params.id,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Error getting ticket',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Update ticket
 */
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      category,
      type,
      assignedToId,
      tags
    } = req.body;
    
    logger.info('🔄 ОБНОВЛЕНИЕ ТИКЕТА - Начало процесса', {
      ticketId: id,
      userId: req.user?.id,
      userRole: req.user?.role,
      requestBody: req.body,
      requestedChanges: {
        title: !!title,
        description: !!description,
        status: !!status,
        priority: !!priority,
        category: !!category,
        assignedToId: !!assignedToId,
        tags: !!tags
      }
    });
    
    // Get ticket
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      logger.error('❌ ОБНОВЛЕНИЕ ТИКЕТА - Тикет не найден', {
        ticketId: id,
        userId: req.user?.id
      });
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    logger.info('✅ ОБНОВЛЕНИЕ ТИКЕТА - Тикет найден', {
      ticketId: ticket.id,
      currentStatus: ticket.status,
      currentTitle: ticket.title,
      createdById: ticket.createdById,
      userId: req.user?.id
    });
    
    // Store old values for logging
    const oldValues = {
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      type: ticket.type,
      assignedToId: ticket.assignedToId,
      tags: ticket.tags
    };
    
    // Role-based access control
    if (req.user.role === 'client') {
      // Clients can only update their own tickets and only certain fields
      if (ticket.createdById !== req.user.id) {
        logger.warn('❌ ОБНОВЛЕНИЕ ТИКЕТА - Доступ запрещен для клиента', {
          ticketId: id,
          userId: req.user?.id,
          ticketCreatedById: ticket.createdById
        });
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Clients can only update title and description
      if (title) ticket.title = title;
      if (description) ticket.description = description;
      
      logger.info('👤 ОБНОВЛЕНИЕ ТИКЕТА - Клиент может изменить только title и description', {
        ticketId: id,
        userId: req.user?.id,
        titleChanged: !!title,
        descriptionChanged: !!description
      });
    } else {
      // Agents and admins can update all fields
      if (title) ticket.title = title;
      if (description) ticket.description = description;
      if (status) ticket.status = status;
      if (priority) ticket.priority = priority;
      if (category) ticket.category = category;
      if (type) ticket.type = type;
      if (assignedToId) ticket.assignedToId = assignedToId;
      if (tags) ticket.tags = tags;
      
      logger.info('👨‍💼 ОБНОВЛЕНИЕ ТИКЕТА - Агент/Админ может изменить все поля', {
        ticketId: id,
        userId: req.user?.id,
        userRole: req.user?.role,
        statusChange: oldValues.status !== ticket.status ? `${oldValues.status} → ${ticket.status}` : 'нет изменений',
        priorityChange: oldValues.priority !== ticket.priority ? `${oldValues.priority} → ${ticket.priority}` : 'нет изменений'
      });
    }
    
    // Check what actually changed
    const changes = ticket.changed();
    logger.info('📝 ОБНОВЛЕНИЕ ТИКЕТА - Обнаруженные изменения', {
      ticketId: id,
      changes: changes || 'нет изменений',
      changedFields: changes ? changes.map(field => ({
        field,
        oldValue: oldValues[field],
        newValue: ticket[field]
      })) : []
    });
    
    // Create history entries for each changed field
    if (changes) {
      try {
        for (const field of changes) {
          await TicketHistory.create({
            ticketId: ticket.id,
            userId: req.user.id,
            field,
            oldValue: ticket.previous(field),
            newValue: ticket[field],
            action: 'update'
          });
        }
        logger.info('📚 ОБНОВЛЕНИЕ ТИКЕТА - История изменений создана', {
          ticketId: id,
          changesCount: changes.length
        });
      } catch (historyError) {
        logger.error('❌ ОБНОВЛЕНИЕ ТИКЕТА - Ошибка создания истории:', {
          ticketId: id,
          error: historyError.message
        });
        // Не прерываем процесс из-за ошибки истории
      }
    }
    
    // Save ticket
    logger.info('💾 ОБНОВЛЕНИЕ ТИКЕТА - Сохранение в базу данных', {
      ticketId: id,
      newStatus: ticket.status,
      hasChanges: !!changes
    });
    
    await ticket.save();
    
    logger.info('🎉 ОБНОВЛЕНИЕ ТИКЕТА - Тикет успешно сохранен', {
      ticketId: ticket.id,
      finalStatus: ticket.status,
      updatedAt: ticket.updatedAt
    });
    
    res.status(200).json({
      message: 'Ticket updated successfully',
      ticket
    });
  } catch (error) {
    logger.error('❌ ОБНОВЛЕНИЕ ТИКЕТА - Критическая ошибка:', {
      ticketId: req.params.id,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
      requestBody: req.body
    });
    
    // Проверяем, не связана ли ошибка с ENUM
    if (error.message.includes('invalid input value for enum')) {
      logger.error('🚫 ОБНОВЛЕНИЕ ТИКЕТА - Ошибка ENUM статуса:', {
        requestedStatus: req.body.status,
        error: error.message
      });
      return res.status(400).json({
        message: 'Invalid status value. Please check available statuses.',
        error: error.message,
        requestedStatus: req.body.status
      });
    }
    
    res.status(500).json({
      message: 'Error updating ticket',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Add comment to ticket
 */
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isInternal, telegramMessageId } = req.body;
    
    // Get ticket
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'client' && ticket.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Clients cannot create internal comments
    if (req.user.role === 'client' && isInternal) {
      return res.status(403).json({ message: 'Clients cannot create internal comments' });
    }
    
    // Create comment
    const comment = await Comment.create({
      content,
      isInternal: isInternal || false,
      telegramMessageId,
      ticketId: ticket.id,
      userId: req.user.id
    });
    
    // Create history entry
    await TicketHistory.create({
      ticketId: ticket.id,
      userId: req.user.id,
      field: 'comment',
      newValue: comment.id,
      action: 'comment'
    });
    
    // Get comment with user data
    const commentWithUser = await Comment.findByPk(comment.id, {
      include: [
        {
          model: User,
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });
    
    res.status(201).json({
      message: 'Comment added successfully',
      comment: commentWithUser
    });
  } catch (error) {
    logger.error('Error in addComment controller:', error);
    res.status(500).json({ 
      message: 'Error adding comment',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Get SLA metrics
 */
exports.getSlaMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const start = startDate 
      ? moment(startDate).startOf('day').toDate() 
      : moment().subtract(30, 'days').startOf('day').toDate();
    
    const end = endDate 
      ? moment(endDate).endOf('day').toDate() 
      : moment().endOf('day').toDate();
    
    // Get tickets created in date range
    const tickets = await Ticket.findAll({
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      attributes: [
        'id', 'priority', 'status', 'slaBreach', 'responseBreach',
        'createdAt', 'slaDeadline', 'responseDeadline', 'firstResponseTime', 'resolutionTime'
      ]
    });
    
    // Calculate metrics
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length;
    const slaBreaches = tickets.filter(t => t.slaBreach).length;
    const responseBreaches = tickets.filter(t => t.responseBreach).length;
    
    // Calculate status breakdown
    const statusBreakdown = {
      new: tickets.filter(t => t.status === 'new').length,
      open: tickets.filter(t => t.status === 'open').length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length
    };
    
    // Calculate average response and resolution times
    let totalResponseTime = 0;
    let responseCount = 0;
    let totalResolutionTime = 0;
    let resolutionCount = 0;
    
    for (const ticket of tickets) {
      if (ticket.firstResponseTime) {
        const responseTime = moment(ticket.firstResponseTime).diff(moment(ticket.createdAt), 'minutes');
        totalResponseTime += responseTime;
        responseCount++;
      }
      
      if (ticket.resolutionTime) {
        const resolutionTime = moment(ticket.resolutionTime).diff(moment(ticket.createdAt), 'minutes');
        totalResolutionTime += resolutionTime;
        resolutionCount++;
      }
    }
    
    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    const avgResolutionTime = resolutionCount > 0 ? totalResolutionTime / resolutionCount : 0;
    
    // Group by priority
    const priorityMetrics = {
      urgent: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
      high: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
      medium: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
      low: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 }
    };
    
    for (const ticket of tickets) {
      priorityMetrics[ticket.priority].total++;
      
      if (['resolved', 'closed'].includes(ticket.status)) {
        priorityMetrics[ticket.priority].resolved++;
      }
      
      if (ticket.slaBreach) {
        priorityMetrics[ticket.priority].slaBreaches++;
      }
      
      if (ticket.responseBreach) {
        priorityMetrics[ticket.priority].responseBreaches++;
      }
    }
    
    res.status(200).json({
      metrics: {
        totalTickets,
        resolvedTickets,
        slaBreaches,
        responseBreaches,
        avgResponseTime,
        avgResolutionTime,
        slaComplianceRate: totalTickets > 0 ? ((totalTickets - slaBreaches) / totalTickets) * 100 : 100,
        responseComplianceRate: totalTickets > 0 ? ((totalTickets - responseBreaches) / totalTickets) * 100 : 100,
        statusBreakdown,
        priorityMetrics
      },
      dateRange: {
        start,
        end
      }
    });
  } catch (error) {
    logger.error('Error in getSlaMetrics controller:', error);
    res.status(500).json({ 
      message: 'Error getting SLA metrics',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Export tickets to CSV
 */
exports.exportTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      category,
      startDate,
      endDate
    } = req.query;
    
    // Build filter conditions
    const where = {};
    
    // Filter by status
    if (status) {
      where.status = status;
    }
    
    // Filter by priority
    if (priority) {
      where.priority = priority;
    }
    
    // Filter by category
    if (category) {
      where.category = category;
    }
    
    // Filter by date range
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [
          moment(startDate).startOf('day').toDate(),
          moment(endDate).endOf('day').toDate()
        ]
      };
    }
    
    // Role-based access control
    if (req.user.role === 'client') {
      // Clients can only export their own tickets
      where.createdById = req.user.id;
    }
    
    // Get tickets
    const tickets = await Ticket.findAll({
      where,
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Format tickets for CSV
    const csvData = tickets.map(ticket => ({
      ID: ticket.id,
      Title: ticket.title,
      Description: ticket.description,
      Status: ticket.status,
      Priority: ticket.priority,
      Category: ticket.category,
      CreatedBy: ticket.createdBy ? `${ticket.createdBy.firstName} ${ticket.createdBy.lastName}` : 'N/A',
      AssignedTo: ticket.assignedTo ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}` : 'N/A',
      CreatedAt: moment(ticket.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      SLADeadline: ticket.slaDeadline ? moment(ticket.slaDeadline).format('YYYY-MM-DD HH:mm:ss') : 'N/A',
      SLABreach: ticket.slaBreach ? 'Yes' : 'No',
      Tags: ticket.tags.join(', ')
    }));
    
    // Convert to CSV string
    const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
    const csvStringifier = createCsvStringifier({
      header: [
        { id: 'ID', title: 'ID' },
        { id: 'Title', title: 'Title' },
        { id: 'Description', title: 'Description' },
        { id: 'Status', title: 'Status' },
        { id: 'Priority', title: 'Priority' },
        { id: 'Category', title: 'Category' },
        { id: 'CreatedBy', title: 'Created By' },
        { id: 'AssignedTo', title: 'Assigned To' },
        { id: 'CreatedAt', title: 'Created At' },
        { id: 'SLADeadline', title: 'SLA Deadline' },
        { id: 'SLABreach', title: 'SLA Breach' },
        { id: 'Tags', title: 'Tags' }
      ]
    });
    
    const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvData);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tickets.csv');
    
    res.status(200).send(csvString);
  } catch (error) {
    logger.error('Error in exportTickets controller:', error);
    res.status(500).json({ 
      message: 'Error exporting tickets',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Upload attachments to ticket
 */
exports.uploadAttachments = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.error('❌ ЗАГРУЗКА ФАЙЛОВ - Ошибки валидации', {
        errors: errors.array(),
        ticketId: req.params.id,
        userId: req.user?.id
      });
      return res.status(400).json({
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Check for multer errors
    if (req.fileValidationError) {
      logger.error('❌ ЗАГРУЗКА ФАЙЛОВ - Ошибка multer', {
        error: req.fileValidationError,
        ticketId: req.params.id,
        userId: req.user?.id
      });
      return res.status(400).json({
        message: 'File upload error',
        error: req.fileValidationError
      });
    }
    
    const { id } = req.params;
    const files = req.files;
    
    logger.info('📎 ЗАГРУЗКА ФАЙЛОВ - Получен запрос', {
      ticketId: id,
      ticketIdType: typeof id,
      ticketIdLength: id ? id.length : 0,
      ticketIdRaw: JSON.stringify(id),
      filesCount: files ? files.length : 0,
      userId: req.user?.id,
      userRole: req.user?.role,
      requestUrl: req.originalUrl,
      requestMethod: req.method,
      requestHeaders: {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent']
      }
    });
    
    if (!files || files.length === 0) {
      logger.warn('❌ ЗАГРУЗКА ФАЙЛОВ - Файлы не переданы', {
        ticketId: id,
        userId: req.user?.id
      });
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    // Validate ticket ID format
    if (!id || id.trim() === '') {
      logger.error('❌ ЗАГРУЗКА ФАЙЛОВ - Некорректный ID тикета', {
        ticketId: id,
        userId: req.user?.id
      });
      return res.status(400).json({ message: 'Invalid ticket ID' });
    }
    
    // Get ticket
    logger.info('🔍 ЗАГРУЗКА ФАЙЛОВ - Поиск тикета в базе данных', {
      ticketId: id,
      userId: req.user?.id
    });
    
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      logger.error('❌ ЗАГРУЗКА ФАЙЛОВ - Тикет не найден в базе данных', {
        ticketId: id,
        userId: req.user?.id,
        searchedId: id,
        searchedIdType: typeof id
      });
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    logger.info('✅ ЗАГРУЗКА ФАЙЛОВ - Тикет найден', {
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      ticketStatus: ticket.status,
      createdById: ticket.createdById,
      userId: req.user?.id
    });
    
    // Role-based access control
    if (req.user.role === 'client' && ticket.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    logger.info('📎 ЗАГРУЗКА ФАЙЛОВ - Начало загрузки', {
      ticketId: id,
      filesCount: files.length,
      userId: req.user.id
    });
    
    // Ensure upload directory exists
    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(process.cwd(), 'uploads', 'attachments');
    
    if (!fs.existsSync(uploadDir)) {
      logger.info('📁 ЗАГРУЗКА ФАЙЛОВ - Создание директории для загрузок', {
        uploadDir: uploadDir
      });
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Create attachment records
    const attachments = [];
    for (const file of files) {
      // Verify file exists on disk
      if (!fs.existsSync(file.path)) {
        logger.error('❌ ЗАГРУЗКА ФАЙЛОВ - Файл не найден на диске', {
          filename: file.filename,
          path: file.path,
          originalName: file.originalname
        });
        continue; // Skip this file
      }
      
      const attachment = await Attachment.create({
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        ticketId: ticket.id,
        isPublic: true
      });
      
      attachments.push(attachment);
      
      logger.info('📎 ЗАГРУЗКА ФАЙЛОВ - Файл сохранен', {
        attachmentId: attachment.id,
        originalName: file.originalname,
        filename: file.filename,
        size: file.size,
        path: file.path
      });
    }
    
    logger.info('✅ ЗАГРУЗКА ФАЙЛОВ - Все файлы успешно загружены', {
      ticketId: id,
      attachmentsCount: attachments.length,
      userId: req.user.id
    });
    
    res.status(201).json({
      message: 'Files uploaded successfully',
      attachments
    });
  } catch (error) {
    logger.error('❌ ЗАГРУЗКА ФАЙЛОВ - Ошибка загрузки файлов:', {
      ticketId: req.params.id,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Error uploading files',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Download attachment
 */
exports.downloadAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    
    // Get ticket
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'client' && ticket.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get attachment
    const attachment = await Attachment.findOne({
      where: {
        id: attachmentId,
        ticketId: id
      }
    });
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    logger.info('📥 СКАЧИВАНИЕ ФАЙЛА - Запрос на скачивание', {
      ticketId: id,
      attachmentId: attachmentId,
      filename: attachment.originalName,
      userId: req.user.id
    });
    
    const fs = require('fs');
    const path = require('path');
    
    // Check if file exists
    if (!fs.existsSync(attachment.path)) {
      logger.error('❌ СКАЧИВАНИЕ ФАЙЛА - Файл не найден на диске', {
        attachmentId: attachmentId,
        path: attachment.path
      });
      return res.status(404).json({ message: 'File not found on disk' });
    }
    
    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Length', attachment.size);
    
    // Stream file to response
    const fileStream = fs.createReadStream(attachment.path);
    fileStream.pipe(res);
    
    logger.info('✅ СКАЧИВАНИЕ ФАЙЛА - Файл успешно отправлен', {
      ticketId: id,
      attachmentId: attachmentId,
      filename: attachment.originalName,
      userId: req.user.id
    });
    
  } catch (error) {
    logger.error('❌ СКАЧИВАНИЕ ФАЙЛА - Ошибка скачивания файла:', {
      ticketId: req.params.id,
      attachmentId: req.params.attachmentId,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Error downloading file',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Delete attachment
 */
exports.deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    
    // Get ticket
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'client' && ticket.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get attachment
    const attachment = await Attachment.findOne({
      where: {
        id: attachmentId,
        ticketId: id
      }
    });
    
    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    logger.info('🗑️ УДАЛЕНИЕ ФАЙЛА - Запрос на удаление', {
      ticketId: id,
      attachmentId: attachmentId,
      filename: attachment.originalName,
      userId: req.user.id
    });
    
    const fs = require('fs');
    
    // Delete file from disk
    if (fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
      logger.info('🗑️ УДАЛЕНИЕ ФАЙЛА - Файл удален с диска', {
        path: attachment.path
      });
    }
    
    // Delete attachment record
    await attachment.destroy();
    
    logger.info('✅ УДАЛЕНИЕ ФАЙЛА - Файл успешно удален', {
      ticketId: id,
      attachmentId: attachmentId,
      filename: attachment.originalName,
      userId: req.user.id
    });
    
    res.status(200).json({
      message: 'Attachment deleted successfully'
    });
    
  } catch (error) {
    logger.error('❌ УДАЛЕНИЕ ФАЙЛА - Ошибка удаления файла:', {
      ticketId: req.params.id,
      attachmentId: req.params.attachmentId,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Error deleting attachment',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Assign ticket to user
 * Admin and agent only
 */
exports.assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;
    
    logger.info('🎯 НАЗНАЧЕНИЕ ТИКЕТА - Начало процесса', {
      ticketId: id,
      assignedToId: assignedToId,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    
    // Role-based access control - только админы и агенты могут назначать
    if (req.user.role === 'client') {
      logger.warn('❌ НАЗНАЧЕНИЕ ТИКЕТА - Доступ запрещен для клиента', {
        ticketId: id,
        userId: req.user?.id,
        userRole: req.user?.role
      });
      return res.status(403).json({ message: 'Access denied. Only admins and agents can assign tickets.' });
    }
    
    // Get ticket
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      logger.error('❌ НАЗНАЧЕНИЕ ТИКЕТА - Тикет не найден', {
        ticketId: id,
        userId: req.user?.id
      });
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Validate assignee if provided
    if (assignedToId) {
      const assignee = await User.findByPk(assignedToId);
      
      if (!assignee) {
        logger.error('❌ НАЗНАЧЕНИЕ ТИКЕТА - Пользователь для назначения не найден', {
          ticketId: id,
          assignedToId: assignedToId,
          userId: req.user?.id
        });
        return res.status(404).json({ message: 'Assignee not found' });
      }
      
      // Проверяем, что назначаем только на админа или агента
      if (assignee.role === 'client') {
        logger.error('❌ НАЗНАЧЕНИЕ ТИКЕТА - Нельзя назначить на клиента', {
          ticketId: id,
          assignedToId: assignedToId,
          assigneeRole: assignee.role,
          userId: req.user?.id
        });
        return res.status(400).json({ message: 'Cannot assign ticket to client. Only admins and agents can be assigned.' });
      }
      
      logger.info('✅ НАЗНАЧЕНИЕ ТИКЕТА - Пользователь для назначения найден', {
        ticketId: id,
        assignedToId: assignedToId,
        assigneeName: `${assignee.firstName} ${assignee.lastName}`,
        assigneeRole: assignee.role,
        userId: req.user?.id
      });
    }
    
    // Store old value for history
    const oldAssignedToId = ticket.assignedToId;
    
    // Update assignment
    ticket.assignedToId = assignedToId || null;
    await ticket.save();
    
    // Create history entry
    try {
      await TicketHistory.create({
        ticketId: ticket.id,
        userId: req.user.id,
        field: 'assignedToId',
        oldValue: oldAssignedToId,
        newValue: assignedToId,
        action: 'assign'
      });
      
      logger.info('📝 НАЗНАЧЕНИЕ ТИКЕТА - История создана', {
        ticketId: id,
        oldAssignedToId: oldAssignedToId,
        newAssignedToId: assignedToId
      });
    } catch (historyError) {
      logger.error('❌ НАЗНАЧЕНИЕ ТИКЕТА - Ошибка создания истории:', {
        ticketId: id,
        error: historyError.message
      });
      // Не прерываем процесс из-за ошибки истории
    }
    
    // Get updated ticket with assignee info
    const updatedTicket = await Ticket.findByPk(id, {
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    logger.info('🎉 НАЗНАЧЕНИЕ ТИКЕТА - Тикет успешно назначен', {
      ticketId: id,
      assignedToId: assignedToId,
      assignedToName: updatedTicket.assignedTo ? `${updatedTicket.assignedTo.firstName} ${updatedTicket.assignedTo.lastName}` : 'Не назначен',
      userId: req.user?.id
    });
    
    // Send notification about assignment
    try {
      if (assignedToId && assignedToId !== oldAssignedToId) {
        await notificationService.sendTicketAssignmentNotification(updatedTicket, req.user);
        logger.info('📧 НАЗНАЧЕНИЕ ТИКЕТА - Уведомление отправлено', {
          ticketId: id,
          assignedToId: assignedToId
        });
      }
    } catch (notificationError) {
      logger.error('❌ НАЗНАЧЕНИЕ ТИКЕТА - Ошибка отправки уведомления:', {
        ticketId: id,
        error: notificationError.message
      });
      // Не прерываем процесс из-за ошибки уведомлений
    }
    
    res.status(200).json({
      message: assignedToId ? 'Ticket assigned successfully' : 'Ticket unassigned successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    logger.error('❌ НАЗНАЧЕНИЕ ТИКЕТА - Критическая ошибка:', {
      ticketId: req.params.id,
      assignedToId: req.body.assignedToId,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Error assigning ticket',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Get available assignees (admins and agents)
 * Admin and agent only
 */
exports.getAvailableAssignees = async (req, res) => {
  try {
    logger.info('👥 ПОЛУЧЕНИЕ ИСПОЛНИТЕЛЕЙ - Запрос списка доступных исполнителей', {
      userId: req.user?.id,
      userRole: req.user?.role
    });
    
    // Role-based access control
    if (req.user.role === 'client') {
      logger.warn('❌ ПОЛУЧЕНИЕ ИСПОЛНИТЕЛЕЙ - Доступ запрещен для клиента', {
        userId: req.user?.id,
        userRole: req.user?.role
      });
      return res.status(403).json({ message: 'Access denied. Only admins and agents can view assignees.' });
    }
    
    // Get all active admins and agents
    const assignees = await User.findAll({
      where: {
        role: {
          [Op.in]: ['admin', 'agent']
        },
        isActive: true
      },
      attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'role'],
      order: [['firstName', 'ASC'], ['lastName', 'ASC']]
    });
    
    logger.info('✅ ПОЛУЧЕНИЕ ИСПОЛНИТЕЛЕЙ - Список получен', {
      assigneesCount: assignees.length,
      userId: req.user?.id
    });
    
    res.status(200).json({
      assignees: assignees.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        username: user.username
      }))
    });
  } catch (error) {
    logger.error('❌ ПОЛУЧЕНИЕ ИСПОЛНИТЕЛЕЙ - Ошибка получения списка:', {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Error getting available assignees',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Add contact person to ticket
 * Admin, agent and ticket creator only
 */
exports.addTicketContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role = 'watcher', notifyOnStatusChange = true, notifyOnComments = true, notifyOnAssignment = true } = req.body;
    
    logger.info('👥 ДОБАВЛЕНИЕ КОНТАКТА - Начало процесса', {
      ticketId: id,
      contactUserId: userId,
      role: role,
      requestUserId: req.user?.id,
      userRole: req.user?.role
    });
    
    // Get ticket
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      logger.error('❌ ДОБАВЛЕНИЕ КОНТАКТА - Тикет не найден', {
        ticketId: id,
        userId: req.user?.id
      });
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'client' && ticket.createdById !== req.user.id) {
      logger.warn('❌ ДОБАВЛЕНИЕ КОНТАКТА - Доступ запрещен для клиента', {
        ticketId: id,
        userId: req.user?.id,
        ticketCreatedById: ticket.createdById
      });
      return res.status(403).json({ message: 'Access denied. Only ticket creator, admins and agents can add contacts.' });
    }
    
    // Validate contact user
    const contactUser = await User.findByPk(userId);
    if (!contactUser) {
      logger.error('❌ ДОБАВЛЕНИЕ КОНТАКТА - Контактный пользователь не найден', {
        ticketId: id,
        contactUserId: userId,
        userId: req.user?.id
      });
      return res.status(404).json({ message: 'Contact user not found' });
    }
    
    // Check if contact already exists
    const existingContact = await TicketContact.findOne({
      where: {
        ticketId: id,
        userId: userId
      }
    });
    
    if (existingContact) {
      logger.warn('❌ ДОБАВЛЕНИЕ КОНТАКТА - Контакт уже существует', {
        ticketId: id,
        contactUserId: userId,
        existingContactId: existingContact.id
      });
      return res.status(400).json({ message: 'Contact already exists for this ticket' });
    }
    
    // Create contact
    const contact = await TicketContact.create({
      ticketId: id,
      userId: userId,
      role: role,
      addedById: req.user.id,
      notifyOnStatusChange,
      notifyOnComments,
      notifyOnAssignment
    });
    
    // Create history entry
    try {
      await TicketHistory.create({
        ticketId: ticket.id,
        userId: req.user.id,
        field: 'contact',
        newValue: `Added ${contactUser.firstName} ${contactUser.lastName} as ${role}`,
        action: 'contact_add'
      });
    } catch (historyError) {
      logger.error('❌ ДОБАВЛЕНИЕ КОНТАКТА - Ошибка создания истории:', {
        ticketId: id,
        error: historyError.message
      });
    }
    
    // Get contact with user data
    const contactWithUser = await TicketContact.findByPk(contact.id, {
      include: [
        {
          model: User,
          as: 'contactUser',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'addedBy',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });
    
    logger.info('✅ ДОБАВЛЕНИЕ КОНТАКТА - Контакт успешно добавлен', {
      ticketId: id,
      contactId: contact.id,
      contactUserId: userId,
      contactName: `${contactUser.firstName} ${contactUser.lastName}`,
      role: role,
      userId: req.user?.id
    });
    
    res.status(201).json({
      message: 'Contact added successfully',
      contact: contactWithUser
    });
  } catch (error) {
    logger.error('❌ ДОБАВЛЕНИЕ КОНТАКТА - Критическая ошибка:', {
      ticketId: req.params.id,
      contactUserId: req.body.userId,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Error adding contact',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Remove contact person from ticket
 * Admin, agent and ticket creator only
 */
exports.removeTicketContact = async (req, res) => {
  try {
    const { id, contactId } = req.params;
    
    logger.info('👥 УДАЛЕНИЕ КОНТАКТА - Начало процесса', {
      ticketId: id,
      contactId: contactId,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    
    // Get ticket
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      logger.error('❌ УДАЛЕНИЕ КОНТАКТА - Тикет не найден', {
        ticketId: id,
        userId: req.user?.id
      });
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'client' && ticket.createdById !== req.user.id) {
      logger.warn('❌ УДАЛЕНИЕ КОНТАКТА - Доступ запрещен для клиента', {
        ticketId: id,
        userId: req.user?.id,
        ticketCreatedById: ticket.createdById
      });
      return res.status(403).json({ message: 'Access denied. Only ticket creator, admins and agents can remove contacts.' });
    }
    
    // Get contact
    const contact = await TicketContact.findOne({
      where: {
        id: contactId,
        ticketId: id
      },
      include: [
        {
          model: User,
          as: 'contactUser',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        }
      ]
    });
    
    if (!contact) {
      logger.error('❌ УДАЛЕНИЕ КОНТАКТА - Контакт не найден', {
        ticketId: id,
        contactId: contactId,
        userId: req.user?.id
      });
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    // Store contact info for history
    const contactUserName = `${contact.contactUser.firstName} ${contact.contactUser.lastName}`;
    const contactRole = contact.role;
    
    // Delete contact
    await contact.destroy();
    
    // Create history entry
    try {
      await TicketHistory.create({
        ticketId: ticket.id,
        userId: req.user.id,
        field: 'contact',
        oldValue: `${contactUserName} as ${contactRole}`,
        action: 'contact_remove'
      });
    } catch (historyError) {
      logger.error('❌ УДАЛЕНИЕ КОНТАКТА - Ошибка создания истории:', {
        ticketId: id,
        error: historyError.message
      });
    }
    
    logger.info('✅ УДАЛЕНИЕ КОНТАКТА - Контакт успешно удален', {
      ticketId: id,
      contactId: contactId,
      contactName: contactUserName,
      userId: req.user?.id
    });
    
    res.status(200).json({
      message: 'Contact removed successfully'
    });
  } catch (error) {
    logger.error('❌ УДАЛЕНИЕ КОНТАКТА - Критическая ошибка:', {
      ticketId: req.params.id,
      contactId: req.params.contactId,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Error removing contact',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Update contact person settings
 * Admin, agent and ticket creator only
 */
exports.updateTicketContact = async (req, res) => {
  try {
    const { id, contactId } = req.params;
    const { role, notifyOnStatusChange, notifyOnComments, notifyOnAssignment } = req.body;
    
    logger.info('👥 ОБНОВЛЕНИЕ КОНТАКТА - Начало процесса', {
      ticketId: id,
      contactId: contactId,
      userId: req.user?.id,
      userRole: req.user?.role,
      requestBody: req.body
    });
    
    // Get ticket
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      logger.error('❌ ОБНОВЛЕНИЕ КОНТАКТА - Тикет не найден', {
        ticketId: id,
        userId: req.user?.id
      });
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'client' && ticket.createdById !== req.user.id) {
      logger.warn('❌ ОБНОВЛЕНИЕ КОНТАКТА - Доступ запрещен для клиента', {
        ticketId: id,
        userId: req.user?.id,
        ticketCreatedById: ticket.createdById
      });
      return res.status(403).json({ message: 'Access denied. Only ticket creator, admins and agents can update contacts.' });
    }
    
    // Get contact
    const contact = await TicketContact.findOne({
      where: {
        id: contactId,
        ticketId: id
      }
    });
    
    if (!contact) {
      logger.error('❌ ОБНОВЛЕНИЕ КОНТАКТА - Контакт не найден', {
        ticketId: id,
        contactId: contactId,
        userId: req.user?.id
      });
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    // Store old values for history
    const oldValues = {
      role: contact.role,
      notifyOnStatusChange: contact.notifyOnStatusChange,
      notifyOnComments: contact.notifyOnComments,
      notifyOnAssignment: contact.notifyOnAssignment
    };
    
    // Update contact
    if (role !== undefined) contact.role = role;
    if (notifyOnStatusChange !== undefined) contact.notifyOnStatusChange = notifyOnStatusChange;
    if (notifyOnComments !== undefined) contact.notifyOnComments = notifyOnComments;
    if (notifyOnAssignment !== undefined) contact.notifyOnAssignment = notifyOnAssignment;
    
    await contact.save();
    
    // Create history entry if role changed
    if (role !== undefined && role !== oldValues.role) {
      try {
        await TicketHistory.create({
          ticketId: ticket.id,
          userId: req.user.id,
          field: 'contact_role',
          oldValue: oldValues.role,
          newValue: role,
          action: 'contact_update'
        });
      } catch (historyError) {
        logger.error('❌ ОБНОВЛЕНИЕ КОНТАКТА - Ошибка создания истории:', {
          ticketId: id,
          error: historyError.message
        });
      }
    }
    
    // Get updated contact with user data
    const updatedContact = await TicketContact.findByPk(contact.id, {
      include: [
        {
          model: User,
          as: 'contactUser',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'addedBy',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });
    
    logger.info('✅ ОБНОВЛЕНИЕ КОНТАКТА - Контакт успешно обновлен', {
      ticketId: id,
      contactId: contactId,
      changes: contact.changed(),
      userId: req.user?.id
    });
    
    res.status(200).json({
      message: 'Contact updated successfully',
      contact: updatedContact
    });
  } catch (error) {
    logger.error('❌ ОБНОВЛЕНИЕ КОНТАКТА - Критическая ошибка:', {
      ticketId: req.params.id,
      contactId: req.params.contactId,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Error updating contact',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Get ticket contacts
 * All authenticated users can view contacts of tickets they have access to
 */
exports.getTicketContacts = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('👥 ПОЛУЧЕНИЕ КОНТАКТОВ - Запрос списка контактов', {
      ticketId: id,
      userId: req.user?.id,
      userRole: req.user?.role
    });
    
    // Get ticket
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      logger.error('❌ ПОЛУЧЕНИЕ КОНТАКТОВ - Тикет не найден', {
        ticketId: id,
        userId: req.user?.id
      });
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'client' && ticket.createdById !== req.user.id) {
      logger.warn('❌ ПОЛУЧЕНИЕ КОНТАКТОВ - Доступ запрещен для клиента', {
        ticketId: id,
        userId: req.user?.id,
        ticketCreatedById: ticket.createdById
      });
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get contacts
    const contacts = await TicketContact.findAll({
      where: {
        ticketId: id
      },
      include: [
        {
          model: User,
          as: 'contactUser',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'role']
        },
        {
          model: User,
          as: 'addedBy',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'ASC']]
    });
    
    logger.info('✅ ПОЛУЧЕНИЕ КОНТАКТОВ - Список получен', {
      ticketId: id,
      contactsCount: contacts.length,
      userId: req.user?.id
    });
    
    res.status(200).json({
      contacts: contacts
    });
  } catch (error) {
    logger.error('❌ ПОЛУЧЕНИЕ КОНТАКТОВ - Критическая ошибка:', {
      ticketId: req.params.id,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Error getting contacts',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};