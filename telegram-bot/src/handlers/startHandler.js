const { Markup } = require('telegraf');

/**
 * Handle /start command
 */
exports.handleStart = async (ctx) => {
  try {
    const { apiClient, logger } = ctx;
    const { id, username, first_name, last_name } = ctx.from;
    
    logger.info(`Start command from user ${id} (${username || 'no username'})`);
    
    // Check if user exists in the system
    try {
      // Try to find user by Telegram ID
      const response = await apiClient.get(`/users/telegram/${id}`);
      
      if (response.data && response.data.user) {
        // User exists
        const user = response.data.user;
        
        await ctx.reply(
          `Добро пожаловать, ${user.firstName} ${user.lastName}!\n\n` +
          'Вы уже зарегистрированы в системе Service Desk. ' +
          'Используйте команды ниже для работы с заявками:',
          Markup.keyboard([
            ['📝 Новая заявка', '📋 Мои заявки'],
            ['❓ Помощь']
          ]).resize()
        );
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // User not found, show registration instructions
        await ctx.reply(
          `Здравствуйте, ${first_name || ''} ${last_name || ''}!\n\n` +
          'Для использования бота Service Desk вам необходимо зарегистрироваться в системе. ' +
          'Пожалуйста, обратитесь к администратору для создания учетной записи и привязки вашего Telegram ID.\n\n' +
          `Ваш Telegram ID: ${id}`
        );
      } else {
        // Other error
        logger.error('Error checking user:', error);
        await ctx.reply(
          'Произошла ошибка при проверке вашей учетной записи. ' +
          'Пожалуйста, попробуйте позже или обратитесь к администратору.'
        );
      }
    }
  } catch (error) {
    ctx.logger.error('Error in handleStart:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

/**
 * Handle /help command
 */
exports.handleHelp = async (ctx) => {
  try {
    await ctx.reply(
      'Справка по использованию бота Service Desk:\n\n' +
      '/start - Начать работу с ботом\n' +
      '/help - Показать эту справку\n' +
      '/new - Создать новую заявку\n' +
      '/tickets - Показать список ваших заявок\n' +
      '/status <ID> - Проверить статус заявки по ID\n\n' +
      'Вы также можете просто отправить сообщение, чтобы создать новую заявку, ' +
      'или ответить на сообщение с заявкой, чтобы добавить комментарий.'
    );
  } catch (error) {
    ctx.logger.error('Error in handleHelp:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};