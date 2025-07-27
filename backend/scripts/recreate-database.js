require('dotenv').config();
const { sequelize } = require('../config/database');

// Импортируем все модели для обеспечения правильной загрузки
const {
  User,
  Ticket,
  Comment,
  Attachment,
  TicketHistory,
  Notification,
  TicketContact
} = require('../src/models');

async function recreateDatabase() {
  try {
    console.log('🔌 Подключение к базе данных...');
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных успешно');

    console.log('\n🗑️ Удаление всех существующих таблиц...');
    
    // Отключаем проверку внешних ключей для безопасного удаления
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true }).catch(() => {
      // PostgreSQL использует другой синтаксис
      console.log('ℹ️ Используется PostgreSQL');
    });

    // Удаляем все таблицы в правильном порядке (с учетом зависимостей)
    const tablesToDrop = [
      'ticket_histories',
      'ticket_contacts', 
      'Attachments',
      'Comments',
      'Notifications',
      'Tickets',
      'Users'
    ];

    for (const tableName of tablesToDrop) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
        console.log(`  ✓ Удалена таблица: ${tableName}`);
      } catch (error) {
        console.log(`  ⚠️ Не удалось удалить таблицу ${tableName}: ${error.message}`);
      }
    }

    // Удаляем ENUM типы если они существуют
    const enumsToDelete = [
      'enum_Users_role',
      'enum_Tickets_category',
      'enum_Tickets_type', 
      'enum_Tickets_priority',
      'enum_Tickets_status',
      'enum_Tickets_source',
      'enum_TicketHistories_action',
      'enum_Notifications_type',
      'ticket_contact_role'
    ];

    for (const enumName of enumsToDelete) {
      try {
        await sequelize.query(`DROP TYPE IF EXISTS "${enumName}" CASCADE;`);
        console.log(`  ✓ Удален ENUM тип: ${enumName}`);
      } catch (error) {
        // Игнорируем ошибки удаления ENUM типов
      }
    }

    console.log('\n🏗️ Создание всех таблиц с правильной структурой...');
    
    // Используем sequelize.sync для создания всех таблиц с правильными зависимостями
    console.log('  🔄 Синхронизация всех моделей с базой данных...');
    await sequelize.sync({ force: true });
    console.log('  ✅ Все таблицы созданы успешно');

    console.log('\n🔍 Проверка структуры созданных таблиц...');
    
    // Получаем список всех таблиц
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Созданные таблицы:');
    for (const table of tables) {
      console.log(`  - ${table.table_name}`);
      
      // Получаем структуру каждой таблицы
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = '${table.table_name}' 
        ORDER BY ordinal_position;
      `);
      
      console.log(`    Колонки (${columns.length}):`);
      columns.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`      • ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
      });
      console.log('');
    }

    console.log('🎯 Создание тестовых пользователей...');
    await createDefaultUsers();

    console.log('\n🎉 База данных успешно пересоздана!');
    console.log('✅ Все таблицы созданы с правильной структурой');
    console.log('✅ Связи между таблицами настроены');
    console.log('✅ Тестовые пользователи добавлены');
    
  } catch (error) {
    console.error('❌ Ошибка при пересоздании базы данных:', error);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    await sequelize.close();
  }
}

async function createDefaultUsers() {
  try {
    const users = [
      {
        username: 'admin',
        email: 'admin@servicedesk.com',
        password: 'admin123',
        firstName: 'Администратор',
        lastName: 'Системы',
        role: 'admin',
        department: 'IT',
        company: 'Service Desk'
      },
      {
        username: 'agent',
        email: 'agent@servicedesk.com',
        password: 'agent123',
        firstName: 'Агент',
        lastName: 'Поддержки',
        role: 'agent',
        department: 'Support',
        company: 'Service Desk'
      },
      {
        username: 'client',
        email: 'client@servicedesk.com',
        password: 'client123',
        firstName: 'Клиент',
        lastName: 'Тестовый',
        role: 'client',
        department: 'Sales',
        company: 'Test Company'
      }
    ];

    for (const userData of users) {
      await User.create(userData);
      console.log(`  ✓ Создан пользователь: ${userData.email}`);
    }
    
    console.log('\n📋 Данные для входа:');
    console.log('  👑 Админ: admin@servicedesk.com / admin123');
    console.log('  🛠️ Агент: agent@servicedesk.com / agent123');
    console.log('  👤 Клиент: client@servicedesk.com / client123');
    
  } catch (error) {
    console.error('❌ Ошибка создания пользователей:', error);
    throw error;
  }
}

// Запускаем скрипт
if (require.main === module) {
  recreateDatabase()
    .then(() => {
      console.log('\n🚀 Скрипт завершен успешно!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Скрипт завершен с ошибкой:', error.message);
      process.exit(1);
    });
}

module.exports = { recreateDatabase };