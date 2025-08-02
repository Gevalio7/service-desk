require('dotenv').config();
const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');

// Import all models to ensure they are loaded
const {
  User,
  WorkflowType,
  WorkflowStatus,
  WorkflowTransition,
  WorkflowCondition,
  WorkflowAction,
  WorkflowVersion
} = require('../src/models');

async function initWorkflowDatabase() {
  try {
    console.log('🚀 Инициализация базы данных workflow...');
    
    // Подключаемся к базе данных
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');
    
    // Проверяем, что все workflow таблицы уже созданы
    console.log('📋 Проверка существования workflow таблиц...');
    const tables = await sequelize.getQueryInterface().showAllTables();
    const workflowTables = ['workflow_types', 'workflow_statuses', 'workflow_transitions', 'workflow_conditions', 'workflow_actions', 'workflow_versions', 'workflow_execution_log'];
    
    const missingTables = workflowTables.filter(table => !tables.includes(table));
    if (missingTables.length > 0) {
      console.log(`⚠️ Отсутствуют таблицы: ${missingTables.join(', ')}`);
      console.log('📋 Создание недостающих таблиц workflow...');
      await executeWorkflowSchema();
    } else {
      console.log('✅ Все workflow таблицы уже существуют');
    }
    
    // Создаем примеры workflow
    console.log('📝 Создание примеров workflow...');
    await createSampleWorkflows();
    
    console.log('🎉 Инициализация базы данных workflow завершена!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка инициализации базы данных workflow:', error);
    process.exit(1);
  }
}

async function executeWorkflowSchema() {
  try {
    const schemaPath = path.join(__dirname, '../database-schema/workflow-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Разбиваем на отдельные команды
    const commands = schema
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (const command of commands) {
      if (command.trim()) {
        try {
          await sequelize.query(command);
        } catch (error) {
          // Игнорируем ошибки "уже существует"
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate object')) {
            console.warn('⚠️ Предупреждение при выполнении SQL:', error.message);
          }
        }
      }
    }
    
    console.log('✅ SQL схема выполнена');
  } catch (error) {
    console.error('❌ Ошибка выполнения SQL схемы:', error);
    throw error;
  }
}

async function createSampleWorkflows() {
  const transaction = await sequelize.transaction();
  
  try {
    // Получаем админа для создания workflow
    const admin = await User.findOne({
      where: { role: 'admin' },
      transaction
    });
    
    if (!admin) {
      console.warn('⚠️ Админ не найден, создаем системного пользователя');
      const systemAdmin = await User.create({
        username: 'system',
        email: 'system@workflow.local',
        password: 'system123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true
      }, { transaction });
      
      await createWorkflowExamples(systemAdmin.id, transaction);
    } else {
      await createWorkflowExamples(admin.id, transaction);
    }
    
    await transaction.commit();
    console.log('✅ Примеры workflow созданы');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Ошибка создания примеров workflow:', error);
    throw error;
  }
}

async function createWorkflowExamples(adminId, transaction) {
  // 1. Создаем workflow для инцидентов
  await createIncidentWorkflow(adminId, transaction);
  
  // 2. Создаем workflow для запросов на обслуживание
  await createServiceRequestWorkflow(adminId, transaction);
  
  // 3. Создаем workflow для запросов на изменения
  await createChangeRequestWorkflow(adminId, transaction);
}

async function createIncidentWorkflow(adminId, transaction) {
  console.log('📋 Создание workflow для инцидентов...');
  
  // Создаем тип workflow
  const incidentWorkflow = await WorkflowType.create({
    name: 'incident',
    displayName: {
      ru: 'Инцидент',
      en: 'Incident'
    },
    description: {
      ru: 'Workflow для обработки инцидентов',
      en: 'Workflow for incident management'
    },
    icon: 'alert-triangle',
    color: '#dc3545',
    isActive: true,
    isDefault: true,
    createdById: adminId
  }, { transaction });

  // Создаем статусы
  const statuses = await Promise.all([
    WorkflowStatus.create({
      workflowTypeId: incidentWorkflow.id,
      name: 'new',
      displayName: { ru: 'Новый', en: 'New' },
      description: { ru: 'Новый инцидент', en: 'New incident' },
      icon: 'plus-circle',
      color: '#007bff',
      category: 'open',
      isInitial: true,
      sortOrder: 1,
      responseHours: 1,
      slaHours: 4,
      notifyOnEnter: true,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: incidentWorkflow.id,
      name: 'assigned',
      displayName: { ru: 'Назначен', en: 'Assigned' },
      description: { ru: 'Инцидент назначен исполнителю', en: 'Incident assigned to agent' },
      icon: 'user-check',
      color: '#ffc107',
      category: 'active',
      sortOrder: 2,
      slaHours: 4,
      autoAssign: false,
      notifyOnEnter: true,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: incidentWorkflow.id,
      name: 'in_progress',
      displayName: { ru: 'В работе', en: 'In Progress' },
      description: { ru: 'Инцидент в работе', en: 'Incident in progress' },
      icon: 'play-circle',
      color: '#17a2b8',
      category: 'active',
      sortOrder: 3,
      slaHours: 2,
      notifyOnEnter: true,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: incidentWorkflow.id,
      name: 'on_hold',
      displayName: { ru: 'Приостановлен', en: 'On Hold' },
      description: { ru: 'Инцидент приостановлен', en: 'Incident on hold' },
      icon: 'pause-circle',
      color: '#6c757d',
      category: 'pending',
      sortOrder: 4,
      notifyOnEnter: true,
      notifyOnExit: true,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: incidentWorkflow.id,
      name: 'resolved',
      displayName: { ru: 'Решен', en: 'Resolved' },
      description: { ru: 'Инцидент решен', en: 'Incident resolved' },
      icon: 'check-circle',
      color: '#28a745',
      category: 'resolved',
      sortOrder: 5,
      notifyOnEnter: true,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: incidentWorkflow.id,
      name: 'closed',
      displayName: { ru: 'Закрыт', en: 'Closed' },
      description: { ru: 'Инцидент закрыт', en: 'Incident closed' },
      icon: 'x-circle',
      color: '#343a40',
      category: 'closed',
      isFinal: true,
      sortOrder: 6,
      notifyOnEnter: true,
      createdById: adminId
    }, { transaction })
  ]);

  // Создаем переходы
  const transitions = [
    // New -> Assigned
    {
      from: 'new', to: 'assigned',
      name: 'assign', displayName: { ru: 'Назначить', en: 'Assign' },
      requiresAssignment: true, allowedRoles: ['admin', 'agent']
    },
    // New -> In Progress
    {
      from: 'new', to: 'in_progress',
      name: 'start_work', displayName: { ru: 'Начать работу', en: 'Start Work' },
      allowedRoles: ['admin', 'agent']
    },
    // Assigned -> In Progress
    {
      from: 'assigned', to: 'in_progress',
      name: 'start_work', displayName: { ru: 'Начать работу', en: 'Start Work' },
      allowedRoles: ['admin', 'agent']
    },
    // In Progress -> On Hold
    {
      from: 'in_progress', to: 'on_hold',
      name: 'hold', displayName: { ru: 'Приостановить', en: 'Put On Hold' },
      requiresComment: true, allowedRoles: ['admin', 'agent']
    },
    // On Hold -> In Progress
    {
      from: 'on_hold', to: 'in_progress',
      name: 'resume', displayName: { ru: 'Возобновить', en: 'Resume' },
      allowedRoles: ['admin', 'agent']
    },
    // In Progress -> Resolved
    {
      from: 'in_progress', to: 'resolved',
      name: 'resolve', displayName: { ru: 'Решить', en: 'Resolve' },
      requiresComment: true, allowedRoles: ['admin', 'agent']
    },
    // Resolved -> Closed
    {
      from: 'resolved', to: 'closed',
      name: 'close', displayName: { ru: 'Закрыть', en: 'Close' },
      allowedRoles: ['admin', 'agent', 'client']
    },
    // Resolved -> In Progress (reopen)
    {
      from: 'resolved', to: 'in_progress',
      name: 'reopen', displayName: { ru: 'Переоткрыть', en: 'Reopen' },
      requiresComment: true, allowedRoles: ['admin', 'agent', 'client']
    }
  ];

  const statusMap = {};
  statuses.forEach(status => {
    statusMap[status.name] = status.id;
  });

  for (const transitionData of transitions) {
    const transition = await WorkflowTransition.create({
      workflowTypeId: incidentWorkflow.id,
      fromStatusId: statusMap[transitionData.from],
      toStatusId: statusMap[transitionData.to],
      name: transitionData.name,
      displayName: transitionData.displayName,
      icon: 'arrow-right',
      color: '#007bff',
      requiresComment: transitionData.requiresComment || false,
      requiresAssignment: transitionData.requiresAssignment || false,
      allowedRoles: transitionData.allowedRoles || [],
      createdById: adminId
    }, { transaction });

    // Добавляем действия для некоторых переходов
    if (transitionData.name === 'assign') {
      await WorkflowAction.create({
        transitionId: transition.id,
        actionType: 'notify',
        actionConfig: {
          recipients: ['assignee'],
          template: {
            subject: 'Вам назначен инцидент',
            body: 'Вам назначен инцидент {{ticket.title}}'
          }
        },
        executionOrder: 1
      }, { transaction });
    }

    if (transitionData.name === 'resolve') {
      await WorkflowAction.create({
        transitionId: transition.id,
        actionType: 'update_field',
        actionConfig: {
          fieldName: 'resolutionTime',
          fieldValue: '{{now}}'
        },
        executionOrder: 1
      }, { transaction });
    }
  }

  // Создаем версию
  await WorkflowVersion.create({
    workflowTypeId: incidentWorkflow.id,
    versionNumber: 1,
    description: 'Начальная версия workflow для инцидентов',
    configuration: { statuses: [], transitions: [] },
    isActive: true,
    isDraft: false,
    publishedAt: new Date(),
    createdById: adminId
  }, { transaction });

  console.log('✅ Workflow для инцидентов создан');
}

async function createServiceRequestWorkflow(adminId, transaction) {
  console.log('📋 Создание workflow для запросов на обслуживание...');
  
  const serviceWorkflow = await WorkflowType.create({
    name: 'service_request',
    displayName: {
      ru: 'Запрос на обслуживание',
      en: 'Service Request'
    },
    description: {
      ru: 'Workflow для обработки запросов на обслуживание',
      en: 'Workflow for service request management'
    },
    icon: 'tool',
    color: '#17a2b8',
    isActive: true,
    createdById: adminId
  }, { transaction });

  // Создаем упрощенные статусы для запросов на обслуживание
  const statuses = await Promise.all([
    WorkflowStatus.create({
      workflowTypeId: serviceWorkflow.id,
      name: 'submitted',
      displayName: { ru: 'Подан', en: 'Submitted' },
      icon: 'file-plus',
      color: '#007bff',
      category: 'open',
      isInitial: true,
      sortOrder: 1,
      responseHours: 2,
      slaHours: 24,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: serviceWorkflow.id,
      name: 'approved',
      displayName: { ru: 'Одобрен', en: 'Approved' },
      icon: 'check',
      color: '#28a745',
      category: 'active',
      sortOrder: 2,
      slaHours: 48,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: serviceWorkflow.id,
      name: 'in_fulfillment',
      displayName: { ru: 'Выполняется', en: 'In Fulfillment' },
      icon: 'settings',
      color: '#ffc107',
      category: 'active',
      sortOrder: 3,
      slaHours: 72,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: serviceWorkflow.id,
      name: 'completed',
      displayName: { ru: 'Выполнен', en: 'Completed' },
      icon: 'check-circle',
      color: '#28a745',
      category: 'resolved',
      isFinal: true,
      sortOrder: 4,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: serviceWorkflow.id,
      name: 'rejected',
      displayName: { ru: 'Отклонен', en: 'Rejected' },
      icon: 'x-circle',
      color: '#dc3545',
      category: 'closed',
      isFinal: true,
      sortOrder: 5,
      createdById: adminId
    }, { transaction })
  ]);

  console.log('✅ Workflow для запросов на обслуживание создан');
}

async function createChangeRequestWorkflow(adminId, transaction) {
  console.log('📋 Создание workflow для запросов на изменения...');
  
  const changeWorkflow = await WorkflowType.create({
    name: 'change_request',
    displayName: {
      ru: 'Запрос на изменение',
      en: 'Change Request'
    },
    description: {
      ru: 'Workflow для обработки запросов на изменения',
      en: 'Workflow for change request management'
    },
    icon: 'git-branch',
    color: '#6f42c1',
    isActive: true,
    createdById: adminId
  }, { transaction });

  // Создаем статусы для запросов на изменения (ITIL процесс)
  const statuses = await Promise.all([
    WorkflowStatus.create({
      workflowTypeId: changeWorkflow.id,
      name: 'draft',
      displayName: { ru: 'Черновик', en: 'Draft' },
      icon: 'edit',
      color: '#6c757d',
      category: 'open',
      isInitial: true,
      sortOrder: 1,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: changeWorkflow.id,
      name: 'submitted',
      displayName: { ru: 'Подан на рассмотрение', en: 'Submitted for Review' },
      icon: 'upload',
      color: '#007bff',
      category: 'active',
      sortOrder: 2,
      responseHours: 4,
      slaHours: 72,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: changeWorkflow.id,
      name: 'under_review',
      displayName: { ru: 'На рассмотрении', en: 'Under Review' },
      icon: 'search',
      color: '#ffc107',
      category: 'active',
      sortOrder: 3,
      slaHours: 120,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: changeWorkflow.id,
      name: 'approved',
      displayName: { ru: 'Одобрен', en: 'Approved' },
      icon: 'check',
      color: '#28a745',
      category: 'active',
      sortOrder: 4,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: changeWorkflow.id,
      name: 'scheduled',
      displayName: { ru: 'Запланирован', en: 'Scheduled' },
      icon: 'calendar',
      color: '#17a2b8',
      category: 'active',
      sortOrder: 5,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: changeWorkflow.id,
      name: 'in_implementation',
      displayName: { ru: 'Внедряется', en: 'In Implementation' },
      icon: 'play',
      color: '#fd7e14',
      category: 'active',
      sortOrder: 6,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: changeWorkflow.id,
      name: 'implemented',
      displayName: { ru: 'Внедрен', en: 'Implemented' },
      icon: 'check-circle',
      color: '#28a745',
      category: 'resolved',
      isFinal: true,
      sortOrder: 7,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: changeWorkflow.id,
      name: 'rejected',
      displayName: { ru: 'Отклонен', en: 'Rejected' },
      icon: 'x-circle',
      color: '#dc3545',
      category: 'closed',
      isFinal: true,
      sortOrder: 8,
      createdById: adminId
    }, { transaction }),
    
    WorkflowStatus.create({
      workflowTypeId: changeWorkflow.id,
      name: 'cancelled',
      displayName: { ru: 'Отменен', en: 'Cancelled' },
      icon: 'slash',
      color: '#6c757d',
      category: 'closed',
      isFinal: true,
      sortOrder: 9,
      createdById: adminId
    }, { transaction })
  ]);

  console.log('✅ Workflow для запросов на изменения создан');
}

// Запускаем инициализацию
initWorkflowDatabase();