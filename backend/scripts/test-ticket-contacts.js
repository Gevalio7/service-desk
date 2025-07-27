require('dotenv').config();
const { sequelize } = require('../config/database');
const { TicketContact, User, Ticket } = require('../src/models');

async function testTicketContacts() {
  try {
    console.log('Тестирование модели TicketContact...');
    
    // Проверяем, что модель может подключиться к таблице
    await TicketContact.findAll({ limit: 1 });
    console.log('✓ Модель TicketContact успешно подключена к таблице');
    
    // Проверяем связи
    const ticketWithContacts = await Ticket.findOne({
      include: [{
        model: TicketContact,
        include: [
          { model: User, as: 'contactUser' },
          { model: User, as: 'addedBy' }
        ]
      }],
      limit: 1
    });
    
    console.log('✓ Связи между моделями работают корректно');
    
    // Проверяем many-to-many связь
    const ticketWithContactUsers = await Ticket.findOne({
      include: [{
        model: User,
        as: 'contacts',
        through: { attributes: ['role', 'notifyOnStatusChange'] }
      }],
      limit: 1
    });
    
    console.log('✓ Many-to-many связь через TicketContact работает');
    
    console.log('🎉 Все тесты пройдены успешно!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message);
    process.exit(1);
  }
}

testTicketContacts();