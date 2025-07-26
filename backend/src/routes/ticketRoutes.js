const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, query, param } = require('express-validator');
const ticketController = require('../controllers/ticketController');
const { authenticate, isStaff } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/attachments/')
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow all file types for now, but you can restrict if needed
    cb(null, true);
  }
});

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
    query('assignedToId').optional(),
    query('createdById').optional(),
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

/**
 * @route GET /api/tickets/:id
 * @desc Get ticket by ID
 * @access Private
 */
router.get(
  '/:id',
  authenticate,
  [
    param('id').notEmpty().withMessage('Ticket ID is required')
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
    param('id').notEmpty().withMessage('Ticket ID is required'),
    body('title').optional(),
    body('description').optional(),
    body('status').optional().isIn(['new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed']),
    body('priority').optional().isIn(['P1', 'P2', 'P3', 'P4']),
    body('category').optional().isIn(['incident', 'request', 'problem', 'change']),
    body('assignedToId').optional(),
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
    param('id').notEmpty().withMessage('Ticket ID is required'),
    body('content').notEmpty().withMessage('Comment content is required'),
    body('isInternal').optional().isBoolean(),
    body('telegramMessageId').optional()
  ],
  ticketController.addComment
);

/**
 * @route POST /api/tickets/:id/attachments
 * @desc Upload attachments to ticket
 * @access Private
 */
router.post(
  '/:id/attachments',
  authenticate,
  upload.array('files', 5), // Allow up to 5 files
  [
    param('id')
      .notEmpty()
      .withMessage('Ticket ID is required')
      .isUUID()
      .withMessage('Ticket ID must be a valid UUID')
  ],
  ticketController.uploadAttachments
);

/**
 * @route GET /api/tickets/:id/attachments/:attachmentId
 * @desc Download attachment
 * @access Private
 */
router.get(
  '/:id/attachments/:attachmentId',
  authenticate,
  [
    param('id').notEmpty().withMessage('Ticket ID is required'),
    param('attachmentId').notEmpty().withMessage('Attachment ID is required')
  ],
  ticketController.downloadAttachment
);

/**
 * @route DELETE /api/tickets/:id/attachments/:attachmentId
 * @desc Delete attachment
 * @access Private
 */
router.delete(
  '/:id/attachments/:attachmentId',
  authenticate,
  [
    param('id').notEmpty().withMessage('Ticket ID is required'),
    param('attachmentId').notEmpty().withMessage('Attachment ID is required')
  ],
  ticketController.deleteAttachment
);

module.exports = router;