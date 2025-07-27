require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Import utilities
const logger = require('./utils/logger');
const { metricsMiddleware, setupMetricsRoute } = require('./utils/metrics');
const setupSwagger = require('./utils/swagger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3007;

// Increase header size limits to prevent 431 errors
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure server with increased header limits
const server = require('http').createServer(app);
server.maxHeadersCount = 0; // Remove header count limit
server.headersTimeout = 60000; // 60 seconds
server.requestTimeout = 60000; // 60 seconds
server.maxHeaderSize = 16384; // 16KB header size limit (default is 8KB)

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://0.0.0.0:3000'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

// Request logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Metrics middleware
app.use(metricsMiddleware);

// Database connection
const { sequelize } = require('../config/database');

// Test database connection
async function testDbConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    
    // Sync models with database - temporarily disabled due to database permissions
    // Use alter: true to update existing tables without dropping data
    // await sequelize.sync({ alter: true });
    // logger.info('Database models synchronized.');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
  }
}

// Import models to ensure they are loaded before sync
require('./models');

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
server.listen(PORT, async () => {
  logger.info(`Server is running on port ${PORT}`);
  await testDbConnection();
  
  // Schedule SLA checks - temporarily disabled due to database permissions
  // const slaService = require('./services/slaService');
  // slaService.scheduleSlaChecks();
  
  // Update active tickets gauge initially and then every 5 minutes
  // Temporarily disabled until database tables are created
  /*
  const { Ticket } = require('./models');
  const { updateActiveTicketsGauge } = require('./utils/metrics');
  
  await updateActiveTicketsGauge(Ticket);
  setInterval(async () => {
    await updateActiveTicketsGauge(Ticket);
  }, 5 * 60 * 1000);
  */
});

// Handle server shutdown gracefully
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
  });
});

module.exports = app;