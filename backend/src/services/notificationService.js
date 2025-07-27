const { Notification, User, TicketContact } = require('../models');
const logger = require('../utils/logger');
const telegramService = require('./telegramService');

/**
 * Send in-app notification
 */
exports.sendNotification = async (notificationData) => {
  try {
    const { userId, title, message, type, data } = notificationData;
    
    // Create notification in database
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      data,
      isRead: false
    });
    
    logger.info(`Notification sent to user ${userId}: ${title}`);
    
    return notification;
  } catch (error) {
    logger.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Get ticket contacts for notifications
 */
const getTicketContacts = async (ticketId, notificationType) => {
  try {
    const contacts = await TicketContact.findAll({
      where: {
        ticketId,
        // Фильтруем по типу уведомления
        ...(notificationType === 'status' && { notifyOnStatusChange: true }),
        ...(notificationType === 'comment' && { notifyOnComments: true }),
        ...(notificationType === 'assignment' && { notifyOnAssignment: true })
      },
      include: [
        {
          model: User,
          as: 'contactUser',
          attributes: ['id', 'username', 'firstName', 'lastName', 'email', 'telegramId', 'isActive'],
          where: {
            isActive: true
          }
        }
      ]
    });
    
    return contacts.map(contact => contact.contactUser);
  } catch (error) {
    logger.error('Error getting ticket contacts:', error);
    return [];
  }
};

/**
 * Send Telegram notification
 */
exports.sendTelegramNotification = async (telegramId, message) => {
  try {
    // Send message via Telegram bot
    await telegramService.sendMessage(telegramId, message);
    
    logger.info(`Telegram notification sent to ${telegramId}`);
    
    return true;
  } catch (error) {
    logger.error('Error sending Telegram notification:', error);
    throw error;
  }
};

/**
 * Send new ticket notification
 */
exports.sendNewTicketNotification = async (ticket) => {
  try {
    // Get all staff users (admins and agents)
    const staffUsers = await User.findAll({
      where: {
        role: ['admin', 'agent'],
        isActive: true
      }
    });
    
    // Get ticket creator
    const creator = await User.findByPk(ticket.createdById);
    
    if (!creator) {
      logger.warn(`Creator not found for ticket ${ticket.id}`);
      return;
    }
    
    // Create notification message
    const message = `New ticket #${ticket.id} "${ticket.title}" created by ${creator.firstName} ${creator.lastName}`;
    
    // Send notifications to all staff members
    for (const user of staffUsers) {
      // Send in-app notification
      await exports.sendNotification({
        userId: user.id,
        title: 'New Ticket Created',
        message,
        type: 'new_ticket',
        data: {
          ticketId: ticket.id,
          priority: ticket.priority,
          category: ticket.category,
          createdBy: creator.email
        }
      });
      
      // Send Telegram notification if user has Telegram ID
      if (user.telegramId) {
        let emoji = '🎫';
        
        // Add appropriate emoji based on priority
        switch (ticket.priority) {
          case 'urgent':
            emoji = '🚨';
            break;
          case 'high':
            emoji = '🔴';
            break;
          case 'medium':
            emoji = '🟡';
            break;
          case 'low':
            emoji = '🟢';
            break;
        }
        
        await exports.sendTelegramNotification(
          user.telegramId,
          `${emoji} ${message}\nPriority: ${ticket.priority}\nCategory: ${ticket.category}`
        );
      }
    }
    
    logger.info(`New ticket notifications sent for ticket ${ticket.id}`);
    return true;
  } catch (error) {
    logger.error('Error sending new ticket notification:', error);
    throw error;
  }
};

/**
 * Send ticket status update notification
 */
exports.sendTicketStatusNotification = async (ticket, previousStatus) => {
  try {
    // Get ticket creator
    const creator = await User.findByPk(ticket.createdById);
    
    if (!creator) {
      logger.warn(`Creator not found for ticket ${ticket.id}`);
      return;
    }
    
    // Get ticket contacts who want status notifications
    const contacts = await getTicketContacts(ticket.id, 'status');
    
    // Create notification message
    const message = `Ticket #${ticket.id} "${ticket.title}" status changed from ${previousStatus} to ${ticket.status}`;
    
    // Collect all users to notify (creator + contacts)
    const usersToNotify = [creator, ...contacts];
    
    // Remove duplicates based on user ID
    const uniqueUsers = usersToNotify.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );
    
    // Send notifications to all users
    for (const user of uniqueUsers) {
      // Send in-app notification
      await exports.sendNotification({
        userId: user.id,
        title: 'Ticket Status Updated',
        message,
        type: 'ticket_update',
        data: {
          ticketId: ticket.id,
          status: ticket.status
        }
      });
      
      // Send Telegram notification if user has Telegram ID
      if (user.telegramId) {
        let emoji = '📋';
        
        // Add appropriate emoji based on status
        switch (ticket.status) {
          case 'assigned':
            emoji = '👤';
            break;
          case 'in_progress':
            emoji = '🔧';
            break;
          case 'on_hold':
            emoji = '⏸️';
            break;
          case 'resolved':
            emoji = '✅';
            break;
          case 'closed':
            emoji = '🔒';
            break;
        }
        
        await exports.sendTelegramNotification(
          user.telegramId,
          `${emoji} ${message}`
        );
      }
    }
    
    // If ticket is assigned, also notify the assigned agent
    if (ticket.status === 'assigned' && ticket.assignedToId) {
      const assignedTo = await User.findByPk(ticket.assignedToId);
      
      if (assignedTo && !uniqueUsers.find(u => u.id === assignedTo.id)) {
        // Send in-app notification
        await exports.sendNotification({
          userId: assignedTo.id,
          title: 'Ticket Assigned',
          message: `Ticket #${ticket.id} "${ticket.title}" has been assigned to you`,
          type: 'ticket_assigned',
          data: {
            ticketId: ticket.id
          }
        });
        
        // Send Telegram notification if agent has Telegram ID
        if (assignedTo.telegramId) {
          await exports.sendTelegramNotification(
            assignedTo.telegramId,
            `👤 Ticket #${ticket.id} "${ticket.title}" has been assigned to you`
          );
        }
      }
    }
    
    logger.info(`Status change notifications sent for ticket ${ticket.id} to ${uniqueUsers.length} users`);
    return true;
  } catch (error) {
    logger.error('Error sending ticket status notification:', error);
    throw error;
  }
};

/**
 * Send comment notification
 */
exports.sendCommentNotification = async (comment, ticket) => {
  try {
    // Get comment author
    const author = await User.findByPk(comment.userId);
    
    // Don't notify for internal comments to clients
    if (comment.isInternal) {
      // Only notify staff
      const staffUsers = await User.findAll({
        where: {
          role: ['admin', 'agent'],
          isActive: true
        }
      });
      
      for (const user of staffUsers) {
        // Skip the comment author
        if (user.id === comment.userId) continue;
        
        // Send in-app notification
        await exports.sendNotification({
          userId: user.id,
          title: 'New Internal Comment',
          message: `New internal comment on ticket #${ticket.id}: "${ticket.title}"`,
          type: 'new_comment',
          data: {
            ticketId: ticket.id,
            commentId: comment.id,
            isInternal: true
          }
        });
        
        // Send Telegram notification if user has Telegram ID
        if (user.telegramId) {
          await exports.sendTelegramNotification(
            user.telegramId,
            `🔒 New internal comment on ticket #${ticket.id}: "${ticket.title}"`
          );
        }
      }
    } else {
      // For regular comments, notify ticket creator, assigned agent, and contacts
      
      // Get ticket contacts who want comment notifications
      const contacts = await getTicketContacts(ticket.id, 'comment');
      
      // Collect all users to notify
      const usersToNotify = [];
      
      // Add ticket creator if they're not the comment author
      if (ticket.createdById !== comment.userId) {
        const creator = await User.findByPk(ticket.createdById);
        if (creator) {
          usersToNotify.push(creator);
        }
      }
      
      // Add assigned agent if they're not the comment author
      if (ticket.assignedToId && ticket.assignedToId !== comment.userId) {
        const assignedTo = await User.findByPk(ticket.assignedToId);
        if (assignedTo) {
          usersToNotify.push(assignedTo);
        }
      }
      
      // Add contacts (excluding comment author)
      const contactsToNotify = contacts.filter(contact => contact.id !== comment.userId);
      usersToNotify.push(...contactsToNotify);
      
      // Remove duplicates based on user ID
      const uniqueUsers = usersToNotify.filter((user, index, self) =>
        index === self.findIndex(u => u.id === user.id)
      );
      
      // Send notifications to all users
      for (const user of uniqueUsers) {
        // Send in-app notification
        await exports.sendNotification({
          userId: user.id,
          title: 'New Comment',
          message: `New comment on ticket #${ticket.id} from ${author ? `${author.firstName} ${author.lastName}` : 'a user'}`,
          type: 'new_comment',
          data: {
            ticketId: ticket.id,
            commentId: comment.id
          }
        });
        
        // Send Telegram notification if user has Telegram ID
        if (user.telegramId) {
          await exports.sendTelegramNotification(
            user.telegramId,
            `💬 New comment on ticket #${ticket.id}: "${ticket.title}"`
          );
        }
      }
      
      logger.info(`Comment notifications sent for ticket ${ticket.id} to ${uniqueUsers.length} users`);
    }
    
    return true;
  } catch (error) {
    logger.error('Error sending comment notification:', error);
    throw error;
  }
};

/**
 * Get user notifications
 */
exports.getUserNotifications = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 10, unreadOnly = false } = options;
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Build query
    const query = {
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    // Filter by read status if requested
    if (unreadOnly) {
      query.where.isRead = false;
    }
    
    // Get notifications with pagination
    const { count, rows: notifications } = await Notification.findAndCountAll(query);
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    return {
      notifications,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    };
  } catch (error) {
    logger.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
exports.markNotificationAsRead = async (notificationId, userId) => {
  try {
    // Find notification
    const notification = await Notification.findOne({
      where: {
        id: notificationId,
        userId
      }
    });
    
    if (!notification) {
      throw new Error('Notification not found');
    }
    
    // Update notification
    notification.isRead = true;
    await notification.save();
    
    return notification;
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllNotificationsAsRead = async (userId) => {
  try {
    // Update all unread notifications for user
    await Notification.update(
      { isRead: true },
      {
        where: {
          userId,
          isRead: false
        }
      }
    );
    
    return true;
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Send ticket assignment notification
 */
exports.sendTicketAssignmentNotification = async (ticket, assignedBy) => {
  try {
    // Get ticket contacts who want assignment notifications
    const contacts = await getTicketContacts(ticket.id, 'assignment');
    
    // Get ticket creator
    const creator = await User.findByPk(ticket.createdById);
    
    // Get assigned user
    const assignedTo = ticket.assignedTo || await User.findByPk(ticket.assignedToId);
    
    if (!assignedTo) {
      logger.warn(`Assigned user not found for ticket ${ticket.id}`);
      return;
    }
    
    // Create notification message
    const assignedByName = assignedBy ? `${assignedBy.firstName} ${assignedBy.lastName}` : 'System';
    const message = `Ticket #${ticket.id} "${ticket.title}" has been assigned to ${assignedTo.firstName} ${assignedTo.lastName} by ${assignedByName}`;
    
    // Collect all users to notify (creator + contacts, excluding the assigned user)
    const usersToNotify = [];
    
    // Add creator if they're not the assigned user
    if (creator && creator.id !== assignedTo.id) {
      usersToNotify.push(creator);
    }
    
    // Add contacts (excluding assigned user)
    const contactsToNotify = contacts.filter(contact => contact.id !== assignedTo.id);
    usersToNotify.push(...contactsToNotify);
    
    // Remove duplicates based on user ID
    const uniqueUsers = usersToNotify.filter((user, index, self) =>
      index === self.findIndex(u => u.id === user.id)
    );
    
    // Send notifications to all users
    for (const user of uniqueUsers) {
      // Send in-app notification
      await exports.sendNotification({
        userId: user.id,
        title: 'Ticket Assignment Updated',
        message,
        type: 'ticket_assignment',
        data: {
          ticketId: ticket.id,
          assignedToId: assignedTo.id,
          assignedToName: `${assignedTo.firstName} ${assignedTo.lastName}`
        }
      });
      
      // Send Telegram notification if user has Telegram ID
      if (user.telegramId) {
        await exports.sendTelegramNotification(
          user.telegramId,
          `👤 ${message}`
        );
      }
    }
    
    // Also notify the assigned user
    await exports.sendNotification({
      userId: assignedTo.id,
      title: 'Ticket Assigned',
      message: `Ticket #${ticket.id} "${ticket.title}" has been assigned to you by ${assignedByName}`,
      type: 'ticket_assigned',
      data: {
        ticketId: ticket.id
      }
    });
    
    // Send Telegram notification to assigned user
    if (assignedTo.telegramId) {
      await exports.sendTelegramNotification(
        assignedTo.telegramId,
        `👤 Ticket #${ticket.id} "${ticket.title}" has been assigned to you by ${assignedByName}`
      );
    }
    
    logger.info(`Assignment notifications sent for ticket ${ticket.id} to ${uniqueUsers.length + 1} users`);
    return true;
  } catch (error) {
    logger.error('Error sending ticket assignment notification:', error);
    throw error;
  }
};