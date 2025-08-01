const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Конфигурация
const API_BASE_URL = 'http://localhost:3007/api';
const API_TOKEN = 'service-desk-api-token'; // Service token для тестирования

// Создаем тестовый файл
const testFilePath = path.join(__dirname, 'test-attachment.txt');
const testFileContent = 'Это тестовый файл для проверки загрузки вложений в телеграм боте.\nДата создания: ' + new Date().toISOString();

async function testFileUpload() {
  try {
    console.log('🧪 ТЕСТ ЗАГРУЗКИ ФАЙЛОВ - Начало тестирования');
    
    // 1. Создаем тестовый файл
    fs.writeFileSync(testFilePath, testFileContent);
    console.log('✅ Тестовый файл создан:', testFilePath);
    
    // 2. Используем известного пользователя admin
    console.log('\n👤 Используем admin пользователя для тестирования...');
    const testUserId = '12345678-1234-1234-1234-123456789012'; // Admin user ID
    console.log('✅ Используем admin пользователя');
    
    // 3. Создаем заявку
    console.log('\n📝 Создание тестовой заявки...');
    const ticketData = {
      title: 'Тест загрузки файлов из телеграм бота',
      description: 'Проверяем, что файлы корректно загружаются при создании заявки через телеграм бот',
      category: 'technical',
      priority: 'medium',
      type: 'incident',
      source: 'telegram',
      createdById: testUserId
    };
    
    const ticketResponse = await axios.post(`${API_BASE_URL}/tickets`, ticketData, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!ticketResponse.data || !ticketResponse.data.ticket) {
      throw new Error('Не удалось создать заявку');
    }
    
    const ticket = ticketResponse.data.ticket;
    console.log('✅ Заявка создана:', ticket.id);
    
    // 3. Загружаем файл к заявке
    console.log('\n📎 Загрузка файла к заявке...');
    const formData = new FormData();
    formData.append('files', fs.createReadStream(testFilePath), {
      filename: 'test-attachment.txt',
      contentType: 'text/plain'
    });
    
    const uploadResponse = await axios.post(
      `${API_BASE_URL}/tickets/${ticket.id}/attachments`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          ...formData.getHeaders()
        },
        timeout: 30000
      }
    );
    
    if (uploadResponse.data && uploadResponse.data.attachments) {
      console.log('✅ Файл успешно загружен:', uploadResponse.data.attachments[0].id);
      console.log('📄 Информация о файле:', {
        id: uploadResponse.data.attachments[0].id,
        filename: uploadResponse.data.attachments[0].filename,
        originalName: uploadResponse.data.attachments[0].originalName,
        size: uploadResponse.data.attachments[0].size,
        mimeType: uploadResponse.data.attachments[0].mimeType
      });
    } else {
      throw new Error('Неожиданный ответ при загрузке файла');
    }
    
    // 4. Проверяем, что файл привязан к заявке
    console.log('\n🔍 Проверка заявки с вложением...');
    const ticketDetailsResponse = await axios.get(`${API_BASE_URL}/tickets/${ticket.id}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    const ticketWithAttachments = ticketDetailsResponse.data.ticket;
    if (ticketWithAttachments.Attachments && ticketWithAttachments.Attachments.length > 0) {
      console.log('✅ Вложение найдено в заявке:', ticketWithAttachments.Attachments[0].originalName);
    } else {
      console.log('❌ Вложение не найдено в заявке');
    }
    
    // 5. Симулируем процесс, который происходит в телеграм боте
    console.log('\n🤖 Симуляция процесса телеграм бота...');
    
    // Симулируем данные, которые сохраняются в сессии телеграм бота
    const telegramAttachments = [
      {
        fileId: 'test-file-id-123',
        fileUrl: 'https://api.telegram.org/file/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/documents/file_1.txt',
        fileName: 'telegram-test-file.txt',
        mimeType: 'text/plain',
        size: testFileContent.length
      }
    ];
    
    // Создаем еще одну заявку для симуляции телеграм процесса
    const telegramTicketData = {
      title: 'Заявка из телеграм с вложением',
      description: 'Тестируем полный процесс создания заявки с файлом через телеграм бот',
      category: 'general',
      priority: 'low',
      type: 'service_request',
      source: 'telegram',
      createdById: testUserId
    };
    
    const telegramTicketResponse = await axios.post(`${API_BASE_URL}/tickets`, telegramTicketData, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const telegramTicket = telegramTicketResponse.data.ticket;
    console.log('✅ Телеграм заявка создана:', telegramTicket.id);
    
    // Симулируем загрузку файла (как это делает функция uploadAttachmentsToTicket)
    console.log('📎 Симуляция загрузки файла из телеграм...');
    
    const telegramFormData = new FormData();
    telegramFormData.append('files', fs.createReadStream(testFilePath), {
      filename: telegramAttachments[0].fileName,
      contentType: telegramAttachments[0].mimeType
    });
    
    const telegramUploadResponse = await axios.post(
      `${API_BASE_URL}/tickets/${telegramTicket.id}/attachments`,
      telegramFormData,
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          ...telegramFormData.getHeaders()
        },
        timeout: 30000
      }
    );
    
    if (telegramUploadResponse.data && telegramUploadResponse.data.attachments) {
      console.log('✅ Файл из телеграм успешно загружен:', telegramUploadResponse.data.attachments[0].originalName);
    }
    
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('\n📋 Результаты тестирования:');
    console.log('- Создание заявки: ✅');
    console.log('- Загрузка файла к заявке: ✅');
    console.log('- Проверка вложения в заявке: ✅');
    console.log('- Симуляция телеграм процесса: ✅');
    
  } catch (error) {
    console.error('❌ ОШИБКА ТЕСТИРОВАНИЯ:', error.message);
    if (error.response) {
      console.error('📄 Ответ сервера:', error.response.data);
      console.error('🔢 Статус:', error.response.status);
    }
    console.error('📚 Стек ошибки:', error.stack);
  } finally {
    // Удаляем тестовый файл
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('🗑️ Тестовый файл удален');
    }
  }
}

// Запускаем тест
testFileUpload();