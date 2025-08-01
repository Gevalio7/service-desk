const axios = require('axios');

// Конфигурация
const API_BASE_URL = 'http://localhost:3007/api';
const SERVICE_API_TOKEN = 'service-desk-api-token';

// Создаем клиент API
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${SERVICE_API_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Симуляция обработчика команды /tickets
async function simulateTicketsCommand() {
  console.log('🤖 Симуляция команды /tickets в Telegram боте...\n');

  try {
    const telegramId = '5864094586'; // ID реального пользователя
    
    console.log('1️⃣ Получение пользователя по Telegram ID...');
    
    // Получаем пользователя по Telegram ID (как в handleListTickets)
    const userResponse = await apiClient.get(`/users/telegram/${telegramId}`);
    
    if (userResponse.data && userResponse.data.user) {
      const user = userResponse.data.user;
      console.log('✅ Пользователь найден:', `${user.firstName} ${user.lastName} (${user.email})`);
      
      console.log('\n2️⃣ Получение заявок пользователя...');
      
      // Получаем заявки пользователя (как в handleListTickets)
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
          console.log('📭 У пользователя нет заявок');
          console.log('Ответ бота: "У вас пока нет заявок. Используйте команду /new, чтобы создать новую заявку."');
        } else {
          console.log(`✅ Найдено заявок: ${tickets.length}`);
          
          // Формируем сообщение как в handleListTickets
          let message = 'Ваши последние заявки:\n\n';
          
          for (const ticket of tickets) {
            const createdAt = new Date(ticket.createdAt).toLocaleString('ru-RU');
            const statusEmoji = getStatusEmoji(ticket.status);
            const priorityEmoji = getPriorityEmoji(ticket.priority);
            
            message += `${statusEmoji} ${priorityEmoji} **№${ticket.id.substring(0, 8)}**: ${ticket.title}\n`;
            message += `Статус: ${translateStatus(ticket.status)} | Создана: ${createdAt}\n\n`;
          }
          
          message += 'Для просмотра деталей заявки используйте команду /status [ID]';
          
          console.log('\n📋 Ответ бота:');
          console.log('─'.repeat(50));
          console.log(message);
          console.log('─'.repeat(50));
        }
      } else {
        console.log('❌ Не удалось получить список заявок');
        console.log('Ответ бота: "Не удалось получить список заявок. Пожалуйста, попробуйте позже."');
      }
    } else {
      console.log('❌ Пользователь не найден');
      console.log('Ответ бота: "Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи."');
    }
    
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('❌ Пользователь не найден (404)');
      console.log('Ответ бота: "Вы не зарегистрированы в системе. Пожалуйста, обратитесь к администратору для создания учетной записи."');
    } else {
      console.error('❌ Ошибка при выполнении команды:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      console.log('Ответ бота: "Произошла ошибка при получении списка заявок. Пожалуйста, попробуйте позже."');
    }
  }
}

// Вспомогательные функции (копии из ticketHandler.js)
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

function getPriorityEmoji(priority) {
  switch (priority) {
    case 'urgent':
      return '🔴';
    case 'high':
      return '🟠';
    case 'medium':
      return '🟡';
    case 'low':
      return '🟢';
    default:
      return '⚪';
  }
}

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

// Запускаем симуляцию
simulateTicketsCommand();