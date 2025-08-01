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

async function testRealUser() {
  console.log('🔍 Проверка реального пользователя...\n');

  try {
    const realTelegramId = '5864094586'; // Реальный ID пользователя
    
    console.log(`1️⃣ Поиск пользователя с Telegram ID: ${realTelegramId}`);
    
    try {
      const userResponse = await apiClient.get(`/users/telegram/${realTelegramId}`);
      
      if (userResponse.data && userResponse.data.user) {
        const user = userResponse.data.user;
        console.log('✅ Пользователь найден:', {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role,
          telegramId: user.telegramId,
          isActive: user.isActive
        });
        
        // Проверяем заявки пользователя
        console.log('\n2️⃣ Проверка заявок пользователя...');
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
          console.log(`✅ Найдено заявок: ${tickets.length}`);
          
          if (tickets.length > 0) {
            console.log('\n📋 Заявки пользователя:');
            tickets.forEach((ticket, index) => {
              console.log(`${index + 1}. ID: ${ticket.id.substring(0, 8)} | ${ticket.title} | ${ticket.status}`);
            });
          } else {
            console.log('📭 У пользователя нет заявок');
          }
        }
        
      } else {
        console.log('❌ Пользователь не найден в ответе API');
      }
      
    } catch (userError) {
      if (userError.response && userError.response.status === 404) {
        console.log('❌ Пользователь не найден (404)');
        console.log('\n💡 Возможные решения:');
        console.log('1. Создать пользователя через веб-интерфейс');
        console.log('2. Убедиться, что Telegram ID указан правильно');
        console.log('3. Проверить, что пользователь активен (isActive: true)');
        
        // Попробуем найти всех пользователей с Telegram ID
        console.log('\n🔍 Поиск всех пользователей с Telegram ID...');
        try {
          const allUsersResponse = await apiClient.get('/users', {
            params: {
              limit: 100
            }
          });
          
          if (allUsersResponse.data && allUsersResponse.data.users) {
            const usersWithTelegram = allUsersResponse.data.users.filter(u => u.telegramId);
            console.log(`Найдено пользователей с Telegram ID: ${usersWithTelegram.length}`);
            
            usersWithTelegram.forEach(user => {
              console.log(`- ${user.firstName} ${user.lastName}: ${user.telegramId} (${user.isActive ? 'активен' : 'неактивен'})`);
            });
          }
        } catch (listError) {
          console.log('❌ Не удалось получить список пользователей:', listError.response?.status);
        }
        
      } else {
        console.error('❌ Ошибка API:', {
          status: userError.response?.status,
          message: userError.message,
          data: userError.response?.data
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
  }
}

// Запускаем проверку
testRealUser();