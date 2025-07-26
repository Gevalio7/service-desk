const { User } = require('../src/models');
const { sequelize } = require('../config/database');

async function createTestUsers() {
  try {
    console.log('🔄 Подключение к базе данных...');
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    console.log('👤 Создание пользователей...');

    // Создаем администратора (пароль будет автоматически захеширован в модели)
    const [admin, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@servicedesk.com' },
      defaults: {
        username: 'admin',
        email: 'admin@servicedesk.com',
        password: 'admin123', // Будет захеширован автоматически
        firstName: 'Администратор',
        lastName: 'Системы',
        role: 'admin',
        isActive: true
      }
    });

    if (adminCreated) {
      console.log('✅ Администратор создан:', {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      });
    } else {
      console.log('ℹ️ Администратор уже существует:', {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      });
    }

    // Создаем агента (пароль будет автоматически захеширован в модели)
    const [agent, agentCreated] = await User.findOrCreate({
      where: { email: 'agent@servicedesk.com' },
      defaults: {
        username: 'agent',
        email: 'agent@servicedesk.com',
        password: 'agent123', // Будет захеширован автоматически
        firstName: 'Агент',
        lastName: 'Поддержки',
        role: 'agent',
        isActive: true
      }
    });

    if (agentCreated) {
      console.log('✅ Агент создан:', {
        id: agent.id,
        username: agent.username,
        email: agent.email,
        role: agent.role
      });
    } else {
      console.log('ℹ️ Агент уже существует:', {
        id: agent.id,
        username: agent.username,
        email: agent.email,
        role: agent.role
      });
    }

    console.log('\n🎉 Тестовые пользователи готовы!');
    console.log('\n📋 Данные для входа:');
    console.log('👨‍💼 Администратор:');
    console.log('   Email: admin@servicedesk.com');
    console.log('   Пароль: admin123');
    console.log('   Роль: admin');
    console.log('\n👨‍💻 Агент:');
    console.log('   Email: agent@servicedesk.com');
    console.log('   Пароль: agent123');
    console.log('   Роль: agent');

    // Показываем всех пользователей в системе
    console.log('\n📊 Все пользователи в системе:');
    const allUsers = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'isActive', 'createdAt']
    });
    
    allUsers.forEach(user => {
      console.log(`- ${user.username} (${user.email}) - ${user.role} - Активен: ${user.isActive} - Создан: ${user.createdAt.toLocaleDateString()}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при создании пользователей:', error);
    process.exit(1);
  }
}

createTestUsers();