# Service Desk System

Система управления заявками с веб-интерфейсом и Telegram-ботом.

## Компоненты

- **Backend API** - Express.js сервер с PostgreSQL
- **Frontend** - React приложение
- **Telegram Bot** - Бот для работы с заявками через Telegram

## Быстрый запуск

### Предварительные требования

- Node.js 18+
- PostgreSQL 12+
- npm или yarn

### Установка и запуск

1. **Клонирование и установка зависимостей:**
   ```bash
   # Все зависимости уже установлены
   ```

2. **Настройка базы данных:**
   ```bash
   # PostgreSQL уже настроен и база данных создана
   # Пользователи по умолчанию созданы
   ```

3. **Запуск всех компонентов:**
   ```bash
   ./restart-app.sh
   ```

4. **Остановка приложения:**
   ```bash
   ./stop-app.sh
   ```

## Доступ к приложению

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3007/api
- **API Documentation:** http://localhost:3007/api-docs
- **Telegram Bot:** активен на webhook http://localhost:3001

## Пользователи по умолчанию

| Роль | Email | Пароль | Описание |
|------|-------|--------|----------|
| Администратор | admin@servicedesk.com | admin123 | Полный доступ к системе |
| Агент | agent@servicedesk.com | agent123 | Обработка заявок |
| Клиент | client@servicedesk.com | client123 | Создание заявок |

## Конфигурация

### Backend (.env)
- `PORT=5000` - Порт API сервера
- `DB_*` - Настройки PostgreSQL
- `JWT_SECRET` - Секретный ключ для JWT токенов

### Frontend (.env)
- `PORT=3000` - Порт React приложения
- `REACT_APP_API_URL` - URL Backend API

### Telegram Bot (.env)
- `TELEGRAM_BOT_TOKEN` - Токен Telegram бота
- `API_BASE_URL` - URL Backend API

## Структура проекта

```
service-desk/
├── backend/          # Express.js API сервер
│   ├── src/
│   ├── config/
│   ├── scripts/
│   └── .env
├── frontend/         # React приложение
│   ├── src/
│   ├── public/
│   └── .env
├── telegram-bot/     # Telegram бот
│   ├── src/
│   └── .env
├── restart-app.sh    # Скрипт запуска
└── stop-app.sh       # Скрипт остановки
```

## Разработка

### Запуск в режиме разработки

Компоненты автоматически запускаются в режиме разработки с hot-reload:
- Backend: `nodemon`
- Frontend: `react-scripts start`
- Telegram Bot: `nodemon`

### Логи

Логи сохраняются в:
- Backend: `backend/logs/`
- Консоль терминала для всех компонентов

## Возможности

- ✅ Создание и управление заявками
- ✅ Система ролей (админ, агент, клиент)
- ✅ Комментарии к заявкам
- ✅ Загрузка файлов
- ✅ Уведомления
- ✅ Telegram интеграция
- ✅ API документация (Swagger)
- ✅ Метрики и мониторинг

## Поддержка

Для получения помощи обратитесь к документации API или создайте заявку через систему.