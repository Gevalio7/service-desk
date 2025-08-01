require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const axios = require('axios');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/telegram-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/telegram.log' })
  ]
});

// Check if bot token is provided and valid
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN || BOT_TOKEN === 'your-telegram-bot-token-here') {
  logger.warn('Telegram bot token not provided or using placeholder. Bot will not start.');
  logger.info('To enable Telegram bot:');
  logger.info('1. Create a bot via @BotFather on Telegram');
  logger.info('2. Get the bot token');
  logger.info('3. Update TELEGRAM_BOT_TOKEN in .env file');
  logger.info('4. Restart the application');
  
  // Export empty functions to prevent crashes
  module.exports = {
    bot: null,
    startBot: async () => {
      logger.info('Telegram bot is disabled - no valid token provided');
      return Promise.resolve();
    }
  };
  return;
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Import handlers
const startHandler = require('./handlers/startHandler');
const ticketHandler = require('./handlers/ticketHandler');
const callbackHandler = require('./handlers/callbackHandler');
const messageHandler = require('./handlers/messageHandler');

// API configuration
const API_URL = process.env.API_BASE_URL || 'http://localhost:3007/api';
const API_TOKEN = process.env.API_TOKEN; // Service account token for API access

// Configure axios for API requests
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Add session middleware
bot.use(session());

// Make API client available to handlers
bot.context.apiClient = apiClient;
bot.context.logger = logger;

// Set bot commands
bot.telegram.setMyCommands([
  { command: 'start', description: 'Начать работу с ботом' },
  { command: 'help', description: 'Показать справку' },
  { command: 'new', description: 'Создать новую заявку' },
  { command: 'tickets', description: 'Показать мои заявки' },
  { command: 'status', description: 'Проверить статус заявки' }
]);

// Command handlers
bot.start(startHandler.handleStart);
bot.help(startHandler.handleHelp);
bot.command('new', ticketHandler.handleNewTicket);
bot.command('tickets', ticketHandler.handleListTickets);
bot.command('status', ticketHandler.handleCheckStatus);

// Handle callback queries (button clicks)
bot.on('callback_query', callbackHandler.handleCallbackQuery);

// Handle messages with media
bot.on('photo', messageHandler.handlePhoto);
bot.on('document', messageHandler.handleDocument);

// Handle text messages (for ticket creation and replies)
bot.on('text', messageHandler.handleText);

// Error handling
bot.catch((err, ctx) => {
  logger.error(`Error for ${ctx.updateType}`, err);
  ctx.reply('Произошла ошибка при обработке запроса. Пожалуйста, попробуйте позже.');
});

// Start bot
const startBot = async () => {
  try {
    logger.info('Starting Telegram bot...');
    await bot.launch();
    logger.info('Telegram bot started successfully');
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    logger.error('Error starting Telegram bot:', error);
    process.exit(1);
  }
};

// Start the bot if this file is run directly
if (require.main === module) {
  startBot();
}

module.exports = {
  bot,
  startBot
};