const { sequelize } = require('../config/database');

async function addRemainingColumns() {
  try {
    console.log('Начинаем добавление оставшихся недостающих колонок в таблицу Tickets...');

    // Добавляем колонку source
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "source" VARCHAR(255) 
      CHECK ("source" IN ('web', 'email', 'telegram', 'api'))
      DEFAULT 'web';
    `);
    console.log('✓ Колонка source добавлена');

    // Добавляем колонку tags (массив строк)
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
    `);
    console.log('✓ Колонка tags добавлена');

    // Добавляем колонку telegramMessageId
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "telegramMessageId" VARCHAR(255);
    `);
    console.log('✓ Колонка telegramMessageId добавлена');

    // Добавляем колонки для SLA
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "slaDeadline" TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Колонка slaDeadline добавлена');

    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "responseDeadline" TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Колонка responseDeadline добавлена');

    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "firstResponseTime" TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Колонка firstResponseTime добавлена');

    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "resolutionTime" TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✓ Колонка resolutionTime добавлена');

    // Добавляем булевые колонки для отслеживания нарушений SLA
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "slaBreach" BOOLEAN DEFAULT FALSE;
    `);
    console.log('✓ Колонка slaBreach добавлена');

    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "responseBreach" BOOLEAN DEFAULT FALSE;
    `);
    console.log('✓ Колонка responseBreach добавлена');

    // Обновляем существующие записи со значениями по умолчанию
    await sequelize.query(`
      UPDATE "Tickets" 
      SET "source" = 'web' 
      WHERE "source" IS NULL;
    `);

    await sequelize.query(`
      UPDATE "Tickets" 
      SET "tags" = '{}' 
      WHERE "tags" IS NULL;
    `);

    await sequelize.query(`
      UPDATE "Tickets" 
      SET "slaBreach" = FALSE 
      WHERE "slaBreach" IS NULL;
    `);

    await sequelize.query(`
      UPDATE "Tickets" 
      SET "responseBreach" = FALSE 
      WHERE "responseBreach" IS NULL;
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
  addRemainingColumns()
    .then(() => {
      console.log('Миграция завершена успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ошибка миграции:', error);
      process.exit(1);
    });
}

module.exports = addRemainingColumns;