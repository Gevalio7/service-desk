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

async function createTestTicket() {
  console.log('🎫 Создание тестовой заявки...\n');

  try {
    // Получаем пользователя
    const testTelegramId = '123456789';
    const userResponse = await apiClient.get(`/users/telegram/${testTelegramId}`);
    const user = userResponse.data.user;
    
    console.log('👤 Пользователь найден:', user.firstName, user.lastName);
    
    // Создаем тестовую заявку
    const ticketData = {
      title: 'Тестовая заявка из Telegram бота',
      description: 'Это тестовая заявка для проверки работы команды /tickets в Telegram боте.',
      category: 'technical',
      priority: 'medium',
      type: 'incident',
      source: 'telegram',
      createdById: user.id
    };
    
    const ticketResponse = await apiClient.post('/tickets', ticketData);
    const ticket = ticketResponse.data.ticket;
    
    console.log('✅ Заявка создана:', {
      id: ticket.id.substring(0, 8),
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category
    });
    
    // Проверяем, что заявка появилась в списке пользователя
    const ticketsResponse = await apiClient.get('/tickets', {
      params: {
        createdById: user.id,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'DESC'
      }
    });
    
    console.log('\n📋 Заявки пользователя:', {
      count: ticketsResponse.data.tickets.length,
      tickets: ticketsResponse.data.tickets.map(t => ({
        id: t.id.substring(0, 8),
        title: t.title,
        status: t.status,
        createdAt: new Date(t.createdAt).toLocaleString('ru-RU')
      }))
    });
    
    console.log('\n🎉 Тест завершен успешно! Теперь можно проверить команду /tickets в Telegram боте.');
    
  } catch (error) {
    console.error('❌ Ошибка:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Запускаем создание тестовой заявки
createTestTicket();