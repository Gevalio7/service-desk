const { sequelize } = require('../config/database');
const User = require('../src/models/User');

async function clearTelegramIds() {
  try {
    console.log('Подключение к базе данных...');
    await sequelize.authenticate();
    console.log('Подключение успешно установлено.');

    // Получаем количество пользователей с telegram_id
    const usersWithTelegramId = await User.count({
      where: {
        telegramId: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    });

    console.log(`Найдено пользователей с telegram_id: ${usersWithTelegramId}`);

    if (usersWithTelegramId === 0) {
      console.log('Нет пользователей с telegram_id для очистки.');
      return;
    }

    // Обновляем всех пользователей, устанавливая telegramId в null
    const [updatedCount] = await User.update(
      { telegramId: null },
      {
        where: {
          telegramId: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      }
    );

    console.log(`Успешно очищен telegram_id у ${updatedCount} пользователей.`);

    // Проверяем результат
    const remainingUsersWithTelegramId = await User.count({
      where: {
        telegramId: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    });

    console.log(`Пользователей с telegram_id после очистки: ${remainingUsersWithTelegramId}`);

  } catch (error) {
    console.error('Ошибка при очистке telegram_id:', error);
  } finally {
    await sequelize.close();
    console.log('Соединение с базой данных закрыто.');
  }
}

// Запускаем скрипт
clearTelegramIds();