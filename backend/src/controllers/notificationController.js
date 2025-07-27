const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Get user notifications
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, unreadOnly } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    };
    
    const result = await notificationService.getUserNotifications(userId, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error getting user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении уведомлений',
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 */
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const notification = await notificationService.markNotificationAsRead(id, userId);
    
    res.json({
      success: true,
      data: notification,
      message: 'Уведомление отмечено как прочитанное'
    });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при отметке уведомления как прочитанного',
      error: error.message
    });
  }
};

/**
 * Mark all notifications as read
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    await notificationService.markAllNotificationsAsRead(userId);
    
    res.json({
      success: true,
      message: 'Все уведомления отмечены как прочитанные'
    });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при отметке всех уведомлений как прочитанных',
      error: error.message
    });
  }
};

/**
 * Get unread notifications count
 */
exports.getUnreadNotificationsCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await notificationService.getUserNotifications(userId, {
      page: 1,
      limit: 1,
      unreadOnly: true
    });
    
    res.json({
      success: true,
      data: {
        count: result.pagination.total
      }
    });
  } catch (error) {
    logger.error('Error getting unread notifications count:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении количества непрочитанных уведомлений',
      error: error.message
    });
  }
};