const { Op } = require('sequelize');
const { User, Ticket } = require('../models');
const { logger } = require('../../config/database');

// Trigger nodemon restart
/**
 * Get all users with filtering
 * Admin and agent only
 */
exports.getUsers = async (req, res) => {
  try {
    // Role-based access control
    if (req.user.role === 'client') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const {
      role,
      search,
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;
    
    // Build filter conditions
    const where = {};
    
    // Filter by role
    if (role) {
      where.role = role;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    // Filter by search term (username, email, firstName, lastName)
    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Calculate pagination
    const offset = (page - 1) * limit;
    
    // Get users with pagination
    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Calculate total pages
    const totalPages = Math.ceil(count / limit);
    
    res.status(200).json({
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages
      }
    });
  } catch (error) {
    logger.error('Error in getUsers controller:', error);
    res.status(500).json({ 
      message: 'Error getting users',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Get user by ID
 * Admin and agent only, or self
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Role-based access control
    if (req.user.role === 'client' && req.user.id !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Get user
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user statistics
    const stats = {
      totalTickets: await Ticket.count({ where: { createdById: id } }),
      openTickets: await Ticket.count({ 
        where: { 
          createdById: id,
          status: { [Op.notIn]: ['resolved', 'closed'] }
        } 
      })
    };
    
    // If user is an agent, get assigned tickets
    if (user.role === 'agent' || user.role === 'admin') {
      stats.assignedTickets = await Ticket.count({ where: { assignedToId: id } });
      stats.assignedOpenTickets = await Ticket.count({ 
        where: { 
          assignedToId: id,
          status: { [Op.notIn]: ['resolved', 'closed'] }
        } 
      });
    }
    
    res.status(200).json({
      user,
      stats
    });
  } catch (error) {
    logger.error('Error in getUserById controller:', error);
    res.status(500).json({ 
      message: 'Error getting user',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Create a new user
 * Admin only
 */
exports.createUser = async (req, res) => {
  try {
    // Role-based access control
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { 
      username, 
      email, 
      password, 
      firstName, 
      lastName, 
      role, 
      department, 
      company,
      telegramId
    } = req.body;
    
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
      password,
      firstName,
      lastName,
      role: role || 'client',
      department,
      company,
      telegramId,
      isActive: true
    });
    
    // Return user data without password
    const userData = user.toJSON();
    delete userData.password;
    
    res.status(201).json({
      message: 'User created successfully',
      user: userData
    });
  } catch (error) {
    logger.error('Error in createUser controller:', error);
    res.status(500).json({ 
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Update user
 * Admin only, or self (limited fields)
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      firstName, 
      lastName, 
      role, 
      department, 
      company,
      telegramId,
      isActive
    } = req.body;
    
    // Get user
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Role-based access control
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // Users can update their own profile, but not role or active status
    if (req.user.role !== 'admin') {
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (department) user.department = department;
      if (company) user.company = company;
      if (telegramId) user.telegramId = telegramId;
    } else {
      // Admins can update all fields
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (role) user.role = role;
      if (department) user.department = department;
      if (company) user.company = company;
      if (telegramId) user.telegramId = telegramId;
      if (isActive !== undefined) user.isActive = isActive;
    }
    
    await user.save();
    
    // Return user data without password
    const userData = user.toJSON();
    delete userData.password;
    
    res.status(200).json({
      message: 'User updated successfully',
      user: userData
    });
  } catch (error) {
    logger.error('Error in updateUser controller:', error);
    res.status(500).json({ 
      message: 'Error updating user',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Delete user (soft delete by setting isActive to false)
 * Admin only
 */
exports.deleteUser = async (req, res) => {
  try {
    // Role-based access control
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { id } = req.params;
    
    // Get user
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting yourself
    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Soft delete by setting isActive to false
    user.isActive = false;
    await user.save();
    
    res.status(200).json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error in deleteUser controller:', error);
    res.status(500).json({ 
      message: 'Error deleting user',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Change user password
 * Admin can change any user's password, users can change their own
 */
exports.changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    // Get user
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Role-based access control
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // If not admin, verify current password
    if (req.user.role !== 'admin') {
      const isPasswordValid = await user.isValidPassword(currentPassword);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error in changePassword controller:', error);
    res.status(500).json({
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};
