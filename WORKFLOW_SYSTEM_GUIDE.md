# Руководство по системе управления Workflow

## Обзор системы

Система управления workflow предоставляет полнофункциональную платформу для создания и управления пользовательскими статусами тикетов, настройки переходов между ними, автоматизации процессов и контроля выполнения бизнес-правил.

## Основные возможности

### 🎯 Настраиваемые статусы
- Создание пользовательских статусов с мультиязычными названиями
- Настройка цветовых схем и иконок для визуального отображения
- Категоризация статусов (открытые, активные, ожидающие, решенные, закрытые)
- Настройка SLA и времени ответа для каждого статуса

### 🔄 Гибкие переходы
- Настройка переходов между статусами с условиями
- Ролевые ограничения на выполнение переходов
- Обязательные поля (комментарии, назначение)
- Автоматические переходы по условиям

### ⚡ Система условий и триггеров
- Условия на основе полей тикета, ролей пользователей, времени
- Автоматические действия при переходах (назначение, уведомления, обновление полей)
- Поддержка webhook'ов и пользовательских скриптов
- Группировка условий с логикой AND/OR

### 📊 Версионирование и аудит
- Система версий конфигураций workflow
- Полный аудит всех изменений
- Возможность отката к предыдущим версиям
- Логирование выполнения переходов

### 📤 Импорт/Экспорт
- Экспорт конфигураций workflow в JSON
- Импорт готовых шаблонов
- Библиотека предустановленных workflow (ITIL, Agile, Custom)

## Архитектура системы

### Основные компоненты

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  WorkflowType   │    │ WorkflowStatus  │    │WorkflowTransition│
│                 │    │                 │    │                 │
│ - name          │    │ - name          │    │ - name          │
│ - displayName   │◄───┤ - displayName   │◄───┤ - displayName   │
│ - icon/color    │    │ - icon/color    │    │ - conditions    │
│ - isActive      │    │ - category      │    │ - actions       │
└─────────────────┘    │ - slaHours      │    │ - allowedRoles  │
                       └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐    ┌─────────────────┐
                       │WorkflowCondition│    │ WorkflowAction  │
                       │                 │    │                 │
                       │ - conditionType │    │ - actionType    │
                       │ - operator      │◄───┤ - actionConfig  │
                       │ - expectedValue │    │ - executionOrder│
                       └─────────────────┘    └─────────────────┘
```

### Модели данных

#### WorkflowType
Определяет тип workflow (инцидент, запрос на обслуживание, изменение)
```javascript
{
  name: 'incident',
  displayName: { ru: 'Инцидент', en: 'Incident' },
  icon: 'alert-triangle',
  color: '#dc3545',
  isActive: true,
  isDefault: true
}
```

#### WorkflowStatus
Определяет статус в рамках workflow
```javascript
{
  name: 'in_progress',
  displayName: { ru: 'В работе', en: 'In Progress' },
  category: 'active',
  icon: 'play-circle',
  color: '#17a2b8',
  slaHours: 4,
  responseHours: 1,
  isInitial: false,
  isFinal: false
}
```

#### WorkflowTransition
Определяет переход между статусами
```javascript
{
  name: 'start_work',
  displayName: { ru: 'Начать работу', en: 'Start Work' },
  fromStatusId: 'uuid-new-status',
  toStatusId: 'uuid-in-progress-status',
  requiresComment: false,
  requiresAssignment: true,
  allowedRoles: ['admin', 'agent']
}
```

## API Reference

### Основные эндпоинты

#### Типы Workflow
```http
GET    /api/workflow/types                    # Получить все типы
POST   /api/workflow/types                    # Создать новый тип
GET    /api/workflow/types/:id                # Получить тип по ID
PUT    /api/workflow/types/:id                # Обновить тип
```

#### Статусы
```http
GET    /api/workflow/types/:id/statuses       # Получить статусы типа
POST   /api/workflow/types/:id/statuses       # Создать статус
PUT    /api/workflow/statuses/:id             # Обновить статус
```

#### Переходы
```http
GET    /api/workflow/types/:id/transitions    # Получить переходы типа
POST   /api/workflow/types/:id/transitions    # Создать переход
GET    /api/workflow/tickets/:id/transitions  # Доступные переходы для тикета
POST   /api/workflow/tickets/:id/transitions/:transitionId/execute # Выполнить переход
```

#### Статистика и аудит
```http
GET    /api/workflow/types/:id/stats          # Статистика workflow
GET    /api/workflow/tickets/:id/history      # История переходов тикета
```

#### Импорт/Экспорт
```http
GET    /api/workflow/types/:id/export         # Экспорт конфигурации
POST   /api/workflow/import                   # Импорт конфигурации
```

### Примеры использования API

#### Создание нового типа workflow
```javascript
const workflowType = await fetch('/api/workflow/types', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'custom_process',
    displayName: {
      ru: 'Пользовательский процесс',
      en: 'Custom Process'
    },
    description: {
      ru: 'Описание процесса',
      en: 'Process description'
    },
    icon: 'settings',
    color: '#6f42c1',
    isActive: true
  })
});
```

#### Выполнение перехода статуса
```javascript
const result = await fetch(`/api/workflow/tickets/${ticketId}/transitions/${transitionId}/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    comment: 'Начинаю работу над тикетом',
    assigneeId: 'user-uuid',
    context: {
      priority: 'high',
      department: 'IT'
    }
  })
});
```

## Настройка системы

### 1. Инициализация базы данных

```bash
# Выполнить миграцию схемы workflow
node backend/scripts/init-workflow-db.js
```

### 2. Создание базового workflow

```javascript
// Пример создания простого workflow
const workflowService = require('./src/services/workflowService');

// Создать тип workflow
const workflowType = await workflowService.createWorkflowType({
  name: 'simple_task',
  displayName: { ru: 'Простая задача', en: 'Simple Task' },
  icon: 'check-square',
  color: '#28a745'
}, adminUserId);

// Создать статусы
const statuses = [
  { name: 'todo', displayName: { ru: 'К выполнению', en: 'To Do' }, isInitial: true },
  { name: 'doing', displayName: { ru: 'Выполняется', en: 'Doing' } },
  { name: 'done', displayName: { ru: 'Выполнено', en: 'Done' }, isFinal: true }
];

// Создать переходы
const transitions = [
  { from: 'todo', to: 'doing', name: 'start' },
  { from: 'doing', to: 'done', name: 'complete' },
  { from: 'done', to: 'doing', name: 'reopen' }
];
```

### 3. Настройка условий и действий

#### Условия перехода
```javascript
// Условие: только админы и агенты могут закрывать тикеты
{
  conditionType: 'role',
  operator: 'in',
  expectedValue: '["admin", "agent"]'
}

// Условие: тикет должен быть назначен
{
  conditionType: 'field',
  fieldName: 'assignedToId',
  operator: 'is_not_empty'
}

// Условие: прошло более 24 часов с создания
{
  conditionType: 'time',
  fieldName: 'createdAt',
  operator: 'greater_than',
  expectedValue: '1440' // минуты
}
```

#### Действия при переходе
```javascript
// Уведомить назначенного пользователя
{
  actionType: 'notify',
  actionConfig: {
    recipients: ['assignee'],
    template: {
      subject: 'Тикет назначен вам',
      body: 'Вам назначен тикет: {{ticket.title}}'
    }
  }
}

// Обновить поле
{
  actionType: 'update_field',
  actionConfig: {
    fieldName: 'priority',
    fieldValue: 'high'
  }
}

// Вызвать webhook
{
  actionType: 'webhook',
  actionConfig: {
    url: 'https://api.example.com/webhook',
    headers: { 'Authorization': 'Bearer token' }
  }
}
```

## Предустановленные шаблоны

### 1. ITIL Incident Management
- **Статусы**: New → Assigned → In Progress → On Hold → Resolved → Closed
- **SLA**: Автоматический расчет на основе приоритета
- **Эскалация**: Автоматическая эскалация при нарушении SLA

### 2. Service Request Workflow
- **Статусы**: Submitted → Approved → In Fulfillment → Completed / Rejected
- **Утверждение**: Обязательное утверждение для определенных типов запросов
- **Уведомления**: Автоматические уведомления на каждом этапе

### 3. Change Management (ITIL)
- **Статусы**: Draft → Submitted → Under Review → Approved → Scheduled → In Implementation → Implemented
- **CAB процесс**: Интеграция с процессом Change Advisory Board
- **Планирование**: Обязательное планирование изменений

### 4. Agile/Kanban
- **Статусы**: Backlog → To Do → In Progress → Review → Done
- **Лимиты WIP**: Ограничения на количество задач в статусе
- **Метрики**: Время цикла, пропускная способность

## Миграция с существующей системы

### Пошаговый план миграции

1. **Анализ текущих статусов**
   ```sql
   SELECT DISTINCT status FROM "Tickets";
   ```

2. **Создание соответствующих workflow**
   - Создать WorkflowType для каждого типа тикета
   - Создать WorkflowStatus для каждого существующего статуса
   - Настроить переходы между статусами

3. **Миграция данных**
   ```sql
   -- Обновить тикеты для использования новой системы
   UPDATE "Tickets" SET 
     workflow_type_id = (SELECT id FROM workflow_types WHERE name = 'incident'),
     current_status_id = (SELECT id FROM workflow_statuses WHERE name = status);
   ```

4. **Тестирование**
   - Проверить все переходы статусов
   - Убедиться в корректности работы условий и действий
   - Протестировать уведомления и автоматизацию

### Скрипт миграции
```javascript
// backend/scripts/migrate-to-workflow.js
const { Ticket, WorkflowType, WorkflowStatus } = require('../src/models');

async function migrateTicketsToWorkflow() {
  // Получить все тикеты с старыми статусами
  const tickets = await Ticket.findAll();
  
  // Получить workflow по умолчанию
  const defaultWorkflow = await WorkflowType.findOne({ where: { isDefault: true } });
  
  for (const ticket of tickets) {
    // Найти соответствующий статус в новой системе
    const status = await WorkflowStatus.findOne({
      where: {
        workflowTypeId: defaultWorkflow.id,
        name: ticket.status
      }
    });
    
    if (status) {
      await ticket.update({
        workflowTypeId: defaultWorkflow.id,
        currentStatusId: status.id
      });
    }
  }
}
```

## Мониторинг и аналитика

### Метрики производительности
- Время выполнения переходов
- Количество нарушений SLA
- Распределение тикетов по статусам
- Эффективность автоматизации

### Дашборды
```javascript
// Получить статистику workflow
const stats = await fetch(`/api/workflow/types/${workflowTypeId}/stats?startDate=2024-01-01&endDate=2024-12-31`);

// Результат:
{
  performance: {
    totalExecutions: 1250,
    avgDuration: 145, // миллисекунды
    successRate: 98.4,
    errorRate: 1.6
  },
  statusDistribution: [
    { statusName: 'new', ticketCount: 45 },
    { statusName: 'in_progress', ticketCount: 123 },
    { statusName: 'resolved', ticketCount: 890 }
  ]
}
```

## Лучшие практики

### 1. Проектирование workflow
- Начинайте с простых процессов
- Используйте понятные названия статусов
- Минимизируйте количество переходов
- Документируйте бизнес-правила

### 2. Настройка условий
- Тестируйте условия на тестовых данных
- Используйте группировку условий для сложной логики
- Избегайте циклических зависимостей

### 3. Автоматизация
- Начинайте с простых действий (уведомления)
- Тестируйте webhook'и в изолированной среде
- Используйте версионирование для отката изменений

### 4. Производительность
- Индексируйте поля, используемые в условиях
- Ограничивайте сложность пользовательских скриптов
- Мониторьте время выполнения переходов

## Устранение неполадок

### Частые проблемы

1. **Переход не выполняется**
   - Проверьте права пользователя
   - Убедитесь, что все условия выполнены
   - Проверьте логи выполнения

2. **Действия не срабатывают**
   - Проверьте конфигурацию действий
   - Убедитесь в доступности внешних сервисов
   - Проверьте порядок выполнения действий

3. **Низкая производительность**
   - Оптимизируйте условия переходов
   - Используйте индексы базы данных
   - Ограничьте сложность пользовательских скриптов

### Логирование и отладка
```javascript
// Включить подробное логирование
process.env.WORKFLOW_DEBUG = 'true';

// Просмотр логов выполнения
const history = await fetch(`/api/workflow/tickets/${ticketId}/history?includeDetails=true`);
```

## Заключение

Система управления workflow предоставляет мощные возможности для автоматизации и оптимизации бизнес-процессов. Правильная настройка и использование системы позволит значительно повысить эффективность работы службы поддержки и улучшить качество обслуживания клиентов.

Для получения дополнительной помощи обращайтесь к API документации или создавайте issues в репозитории проекта.