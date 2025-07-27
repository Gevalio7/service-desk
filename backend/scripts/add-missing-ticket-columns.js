const { sequelize } = require('../config/database');

async function addMissingTicketColumns() {
  try {
    console.log('Начинаем добавление недостающих колонок в таблицу Tickets...');

    // Добавляем колонку category
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "category" VARCHAR(255) 
      CHECK ("category" IN ('technical', 'billing', 'general', 'feature_request'))
      DEFAULT 'general';
    `);
    console.log('✓ Колонка category добавлена');

    // Добавляем колонку priority
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "priority" VARCHAR(255) 
      CHECK ("priority" IN ('low', 'medium', 'high', 'urgent'))
      DEFAULT 'medium';
    `);
    console.log('✓ Колонка priority добавлена');

    // Обновляем существующие записи, если они есть
    await sequelize.query(`
      UPDATE "Tickets" 
      SET "category" = 'general' 
      WHERE "category" IS NULL;
    `);

    await sequelize.query(`
      UPDATE "Tickets" 
      SET "priority" = 'medium' 
      WHERE "priority" IS NULL;
    `);

    console.log('✓ Существующие записи обновлены со значениями по умолчанию');
    console.log('Миграция успешно завершена!');

  } catch (error) {
    console.error('Ошибка при добавлении колонок:', error);
    throw error;
  }
}

// Запускаем миграцию, если скрипт вызван напрямую
if (require.main === module) {
  addMissingTicketColumns()
    .then(() => {
      console.log('Миграция завершена успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ошибка миграции:', error);
      process.exit(1);
    });
}

module.exports = addMissingTicketColumns;