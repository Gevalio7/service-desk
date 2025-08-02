const { sequelize } = require('../config/database');

async function addWorkflowFieldsToTickets() {
  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    // Проверяем, существуют ли уже поля workflow в таблице Tickets
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Tickets' 
      AND column_name IN ('workflowTypeId', 'currentStatusId');
    `);

    const existingColumns = columns.map(col => col.column_name);
    
    if (existingColumns.includes('workflowTypeId') && existingColumns.includes('currentStatusId')) {
      console.log('✅ Поля workflow уже существуют в таблице Tickets');
      return;
    }

    console.log('🔄 Добавляем поля workflow в таблицу Tickets...');

    // Добавляем поле workflowTypeId если его нет
    if (!existingColumns.includes('workflowTypeId')) {
      await sequelize.query(`
        ALTER TABLE "Tickets" 
        ADD COLUMN "workflowTypeId" UUID REFERENCES workflow_types(id);
      `);
      console.log('✅ Добавлено поле workflowTypeId');
    }

    // Добавляем поле currentStatusId если его нет
    if (!existingColumns.includes('currentStatusId')) {
      await sequelize.query(`
        ALTER TABLE "Tickets" 
        ADD COLUMN "currentStatusId" UUID REFERENCES workflow_statuses(id);
      `);
      console.log('✅ Добавлено поле currentStatusId');
    }

    // Получаем ID дефолтного workflow типа и статуса
    const [defaultWorkflowType] = await sequelize.query(`
      SELECT id FROM workflow_types WHERE name = 'default_support' LIMIT 1;
    `);

    if (defaultWorkflowType.length > 0) {
      const workflowTypeId = defaultWorkflowType[0].id;
      
      // Получаем начальный статус для этого workflow
      const [initialStatus] = await sequelize.query(`
        SELECT id FROM workflow_statuses 
        WHERE "workflowTypeId" = :workflowTypeId AND "isInitial" = true 
        LIMIT 1;
      `, {
        replacements: { workflowTypeId }
      });

      if (initialStatus.length > 0) {
        const initialStatusId = initialStatus[0].id;
        
        // Обновляем существующие тикеты, у которых нет workflow данных
        await sequelize.query(`
          UPDATE "Tickets" 
          SET "workflowTypeId" = :workflowTypeId, "currentStatusId" = :currentStatusId
          WHERE "workflowTypeId" IS NULL OR "currentStatusId" IS NULL;
        `, {
          replacements: { 
            workflowTypeId, 
            currentStatusId: initialStatusId 
          }
        });
        
        console.log('✅ Обновлены существующие тикеты с дефолтными workflow данными');
      }
    }

    // Создаем индексы для производительности
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS "idx_tickets_workflow_type" 
        ON "Tickets" ("workflowTypeId");
      `);
      
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS "idx_tickets_current_status" 
        ON "Tickets" ("currentStatusId");
      `);
      
      console.log('✅ Созданы индексы для workflow полей');
    } catch (indexError) {
      console.log('⚠️ Индексы уже существуют или произошла ошибка:', indexError.message);
    }

    console.log('🎉 Поля workflow успешно добавлены в таблицу Tickets!');

  } catch (error) {
    console.error('❌ Ошибка при добавлении полей workflow:', error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Запускаем скрипт если он вызван напрямую
if (require.main === module) {
  addWorkflowFieldsToTickets()
    .then(() => {
      console.log('✅ Скрипт выполнен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}

module.exports = addWorkflowFieldsToTickets;