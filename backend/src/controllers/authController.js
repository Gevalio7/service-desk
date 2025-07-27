const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { validationResult } = require('express-validator');
const { User } = require('../models');
const { logger } = require('../../config/database');

// JWT secret key - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Ошибка валидации данных',
        errors: errors.array()
      });
    }

    const { username, email, password, firstName, lastName, role, department, company } = req.body;
    
    // Additional validation
    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({
        message: 'Все обязательные поля должны быть заполнены'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { 
        [Op.or]: [{ email }, { username }] 
      } 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }
    
    // Create new user
    const user = await User.create({
      username,
      email,
      password, // Will be hashed by the model hook
      firstName,
      lastName,
      role: role || 'client',
      department,
      company
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Return user data (without password) and token
    const userData = user.toJSON();
    delete userData.password;
    
    res.status(201).json({
      message: 'User registered successfully',
      user: userData,
      token
    });
  } catch (error) {
    logger.error('Error in register controller:', error);
    res.status(500).json({ 
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    logger.info('🔐 Login attempt started', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('❌ Login validation failed', {
        errors: errors.array(),
        ip: req.ip
      });
      return res.status(400).json({
        message: 'Ошибка валидации данных',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    logger.info('📧 Login attempt for email', {
      email: email,
      hasPassword: !!password,
      ip: req.ip
    });
    
    // Additional validation
    if (!email || !password) {
      logger.warn('❌ Missing email or password', {
        hasEmail: !!email,
        hasPassword: !!password,
        ip: req.ip
      });
      return res.status(400).json({
        message: 'Email и пароль обязательны для заполнения'
      });
    }
    
    // Find user by email
    logger.info('🔍 Searching for user in database', { email });
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      logger.warn('❌ User not found', {
        email,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    logger.info('👤 User found, checking password', {
      userId: user.id,
      username: user.username,
      email: user.email
    });
    
    // Check if password is correct
    const isPasswordValid = await user.isValidPassword(password);
    
    if (!isPasswordValid) {
      logger.warn('❌ Invalid password', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    logger.info('✅ Password valid, proceeding with login', {
      userId: user.id,
      email: user.email
    });
    
    // Update last login time
    logger.info('🕒 Updating last login time', { userId: user.id });
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    logger.info('🎫 Generating JWT token', { userId: user.id, role: user.role });
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    // Return user data (without password) and token
    const userData = user.toJSON();
    delete userData.password;
    
    logger.info('✅ Login successful', {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.status(200).json({
      message: 'Login successful',
      user: userData,
      token
    });
  } catch (error) {
    logger.error('💥 Error in login controller:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    logger.info('👤 Getting user profile', {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // User is already attached to req by auth middleware
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      logger.warn('❌ User not found in getProfile', {
        userId: req.user?.id,
        ip: req.ip
      });
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user data without password
    const userData = user.toJSON();
    delete userData.password;
    
    logger.info('✅ Profile retrieved successfully', {
      userId: user.id,
      username: user.username,
      email: user.email,
      ip: req.ip
    });
    
    res.status(200).json({
      user: userData
    });
  } catch (error) {
    logger.error('💥 Error in getProfile controller:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      ip: req.ip
    });
    res.status(500).json({
      message: 'Error getting user profile',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, department, company, telegramId } = req.body;
    
    // Find user
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (department) user.department = department;
    if (company) user.company = company;
    if (telegramId) user.telegramId = telegramId;
    
    await user.save();
    
    // Return updated user data without password
    const userData = user.toJSON();
    delete userData.password;
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: userData
    });
  } catch (error) {
    logger.error('Error in updateProfile controller:', error);
    res.status(500).json({ 
      message: 'Error updating user profile',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};