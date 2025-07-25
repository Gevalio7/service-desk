# Service Desk

Система Service Desk для обработки заявок и инцидентов с SLA-трекингом, интеграцией с Telegram и современным UI/UX.

## Содержание

- [Возможности](#возможности)
- [Архитектура](#архитектура)
- [Требования](#требования)
- [Установка](#установка)
- [Настройка](#настройка)
- [Запуск](#запуск)
- [Тестирование](#тестирование)
- [Мониторинг](#мониторинг)
- [API Документация](#api-документация)
- [Структура проекта](#структура-проекта)

## Возможности

### Telegram-бот для приёма заявок
- Создание заявок через Telegram
- Поддержка вложений (фото, документы)
- Кнопки для быстрого выбора категории и приоритета
- Уведомления об изменении статуса заявок

### Backend (API + БД)
- Хранение заявок с полями: ID, Тема, Описание, Категория, Приоритет, Статус, SLA срок, Клиент, Дата создания
- Расчёт SLA в зависимости от приоритета
- Автоматические уведомления при нарушении SLA
- Фильтрация заявок по различным параметрам
- Экспорт данных в CSV

### Frontend (React + Dashboard)
- Главный дашборд с метриками
- Интерактивные графики
- Таблица заявок с сортировкой и фильтрацией
- Детальная информация о заявках
- Темная и светлая темы оформления

## Архитектура

Система состоит из трех основных компонентов:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  Telegram Bot   │◄────►│   Backend API   │◄────►│    Frontend     │
│                 │      │                 │      │    Dashboard    │
└─────────────────┘      └────────┬────────┘      └─────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │                 │
                         │   PostgreSQL    │
                         │   Database      │
                         │                 │
                         └─────────────────┘
```

## Требования

- Node.js 16+
- PostgreSQL 13+
- Telegram Bot Token (для интеграции с Telegram)

## Установка

1. Клонировать репозиторий:
```bash
git clone https://github.com/your-username/service-desk.git
cd service-desk
```

2. Установить зависимости для backend:
```bash
cd backend
npm install
```

3. Установить зависимости для frontend:
```bash
cd ../frontend
npm install
```

4. Установить зависимости для Telegram-бота:
```bash
cd ../telegram-bot
npm install
```

## Настройка

### Backend

1. Создать файл `.env` в директории `backend`:
```
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=servicedesk
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info
```

2. Создать базу данных PostgreSQL:
```bash
createdb servicedesk
```

### Telegram Bot

1. Создать файл `.env` в директории `telegram-bot`:
```
# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# API
API_URL=http://localhost:3000/api
API_TOKEN=your-api-token
```

2. Получить токен для Telegram-бота у [@BotFather](https://t.me/BotFather)

## Запуск

### Backend

```bash
cd backend
npm run dev
```

Backend API будет доступен по адресу: http://localhost:3000

### Frontend

```bash
cd frontend
npm start
```

Frontend будет доступен по адресу: http://localhost:3001

### Telegram Bot

```bash
cd telegram-bot
npm run dev
```

## Тестирование

### Backend

```bash
cd backend
npm test
```

Для запуска тестов с отчетом о покрытии:
```bash
npm run test:coverage
```

### Frontend

```bash
cd frontend
npm test
```

## Мониторинг

Система включает в себя мониторинг с использованием Prometheus. Метрики доступны по адресу:
```
http://localhost:3000/metrics
```

Основные метрики:
- `http_request_duration_seconds` - время выполнения HTTP-запросов
- `http_requests_total` - общее количество HTTP-запросов
- `active_tickets` - количество активных заявок в системе
- `sla_breaches_total` - общее количество нарушений SLA

## API Документация

Swagger документация доступна по адресу:
```
http://localhost:3000/api-docs
```

## Структура проекта

```
service-desk/
├── backend/           # Express.js API сервер
│   ├── src/
│   │   ├── controllers/  # Контроллеры API
│   │   ├── models/       # Модели данных
│   │   ├── routes/       # Маршруты API
│   │   ├── services/     # Сервисы (SLA, уведомления)
│   │   ├── middleware/   # Middleware (аутентификация)
│   │   ├── utils/        # Утилиты (логирование, метрики)
│   │   └── app.js        # Основной файл приложения
│   ├── config/           # Конфигурация
│   ├── tests/            # Тесты
│   └── package.json
├── frontend/          # React приложение
│   ├── public/
│   ├── src/
│   │   ├── components/   # Компоненты React
│   │   ├── contexts/     # Контексты (аутентификация)
│   │   ├── layouts/      # Макеты страниц
│   │   ├── pages/        # Страницы приложения
│   │   └── App.js        # Основной компонент
│   └── package.json
└── telegram-bot/      # Telegram бот
    ├── src/
    │   ├── handlers/     # Обработчики команд
    │   ├── services/     # Сервисы
    │   └── bot.js        # Основной файл бота
    └── package.json
```

## SLA конфигурация

| Приоритет | Описание | Время решения | Время первого ответа |
|-----------|----------|---------------|---------------------|
| P1 | Критический | 4 часа | 30 минут |
| P2 | Высокий | 8 часов | 2 часа |
| P3 | Средний | 24 часа | 4 часа |
| P4 | Низкий | 48 часов | 8 часов |