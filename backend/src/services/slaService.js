const moment = require('moment');
const { Op } = require('sequelize');
const { Ticket, User, TicketHistory } = require('../models');
const { logger } = require('../../config/database');
const notificationService = require('./notificationService');

/**
 * Check tickets for SLA breaches
 */
exports.checkSlaBreaches = async () => {
  try {
    logger.info('Checking tickets for SLA breaches...');
    
    // Get all open tickets that haven't breached SLA yet
    const tickets = await Ticket.findAll({
      where: {
        status: {
          [Op.notIn]: ['resolved', 'closed']
        },
        slaBreach: false
      },
      include: [
        {
          model: User,
          as: 'assignedTo'
        },
        {
          model: User,
          as: 'createdBy'
        }
      ]
    });
    
    const now = moment();
    const breachedTickets = [];
    const warningTickets = [];
    
    for (const ticket of tickets) {
      const slaDeadline = moment(ticket.slaDeadline);
      
      // Check if SLA is breached
      if (now.isAfter(slaDeadline)) {
        // Update ticket
        ticket.slaBreach = true;
        await ticket.save();
        
        // Create history entry
        await TicketHistory.create({
          ticketId: ticket.id,
          field: 'slaBreach',
          oldValue: 'false',
          newValue: 'true',
          action: 'sla_update',
          description: 'SLA breached'
        });
        
        breachedTickets.push(ticket);
      }
      // Check if SLA is about to breach (within 1 hour)
      else if (now.isAfter(slaDeadline.clone().subtract(1, 'hour'))) {
        warningTickets.push(ticket);
      }
    }
    
    // Send notifications for breached tickets
    for (const ticket of breachedTickets) {
      // Notify assigned agent
      if (ticket.assignedTo) {
        await notificationService.sendNotification({
          userId: ticket.assignedTo.id,
          title: 'SLA Breach',
          message: `SLA breached for ticket ${ticket.id}: ${ticket.title}`,
          type: 'sla_breach',
          data: {
            ticketId: ticket.id
          }
        });
        
        // Send Telegram notification if user has Telegram ID
        if (ticket.assignedTo.telegramId) {
          await notificationService.sendTelegramNotification(
            ticket.assignedTo.telegramId,
            `🚨 SLA BREACH: Ticket #${ticket.id} "${ticket.title}" has breached its SLA deadline.`
          );
        }
      }
      
      // Notify admin users
      const admins = await User.findAll({
        where: {
          role: 'admin',
          isActive: true
        }
      });
      
      for (const admin of admins) {
        await notificationService.sendNotification({
          userId: admin.id,
          title: 'SLA Breach',
          message: `SLA breached for ticket ${ticket.id}: ${ticket.title}`,
          type: 'sla_breach',
          data: {
            ticketId: ticket.id
          }
        });
        
        // Send Telegram notification if admin has Telegram ID
        if (admin.telegramId) {
          await notificationService.sendTelegramNotification(
            admin.telegramId,
            `🚨 SLA BREACH: Ticket #${ticket.id} "${ticket.title}" has breached its SLA deadline.`
          );
        }
      }
    }
    
    // Send warnings for tickets about to breach SLA
    for (const ticket of warningTickets) {
      // Notify assigned agent
      if (ticket.assignedTo) {
        await notificationService.sendNotification({
          userId: ticket.assignedTo.id,
          title: 'SLA Warning',
          message: `SLA deadline approaching for ticket ${ticket.id}: ${ticket.title}`,
          type: 'sla_warning',
          data: {
            ticketId: ticket.id
          }
        });
        
        // Send Telegram notification if user has Telegram ID
        if (ticket.assignedTo.telegramId) {
          await notificationService.sendTelegramNotification(
            ticket.assignedTo.telegramId,
            `⚠️ SLA WARNING: Ticket #${ticket.id} "${ticket.title}" will breach SLA in less than 1 hour.`
          );
        }
      }
    }
    
    logger.info(`SLA check completed. Found ${breachedTickets.length} breached tickets and ${warningTickets.length} tickets about to breach.`);
    
    return {
      breachedTickets: breachedTickets.length,
      warningTickets: warningTickets.length
    };
  } catch (error) {
    logger.error('Error checking SLA breaches:', error);
    throw error;
  }
};

/**
 * Check tickets for response SLA breaches
 */
exports.checkResponseBreaches = async () => {
  try {
    logger.info('Checking tickets for response SLA breaches...');
    
    // Get all new tickets that haven't breached response SLA yet
    const tickets = await Ticket.findAll({
      where: {
        status: 'new',
        responseBreach: false
      },
      include: [
        {
          model: User,
          as: 'createdBy'
        }
      ]
    });
    
    const now = moment();
    const breachedTickets = [];
    const warningTickets = [];
    
    for (const ticket of tickets) {
      const responseDeadline = moment(ticket.responseDeadline);
      
      // Check if response SLA is breached
      if (now.isAfter(responseDeadline)) {
        // Update ticket
        ticket.responseBreach = true;
        await ticket.save();
        
        // Create history entry
        await TicketHistory.create({
          ticketId: ticket.id,
          field: 'responseBreach',
          oldValue: 'false',
          newValue: 'true',
          action: 'sla_update',
          description: 'Response SLA breached'
        });
        
        breachedTickets.push(ticket);
      }
      // Check if response SLA is about to breach (within 15 minutes)
      else if (now.isAfter(responseDeadline.clone().subtract(15, 'minutes'))) {
        warningTickets.push(ticket);
      }
    }
    
    // Send notifications for breached tickets
    for (const ticket of breachedTickets) {
      // Notify admin users
      const admins = await User.findAll({
        where: {
          role: 'admin',
          isActive: true
        }
      });
      
      for (const admin of admins) {
        await notificationService.sendNotification({
          userId: admin.id,
          title: 'Response SLA Breach',
          message: `Response SLA breached for ticket ${ticket.id}: ${ticket.title}`,
          type: 'response_breach',
          data: {
            ticketId: ticket.id
          }
        });
        
        // Send Telegram notification if admin has Telegram ID
        if (admin.telegramId) {
          await notificationService.sendTelegramNotification(
            admin.telegramId,
            `🚨 RESPONSE SLA BREACH: Ticket #${ticket.id} "${ticket.title}" has not received a first response within the SLA.`
          );
        }
      }
    }
    
    // Send warnings for tickets about to breach response SLA
    for (const ticket of warningTickets) {
      // Notify all agents
      const agents = await User.findAll({
        where: {
          role: {
            [Op.in]: ['admin', 'agent']
          },
          isActive: true
        }
      });
      
      for (const agent of agents) {
        await notificationService.sendNotification({
          userId: agent.id,
          title: 'Response SLA Warning',
          message: `Response SLA deadline approaching for ticket ${ticket.id}: ${ticket.title}`,
          type: 'response_warning',
          data: {
            ticketId: ticket.id
          }
        });
        
        // Send Telegram notification if agent has Telegram ID
        if (agent.telegramId) {
          await notificationService.sendTelegramNotification(
            agent.telegramId,
            `⚠️ RESPONSE SLA WARNING: Ticket #${ticket.id} "${ticket.title}" needs a first response within 15 minutes.`
          );
        }
      }
    }
    
    logger.info(`Response SLA check completed. Found ${breachedTickets.length} breached tickets and ${warningTickets.length} tickets about to breach.`);
    
    return {
      breachedTickets: breachedTickets.length,
      warningTickets: warningTickets.length
    };
  } catch (error) {
    logger.error('Error checking response SLA breaches:', error);
    throw error;
  }
};

/**
 * Schedule SLA checks
 */
exports.scheduleSlaChecks = () => {
  // Check SLA breaches every 5 minutes
  setInterval(async () => {
    try {
      await exports.checkSlaBreaches();
    } catch (error) {
      logger.error('Error in scheduled SLA breach check:', error);
    }
  }, 5 * 60 * 1000);
  
  // Check response SLA breaches every 2 minutes
  setInterval(async () => {
    try {
      await exports.checkResponseBreaches();
    } catch (error) {
      logger.error('Error in scheduled response SLA breach check:', error);
    }
  }, 2 * 60 * 1000);
  
  logger.info('SLA checks scheduled');
};