const express = require('express');
const { body, query, param } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate, isAdmin, isStaff } = require('../middleware/auth');

const router = express.Router();

/**
 * @route GET /api/users
 * @desc Get all users with filtering
 * @access Private (Staff only)
 */
router.get(
  '/',
  authenticate,
  isStaff,
  [
    query('role').optional().isIn(['admin', 'agent', 'client']),
    query('search').optional(),
    query('isActive').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional(),
    query('sortOrder').optional().isIn(['ASC', 'DESC'])
  ],
  userController.getUsers
);

/**
 * @route GET /api/users/:id
 * @desc Get user by ID
 * @access Private (Staff or self)
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid user ID')
  ],
  userController.getUserById
);

/**
 * @route POST /api/users
 * @desc Create a new user
 * @access Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  isAdmin,
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('role').optional().isIn(['admin', 'agent', 'client']),
    body('department').optional(),
    body('company').optional(),
    body('telegramId').optional()
  ],
  userController.createUser
);

/**
 * @route PUT /api/users/:id
 * @desc Update user
 * @access Private (Admin or self)
 */
router.put(
  '/:id',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('firstName').optional(),
    body('lastName').optional(),
    body('role').optional().isIn(['admin', 'agent', 'client']),
    body('department').optional(),
    body('company').optional(),
    body('telegramId').optional(),
    body('isActive').optional().isBoolean()
  ],
  userController.updateUser
);

/**
 * @route DELETE /api/users/:id
 * @desc Delete user (soft delete)
 * @access Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  [
    param('id').isUUID().withMessage('Invalid user ID')
  ],
  userController.deleteUser
);

/**
 * @route PUT /api/users/:id/password
 * @desc Change user password
 * @access Private (Admin or self)
 */
router.put(
  '/:id/password',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid user ID'),
    body('currentPassword').optional(),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  userController.changePassword
);

module.exports = router;