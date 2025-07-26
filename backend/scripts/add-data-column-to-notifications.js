require('dotenv').config();
const { sequelize } = require('../config/database');

async function addDataColumn() {
  try {
    console.log('Adding data column to Notifications table...');
    
    // Add the data column
    await sequelize.query(`
      ALTER TABLE "Notifications" 
      ADD COLUMN IF NOT EXISTS "data" JSONB DEFAULT '{}'::jsonb;
    `);
    
    console.log('Successfully added data column to Notifications table');
    process.exit(0);
  } catch (error) {
    console.error('Error adding data column:', error);
    process.exit(1);
  }
}

addDataColumn();