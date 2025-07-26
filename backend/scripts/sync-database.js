require('dotenv').config();
const { sequelize } = require('../config/database');

// Import all models to ensure they are registered
require('../src/models');

async function syncDatabase() {
  try {
    console.log('Synchronizing database schema...');
    
    // Sync database with alter: true to add missing columns
    await sequelize.sync({ alter: true });
    
    console.log('Database schema synchronized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error synchronizing database:', error);
    process.exit(1);
  }
}

syncDatabase();