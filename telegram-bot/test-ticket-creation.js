const axios = require('axios');

// Тестируем создание заявки через API с правильными значениями
async function testTicketCreation() {
  try {
    console.log('🧪 Тестирование создания заявки с исправленными категориями...');
    
    // Получаем токен администратора
    const loginResponse = await axios.post('http://localhost:3007/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Токен получен');
    
    // Тестируем каждую категорию
    const categories = [
      { category: 'technical', type: 'incident', description: 'Техническая проблема' },
      { category: 'billing', type: 'service_request', description: 'Вопрос по биллингу' },
      { category: 'general', type: 'service_request', description: 'Общий вопрос' },
      { category: 'feature_request', type: 'change_request', description: 'Запрос новой функции' }
    ];
    
    for (const testCase of categories) {
      try {
        const ticketData = {
          title: `Тест категории ${testCase.category}`,
          description: testCase.description,
          category: testCase.category,
          priority: 'medium',
          type: testCase.type,
          source: 'telegram',
          createdById: '12345678-1234-1234-1234-123456789012' // ID администратора
        };
        
        console.log(`\n📝 Создание заявки для категории: ${testCase.category}`);
        console.log('Данные:', JSON.stringify(ticketData, null, 2));
        
        const response = await axios.post('http://localhost:3007/api/tickets', ticketData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && response.data.ticket) {
          console.log(`✅ Заявка создана успешно! ID: ${response.data.ticket.id.substring(0, 8)}`);
        } else {
          console.log('❌ Неожиданный ответ:', response.data);
        }
        
      } catch (error) {
        console.log(`❌ Ошибка для категории ${testCase.category}:`, error.response?.data || error.message);
      }
    }
    
    console.log('\n🎉 Тестирование завершено!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.response?.data || error.message);
  }
}

testTicketCreation();