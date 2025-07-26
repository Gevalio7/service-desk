require('dotenv').config();
const { sequelize } = require('../config/database');

// Import all models to ensure they are loaded
const { User } = require('../src/models');

async function initDatabase() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
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

initDatabase();