require('dotenv').config();
const { sequelize } = require('../config/database');

async function addDescriptionColumn() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    console.log('Adding description column to TicketHistories table...');
    
    // Add description column to TicketHistories table
    await sequelize.query('ALTER TABLE "TicketHistories" ADD COLUMN IF NOT EXISTS "description" TEXT;');
    
    console.log('Description column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error adding description column:', error);
    process.exit(1);
  }
}

addDescriptionColumn();