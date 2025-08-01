const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { logger } = require('../../config/database');

// JWT secret key - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Service API token for internal services like Telegram bot
const SERVICE_API_TOKEN = process.env.SERVICE_API_TOKEN || 'service-desk-api-token';

/**
 * Middleware to authenticate JWT token
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Check if it's a service API token (for Telegram bot)
    if (token === SERVICE_API_TOKEN) {
      // For service token, skip user validation - let controller handle createdById
      req.user = {
        id: null, // Will be handled by controller
        role: 'system'
      };
      return next();
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user
    const user = await User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ message: 'User account is inactive' });
    }
    
    // Attach user to request
    req.user = {
      id: user.id,
      role: user.role
    };
    
    next();
  } catch (error) {
    logger.error('Error in authenticate middleware:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

/**
 * Middleware to check if user is admin
 */
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied, admin only' });
  }
  
  next();
};

/**
 * Middleware to check if user is admin or agent
 */
exports.isStaff = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'agent') {
    return res.status(403).json({ message: 'Access denied, staff only' });
  }
  
  next();
};