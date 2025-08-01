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
    // Update ticket data with correct category
    ctx.session = ctx.session || {};
    ctx.session.ticketData = ctx.session.ticketData || {};
    
    // Set category (now matches database enum)
    ctx.session.ticketData.category = category;
    // Set default type based on category
    ctx.session.ticketData.type = getDefaultTypeForCategory(category);
    
    // Answer callback query
    await ctx.answerCbQuery(`Выбрана категория: ${translateCategory(category)}`);
    
    // Ask for priority
    await ctx.editMessageText(
      `Выбрана категория: ${translateCategory(category)}\n\nВыберите приоритет заявки:`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('🔴 Критический', 'priority:urgent'),
          Markup.button.callback('🟠 Высокий', 'priority:high')
        ],
        [
          Markup.button.callback('🟡 Средний', 'priority:medium'),
          Markup.button.callback('🟢 Низкий', 'priority:low')
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
    
    // Ask for ticket title or description based on current data
    if (ctx.session.ticketData.title) {
      // Title already exists, ask for description
      await ctx.editMessageText(
        `Выбрана категория: ${translateCategory(ctx.session.ticketData.category)}\n` +
        `Выбран приоритет: ${translatePriority(priority)}\n\n` +
        `Тема: ${ctx.session.ticketData.title}\n\n` +
        'Пожалуйста, введите описание заявки:'
      );
      ctx.session.state = 'awaiting_description';
    } else {
      // No title yet, ask for title
      await ctx.editMessageText(
        `Выбрана категория: ${translateCategory(ctx.session.ticketData.category)}\n` +
        `Выбран приоритет: ${translatePriority(priority)}\n\n` +
        'Пожалуйста, введите тему заявки:'
      );
      ctx.session.state = 'awaiting_title';
    }
    
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
        
        // Create ticket (without attachments first)
        const ticketData = {
          title: ctx.session.ticketData.title,
          description: ctx.session.ticketData.description,
          category: ctx.session.ticketData.category,
          priority: ctx.session.ticketData.priority,
          type: ctx.session.ticketData.type,
          source: ctx.session.ticketData.source,
          createdById: user.id,
          telegramMessageId: ctx.callbackQuery.message.message_id.toString()
        };
        
        const ticketResponse = await apiClient.post('/tickets', ticketData);
        
        if (ticketResponse.data && ticketResponse.data.ticket) {
          const ticket = ticketResponse.data.ticket;
          
          // Upload attachments if any exist
          if (ctx.session.ticketData.attachments && ctx.session.ticketData.attachments.length > 0) {
            try {
              await uploadAttachmentsToTicket(ctx, ticket.id, ctx.session.ticketData.attachments);
              logger.info('✅ СОЗДАНИЕ ЗАЯВКИ - Вложения успешно загружены', {
                ticketId: ticket.id,
                attachmentsCount: ctx.session.ticketData.attachments.length
              });
            } catch (attachmentError) {
              logger.error('❌ СОЗДАНИЕ ЗАЯВКИ - Ошибка загрузки вложений:', {
                ticketId: ticket.id,
                error: attachmentError.message,
                attachmentsCount: ctx.session.ticketData.attachments.length
              });
              // Продолжаем выполнение, даже если вложения не загрузились
            }
          }
          
          // Success message
          const attachmentInfo = ctx.session.ticketData.attachments && ctx.session.ticketData.attachments.length > 0
            ? `\n<b>Вложения:</b> ${ctx.session.ticketData.attachments.length} файл(ов)\n`
            : '\n';
          
          await ctx.editMessageText(
            `✅ Заявка успешно создана!\n\n` +
            `<b>ID:</b> ${ticket.id.substring(0, 8)}\n` +
            `<b>Тема:</b> ${ticket.title}\n` +
            `<b>Категория:</b> ${translateCategory(ticket.category)}\n` +
            `<b>Приоритет:</b> ${translatePriority(ticket.priority)}${attachmentInfo}\n` +
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
    case 'technical':
      return 'Техническая';
    case 'billing':
      return 'Биллинг';
    case 'general':
      return 'Общая';
    case 'feature_request':
      return 'Новая функция';
    default:
      return category;
  }
}

/**
 * Get default type for category
 */
function getDefaultTypeForCategory(category) {
  switch (category) {
    case 'technical':
      return 'incident'; // Технические проблемы обычно инциденты
    case 'billing':
      return 'service_request'; // Вопросы по биллингу - запросы на обслуживание
    case 'general':
      return 'service_request'; // Общие вопросы - запросы на обслуживание
    case 'feature_request':
      return 'change_request'; // Новые функции - запросы на изменения
    default:
      return 'incident';
  }
}

/**
 * Upload attachments to ticket
 */
async function uploadAttachmentsToTicket(ctx, ticketId, attachments) {
  const { apiClient, logger } = ctx;
  const axios = require('axios');
  const FormData = require('form-data');
  
  logger.info('📎 ЗАГРУЗКА ВЛОЖЕНИЙ - Начало загрузки', {
    ticketId: ticketId,
    attachmentsCount: attachments.length
  });
  
  for (const attachment of attachments) {
    try {
      // Download file from Telegram
      logger.info('⬇️ ЗАГРУЗКА ВЛОЖЕНИЙ - Скачивание файла из Telegram', {
        ticketId: ticketId,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl
      });
      
      const fileResponse = await axios.get(attachment.fileUrl, {
        responseType: 'arraybuffer',
        timeout: 30000 // 30 seconds timeout
      });
      
      // Create form data
      const formData = new FormData();
      formData.append('files', fileResponse.data, {
        filename: attachment.fileName,
        contentType: attachment.mimeType
      });
      
      // Upload to backend
      logger.info('⬆️ ЗАГРУЗКА ВЛОЖЕНИЙ - Отправка файла на сервер', {
        ticketId: ticketId,
        fileName: attachment.fileName,
        fileSize: fileResponse.data.length
      });
      
      const uploadResponse = await apiClient.post(
        `/tickets/${ticketId}/attachments`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000, // 60 seconds timeout for upload
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );
      
      if (uploadResponse.data && uploadResponse.data.attachments) {
        logger.info('✅ ЗАГРУЗКА ВЛОЖЕНИЙ - Файл успешно загружен', {
          ticketId: ticketId,
          fileName: attachment.fileName,
          attachmentId: uploadResponse.data.attachments[0]?.id
        });
      } else {
        logger.error('❌ ЗАГРУЗКА ВЛОЖЕНИЙ - Неожиданный ответ сервера', {
          ticketId: ticketId,
          fileName: attachment.fileName,
          response: uploadResponse.data
        });
      }
      
    } catch (error) {
      logger.error('❌ ЗАГРУЗКА ВЛОЖЕНИЙ - Ошибка загрузки файла:', {
        ticketId: ticketId,
        fileName: attachment.fileName,
        error: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      // Продолжаем загрузку других файлов, даже если один не загрузился
      continue;
    }
  }
  
  logger.info('🎉 ЗАГРУЗКА ВЛОЖЕНИЙ - Процесс завершен', {
    ticketId: ticketId,
    totalAttachments: attachments.length
  });
}

/**
 * Translate type to Russian
 */
function translateType(type) {
  switch (type) {
    case 'incident':
      return 'Инцидент';
    case 'service_request':
      return 'Запрос на обслуживание';
    case 'change_request':
      return 'Запрос на изменение';
    default:
      return type;
  }
}

/**
 * Translate priority to Russian
 */
function translatePriority(priority) {
  switch (priority) {
    case 'urgent':
      return 'Критический';
    case 'high':
      return 'Высокий';
    case 'medium':
      return 'Средний';
    case 'low':
      return 'Низкий';
    default:
      return priority;
  }
}