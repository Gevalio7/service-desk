const { Notification, User } = require('../models');
const { logger } = require('../../config/database');
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
    
    // Create notification message
    const message = `Ticket #${ticket.id} "${ticket.title}" status changed from ${previousStatus} to ${ticket.status}`;
    
    // Send in-app notification
    await exports.sendNotification({
      userId: creator.id,
      title: 'Ticket Status Updated',
      message,
      type: 'ticket_update',
      data: {
        ticketId: ticket.id,
        status: ticket.status
      }
    });
    
    // Send Telegram notification if user has Telegram ID
    if (creator.telegramId) {
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
        creator.telegramId,
        `${emoji} ${message}`
      );
    }
    
    // If ticket is assigned, also notify the assigned agent
    if (ticket.status === 'assigned' && ticket.assignedToId) {
      const assignedTo = await User.findByPk(ticket.assignedToId);
      
      if (assignedTo) {
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
      // For regular comments, notify ticket creator and assigned agent
      
      // Get comment author
      const author = await User.findByPk(comment.userId);
      
      // Notify ticket creator if they're not the comment author
      if (ticket.createdById !== comment.userId) {
        const creator = await User.findByPk(ticket.createdById);
        
        if (creator) {
          // Send in-app notification
          await exports.sendNotification({
            userId: creator.id,
            title: 'New Comment',
            message: `New comment on your ticket #${ticket.id} from ${author ? `${author.firstName} ${author.lastName}` : 'a user'}`,
            type: 'new_comment',
            data: {
              ticketId: ticket.id,
              commentId: comment.id
            }
          });
          
          // Send Telegram notification if user has Telegram ID
          if (creator.telegramId) {
            await exports.sendTelegramNotification(
              creator.telegramId,
              `💬 New comment on your ticket #${ticket.id}: "${ticket.title}"`
            );
          }
        }
      }
      
      // Notify assigned agent if they're not the comment author
      if (ticket.assignedToId && ticket.assignedToId !== comment.userId) {
        const assignedTo = await User.findByPk(ticket.assignedToId);
        
        if (assignedTo) {
          // Send in-app notification
          await exports.sendNotification({
            userId: assignedTo.id,
            title: 'New Comment',
            message: `New comment on ticket #${ticket.id} from ${author ? `${author.firstName} ${author.lastName}` : 'a user'}`,
            type: 'new_comment',
            data: {
              ticketId: ticket.id,
              commentId: comment.id
            }
          });
          
          // Send Telegram notification if agent has Telegram ID
          if (assignedTo.telegramId) {
            await exports.sendTelegramNotification(
              assignedTo.telegramId,
              `💬 New comment on ticket #${ticket.id}: "${ticket.title}"`
            );
          }
        }
      }
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