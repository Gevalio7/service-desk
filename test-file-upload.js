const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Конфигурация для тестирования
const BASE_URL = 'http://localhost:3001'; // Порт бэкенда
const TEST_TICKET_ID = 'test-ticket-id'; // Замените на реальный ID тикета
const TEST_TOKEN = 'your-auth-token'; // Замените на реальный токен

async function testFileUpload() {
  try {
    console.log('🧪 ТЕСТ ЗАГРУЗКИ ФАЙЛОВ - Начало тестирования');
    
    // Создаем тестовый файл
    const testFileName = 'test-file.txt';
    const testFileContent = 'Это тестовый файл для проверки загрузки';
    fs.writeFileSync(testFileName, testFileContent);
    
    console.log('📄 Создан тестовый файл:', testFileName);
    
    // Создаем FormData
    const formData = new FormData();
    formData.append('files', fs.createReadStream(testFileName));
    
    // Отправляем запрос
    console.log('📤 Отправка запроса на загрузку файла...');
    console.log('URL:', `${BASE_URL}/api/tickets/${TEST_TICKET_ID}/attachments`);
    
    const response = await axios.post(
      `${BASE_URL}/api/tickets/${TEST_TICKET_ID}/attachments`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      }
    );
    
    console.log('✅ УСПЕХ! Файл загружен:', response.data);
    
    // Удаляем тестовый файл
    fs.unlinkSync(testFileName);
    console.log('🗑️ Тестовый файл удален');
    
  } catch (error) {
    console.error('❌ ОШИБКА при загрузке файла:');
    
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
      console.error('Заголовки:', error.response.headers);
    } else if (error.request) {
      console.error('Ошибка запроса:', error.request);
    } else {
      console.error('Ошибка:', error.message);
    }
    
    // Удаляем тестовый файл в случае ошибки
    try {
      fs.unlinkSync('test-file.txt');
    } catch (e) {
      // Игнорируем ошибку удаления
    }
  }
}

async function testTicketExists() {
  try {
    console.log('🔍 ТЕСТ СУЩЕСТВОВАНИЯ ТИКЕТА - Проверка тикета');
    
    const response = await axios.get(
      `${BASE_URL}/api/tickets/${TEST_TICKET_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`
        }
      }
    );
    
    console.log('✅ Тикет найден:', {
      id: response.data.ticket.id,
      title: response.data.ticket.title,
      status: response.data.ticket.status
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ ОШИБКА при поиске тикета:');
    
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Сообщение:', error.response.data.message);
      
      if (error.response.status === 404) {
        console.error('🚨 ТИКЕТ НЕ НАЙДЕН! Проверьте TEST_TICKET_ID');
      }
    }
    
    return false;
  }
}

// Основная функция тестирования
async function runTests() {
  console.log('🚀 ЗАПУСК ТЕСТОВ ЗАГРУЗКИ ФАЙЛОВ');
  console.log('================================');
  
  // Проверяем конфигурацию
  if (TEST_TICKET_ID === 'test-ticket-id') {
    console.error('❌ ОШИБКА: Необходимо указать реальный TEST_TICKET_ID');
    return;
  }
  
  if (TEST_TOKEN === 'your-auth-token') {
    console.error('❌ ОШИБКА: Необходимо указать реальный TEST_TOKEN');
    return;
  }
  
  // Тест 1: Проверка существования тикета
  const ticketExists = await testTicketExists();
  
  if (!ticketExists) {
    console.error('❌ Тест прерван: тикет не найден');
    return;
  }
  
  // Тест 2: Загрузка файла
  await testFileUpload();
  
  console.log('================================');
  console.log('🏁 ТЕСТЫ ЗАВЕРШЕНЫ');
}

// Запуск тестов
if (require.main === module) {
  runTests();
}

module.exports = { testFileUpload, testTicketExists };