const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const moment = require('moment');

const Ticket = sequelize.define('Ticket', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('incident', 'request', 'problem', 'change'),
    defaultValue: 'request'
  },
  priority: {
    type: DataTypes.ENUM('P1', 'P2', 'P3', 'P4'),
    defaultValue: 'P3'
  },
  status: {
    type: DataTypes.ENUM('new', 'assigned', 'in_progress', 'on_hold', 'resolved', 'closed'),
    defaultValue: 'new'
  },
  slaDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  responseDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  firstResponseTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolutionTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  slaBreach: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  responseBreach: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  source: {
    type: DataTypes.ENUM('web', 'email', 'telegram', 'phone'),
    defaultValue: 'web'
  },
  telegramMessageId: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: (ticket) => {
      // Calculate SLA deadlines based on priority
      const now = moment();
      
      // Set response deadline
      switch(ticket.priority) {
        case 'P1':
          ticket.responseDeadline = now.clone().add(30, 'minutes').toDate();
          ticket.slaDeadline = now.clone().add(4, 'hours').toDate();
          break;
        case 'P2':
          ticket.responseDeadline = now.clone().add(2, 'hours').toDate();
          ticket.slaDeadline = now.clone().add(8, 'hours').toDate();
          break;
        case 'P3':
          ticket.responseDeadline = now.clone().add(4, 'hours').toDate();
          ticket.slaDeadline = now.clone().add(24, 'hours').toDate();
          break;
        case 'P4':
          ticket.responseDeadline = now.clone().add(8, 'hours').toDate();
          ticket.slaDeadline = now.clone().add(48, 'hours').toDate();
          break;
        default:
          ticket.responseDeadline = now.clone().add(4, 'hours').toDate();
          ticket.slaDeadline = now.clone().add(24, 'hours').toDate();
      }
    },
    beforeUpdate: (ticket) => {
      // Update SLA if priority changes
      if (ticket.changed('priority')) {
        const now = moment();
        
        switch(ticket.priority) {
          case 'P1':
            ticket.slaDeadline = now.clone().add(4, 'hours').toDate();
            break;
          case 'P2':
            ticket.slaDeadline = now.clone().add(8, 'hours').toDate();
            break;
          case 'P3':
            ticket.slaDeadline = now.clone().add(24, 'hours').toDate();
            break;
          case 'P4':
            ticket.slaDeadline = now.clone().add(48, 'hours').toDate();
            break;
        }
      }
      
      // Set resolution time when status changes to resolved
      if (ticket.changed('status') && ticket.status === 'resolved' && !ticket.resolutionTime) {
        ticket.resolutionTime = new Date();
        
        // Check if SLA was breached
        if (moment().isAfter(ticket.slaDeadline)) {
          ticket.slaBreach = true;
        }
      }
      
      // Set first response time when status changes from new to anything else
      if (ticket.changed('status') && 
          ticket.previous('status') === 'new' && 
          ticket.status !== 'new' && 
          !ticket.firstResponseTime) {
        ticket.firstResponseTime = new Date();
        
        // Check if response SLA was breached
        if (moment().isAfter(ticket.responseDeadline)) {
          ticket.responseBreach = true;
        }
      }
    }
  }
});

module.exports = Ticket;