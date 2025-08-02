const { sequelize } = require('../config/database');
const { Ticket, WorkflowType, WorkflowStatus } = require('../src/models');

async function migrateTicketsToWorkflow() {
  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    // Получаем дефолтный workflow тип
    const defaultWorkflow = await WorkflowType.findOne({
      where: { isDefault: true, isActive: true },
      include: [{ model: WorkflowStatus }]
    });

    if (!defaultWorkflow) {
      console.error('❌ Дефолтный workflow тип не найден');
      return;
    }

    console.log(`📋 Найден workflow: ${defaultWorkflow.displayName?.ru || defaultWorkflow.name}`);
    console.log(`   Статусов: ${defaultWorkflow.WorkflowStatuses.length}`);

    // Создаем маппинг старых статусов на новые
    const statusMapping = {
      'new': 'new',
      'assigned': 'assigned', 
      'in_progress': 'in_progress',
      'on_hold': 'on_hold',
      'resolved': 'resolved',
      'closed': 'closed'
    };

    // Получаем все тикеты без workflow статусов
    const tickets = await Ticket.findAll({
      where: {
        workflowTypeId: null
      }
    });

    console.log(`\n🔄 Найдено тикетов для миграции: ${tickets.length}`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const ticket of tickets) {
      try {
        // Находим соответствующий workflow статус
        const workflowStatusName = statusMapping[ticket.status] || 'new';
        const workflowStatus = defaultWorkflow.WorkflowStatuses.find(
          s => s.name === workflowStatusName
        );

        if (!workflowStatus) {
          console.warn(`⚠️  Статус ${workflowStatusName} не найден для тикета #${ticket.ticketNumber}`);
          continue;
        }

        // Обновляем тикет
        await ticket.update({
          workflowTypeId: defaultWorkflow.id,
          currentStatusId: workflowStatus.id
        });

        migratedCount++;
        
        if (migratedCount % 10 === 0) {
          console.log(`   Обработано: ${migratedCount}/${tickets.length}`);
        }

      } catch (error) {
        console.error(`❌ Ошибка миграции тикета #${ticket.ticketNumber}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n✅ Миграция завершена:`);
    console.log(`   - Успешно мигрировано: ${migratedCount}`);
    console.log(`   - Ошибок: ${errorCount}`);

    // Проверяем результат
    const [stats] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_tickets,
        COUNT("workflowTypeId") as with_workflow_type,
        COUNT("currentStatusId") as with_current_status
      FROM "Tickets"
    `);

    console.log(`\n📊 Итоговая статистика:`);
    console.log(`   - Всего тикетов: ${stats[0].total_tickets}`);
    console.log(`   - С workflow типом: ${stats[0].with_workflow_type}`);
    console.log(`   - С текущим статусом: ${stats[0].with_current_status}`);

  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
  } finally {
    await sequelize.close();
  }
}

// Запускаем миграцию если скрипт вызван напрямую
if (require.main === module) {
  migrateTicketsToWorkflow();
}

module.exports = migrateTicketsToWorkflow;