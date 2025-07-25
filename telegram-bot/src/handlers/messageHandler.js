const { Markup } = require('telegraf');
const axios = require('axios');
const FormData = require('form-data');

/**
 * Handle text messages
 */
exports.handleText = async (ctx) => {
  try {
    const { apiClient, logger } = ctx;
    const { id } = ctx.from;
    const text = ctx.message.text;
    
    // Check if user is in a specific state
    if (ctx.session && ctx.session.state) {
      switch (ctx.session.state) {
        case 'awaiting_title':
          return await handleTicketTitle(ctx, text);
        
        case 'awaiting_description':
          return await handleTicketDescription(ctx, text);
        
        case 'awaiting_comment':
          return await handleTicketComment(ctx, text);
      }
    }
    
    // Handle text as new ticket if not a command
    if (!text.startsWith('/')) {
      // Get user by Telegram ID
      try {
        const userResponse = await apiClient.get(`/users/telegram/${id}`);
        
        if (userResponse.data && userResponse.data.user) {
          // Start new ticket creation
          ctx.session = ctx.session || {};
          ctx.session.state = 'creating_ticket';
          ctx.session.ticketData = {
            title: text.length > 100 ? text.substring(0, 97) + '...' : text,
            telegramId: id,
            source: 'telegram'
          };
          
          // Ask for ticket category
          await ctx.reply(
            'Создание новой заявки\n\n' +
            `<b>Тема:</b> ${ctx.session.ticketData.title}\n\n` +
            'Выберите категорию заявки:',
            {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('🔥 Инцидент', 'category:incident'),
                  Markup.button.callback('📝 Запрос', 'category:request')
                ],
                [
                  Markup.button.callback('❓ Проблема', 'category:problem'),
                  Markup.button.callback('🔄 Изменение', 'category:change')
                ]
              ])
            }
          );
        } else {
          await ctx.reply(
            'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.\n\n' +
            `Ваш Telegram ID: ${id}`
          );
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          await ctx.reply(
            'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.\n\n' +
            `Ваш Telegram ID: ${id}`
          );
        } else {
          logger.error('Error checking user:', error);
          await ctx.reply('Произошла ошибка при проверке вашей учетной записи. Пожалуйста, попробуйте позже.');
        }
      }
    }
  } catch (error) {
    ctx.logger.error('Error in handleText:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

/**
 * Handle photo messages
 */
exports.handlePhoto = async (ctx) => {
  try {
    const { apiClient, logger } = ctx;
    const { id } = ctx.from;
    const photos = ctx.message.photo;
    const caption = ctx.message.caption || '';
    
    // Get the largest photo
    const photo = photos[photos.length - 1];
    const fileId = photo.file_id;
    
    // Get file info
    const fileInfo = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Check if user is in a specific state
    if (ctx.session && ctx.session.state) {
      switch (ctx.session.state) {
        case 'awaiting_description':
          // Add photo to ticket
          ctx.session.ticketData.attachments = ctx.session.ticketData.attachments || [];
          ctx.session.ticketData.attachments.push({
            fileId,
            fileUrl,
            fileName: `photo_${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            size: photo.file_size
          });
          
          // Use caption as description if provided
          if (caption) {
            return await handleTicketDescription(ctx, caption);
          }
          
          await ctx.reply('Фото добавлено к заявке. Пожалуйста, введите описание заявки:');
          return;
        
        case 'awaiting_comment':
          // Add photo to comment
          return await handleTicketCommentWithMedia(ctx, caption, {
            fileId,
            fileUrl,
            fileName: `photo_${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            size: photo.file_size
          });
      }
    }
    
    // Handle photo as new ticket
    // Get user by Telegram ID
    try {
      const userResponse = await apiClient.get(`/users/telegram/${id}`);
      
      if (userResponse.data && userResponse.data.user) {
        // Start new ticket creation
        ctx.session = ctx.session || {};
        ctx.session.state = 'creating_ticket';
        ctx.session.ticketData = {
          title: caption.length > 0 ? 
            (caption.length > 100 ? caption.substring(0, 97) + '...' : caption) : 
            'Фото от пользователя',
          telegramId: id,
          source: 'telegram',
          attachments: [{
            fileId,
            fileUrl,
            fileName: `photo_${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            size: photo.file_size
          }]
        };
        
        // Ask for ticket category
        await ctx.reply(
          'Создание новой заявки\n\n' +
          `<b>Тема:</b> ${ctx.session.ticketData.title}\n\n` +
          'Выберите категорию заявки:',
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback('🔥 Инцидент', 'category:incident'),
                Markup.button.callback('📝 Запрос', 'category:request')
              ],
              [
                Markup.button.callback('❓ Проблема', 'category:problem'),
                Markup.button.callback('🔄 Изменение', 'category:change')
              ]
            ])
          }
        );
      } else {
        await ctx.reply(
          'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.\n\n' +
          `Ваш Telegram ID: ${id}`
        );
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        await ctx.reply(
          'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.\n\n' +
          `Ваш Telegram ID: ${id}`
        );
      } else {
        logger.error('Error checking user:', error);
        await ctx.reply('Произошла ошибка при проверке вашей учетной записи. Пожалуйста, попробуйте позже.');
      }
    }
  } catch (error) {
    ctx.logger.error('Error in handlePhoto:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

/**
 * Handle document messages
 */
exports.handleDocument = async (ctx) => {
  try {
    const { apiClient, logger } = ctx;
    const { id } = ctx.from;
    const document = ctx.message.document;
    const caption = ctx.message.caption || '';
    
    // Get file info
    const fileId = document.file_id;
    const fileInfo = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfo.file_path}`;
    
    // Check if user is in a specific state
    if (ctx.session && ctx.session.state) {
      switch (ctx.session.state) {
        case 'awaiting_description':
          // Add document to ticket
          ctx.session.ticketData.attachments = ctx.session.ticketData.attachments || [];
          ctx.session.ticketData.attachments.push({
            fileId,
            fileUrl,
            fileName: document.file_name || `document_${Date.now()}`,
            mimeType: document.mime_type || 'application/octet-stream',
            size: document.file_size
          });
          
          // Use caption as description if provided
          if (caption) {
            return await handleTicketDescription(ctx, caption);
          }
          
          await ctx.reply('Документ добавлен к заявке. Пожалуйста, введите описание заявки:');
          return;
        
        case 'awaiting_comment':
          // Add document to comment
          return await handleTicketCommentWithMedia(ctx, caption, {
            fileId,
            fileUrl,
            fileName: document.file_name || `document_${Date.now()}`,
            mimeType: document.mime_type || 'application/octet-stream',
            size: document.file_size
          });
      }
    }
    
    // Handle document as new ticket
    // Get user by Telegram ID
    try {
      const userResponse = await apiClient.get(`/users/telegram/${id}`);
      
      if (userResponse.data && userResponse.data.user) {
        // Start new ticket creation
        ctx.session = ctx.session || {};
        ctx.session.state = 'creating_ticket';
        ctx.session.ticketData = {
          title: caption.length > 0 ? 
            (caption.length > 100 ? caption.substring(0, 97) + '...' : caption) : 
            `Документ: ${document.file_name || 'Без имени'}`,
          telegramId: id,
          source: 'telegram',
          attachments: [{
            fileId,
            fileUrl,
            fileName: document.file_name || `document_${Date.now()}`,
            mimeType: document.mime_type || 'application/octet-stream',
            size: document.file_size
          }]
        };
        
        // Ask for ticket category
        await ctx.reply(
          'Создание новой заявки\n\n' +
          `<b>Тема:</b> ${ctx.session.ticketData.title}\n\n` +
          'Выберите категорию заявки:',
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [
                Markup.button.callback('🔥 Инцидент', 'category:incident'),
                Markup.button.callback('📝 Запрос', 'category:request')
              ],
              [
                Markup.button.callback('❓ Проблема', 'category:problem'),
                Markup.button.callback('🔄 Изменение', 'category:change')
              ]
            ])
          }
        );
      } else {
        await ctx.reply(
          'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.\n\n' +
          `Ваш Telegram ID: ${id}`
        );
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        await ctx.reply(
          'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.\n\n' +
          `Ваш Telegram ID: ${id}`
        );
      } else {
        logger.error('Error checking user:', error);
        await ctx.reply('Произошла ошибка при проверке вашей учетной записи. Пожалуйста, попробуйте позже.');
      }
    }
  } catch (error) {
    ctx.logger.error('Error in handleDocument:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

/**
 * Handle ticket title input
 */
async function handleTicketTitle(ctx, title) {
  try {
    // Update ticket data
    ctx.session.ticketData.title = title.length > 100 ? title.substring(0, 97) + '...' : title;
    
    // Ask for description
    await ctx.reply(
      'Пожалуйста, введите описание заявки. Вы также можете прикрепить фото или документ:'
    );
    
    // Update state
    ctx.session.state = 'awaiting_description';
  } catch (error) {
    ctx.logger.error('Error in handleTicketTitle:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Handle ticket description input
 */
async function handleTicketDescription(ctx, description) {
  try {
    // Update ticket data
    ctx.session.ticketData.description = description;
    
    // Show ticket summary and ask for confirmation
    const ticketData = ctx.session.ticketData;
    
    let message = 'Подтвердите создание заявки:\n\n';
    message += `<b>Тема:</b> ${ticketData.title}\n`;
    message += `<b>Описание:</b> ${ticketData.description}\n`;
    message += `<b>Категория:</b> ${translateCategory(ticketData.category)}\n`;
    message += `<b>Приоритет:</b> ${translatePriority(ticketData.priority)}\n`;
    
    if (ticketData.attachments && ticketData.attachments.length > 0) {
      message += `<b>Вложения:</b> ${ticketData.attachments.length}\n`;
    }
    
    await ctx.reply(
      message,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ Подтвердить', 'confirm:yes'),
            Markup.button.callback('❌ Отменить', 'confirm:no')
          ]
        ])
      }
    );
  } catch (error) {
    ctx.logger.error('Error in handleTicketDescription:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Handle ticket comment input
 */
async function handleTicketComment(ctx, content) {
  try {
    const { apiClient, logger } = ctx;
    const { id } = ctx.from;
    
    // Get user by Telegram ID
    try {
      const userResponse = await apiClient.get(`/users/telegram/${id}`);
      
      if (userResponse.data && userResponse.data.user) {
        const user = userResponse.data.user;
        
        // Add comment to ticket
        const commentData = {
          content,
          ticketId: ctx.session.commentData.ticketId,
          telegramMessageId: ctx.message.message_id.toString()
        };
        
        const commentResponse = await apiClient.post(`/tickets/${ctx.session.commentData.ticketId}/comments`, commentData);
        
        if (commentResponse.data && commentResponse.data.comment) {
          await ctx.reply('✅ Комментарий успешно добавлен к заявке.');
        } else {
          await ctx.reply('Не удалось добавить комментарий. Пожалуйста, попробуйте позже.');
        }
      } else {
        await ctx.reply(
          'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.'
        );
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        await ctx.reply(
          'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.'
        );
      } else {
        logger.error('Error adding comment:', error);
        await ctx.reply('Произошла ошибка при добавлении комментария. Пожалуйста, попробуйте позже.');
      }
    }
    
    // Reset session
    delete ctx.session.state;
    delete ctx.session.commentData;
  } catch (error) {
    ctx.logger.error('Error in handleTicketComment:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
}

/**
 * Handle ticket comment with media
 */
async function handleTicketCommentWithMedia(ctx, content, attachment) {
  try {
    const { apiClient, logger } = ctx;
    const { id } = ctx.from;
    
    // Get user by Telegram ID
    try {
      const userResponse = await apiClient.get(`/users/telegram/${id}`);
      
      if (userResponse.data && userResponse.data.user) {
        const user = userResponse.data.user;
        
        // Download file
        const fileResponse = await axios.get(attachment.fileUrl, { responseType: 'arraybuffer' });
        
        // Create form data
        const formData = new FormData();
        formData.append('content', content || 'Вложение');
        formData.append('telegramMessageId', ctx.message.message_id.toString());
        formData.append('file', fileResponse.data, {
          filename: attachment.fileName,
          contentType: attachment.mimeType
        });
        
        // Add comment with attachment to ticket
        const commentResponse = await apiClient.post(
          `/tickets/${ctx.session.commentData.ticketId}/comments/attachment`,
          formData,
          {
            headers: {
              ...formData.getHeaders()
            }
          }
        );
        
        if (commentResponse.data && commentResponse.data.comment) {
          await ctx.reply('✅ Комментарий с вложением успешно добавлен к заявке.');
        } else {
          await ctx.reply('Не удалось добавить комментарий. Пожалуйста, попробуйте позже.');
        }
      } else {
        await ctx.reply(
          'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.'
        );
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        await ctx.reply(
          'Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи.'
        );
      } else {
        logger.error('Error adding comment with attachment:', error);
        await ctx.reply('Произошла ошибка при добавлении комментария. Пожалуйста, попробуйте позже.');
      }
    }
    
    // Reset session
    delete ctx.session.state;
    delete ctx.session.commentData;
  } catch (error) {
    ctx.logger.error('Error in handleTicketCommentWithMedia:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
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