const express = require('express');
const { body, param, query } = require('express-validator');
const workflowController = require('../controllers/workflowController');
const { authenticate, isStaff, isAdmin } = require('../middleware/auth');

const router = express.Router();

// ========================================
// WORKFLOW TYPES ROUTES
// ========================================

/**
 * @route GET /api/workflow/types
 * @desc Get all workflow types
 * @access Private (Staff only)
 */
router.get(
  '/types',
  authenticate,
  isStaff,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('isActive').optional().isBoolean()
  ],
  workflowController.getWorkflowTypes
);

/**
 * @route GET /api/workflow/types/:id
 * @desc Get workflow type by ID
 * @access Private (Staff only)
 */
router.get(
  '/types/:id',
  authenticate,
  isStaff,
  [
    param('id').isUUID().withMessage('Invalid workflow type ID')
  ],
  workflowController.getWorkflowTypeById
);

/**
 * @route POST /api/workflow/types
 * @desc Create new workflow type
 * @access Private (Admin only)
 */
router.post(
  '/types',
  authenticate,
  isAdmin,
  [
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isAlphanumeric()
      .withMessage('Name must be alphanumeric'),
    body('displayName')
      .isObject()
      .withMessage('Display name must be an object')
      .custom((value) => {
        if (!value.ru && !value.en) {
          throw new Error('Display name must contain at least ru or en translation');
        }
        return true;
      }),
    body('description').optional().isObject(),
    body('icon').optional().isString().isLength({ max: 50 }),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    body('isActive').optional().isBoolean(),
    body('isDefault').optional().isBoolean()
  ],
  workflowController.createWorkflowType
);

/**
 * @route PUT /api/workflow/types/:id
 * @desc Update workflow type
 * @access Private (Admin only)
 */
router.put(
  '/types/:id',
  authenticate,
  isAdmin,
  [
    param('id').isUUID().withMessage('Invalid workflow type ID'),
    body('name').optional().isAlphanumeric().withMessage('Name must be alphanumeric'),
    body('displayName').optional().isObject(),
    body('description').optional().isObject(),
    body('icon').optional().isString().isLength({ max: 50 }),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    body('isActive').optional().isBoolean(),
    body('isDefault').optional().isBoolean()
  ],
  workflowController.updateWorkflowType
);

// ========================================
// WORKFLOW STATUSES ROUTES
// ========================================

/**
 * @route GET /api/workflow/types/:workflowTypeId/statuses
 * @desc Get statuses for workflow type
 * @access Private (Staff only)
 */
router.get(
  '/types/:workflowTypeId/statuses',
  authenticate,
  isStaff,
  [
    param('workflowTypeId').isUUID().withMessage('Invalid workflow type ID'),
    query('includeInactive').optional().isBoolean()
  ],
  workflowController.getWorkflowStatuses
);

/**
 * @route POST /api/workflow/types/:workflowTypeId/statuses
 * @desc Create new workflow status
 * @access Private (Admin only)
 */
router.post(
  '/types/:workflowTypeId/statuses',
  authenticate,
  isAdmin,
  [
    param('workflowTypeId').isUUID().withMessage('Invalid workflow type ID'),
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isAlphanumeric()
      .withMessage('Name must be alphanumeric'),
    body('displayName')
      .isObject()
      .withMessage('Display name must be an object'),
    body('description').optional().isObject(),
    body('icon').optional().isString().isLength({ max: 50 }),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    body('category').optional().isIn(['open', 'active', 'pending', 'resolved', 'closed']),
    body('isInitial').optional().isBoolean(),
    body('isFinal').optional().isBoolean(),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('slaHours').optional().isInt({ min: 0 }),
    body('responseHours').optional().isInt({ min: 0 }),
    body('autoAssign').optional().isBoolean(),
    body('notifyOnEnter').optional().isBoolean(),
    body('notifyOnExit').optional().isBoolean()
  ],
  workflowController.createWorkflowStatus
);

/**
 * @route PUT /api/workflow/statuses/:statusId
 * @desc Update workflow status
 * @access Private (Admin only)
 */
router.put(
  '/statuses/:statusId',
  authenticate,
  isAdmin,
  [
    param('statusId').isUUID().withMessage('Invalid status ID'),
    body('name').optional().isAlphanumeric().withMessage('Name must be alphanumeric'),
    body('displayName').optional().isObject(),
    body('description').optional().isObject(),
    body('icon').optional().isString().isLength({ max: 50 }),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    body('category').optional().isIn(['open', 'active', 'pending', 'resolved', 'closed']),
    body('isInitial').optional().isBoolean(),
    body('isFinal').optional().isBoolean(),
    body('sortOrder').optional().isInt({ min: 0 }),
    body('slaHours').optional().isInt({ min: 0 }),
    body('responseHours').optional().isInt({ min: 0 }),
    body('autoAssign').optional().isBoolean(),
    body('notifyOnEnter').optional().isBoolean(),
    body('notifyOnExit').optional().isBoolean(),
    body('isActive').optional().isBoolean()
  ],
  workflowController.updateWorkflowStatus
);

// ========================================
// WORKFLOW TRANSITIONS ROUTES
// ========================================

/**
 * @route GET /api/workflow/types/:workflowTypeId/transitions
 * @desc Get transitions for workflow type
 * @access Private (Staff only)
 */
router.get(
  '/types/:workflowTypeId/transitions',
  authenticate,
  isStaff,
  [
    param('workflowTypeId').isUUID().withMessage('Invalid workflow type ID'),
    query('includeInactive').optional().isBoolean()
  ],
  workflowController.getWorkflowTransitions
);

/**
 * @route POST /api/workflow/types/:workflowTypeId/transitions
 * @desc Create new workflow transition
 * @access Private (Admin only)
 */
router.post(
  '/types/:workflowTypeId/transitions',
  authenticate,
  isAdmin,
  [
    param('workflowTypeId').isUUID().withMessage('Invalid workflow type ID'),
    body('name').notEmpty().withMessage('Name is required'),
    body('displayName').isObject().withMessage('Display name must be an object'),
    body('description').optional().isObject(),
    body('fromStatusId').optional().isUUID().withMessage('Invalid from status ID'),
    body('toStatusId').isUUID().withMessage('To status ID is required'),
    body('icon').optional().isString().isLength({ max: 50 }),
    body('color').optional().matches(/^#[0-9A-F]{6}$/i).withMessage('Color must be a valid hex color'),
    body('isAutomatic').optional().isBoolean(),
    body('requiresComment').optional().isBoolean(),
    body('requiresAssignment').optional().isBoolean(),
    body('allowedRoles').optional().isArray(),
    body('allowedRoles.*').isIn(['admin', 'agent', 'client', 'system']),
    body('sortOrder').optional().isInt({ min: 0 })
  ],
  workflowController.createWorkflowTransition
);

// ========================================
// WORKFLOW EXECUTION ROUTES
// ========================================

/**
 * @route GET /api/workflow/tickets/:ticketId/transitions
 * @desc Get available transitions for ticket
 * @access Private
 */
router.get(
  '/tickets/:ticketId/transitions',
  authenticate,
  [
    param('ticketId').isUUID().withMessage('Invalid ticket ID')
  ],
  workflowController.getAvailableTransitions
);

/**
 * @route POST /api/workflow/tickets/:ticketId/transitions/:transitionId/execute
 * @desc Execute workflow transition
 * @access Private
 */
router.post(
  '/tickets/:ticketId/transitions/:transitionId/execute',
  authenticate,
  [
    param('ticketId').isUUID().withMessage('Invalid ticket ID'),
    param('transitionId').isUUID().withMessage('Invalid transition ID'),
    body('comment').optional().isString(),
    body('assigneeId').optional().isUUID().withMessage('Invalid assignee ID'),
    body('context').optional().isObject()
  ],
  workflowController.executeTransition
);

/**
 * @route GET /api/workflow/tickets/:ticketId/history
 * @desc Get workflow execution history for ticket
 * @access Private
 */
router.get(
  '/tickets/:ticketId/history',
  authenticate,
  [
    param('ticketId').isUUID().withMessage('Invalid ticket ID'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('includeDetails').optional().isBoolean()
  ],
  workflowController.getTicketWorkflowHistory
);

// ========================================
// WORKFLOW STATISTICS ROUTES
// ========================================

/**
 * @route GET /api/workflow/types/:workflowTypeId/stats
 * @desc Get workflow statistics
 * @access Private (Staff only)
 */
router.get(
  '/types/:workflowTypeId/stats',
  authenticate,
  isStaff,
  [
    param('workflowTypeId').isUUID().withMessage('Invalid workflow type ID'),
    query('startDate').optional().isISO8601().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().withMessage('Invalid end date')
  ],
  workflowController.getWorkflowStats
);

// ========================================
// WORKFLOW IMPORT/EXPORT ROUTES
// ========================================

/**
 * @route GET /api/workflow/types/:workflowTypeId/export
 * @desc Export workflow configuration
 * @access Private (Admin only)
 */
router.get(
  '/types/:workflowTypeId/export',
  authenticate,
  isAdmin,
  [
    param('workflowTypeId').isUUID().withMessage('Invalid workflow type ID')
  ],
  workflowController.exportWorkflowConfiguration
);

/**
 * @route POST /api/workflow/import
 * @desc Import workflow configuration
 * @access Private (Admin only)
 */
router.post(
  '/import',
  authenticate,
  isAdmin,
  [
    body('workflowType').isObject().withMessage('Workflow type configuration is required'),
    body('statuses').isArray().withMessage('Statuses array is required'),
    body('transitions').isArray().withMessage('Transitions array is required')
  ],
  workflowController.importWorkflowConfiguration
);

// ========================================
// WORKFLOW VERSIONS ROUTES
// ========================================

/**
 * @route GET /api/workflow/types/:workflowTypeId/versions
 * @desc Get workflow versions
 * @access Private (Staff only)
 */
router.get(
  '/types/:workflowTypeId/versions',
  authenticate,
  isStaff,
  [
    param('workflowTypeId').isUUID().withMessage('Invalid workflow type ID'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  workflowController.getWorkflowVersions
);

/**
 * @route POST /api/workflow/types/:workflowTypeId/versions
 * @desc Create new workflow version
 * @access Private (Admin only)
 */
router.post(
  '/types/:workflowTypeId/versions',
  authenticate,
  isAdmin,
  [
    param('workflowTypeId').isUUID().withMessage('Invalid workflow type ID'),
    body('description').optional().isString()
  ],
  workflowController.createWorkflowVersion
);

/**
 * @route PUT /api/workflow/versions/:versionId/activate
 * @desc Activate workflow version
 * @access Private (Admin only)
 */
router.put(
  '/versions/:versionId/activate',
  authenticate,
  isAdmin,
  [
    param('versionId').isUUID().withMessage('Invalid version ID')
  ],
  workflowController.activateWorkflowVersion
);

module.exports = router;