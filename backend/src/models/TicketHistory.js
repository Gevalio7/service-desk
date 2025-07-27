const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const TicketHistory = sequelize.define('TicketHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  field: {
    type: DataTypes.STRING,
    allowNull: false
  },
  oldValue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  newValue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  action: {
    type: DataTypes.ENUM('create', 'update', 'delete', 'comment', 'attachment', 'sla_update', 'assign', 'contact_add', 'contact_remove', 'contact_update'),
    defaultValue: 'update'
  },
  ticketId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Tickets',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  tableName: 'ticket_histories'
});

module.exports = TicketHistory;