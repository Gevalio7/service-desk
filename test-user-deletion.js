const axios = require('axios');

const API_BASE = 'http://localhost:3007/api';

async function testUserDeletion() {
  try {
    console.log('🔍 Тестирование исправления удаления пользователей...\n');

    // 1. Авторизация как администратор
    console.log('1. Авторизация администратора...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('✅ Администратор авторизован');

    // 2. Создание тестового пользователя
    console.log('\n2. Создание тестового пользователя...');
    const createUserResponse = await axios.post(`${API_BASE}/users`, {
      username: 'testuser_deletion',
      email: 'testdeletion@example.com',
      password: 'password123',
      firstName: 'Тест',
      lastName: 'Удаления',
      role: 'client'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const testUserId = createUserResponse.data.user.id;
    console.log(`✅ Пользователь создан с ID: ${testUserId}`);

    // 3. Проверка, что пользователь появился в списке
    console.log('\n3. Проверка списка пользователей до удаления...');
    const usersBeforeResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const usersBefore = usersBeforeResponse.data.users;
    const testUserBefore = usersBefore.find(u => u.id === testUserId);
    
    if (testUserBefore) {
      console.log(`✅ Пользователь найден в списке: ${testUserBefore.firstName} ${testUserBefore.lastName} (isActive: ${testUserBefore.isActive})`);
    } else {
      console.log('❌ Пользователь не найден в списке');
      return;
    }

    // 4. Удаление пользователя (мягкое удаление)
    console.log('\n4. Удаление пользователя...');
    await axios.delete(`${API_BASE}/users/${testUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Запрос на удаление выполнен');

    // 5. Проверка списка пользователей после удаления (должен исчезнуть из списка активных)
    console.log('\n5. Проверка списка пользователей после удаления...');
    const usersAfterResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const usersAfter = usersAfterResponse.data.users;
    const testUserAfter = usersAfter.find(u => u.id === testUserId);
    
    if (!testUserAfter) {
      console.log('✅ Пользователь исчез из списка активных пользователей (правильно!)');
    } else {
      console.log(`❌ Пользователь все еще в списке: ${testUserAfter.firstName} ${testUserAfter.lastName} (isActive: ${testUserAfter.isActive})`);
    }

    // 6. Проверка с параметром isActive=false (должен показать удаленного пользователя)
    console.log('\n6. Проверка списка неактивных пользователей...');
    const inactiveUsersResponse = await axios.get(`${API_BASE}/users?isActive=false`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const inactiveUsers = inactiveUsersResponse.data.users;
    const testUserInactive = inactiveUsers.find(u => u.id === testUserId);
    
    if (testUserInactive) {
      console.log(`✅ Пользователь найден в списке неактивных: ${testUserInactive.firstName} ${testUserInactive.lastName} (isActive: ${testUserInactive.isActive})`);
    } else {
      console.log('❌ Пользователь не найден в списке неактивных');
    }

    // 7. Проверка с параметром isActive=true (не должен показать удаленного пользователя)
    console.log('\n7. Проверка списка активных пользователей...');
    const activeUsersResponse = await axios.get(`${API_BASE}/users?isActive=true`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const activeUsers = activeUsersResponse.data.users;
    const testUserActive = activeUsers.find(u => u.id === testUserId);
    
    if (!testUserActive) {
      console.log('✅ Пользователь не найден в списке активных (правильно!)');
    } else {
      console.log(`❌ Пользователь найден в списке активных: ${testUserActive.firstName} ${testUserActive.lastName}`);
    }

    console.log('\n🎉 Тест завершен!');
    console.log('\n📋 Резюме исправлений:');
    console.log('- Backend теперь по умолчанию показывает только активных пользователей');
    console.log('- Удаление пользователя делает мягкое удаление (isActive = false)');
    console.log('- После перезагрузки страницы удаленные пользователи не появляются в списке');
    console.log('- Можно явно запросить неактивных пользователей с параметром isActive=false');

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.response?.data || error.message);
  }
}

testUserDeletion();