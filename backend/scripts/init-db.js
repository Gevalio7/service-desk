require('dotenv').config();
const { sequelize } = require('../config/database');

// Import all models to ensure they are loaded
const { User, TicketContact } = require('../src/models');

async function initDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    console.log('Checking and updating database schema...');
    await ensureTicketTableSchema();
    await ensureTicketContactsTable();
    console.log('Database schema updated successfully.');
    
    console.log('Creating default users...');
    await createDefaultUsers();
    console.log('Default users created successfully.');
    
    console.log('Database initialization completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

async function ensureTicketTableSchema() {
  try {
    console.log('Ensuring Tickets table has all required columns...');
    
    // Добавляем колонку category
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "category" VARCHAR(255) 
      CHECK ("category" IN ('technical', 'billing', 'general', 'feature_request'))
      DEFAULT 'general';
    `);

    // Добавляем колонку priority
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "priority" VARCHAR(255) 
      CHECK ("priority" IN ('low', 'medium', 'high', 'urgent'))
      DEFAULT 'medium';
    `);

    // Добавляем колонку status
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) 
      CHECK ("status" IN ('new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed'))
      DEFAULT 'new';
    `);

    // Добавляем колонку source
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "source" VARCHAR(255) 
      CHECK ("source" IN ('web', 'email', 'telegram', 'api'))
      DEFAULT 'web';
    `);

    // Добавляем колонку tags (массив строк)
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';
    `);

    // Добавляем колонку telegramMessageId
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "telegramMessageId" VARCHAR(255);
    `);

    // Добавляем колонки для SLA
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "slaDeadline" TIMESTAMP WITH TIME ZONE;
    `);

    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "responseDeadline" TIMESTAMP WITH TIME ZONE;
    `);

    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "firstResponseTime" TIMESTAMP WITH TIME ZONE;
    `);

    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "resolutionTime" TIMESTAMP WITH TIME ZONE;
    `);

    // Добавляем булевые колонки для отслеживания нарушений SLA
    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "slaBreach" BOOLEAN DEFAULT FALSE;
    `);

    await sequelize.query(`
      ALTER TABLE "Tickets" 
      ADD COLUMN IF NOT EXISTS "responseBreach" BOOLEAN DEFAULT FALSE;
    `);

    // Обновляем существующие записи со значениями по умолчанию
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

    await sequelize.query(`
      UPDATE "Tickets" 
      SET "status" = 'new' 
      WHERE "status" IS NULL;
    `);

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

    console.log('✓ Tickets table schema is up to date');
  } catch (error) {
    console.error('Error updating Tickets table schema:', error);
    throw error;
  }
}

async function createDefaultUsers() {
  try {
    const users = [
      {
        username: 'admin',
        email: 'admin@servicedesk.com',
        password: 'admin123',
        firstName: 'Администратор',
        lastName: 'Системы',
        role: 'admin',
        department: 'IT',
        company: 'Service Desk'
      },
      {
        username: 'agent',
        email: 'agent@servicedesk.com',
        password: 'agent123',
        firstName: 'Агент',
        lastName: 'Поддержки',
        role: 'agent',
        department: 'Support',
        company: 'Service Desk'
      },
      {
        username: 'client',
        email: 'client@servicedesk.com',
        password: 'client123',
        firstName: 'Клиент',
        lastName: 'Тестовый',
        role: 'client',
        department: 'Sales',
        company: 'Test Company'
      }
    ];

    const { Op } = require('sequelize');
    
    for (const userData of users) {
      // Check if user already exists by email or username
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: userData.email },
            { username: userData.username }
          ]
        }
      });
      
      if (!existingUser) {
        await User.create(userData);
        console.log(`Created user: ${userData.email}`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }
    
    console.log('Default users setup completed:');
    console.log('- Admin: admin@servicedesk.com / admin123');
    console.log('- Agent: agent@servicedesk.com / agent123');
    console.log('- Client: client@servicedesk.com / client123');
  } catch (error) {
    console.error('Error creating default users:', error);
    throw error;
  }
}

async function ensureTicketContactsTable() {
  try {
    console.log('Ensuring ticket_contacts table exists...');
    
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

    console.log('✓ ticket_contacts table is up to date');
  } catch (error) {
    console.error('Error updating ticket_contacts table schema:', error);
    throw error;
  }
}

initDatabase();