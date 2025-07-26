require('dotenv').config();
const { sequelize } = require('../config/database');

async function updateEnums() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    console.log('Updating enum types...');
    
    // Drop and recreate enum types
    await sequelize.query('DROP TYPE IF EXISTS enum_tickets_category CASCADE;');
    await sequelize.query("CREATE TYPE enum_tickets_category AS ENUM ('incident', 'request', 'problem', 'change');");
    
    await sequelize.query('DROP TYPE IF EXISTS enum_tickets_priority CASCADE;');
    await sequelize.query("CREATE TYPE enum_tickets_priority AS ENUM ('P1', 'P2', 'P3', 'P4');");
    
    await sequelize.query('DROP TYPE IF EXISTS enum_tickets_status CASCADE;');
    await sequelize.query("CREATE TYPE enum_tickets_status AS ENUM ('new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed');");
    
    await sequelize.query('DROP TYPE IF EXISTS enum_tickets_source CASCADE;');
    await sequelize.query("CREATE TYPE enum_tickets_source AS ENUM ('web', 'email', 'telegram', 'phone');");
    
    // Update table columns to use new enum types
    await sequelize.query('ALTER TABLE "Tickets" ALTER COLUMN "category" TYPE enum_tickets_category USING "category"::text::enum_tickets_category;');
    await sequelize.query('ALTER TABLE "Tickets" ALTER COLUMN "priority" TYPE enum_tickets_priority USING "priority"::text::enum_tickets_priority;');
    await sequelize.query('ALTER TABLE "Tickets" ALTER COLUMN "status" TYPE enum_tickets_status USING "status"::text::enum_tickets_status;');
    await sequelize.query('ALTER TABLE "Tickets" ALTER COLUMN "source" TYPE enum_tickets_source USING "source"::text::enum_tickets_source;');
    
    // Set default values
    await sequelize.query('ALTER TABLE "Tickets" ALTER COLUMN "category" SET DEFAULT \'request\';');
    await sequelize.query('ALTER TABLE "Tickets" ALTER COLUMN "priority" SET DEFAULT \'P3\';');
    
    console.log('Enum types updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating enum types:', error);
    process.exit(1);
  }
}

updateEnums();