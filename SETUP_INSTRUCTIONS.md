# Service Desk - Инструкции по настройке

## ✅ Статус приложения

**Приложение успешно исправлено и запущено!**

### Что работает:
- ✅ **Backend API** - работает на порту 3007
- ✅ **Frontend** - работает на порту 3000  
- ✅ **База данных PostgreSQL** - подключена и инициализирована
- ⚠️ **Telegram Bot** - отключен (требует настройки токена)

## 🚀 Быстрый запуск

```bash
cd /root/boter/service-desk
./restart-app.sh
```

## 🔗 Доступные URL

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3007/api
- **API Documentation**: http://localhost:3007/api-docs
- **Metrics**: http://localhost:3007/metrics

## 👥 Тестовые пользователи

Созданы следующие пользователи для тестирования:

| Роль | Email | Пароль |
|------|-------|--------|
| Администратор | admin@servicedesk.com | admin123 |
| Агент | agent@servicedesk.com | agent123 |
| Клиент | client@servicedesk.com | client123 |

## 🤖 Настройка Telegram Bot (опционально)

Telegram Bot в настоящее время отключен из-за отсутствия валидного токена. Для его активации:

### 1. Создание бота
1. Откройте Telegram и найдите @BotFather
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Получите токен бота (формат: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Настройка токена
Обновите файлы `.env`:

**backend/.env:**
```env
TELEGRAM_BOT_TOKEN=ваш-реальный-токен-бота
```

**telegram-bot/.env:**
```env
TELEGRAM_BOT_TOKEN=ваш-реальный-токен-бота
API_TOKEN=ваш-api-токен-для-сервиса
```

### 3. Перезапуск приложения
```bash
./restart-app.sh
```

## 🛠️ Управление приложением

### Запуск
```bash
./restart-app.sh
```

### Остановка
```bash
./stop-app.sh
```

### Проверка статуса
```bash
ps aux | grep -E "(service-desk|react-scripts|nodemon)" | grep -v grep
```

## 🔧 Решенные проблемы

### Проблема: Приложение падало после запуска
**Причина**: Telegram Bot пытался подключиться с недействительным токеном (`your-telegram-bot-token-here`)

**Решение**: 
- Добавлена проверка токена в [`telegram-bot/src/bot.js`](boter/service-desk/telegram-bot/src/bot.js:20)
- Бот теперь корректно сообщает о проблеме и не падает
- Приложение работает без Telegram бота

### Проблема: База данных не была инициализирована
**Решение**: 
- Создана база данных `servicedesk`
- Выполнена инициализация через [`backend/scripts/init-db.js`](boter/service-desk/backend/scripts/init-db.js)
- Созданы тестовые пользователи

## 📊 Архитектура

```
Service Desk
├── backend/          # Node.js API сервер (порт 3007)
├── frontend/         # React приложение (порт 3000)
├── telegram-bot/     # Telegram бот (отключен)
└── PostgreSQL        # База данных
```

## 🔍 Логи

- **Backend**: `backend/logs/combined.log`, `backend/logs/error.log`
- **Telegram Bot**: `telegram-bot/logs/telegram.log`, `telegram-bot/logs/telegram-error.log`

## 📝 Дополнительные заметки

1. **Безопасность**: В production окружении обязательно измените:
   - JWT_SECRET в backend/.env
   - Пароли пользователей по умолчанию
   - Настройте CORS правильно

2. **База данных**: PostgreSQL настроена с пользователем `postgres` и паролем `postgres`

3. **Порты**: Убедитесь, что порты 3000 и 3007 свободны перед запуском

## 🆘 Поддержка

Если возникают проблемы:
1. Проверьте логи в соответствующих папках
2. Убедитесь, что PostgreSQL запущен: `sudo systemctl status postgresql`
3. Проверьте доступность портов: `lsof -i :3000,3007`