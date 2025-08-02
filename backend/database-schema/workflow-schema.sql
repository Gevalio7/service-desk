-- =====================================================
-- СХЕМА БАЗЫ ДАННЫХ ДЛЯ СИСТЕМЫ WORKFLOW
-- =====================================================

-- Таблица для хранения типов workflow (например: incident, service_request, change_request)
CREATE TABLE workflow_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name JSONB NOT NULL, -- Мультиязычные названия {"ru": "Инцидент", "en": "Incident"}
    description JSONB, -- Мультиязычные описания
    icon VARCHAR(50), -- Иконка (например, "bug", "service", "change")
    color VARCHAR(7) DEFAULT '#007bff', -- Цвет в HEX формате
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES "Users"(id),
    updated_by UUID REFERENCES "Users"(id)
);

-- Таблица для хранения пользовательских статусов
CREATE TABLE workflow_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type_id UUID NOT NULL REFERENCES workflow_types(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Системное имя статуса
    display_name JSONB NOT NULL, -- Мультиязычные названия
    description JSONB, -- Мультиязычные описания
    icon VARCHAR(50), -- Иконка статуса
    color VARCHAR(7) DEFAULT '#6c757d', -- Цвет статуса
    category VARCHAR(50) DEFAULT 'active', -- open, active, pending, resolved, closed
    is_initial BOOLEAN DEFAULT false, -- Начальный статус
    is_final BOOLEAN DEFAULT false, -- Финальный статус
    is_system BOOLEAN DEFAULT false, -- Системный статус (нельзя удалить)
    sort_order INTEGER DEFAULT 0, -- Порядок сортировки
    sla_hours INTEGER, -- SLA в часах для этого статуса
    response_hours INTEGER, -- Время ответа в часах
    auto_assign BOOLEAN DEFAULT false, -- Автоматическое назначение
    notify_on_enter BOOLEAN DEFAULT true, -- Уведомлять при входе в статус
    notify_on_exit BOOLEAN DEFAULT false, -- Уведомлять при выходе из статуса
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES "Users"(id),
    updated_by UUID REFERENCES "Users"(id),
    UNIQUE(workflow_type_id, name)
);

-- Таблица для хранения переходов между статусами
CREATE TABLE workflow_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type_id UUID NOT NULL REFERENCES workflow_types(id) ON DELETE CASCADE,
    from_status_id UUID REFERENCES workflow_statuses(id) ON DELETE CASCADE,
    to_status_id UUID NOT NULL REFERENCES workflow_statuses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Название перехода
    display_name JSONB NOT NULL, -- Мультиязычные названия
    description JSONB, -- Описание перехода
    icon VARCHAR(50), -- Иконка перехода
    color VARCHAR(7) DEFAULT '#007bff', -- Цвет перехода
    is_automatic BOOLEAN DEFAULT false, -- Автоматический переход
    requires_comment BOOLEAN DEFAULT false, -- Требует комментарий
    requires_assignment BOOLEAN DEFAULT false, -- Требует назначение
    allowed_roles TEXT[] DEFAULT '{}', -- Роли, которые могут выполнить переход
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES "Users"(id),
    updated_by UUID REFERENCES "Users"(id)
);

-- Таблица для условий переходов
CREATE TABLE workflow_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transition_id UUID NOT NULL REFERENCES workflow_transitions(id) ON DELETE CASCADE,
    condition_type VARCHAR(50) NOT NULL, -- field, role, time, custom
    field_name VARCHAR(100), -- Имя поля для проверки
    operator VARCHAR(20) NOT NULL, -- equals, not_equals, greater_than, less_than, contains, etc.
    expected_value TEXT, -- Ожидаемое значение
    condition_group INTEGER DEFAULT 1, -- Группа условий (для OR логики)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для действий при переходах (триггеры)
CREATE TABLE workflow_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transition_id UUID NOT NULL REFERENCES workflow_transitions(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- assign, notify, update_field, webhook, script
    action_config JSONB NOT NULL, -- Конфигурация действия
    execution_order INTEGER DEFAULT 0, -- Порядок выполнения
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица для версионирования workflow
CREATE TABLE workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type_id UUID NOT NULL REFERENCES workflow_types(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_name VARCHAR(100),
    description TEXT,
    configuration JSONB NOT NULL, -- Полная конфигурация workflow
    is_active BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT true,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES "Users"(id),
    UNIQUE(workflow_type_id, version_number)
);

-- Таблица для шаблонов workflow
CREATE TABLE workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name JSONB NOT NULL,
    description JSONB,
    category VARCHAR(50) DEFAULT 'general', -- itil, agile, custom, etc.
    template_data JSONB NOT NULL, -- Данные шаблона
    preview_image TEXT, -- URL превью изображения
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES "Users"(id)
);

-- Таблица для настроек уведомлений workflow
CREATE TABLE workflow_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_type_id UUID NOT NULL REFERENCES workflow_types(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- status_change, assignment, sla_breach, etc.
    notification_type VARCHAR(50) NOT NULL, -- email, telegram, webhook, in_app
    recipients JSONB NOT NULL, -- Получатели уведомлений
    template_config JSONB, -- Конфигурация шаблона
    conditions JSONB, -- Условия отправки
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES "Users"(id)
);

-- Таблица для логирования выполнения workflow
CREATE TABLE workflow_execution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES "Tickets"(id) ON DELETE CASCADE,
    workflow_type_id UUID NOT NULL REFERENCES workflow_types(id),
    from_status_id UUID REFERENCES workflow_statuses(id),
    to_status_id UUID NOT NULL REFERENCES workflow_statuses(id),
    transition_id UUID REFERENCES workflow_transitions(id),
    user_id UUID REFERENCES "Users"(id),
    execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    execution_duration INTEGER, -- Время выполнения в миллисекундах
    conditions_result JSONB, -- Результат проверки условий
    actions_result JSONB, -- Результат выполнения действий
    error_message TEXT, -- Сообщение об ошибке, если есть
    metadata JSONB -- Дополнительные метаданные
);

-- Обновляем таблицу Tickets для поддержки workflow
ALTER TABLE "Tickets" 
ADD COLUMN IF NOT EXISTS workflow_type_id UUID REFERENCES workflow_types(id),
ADD COLUMN IF NOT EXISTS current_status_id UUID REFERENCES workflow_statuses(id),
ADD COLUMN IF NOT EXISTS workflow_data JSONB DEFAULT '{}'; -- Дополнительные данные workflow

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_workflow_statuses_type_id ON workflow_statuses(workflow_type_id);
CREATE INDEX IF NOT EXISTS idx_workflow_statuses_category ON workflow_statuses(category);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_type_id ON workflow_transitions(workflow_type_id);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_from_status ON workflow_transitions(from_status_id);
CREATE INDEX IF NOT EXISTS idx_workflow_transitions_to_status ON workflow_transitions(to_status_id);
CREATE INDEX IF NOT EXISTS idx_workflow_conditions_transition_id ON workflow_conditions(transition_id);
CREATE INDEX IF NOT EXISTS idx_workflow_actions_transition_id ON workflow_actions(transition_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_log_ticket_id ON workflow_execution_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_log_execution_time ON workflow_execution_log(execution_time);
CREATE INDEX IF NOT EXISTS idx_tickets_workflow_type_id ON "Tickets"(workflow_type_id);
CREATE INDEX IF NOT EXISTS idx_tickets_current_status_id ON "Tickets"(current_status_id);

-- Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггеры для автоматического обновления updated_at
CREATE TRIGGER update_workflow_types_updated_at BEFORE UPDATE ON workflow_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_statuses_updated_at BEFORE UPDATE ON workflow_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_transitions_updated_at BEFORE UPDATE ON workflow_transitions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_templates_updated_at BEFORE UPDATE ON workflow_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workflow_notifications_updated_at BEFORE UPDATE ON workflow_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Комментарии к таблицам
COMMENT ON TABLE workflow_types IS 'Типы workflow (инциденты, запросы на обслуживание, изменения)';
COMMENT ON TABLE workflow_statuses IS 'Пользовательские статусы для каждого типа workflow';
COMMENT ON TABLE workflow_transitions IS 'Переходы между статусами';
COMMENT ON TABLE workflow_conditions IS 'Условия для выполнения переходов';
COMMENT ON TABLE workflow_actions IS 'Действия, выполняемые при переходах';
COMMENT ON TABLE workflow_versions IS 'Версионирование конфигураций workflow';
COMMENT ON TABLE workflow_templates IS 'Шаблоны workflow для быстрого создания';
COMMENT ON TABLE workflow_notifications IS 'Настройки уведомлений workflow';
COMMENT ON TABLE workflow_execution_log IS 'Лог выполнения workflow операций';