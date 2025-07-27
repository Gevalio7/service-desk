require('dotenv').config();
const { sequelize } = require('../config/database');

async function createTicketContactsTable() {
  try {
    console.log('Создание таблицы ticket_contacts...');
    
    // Создаем ENUM для роли контактного лица
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE ticket_contact_role AS ENUM ('watcher', 'additional_responsible', 'cc');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Создаем таблицу ticket_contacts
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "ticket_contacts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticketId" UUID NOT NULL REFERENCES "Tickets"("id") ON DELETE CASCADE,
        "userId" UUID NOT NULL REFERENCES "Users"("id") ON DELETE CASCADE,
        "role" ticket_contact_role DEFAULT 'watcher' NOT NULL,
        "addedById" UUID NOT NULL REFERENCES "Users"("id"),
        "notifyOnStatusChange" BOOLEAN DEFAULT true,
        "notifyOnComments" BOOLEAN DEFAULT true,
        "notifyOnAssignment" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT "unique_ticket_contact" UNIQUE ("ticketId", "userId")
      );
    `);

    // Создаем индексы
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "ticket_contacts_ticket_id" ON "ticket_contacts" ("ticketId");
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS "ticket_contacts_user_id" ON "ticket_contacts" ("userId");
    `);

    // Добавляем комментарии к колонкам
    await sequelize.query(`
      COMMENT ON COLUMN "ticket_contacts"."role" IS 'Роль контактного лица: watcher - наблюдатель, additional_responsible - дополнительный ответственный, cc - копия';
    `);

    await sequelize.query(`
      COMMENT ON COLUMN "ticket_contacts"."addedById" IS 'Кто добавил контактное лицо';
    `);

    await sequelize.query(`
      COMMENT ON COLUMN "ticket_contacts"."notifyOnStatusChange" IS 'Уведомлять при изменении статуса';
    `);

    await sequelize.query(`
      COMMENT ON COLUMN "ticket_contacts"."notifyOnComments" IS 'Уведомлять при добавлении комментариев';
    `);

    await sequelize.query(`
      COMMENT ON COLUMN "ticket_contacts"."notifyOnAssignment" IS 'Уведомлять при назначении/переназначении';
    `);

    console.log('✓ Таблица ticket_contacts успешно создана');
    
    // Проверяем, что таблица создалась
    const result = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ticket_contacts';
    `);
    
    if (result[0].length > 0) {
      console.log('✓ Таблица ticket_contacts найдена в базе данных');
    } else {
      throw new Error('Таблица ticket_contacts не была создана');
    }

    process.exit(0);
  } catch (error) {
    console.error('Ошибка при создании таблицы ticket_contacts:', error);
    process.exit(1);
  }
}

createTicketContactsTable();