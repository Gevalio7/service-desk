const { Markup } = require('telegraf');

/**
 * Handle callback queries from inline buttons
 */
exports.handleCallbackQuery = async (ctx) => {
  try {
    const { apiClient, logger } = ctx;
    const { id } = ctx.from;
    const callbackData = ctx.callbackQuery.data;
    
    logger.info(`Callback query from user ${id}: ${callbackData}`);
    
    // Parse callback data
    const [action, value] = callbackData.split(':');
    
    // Handle different callback actions
    switch (action) {
      case 'category':
        await handleCategorySelection(ctx, value);
        break;
      
      case 'priority':
        await handlePrioritySelection(ctx, value);
        break;
      
      case 'confirm':
        await handleTicketConfirmation(ctx, value === 'yes');
        break;
      
      case 'comment':
        await handleCommentStart(ctx, value);
        break;
      
      case 'list_tickets':
        await ctx.answerCbQuery('Загрузка списка заявок...');
        await ctx.deleteMessage();
        await ctx.telegram.sendMessage(id, 'Загрузка списка заявок...');
        await require('./ticketHandler').handleListTickets(ctx);
        break;
      
      default:
        await ctx.answerCbQuery('Неизвестное действие');
        break;
    }
  } catch (error) {
    ctx.logger.error('Error in handleCallbackQuery:', error);
    await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

/**
 * Handle category selection
 */
async function handleCategorySelection(ctx, category) {
  try {
    // Update ticket data
    ctx.session = ctx.session || {};
    ctx.session.ticketData = ctx.session.ticketData || {};
    ctx.session.ticketData.category = category;
    
    // Answer callback query
    await ctx.answerCbQuery(`Выбрана категория: ${translateCategory(category)}`);
    
    // Ask for priority
    await ctx.editMessageText(
      `Выбрана категория: ${translateCategory(category)}\n\nВыберите приоритет заявки:`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('🔴 Критический (P1)', 'priority:P1'),
          Markup.button.callback('🟠 Высокий (P2)', 'priority:P2')
        ],
        [
          Markup.button.callback('🟡 Средний (P3)', 'priority:P3'),
          Markup.button.callback('🟢 Низкий (P4)', 'priority:P4')
        ]
      ])
    );
  } catch (error) {
    ctx.logger.error('Error in handleCategorySelection:', error);
    await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Handle priority selection
 */
async function handlePrioritySelection(ctx, priority) {
  try {
    // Update ticket data
    ctx.session = ctx.session || {};
    ctx.session.ticketData = ctx.session.ticketData || {};
    ctx.session.ticketData.priority = priority;
    
    // Answer callback query
    await ctx.answerCbQuery(`Выбран приоритет: ${translatePriority(priority)}`);
    
    // Ask for ticket title
    await ctx.editMessageText(
      `Выбрана категория: ${translateCategory(ctx.session.ticketData.category)}\n` +
      `Выбран приоритет: ${translatePriority(priority)}\n\n` +
      'Пожалуйста, введите тему заявки:',
      Markup.removeKeyboard()
    );
    
    // Update state
    ctx.session.state = 'awaiting_title';
  } catch (error) {
    ctx.logger.error('Error in handlePrioritySelection:', error);
    await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Handle ticket confirmation
 */
async function handleTicketConfirmation(ctx, confirmed) {
  try {
    const { apiClient, logger } = ctx;
    const { id } = ctx.from;
    
    if (!confirmed) {
      // Cancel ticket creation
      await ctx.answerCbQuery('Создание заявки отменено');
      await ctx.editMessageText('Создание заявки отменено.');
      
      // Reset session
      delete ctx.session.state;
      delete ctx.session.ticketData;
      
      return;
    }
    
    // Confirm ticket creation
    await ctx.answerCbQuery('Создание заявки...');
    
    // Get user by Telegram ID
    try {
      const userResponse = await apiClient.get(`/users/telegram/${id}`);
      
      if (userResponse.data && userResponse.data.user) {
        const user = userResponse.data.user;
        
        // Create ticket
        const ticketData = {
          ...ctx.session.ticketData,
          createdById: user.id,
          telegramMessageId: ctx.callbackQuery.message.message_id.toString()
        };
        
        const ticketResponse = await apiClient.post('/tickets', ticketData);
        
        if (ticketResponse.data && ticketResponse.data.ticket) {
          const ticket = ticketResponse.data.ticket;
          
          // Success message
          await ctx.editMessageText(
            `✅ Заявка успешно создана!\n\n` +
            `<b>ID:</b> ${ticket.id.substring(0, 8)}\n` +
            `<b>Тема:</b> ${ticket.title}\n` +
            `<b>Категория:</b> ${translateCategory(ticket.category)}\n` +
            `<b>Приоритет:</b> ${translatePriority(ticket.priority)}\n\n` +
            `Вы можете проверить статус заявки с помощью команды:\n` +
            `/status ${ticket.id.substring(0, 8)}`,
            {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 Мои заявки', 'list_tickets')]
              ])
            }
          );
          
          // Reset session
          delete ctx.session.state;
          delete ctx.session.ticketData;
        } else {
          await ctx.editMessageText('Не удалось создать заявку. Пожалуйста, попробуйте позже.');
        }
      } else {
        await ctx.editMessageText(
          'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.'
        );
      }
    } catch (error) {
      logger.error('Error creating ticket:', error);
      await ctx.editMessageText('Произошла ошибка при создании заявки. Пожалуйста, попробуйте позже.');
    }
  } catch (error) {
    ctx.logger.error('Error in handleTicketConfirmation:', error);
    await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Handle comment start
 */
async function handleCommentStart(ctx, ticketId) {
  try {
    // Answer callback query
    await ctx.answerCbQuery('Добавление комментария...');
    
    // Update session
    ctx.session = ctx.session || {};
    ctx.session.state = 'awaiting_comment';
    ctx.session.commentData = {
      ticketId
    };
    
    // Ask for comment text
    await ctx.reply(
      `Пожалуйста, введите текст комментария для заявки #${ticketId.substring(0, 8)}:`
    );
  } catch (error) {
    ctx.logger.error('Error in handleCommentStart:', error);
    await ctx.answerCbQuery('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Translate category to Russian
 */
function translateCategory(category) {
  switch (category) {
    case 'incident':
      return 'Инцидент';
    case 'request':
      return 'Запрос';
    case 'problem':
      return 'Проблема';
    case 'change':
      return 'Изменение';
    default:
      return category;
  }
}

/**
 * Translate priority to Russian
 */
function translatePriority(priority) {
  switch (priority) {
    case 'P1':
      return 'Критический';
    case 'P2':
      return 'Высокий';
    case 'P3':
      return 'Средний';
    case 'P4':
      return 'Низкий';
    default:
      return priority;
  }
}