const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const TicketContact = sequelize.define('TicketContact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  },
  role: {
    type: DataTypes.ENUM('watcher', 'additional_responsible', 'cc'),
    defaultValue: 'watcher',
    allowNull: false,
    comment: 'Роль контактного лица: watcher - наблюдатель, additional_responsible - дополнительный ответственный, cc - копия'
  },
  addedById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Кто добавил контактное лицо'
  },
  notifyOnStatusChange: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Уведомлять при изменении статуса'
  },
  notifyOnComments: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Уведомлять при добавлении комментариев'
  },
  notifyOnAssignment: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Уведомлять при назначении/переназначении'
  }
}, {
  timestamps: true,
  tableName: 'ticket_contacts',
  indexes: [
    {
      unique: true,
      fields: ['ticketId', 'userId'],
      name: 'unique_ticket_contact'
    },
    {
      fields: ['ticketId']
    },
    {
      fields: ['userId']
    }
  ]
});

module.exports = TicketContact;