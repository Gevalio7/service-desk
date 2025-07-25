const { Op } = require('sequelize');
const moment = require('moment');
const { 
  Ticket, 
  User, 
  Comment, 
  Attachment, 
  TicketHistory 
} = require('../models');
const { logger } = require('../../config/database');

/**
 * Create a new ticket
 */
exports.createTicket = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      category, 
      priority, 
      tags,
      source,
      telegramMessageId
    } = req.body;
    
    // Create ticket
    const ticket = await Ticket.create({
      title,
      description,
      category: category || 'request',
      priority: priority || 'P3',
      status: 'new',
      tags: tags || [],
      source: source || 'web',
      telegramMessageId,
      createdById: req.user.id
    });
    
    // Create ticket history entry
    await TicketHistory.create({
      ticketId: ticket.id,
      userId: req.user.id,
      field: 'status',
      newValue: 'new',
      action: 'create',
      description: 'Ticket created'
    });
    
    res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    logger.error('Error in createTicket controller:', error);
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
          ]
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
          ]
        }
      ]
    });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'client' && ticket.createdById !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.status(200).json({ ticket });
  } catch (error) {
    logger.error('Error in getTicketById controller:', error);
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
      assignedToId,
      tags
    } = req.body;
    
    // Get ticket
    const ticket = await Ticket.findByPk(id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Role-based access control
    if (req.user.role === 'client') {
      // Clients can only update their own tickets and only certain fields
      if (ticket.createdById !== req.user.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Clients can only update title and description
      if (title) ticket.title = title;
      if (description) ticket.description = description;
    } else {
      // Agents and admins can update all fields
      if (title) ticket.title = title;
      if (description) ticket.description = description;
      if (status) ticket.status = status;
      if (priority) ticket.priority = priority;
      if (category) ticket.category = category;
      if (assignedToId) ticket.assignedToId = assignedToId;
      if (tags) ticket.tags = tags;
    }
    
    // Create history entries for each changed field
    const changes = ticket.changed();
    if (changes) {
      for (const field of changes) {
        await TicketHistory.create({
          ticketId: ticket.id,
          userId: req.user.id,
          field,
          oldValue: ticket.previous(field),
          newValue: ticket[field],
          action: 'update',
          description: `Updated ${field}`
        });
      }
    }
    
    // Save ticket
    await ticket.save();
    
    res.status(200).json({
      message: 'Ticket updated successfully',
      ticket
    });
  } catch (error) {
    logger.error('Error in updateTicket controller:', error);
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
      action: 'comment',
      description: `Added ${isInternal ? 'internal ' : ''}comment`
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
      P1: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
      P2: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
      P3: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 },
      P4: { total: 0, resolved: 0, slaBreaches: 0, responseBreaches: 0 }
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