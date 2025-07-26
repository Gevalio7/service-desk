const axios = require('axios');
const logger = require('../utils/logger');

// Telegram Bot API token - should be in environment variables in production
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'your-telegram-bot-token';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Send message to Telegram user
 */
exports.sendMessage = async (chatId, text, options = {}) => {
  try {
    const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: options.parseMode || 'HTML',
      disable_web_page_preview: options.disableWebPagePreview || false,
      disable_notification: options.disableNotification || false,
      reply_to_message_id: options.replyToMessageId,
      reply_markup: options.replyMarkup
    });
    
    if (response.data && response.data.ok) {
      logger.info(`Telegram message sent to ${chatId}`);
      return response.data.result;
    } else {
      throw new Error(`Telegram API error: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logger.error('Error sending Telegram message:', error);
    throw error;
  }
};

/**
 * Send photo to Telegram user
 */
exports.sendPhoto = async (chatId, photo, options = {}) => {
  try {
    const response = await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, {
      chat_id: chatId,
      photo, // URL or file_id
      caption: options.caption,
      parse_mode: options.parseMode || 'HTML',
      disable_notification: options.disableNotification || false,
      reply_to_message_id: options.replyToMessageId,
      reply_markup: options.replyMarkup
    });
    
    if (response.data && response.data.ok) {
      logger.info(`Telegram photo sent to ${chatId}`);
      return response.data.result;
    } else {
      throw new Error(`Telegram API error: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logger.error('Error sending Telegram photo:', error);
    throw error;
  }
};

/**
 * Send document to Telegram user
 */
exports.sendDocument = async (chatId, document, options = {}) => {
  try {
    const response = await axios.post(`${TELEGRAM_API_URL}/sendDocument`, {
      chat_id: chatId,
      document, // URL or file_id
      caption: options.caption,
      parse_mode: options.parseMode || 'HTML',
      disable_notification: options.disableNotification || false,
      reply_to_message_id: options.replyToMessageId,
      reply_markup: options.replyMarkup
    });
    
    if (response.data && response.data.ok) {
      logger.info(`Telegram document sent to ${chatId}`);
      return response.data.result;
    } else {
      throw new Error(`Telegram API error: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logger.error('Error sending Telegram document:', error);
    throw error;
  }
};

/**
 * Create inline keyboard markup
 */
exports.createInlineKeyboard = (buttons) => {
  return {
    inline_keyboard: buttons
  };
};

/**
 * Create reply keyboard markup
 */
exports.createReplyKeyboard = (buttons, options = {}) => {
  return {
    keyboard: buttons,
    resize_keyboard: options.resize || true,
    one_time_keyboard: options.oneTime || false,
    selective: options.selective || false
  };
};

/**
 * Get updates from Telegram
 */
exports.getUpdates = async (offset = 0, limit = 100) => {
  try {
    const response = await axios.get(`${TELEGRAM_API_URL}/getUpdates`, {
      params: {
        offset,
        limit,
        timeout: 30
      }
    });
    
    if (response.data && response.data.ok) {
      return response.data.result;
    } else {
      throw new Error(`Telegram API error: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logger.error('Error getting Telegram updates:', error);
    throw error;
  }
};

/**
 * Get file from Telegram
 */
exports.getFile = async (fileId) => {
  try {
    const response = await axios.get(`${TELEGRAM_API_URL}/getFile`, {
      params: {
        file_id: fileId
      }
    });
    
    if (response.data && response.data.ok) {
      const filePath = response.data.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
      
      return {
        fileId,
        filePath,
        fileUrl,
        fileSize: response.data.result.file_size
      };
    } else {
      throw new Error(`Telegram API error: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logger.error('Error getting Telegram file:', error);
    throw error;
  }
};