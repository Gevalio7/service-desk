const { Op } = require('sequelize');
const moment = require('moment');
const { 
  Ticket, 
  User, 
  Comment 
} = require('../models');
const { logger } = require('../../config/database');

/**
 * Generate tickets report
 */
exports.generateTicketsReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const start = startDate 
      ? moment(startDate).startOf('day').toDate() 
      : moment().subtract(30, 'days').startOf('day').toDate();
    
    const end = endDate 
      ? moment(endDate).endOf('day').toDate() 
      : moment().endOf('day').toDate();
    
    // Get tickets in date range
    const tickets = await Ticket.findAll({
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      },
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });
    
    // Calculate summary
    const summary = {
      total: tickets.length,
      open: tickets.filter(t => ['new', 'assigned'].includes(t.status)).length,
      inProgress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length,
      closed: tickets.filter(t => t.status === 'closed').length
    };
    
    // Generate chart data (tickets created per day)
    const chartData = generateTicketsChartData(tickets, start, end);
    
    // Format table data
    const tableData = tickets.slice(0, 10).map(ticket => ({
      id: ticket.id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      assignee: ticket.assignedTo 
        ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
        : 'Не назначен',
      created: moment(ticket.createdAt).format('YYYY-MM-DD')
    }));
    
    res.status(200).json({
      summary,
      chartData,
      tableData
    });
  } catch (error) {
    logger.error('Error generating tickets report:', error);
    res.status(500).json({ 
      message: 'Error generating tickets report',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Generate users report
 */
exports.generateUsersReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get all users
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });
    
    // Calculate summary
    const summary = {
      total: users.length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length,
      newThisMonth: users.filter(u => 
        moment(u.createdAt).isAfter(moment().subtract(1, 'month'))
      ).length
    };
    
    // Generate chart data
    const chartData = {
      series: [summary.active, summary.inactive],
      options: {
        chart: { type: 'donut', height: 350 },
        labels: ['Активные', 'Неактивные'],
        title: { text: 'Статус пользователей' }
      }
    };
    
    // Format table data
    const tableData = users.slice(0, 10).map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      status: user.isActive ? 'active' : 'inactive',
      lastLogin: user.lastLogin ? moment(user.lastLogin).format('YYYY-MM-DD') : 'Никогда'
    }));
    
    res.status(200).json({
      summary,
      chartData,
      tableData
    });
  } catch (error) {
    logger.error('Error generating users report:', error);
    res.status(500).json({ 
      message: 'Error generating users report',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

/**
 * Generate performance report
 */
exports.generatePerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const start = startDate 
      ? moment(startDate).startOf('day').toDate() 
      : moment().subtract(30, 'days').startOf('day').toDate();
    
    const end = endDate 
      ? moment(endDate).endOf('day').toDate() 
      : moment().endOf('day').toDate();
    
    // Get tickets in date range
    const tickets = await Ticket.findAll({
      where: {
        createdAt: {
          [Op.between]: [start, end]
        }
      }
    });
    
    // Calculate performance metrics
    let totalResponseTime = 0;
    let responseCount = 0;
    let totalResolutionTime = 0;
    let resolutionCount = 0;
    
    for (const ticket of tickets) {
      if (ticket.firstResponseTime) {
        const responseTime = moment(ticket.firstResponseTime).diff(moment(ticket.createdAt), 'minutes');
        totalResponseTime += responseTime;
        responseCount++;
      }
      
      if (ticket.resolutionTime) {
        const resolutionTime = moment(ticket.resolutionTime).diff(moment(ticket.createdAt), 'hours');
        totalResolutionTime += resolutionTime;
        resolutionCount++;
      }
    }
    
    const avgResponseTime = responseCount > 0 ? (totalResponseTime / responseCount / 60).toFixed(1) : '0';
    const avgResolutionTime = resolutionCount > 0 ? (totalResolutionTime / resolutionCount / 24).toFixed(1) : '0';
    
    // Calculate SLA compliance (mock data for now)
    const slaBreaches = tickets.filter(t => t.slaBreach).length;
    const slaCompliance = tickets.length > 0 ? (((tickets.length - slaBreaches) / tickets.length) * 100).toFixed(0) : '100';
    
    const summary = {
      avgResponseTime: `${avgResponseTime} часа`,
      avgResolutionTime: `${avgResolutionTime} дня`,
      satisfactionRate: '94%', // Mock data
      slaCompliance: `${slaCompliance}%`
    };
    
    // Generate chart data
    const chartData = generatePerformanceChartData();
    
    // Format table data
    const tableData = [
      { metric: 'Среднее время ответа', value: summary.avgResponseTime, trend: 'up', change: '+0.3' },
      { metric: 'Среднее время решения', value: summary.avgResolutionTime, trend: 'down', change: '-0.2' },
      { metric: 'Уровень удовлетворенности', value: summary.satisfactionRate, trend: 'up', change: '+2%' },
      { metric: 'Соблюдение SLA', value: summary.slaCompliance, trend: 'down', change: '-3%' }
    ];
    
    res.status(200).json({
      summary,
      chartData,
      tableData
    });
  } catch (error) {
    logger.error('Error generating performance report:', error);
    res.status(500).json({ 
      message: 'Error generating performance report',
      error: process.env.NODE_ENV === 'production' ? {} : error.message
    });
  }
};

// Helper functions
function generateTicketsChartData(tickets, start, end) {
  const days = moment(end).diff(moment(start), 'days');
  const data = [];
  const categories = [];
  
  for (let i = 0; i <= days; i++) {
    const date = moment(start).add(i, 'days');
    const dayTickets = tickets.filter(t => 
      moment(t.createdAt).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    ).length;
    
    data.push(dayTickets);
    categories.push(date.format('DD MMM'));
  }
  
  return {
    series: [{
      name: 'Тикеты',
      data: data
    }],
    options: {
      chart: { type: 'line', height: 350 },
      xaxis: { categories },
      title: { text: 'Динамика создания тикетов' }
    }
  };
}

function generatePerformanceChartData() {
  // Mock data for performance chart
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  
  return {
    series: [{
      name: 'Время ответа (часы)',
      data: [2.1, 2.8, 1.9, 3.2, 2.5, 2.0, 2.7, 2.3, 2.9, 2.1, 2.4, 2.6]
    }, {
      name: 'Время решения (дни)',
      data: [1.5, 1.8, 1.2, 2.1, 1.4, 1.1, 1.6, 1.3, 1.7, 1.2, 1.4, 1.5]
    }],
    options: {
      chart: { type: 'line', height: 350 },
      xaxis: { categories: months },
      title: { text: 'Показатели производительности' }
    }
  };
}

module.exports = exports;