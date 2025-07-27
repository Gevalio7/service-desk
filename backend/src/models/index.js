const User = require('./User');
const Ticket = require('./Ticket');
const Comment = require('./Comment');
const Attachment = require('./Attachment');
const TicketHistory = require('./TicketHistory');
const Notification = require('./Notification');
const TicketContact = require('./TicketContact');

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

module.exports = {
  User,
  Ticket,
  Comment,
  Attachment,
  TicketHistory,
  Notification,
  TicketContact
};