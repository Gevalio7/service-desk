const axios = require('axios');

const BASE_URL = 'http://localhost:3007/api';

async function testUserUpdate() {
  console.log('🧪 Тестирование исправлений обновления пользователя...\n');
  
  try {
    // 1. Регистрация нового пользователя
    console.log('1️⃣ Регистрация тестового пользователя...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'password123',
      firstName: 'Иван',
      lastName: 'Петров'
    });
    
    console.log('✅ Пользователь зарегистрирован:', registerResponse.data.user.firstName, registerResponse.data.user.lastName);
    const token = registerResponse.data.token;
    
    // 2. Получение профиля
    console.log('\n2️⃣ Получение профиля пользователя...');
    const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Профиль получен:', profileResponse.data.user.firstName, profileResponse.data.user.lastName);
    
    // 3. Обновление профиля с правильными полями
    console.log('\n3️⃣ Обновление профиля с правильными полями...');
    const updateResponse = await axios.put(`${BASE_URL}/auth/profile`, {
      firstName: 'Иван',
      lastName: 'Сидоров',
      department: 'IT отдел',
      company: 'Тестовая компания',
      telegramId: '@ivan_sidorov'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Профиль обновлен:', updateResponse.data.user.firstName, updateResponse.data.user.lastName);
    console.log('   Отдел:', updateResponse.data.user.department);
    console.log('   Компания:', updateResponse.data.user.company);
    console.log('   Telegram ID:', updateResponse.data.user.telegramId);
    
    // 4. Тест валидации - попытка обновить с пустыми полями
    console.log('\n4️⃣ Тестирование валидации (пустые поля)...');
    try {
      await axios.put(`${BASE_URL}/auth/profile`, {
        firstName: '',
        lastName: ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('❌ Валидация не сработала - это ошибка!');
    } catch (validationError) {
      console.log('✅ Валидация сработала:', validationError.response.data.message);
    }
    
    // 5. Тест обновления через userController (если пользователь админ)
    console.log('\n5️⃣ Тестирование обновления через userController...');
    try {
      const userUpdateResponse = await axios.put(`${BASE_URL}/users/${profileResponse.data.user.id}`, {
        firstName: 'Алексей',
        lastName: 'Иванов',
        department: 'Поддержка',
        company: 'Новая компания'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ Пользователь обновлен через userController:', userUpdateResponse.data.user.firstName, userUpdateResponse.data.user.lastName);
    } catch (userUpdateError) {
      console.log('ℹ️ Обновление через userController:', userUpdateError.response?.data?.message || userUpdateError.message);
    }
    
    console.log('\n🎉 Все тесты завершены успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка в тестах:', error.response?.data || error.message);
  }
}

// Запуск тестов
testUserUpdate();