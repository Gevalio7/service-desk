const { sequelize } = require('../config/database');

async function addStatusColumn() {
  try {
    console.log('Начинаем добавление колонки status в таблицу Tickets...');

    // Добавляем колонку status
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) 
      CHECK ("status" IN ('new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed'))
      DEFAULT 'new';
    `);
    console.log('✓ Колонка status добавлена');

    // Обновляем существующие записи, если они есть
    await sequelize.query(`
      UPDATE "Tickets" 
      SET "status" = 'new' 
      WHERE "status" IS NULL;
    `);

    console.log('✓ Существующие записи обновлены со значением по умолчанию');
    console.log('Миграция успешно завершена!');

  } catch (error) {
    console.error('Ошибка при добавлении колонки status:', error);
    throw error;
  }
}

// Запускаем миграцию, если скрипт вызван напрямую
if (require.main === module) {
  addStatusColumn()
    .then(() => {
      console.log('Миграция завершена успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ошибка миграции:', error);
      process.exit(1);
    });
}

module.exports = addStatusColumn;