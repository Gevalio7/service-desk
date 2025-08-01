const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Создаем тестовый файл
const testFilePath = path.join(__dirname, 'test-file.txt');
fs.writeFileSync(testFilePath, 'Это тестовый файл для проверки загрузки вложений');

async function testAttachmentUpload() {
    try {
        console.log('🔍 Тестируем загрузку вложений...');
        
        // 1. Создаем заявку
        console.log('1. Создаем заявку...');
        const ticketResponse = await axios.post('http://localhost:3007/api/tickets', {
            title: 'Тест загрузки вложений',
            description: 'Проверяем функциональность загрузки файлов',
            category: 'technical',
            priority: 'medium',
            type: 'incident',
            source: 'telegram',
            createdById: 'ed774439-ed6a-4317-bb7d-a463f0c19b67' // Используем реальный ID пользователя
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer service-desk-api-token'
            }
        });
        
        const ticketId = ticketResponse.data.ticket?.id || ticketResponse.data.id;
        console.log(`✅ Заявка создана с ID: ${ticketId}`);
        console.log('Полный ответ:', JSON.stringify(ticketResponse.data, null, 2));
        
        // 2. Загружаем файл к заявке
        console.log('2. Загружаем файл к заявке...');
        const formData = new FormData();
        formData.append('files', fs.createReadStream(testFilePath));
        
        const uploadResponse = await axios.post(
            `http://localhost:3007/api/tickets/${ticketId}/attachments`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': 'Bearer service-desk-api-token'
                }
            }
        );
        
        console.log('✅ Файл успешно загружен:', uploadResponse.data);
        
        // 3. Проверяем заявку с вложениями
        console.log('3. Проверяем заявку с вложениями...');
        const ticketWithAttachments = await axios.get(
            `http://localhost:3007/api/tickets/${ticketId}`,
            {
                headers: {
                    'Authorization': 'Bearer service-desk-api-token'
                }
            }
        );
        
        console.log('📎 Полный ответ заявки:', JSON.stringify(ticketWithAttachments.data, null, 2));
        
        const attachments = ticketWithAttachments.data.ticket?.Attachments || ticketWithAttachments.data.attachments;
        console.log('📎 Вложения в заявке:', attachments);
        
        if (attachments && attachments.length > 0) {
            console.log('✅ Тест прошел успешно! Вложения корректно прикреплены к заявке.');
            console.log(`📎 Найдено вложений: ${attachments.length}`);
            attachments.forEach((att, index) => {
                console.log(`  ${index + 1}. ${att.originalName} (${att.size} bytes)`);
            });
        } else {
            console.log('❌ Тест не прошел! Вложения не найдены в заявке.');
        }
        
    } catch (error) {
        console.error('❌ Ошибка при тестировании:', error.response?.data || error.message);
    } finally {
        // Удаляем тестовый файл
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    }
}

testAttachmentUpload();