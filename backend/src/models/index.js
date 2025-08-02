const User = require('./User');
const Ticket = require('./Ticket');
const Comment = require('./Comment');
const Attachment = require('./Attachment');
const TicketHistory = require('./TicketHistory');
const Notification = require('./Notification');
const TicketContact = require('./TicketContact');

// Workflow models
const WorkflowType = require('./WorkflowType');
const WorkflowStatus = require('./WorkflowStatus');
const WorkflowTransition = require('./WorkflowTransition');
const WorkflowCondition = require('./WorkflowCondition');
const WorkflowAction = require('./WorkflowAction');
const WorkflowVersion = require('./WorkflowVersion');
const WorkflowExecutionLog = require('./WorkflowExecutionLog');

// Define relationships

// User - Ticket relationships
User.hasMany(Ticket, {
  as: 'createdTickets',
  foreignKey: 'createdById'
});
Ticket.belongsTo(User, {
  as: 'createdBy',
  foreignKey: 'createdById'
});

User.hasMany(Ticket, {
  as: 'assignedTickets',
  foreignKey: 'assignedToId'
});
Ticket.belongsTo(User, {
  as: 'assignedTo',
  foreignKey: 'assignedToId'
});

// Ticket - Comment relationships
Ticket.hasMany(Comment, {
  foreignKey: 'ticketId',
  onDelete: 'CASCADE'
});
Comment.belongsTo(Ticket, {
  foreignKey: 'ticketId'
});

// User - Comment relationships
User.hasMany(Comment, {
  foreignKey: 'userId'
});
Comment.belongsTo(User, {
  foreignKey: 'userId'
});

// Ticket - Attachment relationships
Ticket.hasMany(Attachment, {
  foreignKey: 'ticketId',
  onDelete: 'CASCADE'
});
Attachment.belongsTo(Ticket, {
  foreignKey: 'ticketId'
});

// Comment - Attachment relationships (for attachments in comments)
Comment.hasMany(Attachment, {
  foreignKey: 'commentId',
  onDelete: 'CASCADE'
});
Attachment.belongsTo(Comment, {
  foreignKey: 'commentId'
});

// Ticket - TicketHistory relationships
Ticket.hasMany(TicketHistory, {
  foreignKey: 'ticketId',
  onDelete: 'CASCADE'
});
TicketHistory.belongsTo(Ticket, {
  foreignKey: 'ticketId'
});

// User - TicketHistory relationships
User.hasMany(TicketHistory, {
  foreignKey: 'userId'
});
TicketHistory.belongsTo(User, {
  foreignKey: 'userId'
});

// User - Notification relationships
User.hasMany(Notification, {
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});
Notification.belongsTo(User, {
  foreignKey: 'userId'
});

// Ticket - TicketContact relationships (many-to-many через промежуточную таблицу)
Ticket.hasMany(TicketContact, {
  foreignKey: 'ticketId',
  onDelete: 'CASCADE'
});
TicketContact.belongsTo(Ticket, {
  foreignKey: 'ticketId'
});

// User - TicketContact relationships
User.hasMany(TicketContact, {
  as: 'contactTickets',
  foreignKey: 'userId',
  onDelete: 'CASCADE'
});
TicketContact.belongsTo(User, {
  as: 'contactUser',
  foreignKey: 'userId'
});

// User - TicketContact relationships (кто добавил контакт)
User.hasMany(TicketContact, {
  as: 'addedContacts',
  foreignKey: 'addedById'
});
TicketContact.belongsTo(User, {
  as: 'addedBy',
  foreignKey: 'addedById'
});

// Связь многие-ко-многим между Ticket и User через TicketContact
Ticket.belongsToMany(User, {
  through: TicketContact,
  as: 'contacts',
  foreignKey: 'ticketId',
  otherKey: 'userId'
});
User.belongsToMany(Ticket, {
  through: TicketContact,
  as: 'watchedTickets',
  foreignKey: 'userId',
  otherKey: 'ticketId'
});

// ========================================
// WORKFLOW RELATIONSHIPS
// ========================================

// User - WorkflowType relationships
User.hasMany(WorkflowType, {
  as: 'createdWorkflowTypes',
  foreignKey: 'createdById'
});
WorkflowType.belongsTo(User, {
  as: 'createdBy',
  foreignKey: 'createdById'
});

User.hasMany(WorkflowType, {
  as: 'updatedWorkflowTypes',
  foreignKey: 'updatedById'
});
WorkflowType.belongsTo(User, {
  as: 'updatedBy',
  foreignKey: 'updatedById'
});

// WorkflowType - WorkflowStatus relationships
WorkflowType.hasMany(WorkflowStatus, {
  foreignKey: 'workflowTypeId',
  onDelete: 'CASCADE'
});
WorkflowStatus.belongsTo(WorkflowType, {
  foreignKey: 'workflowTypeId'
});

// User - WorkflowStatus relationships
User.hasMany(WorkflowStatus, {
  as: 'createdWorkflowStatuses',
  foreignKey: 'createdById'
});
WorkflowStatus.belongsTo(User, {
  as: 'createdBy',
  foreignKey: 'createdById'
});

User.hasMany(WorkflowStatus, {
  as: 'updatedWorkflowStatuses',
  foreignKey: 'updatedById'
});
WorkflowStatus.belongsTo(User, {
  as: 'updatedBy',
  foreignKey: 'updatedById'
});

// WorkflowType - WorkflowTransition relationships
WorkflowType.hasMany(WorkflowTransition, {
  foreignKey: 'workflowTypeId',
  onDelete: 'CASCADE'
});
WorkflowTransition.belongsTo(WorkflowType, {
  foreignKey: 'workflowTypeId'
});

// WorkflowStatus - WorkflowTransition relationships
WorkflowStatus.hasMany(WorkflowTransition, {
  as: 'transitionsFrom',
  foreignKey: 'fromStatusId',
  onDelete: 'CASCADE'
});
WorkflowTransition.belongsTo(WorkflowStatus, {
  as: 'fromStatus',
  foreignKey: 'fromStatusId'
});

WorkflowStatus.hasMany(WorkflowTransition, {
  as: 'transitionsTo',
  foreignKey: 'toStatusId',
  onDelete: 'CASCADE'
});
WorkflowTransition.belongsTo(WorkflowStatus, {
  as: 'toStatus',
  foreignKey: 'toStatusId'
});

// User - WorkflowTransition relationships
User.hasMany(WorkflowTransition, {
  as: 'createdWorkflowTransitions',
  foreignKey: 'createdById'
});
WorkflowTransition.belongsTo(User, {
  as: 'createdBy',
  foreignKey: 'createdById'
});

User.hasMany(WorkflowTransition, {
  as: 'updatedWorkflowTransitions',
  foreignKey: 'updatedById'
});
WorkflowTransition.belongsTo(User, {
  as: 'updatedBy',
  foreignKey: 'updatedById'
});

// WorkflowTransition - WorkflowCondition relationships
WorkflowTransition.hasMany(WorkflowCondition, {
  foreignKey: 'transitionId',
  onDelete: 'CASCADE'
});
WorkflowCondition.belongsTo(WorkflowTransition, {
  foreignKey: 'transitionId'
});

// WorkflowTransition - WorkflowAction relationships
WorkflowTransition.hasMany(WorkflowAction, {
  foreignKey: 'transitionId',
  onDelete: 'CASCADE'
});
WorkflowAction.belongsTo(WorkflowTransition, {
  foreignKey: 'transitionId'
});

// WorkflowType - WorkflowVersion relationships
WorkflowType.hasMany(WorkflowVersion, {
  foreignKey: 'workflowTypeId',
  onDelete: 'CASCADE'
});
WorkflowVersion.belongsTo(WorkflowType, {
  foreignKey: 'workflowTypeId'
});

// User - WorkflowVersion relationships
User.hasMany(WorkflowVersion, {
  as: 'createdWorkflowVersions',
  foreignKey: 'createdById'
});
WorkflowVersion.belongsTo(User, {
  as: 'createdBy',
  foreignKey: 'createdById'
});

// Ticket - Workflow relationships
Ticket.belongsTo(WorkflowType, {
  foreignKey: 'workflowTypeId'
});
WorkflowType.hasMany(Ticket, {
  foreignKey: 'workflowTypeId'
});

Ticket.belongsTo(WorkflowStatus, {
  as: 'currentStatus',
  foreignKey: 'currentStatusId'
});
WorkflowStatus.hasMany(Ticket, {
  as: 'ticketsInStatus',
  foreignKey: 'currentStatusId'
});

// WorkflowExecutionLog relationships
Ticket.hasMany(WorkflowExecutionLog, {
  foreignKey: 'ticketId',
  onDelete: 'CASCADE'
});
WorkflowExecutionLog.belongsTo(Ticket, {
  foreignKey: 'ticketId'
});

WorkflowType.hasMany(WorkflowExecutionLog, {
  foreignKey: 'workflowTypeId'
});
WorkflowExecutionLog.belongsTo(WorkflowType, {
  foreignKey: 'workflowTypeId'
});

WorkflowStatus.hasMany(WorkflowExecutionLog, {
  as: 'executionsFrom',
  foreignKey: 'fromStatusId'
});
WorkflowExecutionLog.belongsTo(WorkflowStatus, {
  as: 'fromStatus',
  foreignKey: 'fromStatusId'
});

WorkflowStatus.hasMany(WorkflowExecutionLog, {
  as: 'executionsTo',
  foreignKey: 'toStatusId'
});
WorkflowExecutionLog.belongsTo(WorkflowStatus, {
  as: 'toStatus',
  foreignKey: 'toStatusId'
});

WorkflowTransition.hasMany(WorkflowExecutionLog, {
  foreignKey: 'transitionId'
});
WorkflowExecutionLog.belongsTo(WorkflowTransition, {
  as: 'transition',
  foreignKey: 'transitionId'
});

User.hasMany(WorkflowExecutionLog, {
  foreignKey: 'userId'
});
WorkflowExecutionLog.belongsTo(User, {
  as: 'user',
  foreignKey: 'userId'
});

module.exports = {
  User,
  Ticket,
  Comment,
  Attachment,
  TicketHistory,
  Notification,
  TicketContact,
  // Workflow models
  WorkflowType,
  WorkflowStatus,
  WorkflowTransition,
  WorkflowCondition,
  WorkflowAction,
  WorkflowVersion,
  WorkflowExecutionLog
};