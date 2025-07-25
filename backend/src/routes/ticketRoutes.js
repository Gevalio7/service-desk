const express = require('express');
const { body, query, param } = require('express-validator');
const ticketController = require('../controllers/ticketController');
const { authenticate, isStaff } = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/tickets
 * @desc Create a new ticket
 * @access Private
 */
router.post(
  '/',
  authenticate,
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('category').optional().isIn(['incident', 'request', 'problem', 'change']),
    body('priority').optional().isIn(['P1', 'P2', 'P3', 'P4']),
    body('tags').optional().isArray(),
    body('source').optional().isIn(['web', 'email', 'telegram', 'phone']),
    body('telegramMessageId').optional()
  ],
  ticketController.createTicket
);

/**
 * @route GET /api/tickets
 * @desc Get all tickets with filtering
 * @access Private
 */
router.get(
  '/',
  authenticate,
  [
    query('status').optional(),
    query('priority').optional(),
    query('category').optional(),
    query('assignedToId').optional().isUUID(),
    query('createdById').optional().isUUID(),
    query('startDate').optional().isDate(),
    query('endDate').optional().isDate(),
    query('search').optional(),
    query('tags').optional(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sortBy').optional(),
    query('sortOrder').optional().isIn(['ASC', 'DESC'])
  ],
  ticketController.getTickets
);

/**
 * @route GET /api/tickets/:id
 * @desc Get ticket by ID
 * @access Private
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid ticket ID')
  ],
  ticketController.getTicketById
);

/**
 * @route PUT /api/tickets/:id
 * @desc Update ticket
 * @access Private
 */
router.put(
  '/:id',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid ticket ID'),
    body('title').optional(),
    body('description').optional(),
    body('status').optional().isIn(['new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed']),
    body('priority').optional().isIn(['P1', 'P2', 'P3', 'P4']),
    body('category').optional().isIn(['incident', 'request', 'problem', 'change']),
    body('assignedToId').optional().isUUID(),
    body('tags').optional().isArray()
  ],
  ticketController.updateTicket
);

/**
 * @route POST /api/tickets/:id/comments
 * @desc Add comment to ticket
 * @access Private
 */
router.post(
  '/:id/comments',
  authenticate,
  [
    param('id').isUUID().withMessage('Invalid ticket ID'),
    body('content').notEmpty().withMessage('Comment content is required'),
    body('isInternal').optional().isBoolean(),
    body('telegramMessageId').optional()
  ],
  ticketController.addComment
);

/**
 * @route GET /api/tickets/metrics/sla
 * @desc Get SLA metrics
 * @access Private (Staff only)
 */
router.get(
  '/metrics/sla',
  authenticate,
  isStaff,
  [
    query('startDate').optional().isDate(),
    query('endDate').optional().isDate()
  ],
  ticketController.getSlaMetrics
);

/**
 * @route GET /api/tickets/export
 * @desc Export tickets to CSV
 * @access Private
 */
router.get(
  '/export',
  authenticate,
  [
    query('status').optional(),
    query('priority').optional(),
    query('category').optional(),
    query('startDate').optional().isDate(),
    query('endDate').optional().isDate()
  ],
  ticketController.exportTickets
);

module.exports = router;