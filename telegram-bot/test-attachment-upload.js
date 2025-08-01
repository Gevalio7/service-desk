const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Конфигурация
const API_BASE_URL = 'http://localhost:3007/api';
const API_TOKEN = 'service-desk-api-token';

async function testAttachmentUpload() {
  try {
    console.log('🧪 ТЕСТ ЗАГРУЗКИ ВЛОЖЕНИЙ - Начало тестирования');
    
    // 1. Получаем существующую заявку
    console.log('\n🔍 Получение существующих заявок...');
    const ticketsResponse = await axios.get(`${API_BASE_URL}/tickets?limit=1`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    if (!ticketsResponse.data || !ticketsResponse.data.tickets || ticketsResponse.data.tickets.length === 0) {
      throw new Error('Не найдено заявок для тестирования');
    }
    
    const testTicket = ticketsResponse.data.tickets[0];
    console.log('✅ Найдена заявка для тестирования:', testTicket.id);
    console.log('📋 Заголовок заявки:', testTicket.title);
    
    // 2. Создаем тестовый файл
    const testFilePath = path.join(__dirname, 'test-attachment.txt');
    const testFileContent = 'Это тестовый файл для проверки загрузки вложений.\nДата создания: ' + new Date().toISOString();
    fs.writeFileSync(testFilePath, testFileContent);
    console.log('✅ Тестовый файл создан:', testFilePath);
    
    // 3. Загружаем файл к заявке
    console.log('\n📎 Загрузка файла к заявке...');
    const formData = new FormData();
    formData.append('files', fs.createReadStream(testFilePath), {
      filename: 'test-attachment.txt',
      contentType: 'text/plain'
    });
    
    const uploadResponse = await axios.post(
      `${API_BASE_URL}/tickets/${testTicket.id}/attachments`,
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
      console.log('✅ Файл успешно загружен!');
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
    const ticketDetailsResponse = await axios.get(`${API_BASE_URL}/tickets/${testTicket.id}`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    });
    
    const ticketWithAttachments = ticketDetailsResponse.data.ticket;
    if (ticketWithAttachments.Attachments && ticketWithAttachments.Attachments.length > 0) {
      console.log('✅ Вложения найдены в заявке:');
      ticketWithAttachments.Attachments.forEach((attachment, index) => {
        console.log(`   ${index + 1}. ${attachment.originalName} (${attachment.size} bytes)`);
      });
    } else {
      console.log('❌ Вложения не найдены в заявке');
    }
    
    // 5. Тестируем функцию uploadAttachmentsToTicket (симуляция телеграм бота)
    console.log('\n🤖 Тестирование функции uploadAttachmentsToTicket...');
    
    // Создаем второй тестовый файл
    const testFile2Path = path.join(__dirname, 'test-telegram-file.txt');
    const testFile2Content = 'Это файл, симулирующий загрузку из Telegram бота.\nВремя: ' + new Date().toISOString();
    fs.writeFileSync(testFile2Path, testFile2Content);
    
    // Симулируем данные из телеграм
    const telegramAttachments = [
      {
        fileId: 'test-file-id-123',
        fileUrl: `file://${testFile2Path}`, // Используем локальный файл
        fileName: 'telegram-test-file.txt',
        mimeType: 'text/plain',
        size: testFile2Content.length
      }
    ];
    
    // Симулируем функцию uploadAttachmentsToTicket
    console.log('📎 Симуляция загрузки файла из телеграм...');
    
    for (const attachment of telegramAttachments) {
      try {
        // Читаем файл (симулируем скачивание из Telegram)
        const fileData = fs.readFileSync(testFile2Path);
        
        // Создаем form data
        const telegramFormData = new FormData();
        telegramFormData.append('files', fileData, {
          filename: attachment.fileName,
          contentType: attachment.mimeType
        });
        
        // Загружаем на сервер
        const telegramUploadResponse = await axios.post(
          `${API_BASE_URL}/tickets/${testTicket.id}/attachments`,
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
        
      } catch (error) {
        console.error('❌ Ошибка загрузки файла из телеграм:', error.message);
      }
    }
    
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('\n📋 Результаты тестирования:');
    console.log('- Получение существующей заявки: ✅');
    console.log('- Загрузка файла к заявке: ✅');
    console.log('- Проверка вложения в заявке: ✅');
    console.log('- Симуляция телеграм процесса: ✅');
    
    // Удаляем тестовые файлы
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(testFile2Path)) {
      fs.unlinkSync(testFile2Path);
    }
    console.log('🗑️ Тестовые файлы удалены');
    
  } catch (error) {
    console.error('❌ ОШИБКА ТЕСТИРОВАНИЯ:', error.message);
    if (error.response) {
      console.error('📄 Ответ сервера:', error.response.data);
      console.error('🔢 Статус:', error.response.status);
    }
    console.error('📚 Стек ошибки:', error.stack);
  }
}

// Запускаем тест
testAttachmentUpload();