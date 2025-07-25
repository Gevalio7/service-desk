const { Markup } = require('telegraf');
const moment = require('moment');

/**
 * Handle /new command - start new ticket creation
 */
exports.handleNewTicket = async (ctx) => {
  try {
    const { id } = ctx.from;
    
    // Set user state to creating ticket
    ctx.session = ctx.session || {};
    ctx.session.state = 'creating_ticket';
    ctx.session.ticketData = {
      telegramId: id,
      source: 'telegram'
    };
    
    // Ask for ticket category
    await ctx.reply(
      'Выберите категорию заявки:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('🔥 Инцидент', 'category:incident'),
          Markup.button.callback('📝 Запрос', 'category:request')
        ],
        [
          Markup.button.callback('❓ Проблема', 'category:problem'),
          Markup.button.callback('🔄 Изменение', 'category:change')
        ]
      ])
    );
  } catch (error) {
    ctx.logger.error('Error in handleNewTicket:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

/**
 * Handle /tickets command - list user tickets
 */
exports.handleListTickets = async (ctx) => {
  try {
    const { apiClient, logger } = ctx;
    const { id } = ctx.from;
    
    // Get user by Telegram ID
    try {
      const userResponse = await apiClient.get(`/users/telegram/${id}`);
      
      if (userResponse.data && userResponse.data.user) {
        const user = userResponse.data.user;
        
        // Get user's tickets
        const ticketsResponse = await apiClient.get('/tickets', {
          params: {
            createdById: user.id,
            limit: 10,
            sortBy: 'createdAt',
            sortOrder: 'DESC'
          }
        });
        
        if (ticketsResponse.data && ticketsResponse.data.tickets) {
          const tickets = ticketsResponse.data.tickets;
          
          if (tickets.length === 0) {
            await ctx.reply('У вас пока нет заявок. Используйте команду /new, чтобы создать новую заявку.');
            return;
          }
          
          let message = 'Ваши последние заявки:\n\n';
          
          for (const ticket of tickets) {
            const createdAt = moment(ticket.createdAt).format('DD.MM.YYYY HH:mm');
            const statusEmoji = getStatusEmoji(ticket.status);
            const priorityEmoji = getPriorityEmoji(ticket.priority);
            
            message += `${statusEmoji} ${priorityEmoji} <b>#${ticket.id.substring(0, 8)}</b>: ${ticket.title}\n`;
            message += `Статус: ${translateStatus(ticket.status)} | Создана: ${createdAt}\n\n`;
          }
          
          message += 'Для просмотра деталей заявки используйте команду /status <ID>';
          
          await ctx.reply(message, { parse_mode: 'HTML' });
        } else {
          await ctx.reply('Не удалось получить список заявок. Пожалуйста, попробуйте позже.');
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
        logger.error('Error getting user tickets:', error);
        await ctx.reply('Произошла ошибка при получении списка заявок. Пожалуйста, попробуйте позже.');
      }
    }
  } catch (error) {
    ctx.logger.error('Error in handleListTickets:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

/**
 * Handle /status command - check ticket status
 */
exports.handleCheckStatus = async (ctx) => {
  try {
    const { apiClient, logger } = ctx;
    const { id } = ctx.from;
    
    // Get ticket ID from command arguments
    const args = ctx.message.text.split(' ');
    
    if (args.length < 2) {
      await ctx.reply('Пожалуйста, укажите ID заявки. Например: /status 12345');
      return;
    }
    
    const ticketId = args[1];
    
    // Get user by Telegram ID
    try {
      const userResponse = await apiClient.get(`/users/telegram/${id}`);
      
      if (userResponse.data && userResponse.data.user) {
        const user = userResponse.data.user;
        
        // Get ticket details
        try {
          const ticketResponse = await apiClient.get(`/tickets/${ticketId}`);
          
          if (ticketResponse.data && ticketResponse.data.ticket) {
            const ticket = ticketResponse.data.ticket;
            
            // Check if user has access to this ticket
            if (ticket.createdById !== user.id && user.role === 'client') {
              await ctx.reply('У вас нет доступа к этой заявке.');
              return;
            }
            
            // Format ticket details
            const createdAt = moment(ticket.createdAt).format('DD.MM.YYYY HH:mm');
            const updatedAt = moment(ticket.updatedAt).format('DD.MM.YYYY HH:mm');
            const statusEmoji = getStatusEmoji(ticket.status);
            const priorityEmoji = getPriorityEmoji(ticket.priority);
            
            let message = `${statusEmoji} ${priorityEmoji} <b>Заявка #${ticket.id.substring(0, 8)}</b>\n\n`;
            message += `<b>Тема:</b> ${ticket.title}\n`;
            message += `<b>Описание:</b> ${ticket.description}\n\n`;
            message += `<b>Статус:</b> ${translateStatus(ticket.status)}\n`;
            message += `<b>Приоритет:</b> ${translatePriority(ticket.priority)}\n`;
            message += `<b>Категория:</b> ${translateCategory(ticket.category)}\n\n`;
            message += `<b>Создана:</b> ${createdAt}\n`;
            message += `<b>Обновлена:</b> ${updatedAt}\n`;
            
            // Add SLA information if available
            if (ticket.slaDeadline) {
              const slaDeadline = moment(ticket.slaDeadline);
              const now = moment();
              const isBreached = now.isAfter(slaDeadline);
              
              message += `\n<b>SLA дедлайн:</b> ${slaDeadline.format('DD.MM.YYYY HH:mm')}`;
              
              if (isBreached) {
                message += ' ⚠️ <b>Просрочен!</b>';
              } else {
                const timeLeft = slaDeadline.diff(now, 'hours');
                message += ` (осталось ${timeLeft} ч.)`;
              }
            }
            
            // Add assigned agent if available
            if (ticket.assignedTo) {
              message += `\n\n<b>Назначена:</b> ${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`;
            }
            
            // Add comments count
            if (ticket.Comments && ticket.Comments.length > 0) {
              message += `\n\n<b>Комментарии:</b> ${ticket.Comments.length}`;
            }
            
            // Add action buttons
            const buttons = [
              [Markup.button.callback('💬 Добавить комментарий', `comment:${ticket.id}`)],
              [Markup.button.callback('📋 Все заявки', 'list_tickets')]
            ];
            
            await ctx.reply(message, {
              parse_mode: 'HTML',
              ...Markup.inlineKeyboard(buttons)
            });
          } else {
            await ctx.reply('Заявка не найдена. Пожалуйста, проверьте ID заявки.');
          }
        } catch (error) {
          if (error.response && error.response.status === 404) {
            await ctx.reply('Заявка не найдена. Пожалуйста, проверьте ID заявки.');
          } else {
            logger.error('Error getting ticket details:', error);
            await ctx.reply('Произошла ошибка при получении информации о заявке. Пожалуйста, попробуйте позже.');
          }
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
        logger.error('Error checking user:', error);
        await ctx.reply('Произошла ошибка при проверке вашей учетной записи. Пожалуйста, попробуйте позже.');
      }
    }
  } catch (error) {
    ctx.logger.error('Error in handleCheckStatus:', error);
    await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
  }
};

// Helper functions

/**
 * Get emoji for ticket status
 */
function getStatusEmoji(status) {
  switch (status) {
    case 'new':
      return '🆕';
    case 'assigned':
      return '👤';
    case 'in_progress':
      return '🔧';
    case 'on_hold':
      return '⏸️';
    case 'resolved':
      return '✅';
    case 'closed':
      return '🔒';
    default:
      return '📋';
  }
}

/**
 * Get emoji for ticket priority
 */
function getPriorityEmoji(priority) {
  switch (priority) {
    case 'P1':
      return '🔴';
    case 'P2':
      return '🟠';
    case 'P3':
      return '🟡';
    case 'P4':
      return '🟢';
    default:
      return '⚪';
  }
}

/**
 * Translate ticket status to Russian
 */
function translateStatus(status) {
  switch (status) {
    case 'new':
      return 'Новая';
    case 'assigned':
      return 'Назначена';
    case 'in_progress':
      return 'В работе';
    case 'on_hold':
      return 'Приостановлена';
    case 'resolved':
      return 'Решена';
    case 'closed':
      return 'Закрыта';
    default:
      return status;
  }
}

/**
 * Translate ticket priority to Russian
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

/**
 * Translate ticket category to Russian
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