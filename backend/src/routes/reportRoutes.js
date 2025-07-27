const express = require('express');
const { query } = require('express-validator');
const reportController = require('../controllers/reportController');
const { authenticate, isStaff } = require('../middleware/auth');

const router = express.Router();

/**
 * @route GET /api/reports/tickets
 * @desc Generate tickets report
 * @access Private (Staff only)
 */
router.get(
  '/tickets',
  authenticate,
  isStaff,
  [
    query('startDate').optional().isDate(),
    query('endDate').optional().isDate()
  ],
  reportController.generateTicketsReport
);

/**
 * @route GET /api/reports/users
 * @desc Generate users report
 * @access Private (Staff only)
 */
router.get(
  '/users',
  authenticate,
  isStaff,
  [
    query('startDate').optional().isDate(),
    query('endDate').optional().isDate()
  ],
  reportController.generateUsersReport
);

/**
 * @route GET /api/reports/performance
 * @desc Generate performance report
 * @access Private (Staff only)
 */
router.get(
  '/performance',
  authenticate,
  isStaff,
  [
    query('startDate').optional().isDate(),
    query('endDate').optional().isDate()
  ],
  reportController.generatePerformanceReport
);

module.exports = router;