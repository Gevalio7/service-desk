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
    type: DataTypes.ENUM('technical', 'billing', 'general', 'feature_request'),
    defaultValue: 'general'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('new', 'open', 'in_progress', 'resolved', 'closed'),
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
    type: DataTypes.ENUM('web', 'email', 'telegram', 'api'),
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
        case 'urgent':
          ticket.responseDeadline = now.clone().add(30, 'minutes').toDate();
          ticket.slaDeadline = now.clone().add(4, 'hours').toDate();
          break;
        case 'high':
          ticket.responseDeadline = now.clone().add(2, 'hours').toDate();
          ticket.slaDeadline = now.clone().add(8, 'hours').toDate();
          break;
        case 'medium':
          ticket.responseDeadline = now.clone().add(4, 'hours').toDate();
          ticket.slaDeadline = now.clone().add(24, 'hours').toDate();
          break;
        case 'low':
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
          case 'urgent':
            ticket.slaDeadline = now.clone().add(4, 'hours').toDate();
            break;
          case 'high':
            ticket.slaDeadline = now.clone().add(8, 'hours').toDate();
            break;
          case 'medium':
            ticket.slaDeadline = now.clone().add(24, 'hours').toDate();
            break;
          case 'low':
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