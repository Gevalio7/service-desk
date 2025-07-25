require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Sequelize } = require('sequelize');

// Import utilities
const logger = require('./utils/logger');
const { metricsMiddleware, setupMetricsRoute } = require('./utils/metrics');
const setupSwagger = require('./utils/swagger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Metrics middleware
app.use(metricsMiddleware);

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'servicedesk',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg)
  }
);

// Test database connection
async function testDbConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    
    // Sync models with database
    // In production, you might want to use migrations instead
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized.');
    }
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
  }
}

// Import routes
const apiRoutes = require('./routes');

// API routes
app.use('/api', apiRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Service Desk API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Setup Swagger documentation
setupSwagger(app);

// Setup metrics endpoint
setupMetricsRoute(app);

// Start server
app.listen(PORT, async () => {
  logger.info(`Server is running on port ${PORT}`);
  await testDbConnection();
  
  // Schedule SLA checks
  const slaService = require('./services/slaService');
  slaService.scheduleSlaChecks();
  
  // Update active tickets gauge initially and then every 5 minutes
  const { Ticket } = require('./models');
  const { updateActiveTicketsGauge } = require('./utils/metrics');
  
  await updateActiveTicketsGauge(Ticket);
  setInterval(async () => {
    await updateActiveTicketsGauge(Ticket);
  }, 5 * 60 * 1000);
});

module.exports = app;