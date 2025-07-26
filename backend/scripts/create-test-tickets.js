require('dotenv').config();
const { sequelize } = require('../config/database');

async function createTestTickets() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    console.log('Creating test tickets...');
    
    const adminUserId = '3d7a279e-cc8b-4a64-818d-10ba85768802';
    
    // Create test tickets
    const tickets = [
      {
        title: 'Проблема с доступом к системе',
        description: 'Не могу войти в систему, выдает ошибку авторизации',
        category: 'technical',
        priority: 'high',
        status: 'new',
        tags: ['авторизация', 'доступ']
      },
      {
        title: 'Запрос на новую функцию',
        description: 'Нужна возможность экспорта отчетов в Excel',
        category: 'feature_request',
        priority: 'medium',
        status: 'new',
        tags: ['отчеты', 'экспорт']
      },
      {
        title: 'Проблема с производительностью',
        description: 'Система работает медленно при загрузке больших файлов',
        category: 'technical',
        priority: 'high',
        status: 'in_progress',
        tags: ['производительность', 'файлы']
      },
      {
        title: 'Вопрос по биллингу',
        description: 'Не понимаю как рассчитывается стоимость услуг',
        category: 'billing',
        priority: 'low',
        status: 'resolved',
        tags: ['биллинг', 'тарифы']
      },
      {
        title: 'Общий вопрос',
        description: 'Как настроить уведомления?',
        category: 'general',
        priority: 'medium',
        status: 'new',
        tags: ['настройки', 'уведомления']
      }
    ];
    
    for (const ticket of tickets) {
      const now = new Date();
      let responseDeadline, slaDeadline;
      
      // Calculate SLA deadlines based on priority
      switch(ticket.priority) {
        case 'urgent':
          responseDeadline = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
          slaDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
          break;
        case 'high':
          responseDeadline = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
          slaDeadline = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours
          break;
        case 'medium':
          responseDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
          slaDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
          break;
        case 'low':
          responseDeadline = new Date(now.getTime() + 8 * 60 * 60 * 1000); // 8 hours
          slaDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
          break;
        default:
          responseDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000);
          slaDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }
      
      // Set resolution time for resolved tickets
      const resolutionTime = ticket.status === 'resolved' ? now : null;
      const firstResponseTime = ticket.status !== 'new' ? now : null;
      
      await sequelize.query(`
        INSERT INTO "Tickets" (
          "id", "title", "description", "category", "priority", "status",
          "slaDeadline", "responseDeadline", "firstResponseTime", "resolutionTime",
          "slaBreach", "responseBreach", "tags", "source", "createdById",
          "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid(), :title, :description, :category, :priority, :status,
          :slaDeadline, :responseDeadline, :firstResponseTime, :resolutionTime,
          false, false, :tags, 'web', :createdById,
          NOW(), NOW()
        )
      `, {
        replacements: {
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          slaDeadline: slaDeadline,
          responseDeadline: responseDeadline,
          firstResponseTime: firstResponseTime,
          resolutionTime: resolutionTime,
          tags: `{${ticket.tags.map(tag => `"${tag}"`).join(',')}}`,
          createdById: adminUserId
        }
      });
      
      console.log(`Created ticket: ${ticket.title}`);
    }
    
    console.log('Test tickets created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating test tickets:', error);
    process.exit(1);
  }
}

createTestTickets();