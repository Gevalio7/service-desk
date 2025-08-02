const express = require('express');
const authRoutes = require('./authRoutes');
const ticketRoutes = require('./ticketRoutes');
const userRoutes = require('./userRoutes');
const notificationRoutes = require('./notificationRoutes');
const reportRoutes = require('./reportRoutes');
const workflowRoutes = require('./workflowRoutes');

const router = express.Router();

// API routes
router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/workflow', workflowRoutes);

module.exports = router;