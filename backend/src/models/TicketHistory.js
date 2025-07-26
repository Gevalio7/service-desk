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
    type: DataTypes.ENUM('create', 'update', 'delete', 'comment', 'attachment', 'sla_update'),
    defaultValue: 'update'
  },
}, {
  timestamps: true
});

module.exports = TicketHistory;