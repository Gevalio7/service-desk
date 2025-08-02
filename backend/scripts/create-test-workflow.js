const { sequelize } = require('../config/database');
const {
  WorkflowType,
  WorkflowStatus,
  WorkflowTransition,
  WorkflowCondition,
  WorkflowAction,
  User
} = require('../src/models');

async function createTestWorkflow() {
  try {
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    // Найдем администратора для создания workflow
    const admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      console.error('❌ Не найден пользователь с ролью admin');
      return;
    }

    console.log('👤 Используем администратора:', admin.email);

    // Создаем тип workflow для инцидентов
    console.log('\n📋 Создание типа workflow "Инциденты"...');
    const incidentWorkflow = await WorkflowType.create({
      name: 'incident',
      displayName: {
        ru: 'Инциденты',
        en: 'Incidents'
      },
      description: {
        ru: 'Workflow для обработки инцидентов в ИТ-системах',
        en: 'Workflow for handling IT system incidents'
      },
      icon: 'bug_report',
      color: '#f44336',
      isActive: true,
      isDefault: true,
      createdById: admin.id
    });

    console.log('✅ Тип workflow создан:', incidentWorkflow.id);

    // Создаем статусы для инцидентов
    console.log('\n📊 Создание статусов...');
    const statuses = [];

    const statusData = [
      {
        name: 'new',
        displayName: { ru: 'Новый', en: 'New' },
        description: { ru: 'Новый инцидент, требует рассмотрения', en: 'New incident, needs review' },
        icon: 'fiber_new',
        color: '#2196f3',
        category: 'open',
        isInitial: true,
        sortOrder: 1,
        slaHours: 4,
        responseHours: 1,
        notifyOnEnter: true
      },
      {
        name: 'assigned',
        displayName: { ru: 'Назначен', en: 'Assigned' },
        description: { ru: 'Инцидент назначен исполнителю', en: 'Incident assigned to agent' },
        icon: 'assignment_ind',
        color: '#ff9800',
        category: 'active',
        sortOrder: 2,
        slaHours: 24,
        responseHours: 2,
        notifyOnEnter: true
      },
      {
        name: 'in_progress',
        displayName: { ru: 'В работе', en: 'In Progress' },
        description: { ru: 'Инцидент находится в работе', en: 'Incident is being worked on' },
        icon: 'work',
        color: '#9c27b0',
        category: 'active',
        sortOrder: 3,
        slaHours: 48,
        notifyOnEnter: false
      },
      {
        name: 'pending',
        displayName: { ru: 'Ожидание', en: 'Pending' },
        description: { ru: 'Ожидание ответа от клиента или третьей стороны', en: 'Waiting for customer or third party response' },
        icon: 'schedule',
        color: '#607d8b',
        category: 'pending',
        sortOrder: 4,
        notifyOnEnter: true
      },
      {
        name: 'resolved',
        displayName: { ru: 'Решен', en: 'Resolved' },
        description: { ru: 'Инцидент решен, ожидает подтверждения', en: 'Incident resolved, awaiting confirmation' },
        icon: 'check_circle',
        color: '#4caf50',
        category: 'resolved',
        sortOrder: 5,
        notifyOnEnter: true,
        notifyOnExit: false
      },
      {
        name: 'closed',
        displayName: { ru: 'Закрыт', en: 'Closed' },
        description: { ru: 'Инцидент закрыт', en: 'Incident closed' },
        icon: 'lock',
        color: '#757575',
        category: 'closed',
        isFinal: true,
        sortOrder: 6,
        notifyOnEnter: true
      }
    ];

    for (const statusInfo of statusData) {
      const status = await WorkflowStatus.create({
        ...statusInfo,
        workflowTypeId: incidentWorkflow.id,
        createdById: admin.id
      });
      statuses.push(status);
      console.log(`  ✅ Статус "${status.displayName.ru}" создан`);
    }

    // Создаем переходы между статусами
    console.log('\n🔄 Создание переходов...');
    const transitions = [];

    const transitionData = [
      {
        name: 'assign',
        displayName: { ru: 'Назначить', en: 'Assign' },
        description: { ru: 'Назначить инцидент исполнителю', en: 'Assign incident to agent' },
        fromStatusId: statuses[0].id, // new
        toStatusId: statuses[1].id,   // assigned
        icon: 'assignment',
        color: '#ff9800',
        requiresAssignment: true,
        allowedRoles: ['admin', 'agent'],
        sortOrder: 1
      },
      {
        name: 'start_work',
        displayName: { ru: 'Начать работу', en: 'Start Work' },
        description: { ru: 'Начать работу над инцидентом', en: 'Start working on incident' },
        fromStatusId: statuses[1].id, // assigned
        toStatusId: statuses[2].id,   // in_progress
        icon: 'play_arrow',
        color: '#9c27b0',
        allowedRoles: ['admin', 'agent'],
        sortOrder: 1
      },
      {
        name: 'put_on_hold',
        displayName: { ru: 'Поставить на ожидание', en: 'Put on Hold' },
        description: { ru: 'Поставить инцидент на ожидание', en: 'Put incident on hold' },
        fromStatusId: statuses[2].id, // in_progress
        toStatusId: statuses[3].id,   // pending
        icon: 'pause',
        color: '#607d8b',
        requiresComment: true,
        allowedRoles: ['admin', 'agent'],
        sortOrder: 2
      },
      {
        name: 'resume_work',
        displayName: { ru: 'Возобновить работу', en: 'Resume Work' },
        description: { ru: 'Возобновить работу над инцидентом', en: 'Resume work on incident' },
        fromStatusId: statuses[3].id, // pending
        toStatusId: statuses[2].id,   // in_progress
        icon: 'play_arrow',
        color: '#9c27b0',
        allowedRoles: ['admin', 'agent'],
        sortOrder: 1
      },
      {
        name: 'resolve',
        displayName: { ru: 'Решить', en: 'Resolve' },
        description: { ru: 'Отметить инцидент как решенный', en: 'Mark incident as resolved' },
        fromStatusId: statuses[2].id, // in_progress
        toStatusId: statuses[4].id,   // resolved
        icon: 'check_circle',
        color: '#4caf50',
        requiresComment: true,
        allowedRoles: ['admin', 'agent'],
        sortOrder: 1
      },
      {
        name: 'close',
        displayName: { ru: 'Закрыть', en: 'Close' },
        description: { ru: 'Закрыть инцидент', en: 'Close incident' },
        fromStatusId: statuses[4].id, // resolved
        toStatusId: statuses[5].id,   // closed
        icon: 'lock',
        color: '#757575',
        allowedRoles: ['admin', 'agent', 'client'],
        sortOrder: 1
      },
      {
        name: 'reopen',
        displayName: { ru: 'Переоткрыть', en: 'Reopen' },
        description: { ru: 'Переоткрыть закрытый инцидент', en: 'Reopen closed incident' },
        fromStatusId: statuses[5].id, // closed
        toStatusId: statuses[1].id,   // assigned
        icon: 'refresh',
        color: '#ff5722',
        requiresComment: true,
        allowedRoles: ['admin', 'agent', 'client'],
        sortOrder: 2
      }
    ];

    for (const transitionInfo of transitionData) {
      const transition = await WorkflowTransition.create({
        ...transitionInfo,
        workflowTypeId: incidentWorkflow.id,
        createdById: admin.id
      });
      transitions.push(transition);
      console.log(`  ✅ Переход "${transition.displayName.ru}" создан`);
    }

    // Создаем условия для некоторых переходов
    console.log('\n⚙️ Создание условий...');
    
    // Условие для автоматического назначения высокоприоритетных инцидентов
    const assignTransition = transitions.find(t => t.name === 'assign');
    if (assignTransition) {
      await WorkflowCondition.create({
        transitionId: assignTransition.id,
        conditionType: 'field',
        fieldName: 'priority',
        operator: 'in',
        expectedValue: JSON.stringify(['high', 'critical']),
        conditionGroup: 1
      });
      console.log('  ✅ Условие для высокоприоритетных инцидентов создано');
    }

    // Создаем действия для переходов
    console.log('\n🎬 Создание действий...');
    
    // Действие для уведомления при назначении
    if (assignTransition) {
      await WorkflowAction.create({
        transitionId: assignTransition.id,
        actionType: 'notify',
        actionConfig: {
          recipients: ['assignee', 'creator'],
          notificationType: 'email',
          template: {
            subject: 'Инцидент {{ticket.title}} назначен вам',
            message: 'Вам назначен инцидент: {{ticket.title}}\n\nОписание: {{ticket.description}}\n\nПриоритет: {{ticket.priority}}'
          }
        },
        executionOrder: 1
      });
      console.log('  ✅ Действие уведомления при назначении создано');
    }

    // Действие для автоматического комментария при решении
    const resolveTransition = transitions.find(t => t.name === 'resolve');
    if (resolveTransition) {
      await WorkflowAction.create({
        transitionId: resolveTransition.id,
        actionType: 'create_comment',
        actionConfig: {
          content: 'Инцидент отмечен как решенный. Ожидается подтверждение от клиента.',
          isInternal: false
        },
        executionOrder: 1
      });
      console.log('  ✅ Действие автоматического комментария при решении создано');

      // Действие для обновления SLA при решении
      await WorkflowAction.create({
        transitionId: resolveTransition.id,
        actionType: 'update_sla',
        actionConfig: {
          action: 'stop_timer',
          reason: 'resolved'
        },
        executionOrder: 2
      });
      console.log('  ✅ Действие обновления SLA при решении создано');
    }

    // Создаем второй тип workflow для запросов на обслуживание
    console.log('\n📋 Создание типа workflow "Запросы на обслуживание"...');
    const serviceRequestWorkflow = await WorkflowType.create({
      name: 'service_request',
      displayName: {
        ru: 'Запросы на обслуживание',
        en: 'Service Requests'
      },
      description: {
        ru: 'Workflow для обработки запросов на обслуживание',
        en: 'Workflow for handling service requests'
      },
      icon: 'support_agent',
      color: '#00bcd4',
      isActive: true,
      createdById: admin.id
    });

    console.log('✅ Тип workflow создан:', serviceRequestWorkflow.id);

    // Создаем упрощенные статусы для запросов на обслуживание
    const serviceStatuses = [];
    const serviceStatusData = [
      {
        name: 'submitted',
        displayName: { ru: 'Подан', en: 'Submitted' },
        description: { ru: 'Запрос подан и ожидает рассмотрения', en: 'Request submitted and awaiting review' },
        icon: 'inbox',
        color: '#2196f3',
        category: 'open',
        isInitial: true,
        sortOrder: 1,
        slaHours: 8
      },
      {
        name: 'approved',
        displayName: { ru: 'Одобрен', en: 'Approved' },
        description: { ru: 'Запрос одобрен и готов к выполнению', en: 'Request approved and ready for fulfillment' },
        icon: 'thumb_up',
        color: '#4caf50',
        category: 'active',
        sortOrder: 2,
        slaHours: 72
      },
      {
        name: 'fulfilled',
        displayName: { ru: 'Выполнен', en: 'Fulfilled' },
        description: { ru: 'Запрос выполнен', en: 'Request fulfilled' },
        icon: 'done_all',
        color: '#8bc34a',
        category: 'resolved',
        isFinal: true,
        sortOrder: 3
      },
      {
        name: 'rejected',
        displayName: { ru: 'Отклонен', en: 'Rejected' },
        description: { ru: 'Запрос отклонен', en: 'Request rejected' },
        icon: 'block',
        color: '#f44336',
        category: 'closed',
        isFinal: true,
        sortOrder: 4
      }
    ];

    for (const statusInfo of serviceStatusData) {
      const status = await WorkflowStatus.create({
        ...statusInfo,
        workflowTypeId: serviceRequestWorkflow.id,
        createdById: admin.id
      });
      serviceStatuses.push(status);
      console.log(`  ✅ Статус "${status.displayName.ru}" создан`);
    }

    console.log('\n🎉 Тестовые данные workflow успешно созданы!');
    console.log('\n📊 Создано:');
    console.log(`  - Типов workflow: 2`);
    console.log(`  - Статусов: ${statuses.length + serviceStatuses.length}`);
    console.log(`  - Переходов: ${transitions.length}`);
    console.log(`  - Условий: 1`);
    console.log(`  - Действий: 3`);

    console.log('\n✨ Теперь вы можете:');
    console.log('  1. Открыть /workflow-admin для управления workflow');
    console.log('  2. Создать тикеты с новыми типами workflow');
    console.log('  3. Протестировать переходы между статусами');

  } catch (error) {
    console.error('❌ Ошибка создания тестовых данных:', error);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Запускаем создание тестовых данных
createTestWorkflow();