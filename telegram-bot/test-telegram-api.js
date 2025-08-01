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

async function testTelegramBotAPI() {
  console.log('🧪 Тестирование API для Telegram бота...\n');

  try {
    // Тест 1: Получение пользователя по Telegram ID
    console.log('1️⃣ Тестирование получения пользователя по Telegram ID...');
    const testTelegramId = '123456789'; // Замените на реальный ID
    
    try {
      const userResponse = await apiClient.get(`/users/telegram/${testTelegramId}`);
      console.log('✅ Пользователь найден:', userResponse.data.user);
      
      const user = userResponse.data.user;
      
      // Тест 2: Получение заявок пользователя
      console.log('\n2️⃣ Тестирование получения заявок пользователя...');
      const ticketsResponse = await apiClient.get('/tickets', {
        params: {
          createdById: user.id,
          limit: 10,
          sortBy: 'createdAt',
          sortOrder: 'DESC'
        }
      });
      
      console.log('✅ Заявки получены:', {
        count: ticketsResponse.data.tickets.length,
        tickets: ticketsResponse.data.tickets.map(t => ({
          id: t.id.substring(0, 8),
          title: t.title,
          status: t.status,
          createdAt: t.createdAt
        }))
      });
      
    } catch (userError) {
      if (userError.response && userError.response.status === 404) {
        console.log('⚠️ Пользователь не найден. Создаем тестового пользователя...');
        
        // Создаем тестового пользователя (нужны права админа)
        console.log('ℹ️ Для создания пользователя нужны права администратора.');
        console.log('ℹ️ Пожалуйста, создайте пользователя через веб-интерфейс или используйте существующий Telegram ID.');
      } else {
        throw userError;
      }
    }
    
    // Тест 3: Проверка общего доступа к API
    console.log('\n3️⃣ Тестирование общего доступа к заявкам...');
    const allTicketsResponse = await apiClient.get('/tickets', {
      params: {
        limit: 5,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      }
    });
    
    console.log('✅ Общий список заявок получен:', {
      count: allTicketsResponse.data.tickets.length,
      total: allTicketsResponse.data.pagination.total
    });
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании API:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Возможные причины:');
      console.log('   - Бэкенд не запущен (порт 3007)');
      console.log('   - Неправильный URL API');
      console.log('   - Проблемы с сетью');
    }
  }
}

// Запускаем тест
testTelegramBotAPI();