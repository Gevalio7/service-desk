const { sequelize } = require('./backend/config/database');

async function checkTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');
    
    const [tables] = await sequelize.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const workflowTables = tables.filter(t => t.table_name.startsWith('workflow_'));
    const otherTables = tables.filter(t => !t.table_name.startsWith('workflow_'));
    
    console.log('\n🔄 Workflow таблицы:');
    workflowTables.forEach(table => {
      console.log(`  ✓ ${table.table_name} (${table.column_count} колонок)`);
    });
    
    console.log('\n📊 Основные таблицы:');
    otherTables.slice(0, 10).forEach(table => {
      console.log(`  ✓ ${table.table_name} (${table.column_count} колонок)`);
    });
    if (otherTables.length > 10) {
      console.log(`  ... и еще ${otherTables.length - 10} таблиц`);
    }
    
    console.log(`\n📈 Итого: ${tables.length} таблиц`);
    console.log(`   - Workflow таблиц: ${workflowTables.length}`);
    console.log(`   - Основных таблиц: ${otherTables.length}`);
    
    // Проверим данные в workflow таблицах
    const [workflowTypes] = await sequelize.query('SELECT COUNT(*) as count FROM workflow_types');
    const [workflowStatuses] = await sequelize.query('SELECT COUNT(*) as count FROM workflow_statuses');
    const [workflowTransitions] = await sequelize.query('SELECT COUNT(*) as count FROM workflow_transitions');
    
    console.log('\n📝 Данные в workflow таблицах:');
    console.log(`  - Типы workflow: ${workflowTypes[0].count}`);
    console.log(`  - Статусы workflow: ${workflowStatuses[0].count}`);
    console.log(`  - Переходы workflow: ${workflowTransitions[0].count}`);
    
    console.log('\n🎉 База данных успешно инициализирована!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTables();