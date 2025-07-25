# Service Desk

Полнофункциональная система Service Desk для обработки заявок и инцидентов с SLA-трекингом, интеграцией с Telegram и современным UI/UX.

![Service Desk](https://via.placeholder.com/800x400?text=Service+Desk)

## Содержание

- [Описание](#описание)
- [Архитектура](#архитектура)
- [Технологии](#технологии)
- [Требования](#требования)
- [Установка и запуск](#установка-и-запуск)
- [Безопасность](#безопасность)
- [Структура проекта](#структура-проекта)
- [Лицензия](#лицензия)

## Описание

Service Desk - это комплексное решение для управления заявками и инцидентами, которое позволяет организациям эффективно обрабатывать запросы пользователей, отслеживать SLA и управлять рабочими процессами. Система включает в себя:

- **Backend API**: RESTful API для обработки всех операций с данными
- **Frontend Dashboard**: Современный интерфейс для администраторов и агентов
- **Telegram Bot**: Интеграция с Telegram для создания заявок и получения уведомлений

### Ключевые возможности

- Создание и управление заявками
- Отслеживание SLA с автоматическими уведомлениями
- Ролевая модель доступа (admin, agent, client)
- Интеграция с Telegram
- Экспорт данных в CSV
- Мониторинг и логирование
- Документация API через Swagger

## Архитектура

Система построена на основе микросервисной архитектуры и состоит из трех основных компонентов:

1. **Backend API** (Node.js/Express) - обрабатывает бизнес-логику и взаимодействие с базой данных
2. **Frontend Dashboard** (React) - предоставляет пользовательский интерфейс для работы с системой
3. **Telegram Bot** (Node.js) - обеспечивает интеграцию с Telegram

## Технологии

### Backend
- Node.js
- Express
- PostgreSQL
- Sequelize ORM
- JWT для аутентификации
- Winston для логирования
- Prometheus для мониторинга
- Jest для тестирования

### Frontend
- React
- Material-UI
- React Router
- Axios
- ApexCharts
- Formik и Yup

### Telegram Bot
- Telegraf.js
- Axios
- Winston

## Требования

- Node.js (v14.x или выше)
- PostgreSQL (v12.x или выше)
- npm (v6.x или выше)
- Токен Telegram бота (получить у @BotFather)

## Установка и запуск

### Шаг 1: Клонирование репозитория

```bash
git clone https://github.com/username/service-desk.git
cd service-desk
```

### Шаг 2: Настройка базы данных

```bash
# Установка PostgreSQL (если не установлен)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Запуск PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Вход в PostgreSQL
sudo -u postgres psql

# Создание базы данных и пользователя
CREATE DATABASE servicedesk;
CREATE USER servicedesk_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE servicedesk TO servicedesk_user;
\q
```

### Шаг 3: Настройка переменных окружения

Создайте файлы `.env` в каждой директории компонентов:

#### Backend (.env в директории service-desk/backend)

```bash
cd backend
cat > .env << EOF
PORT=3000
DB_NAME=servicedesk
DB_USER=servicedesk_user
DB_PASSWORD=your_password
DB_HOST=localhost
NODE_ENV=development
JWT_SECRET=$(openssl rand -hex 32)
EOF
```

#### Telegram Bot (.env в директории service-desk/telegram-bot)

```bash
cd ../telegram-bot
cat > .env << EOF
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
API_URL=http://localhost:3000/api
API_TOKEN=your_api_token
EOF
```

### Шаг 4: Установка зависимостей

```bash
# Backend
cd ../backend
npm install

# Frontend
cd ../frontend
npm install

# Telegram Bot
cd ../telegram-bot
npm install
```

### Шаг 5: Запуск компонентов

#### Backend API

```bash
cd ../backend
npm run dev
```

При первом запуске будет создана структура базы данных. Сервер запустится на порту 3000 (или указанном в .env).

#### Frontend Dashboard

```bash
cd ../frontend
npm start
```

Frontend запустится на порту 3001 и будет доступен по адресу http://localhost:3001

#### Telegram Bot

```bash
cd ../telegram-bot
npm run dev
```

### Шаг 6: Настройка для production

Для запуска в production режиме рекомендуется использовать PM2:

```bash
# Установка PM2
sudo npm install -g pm2

# Запуск компонентов через PM2
cd ../backend
pm2 start src/app.js --name "service-desk-backend"

cd ../telegram-bot
pm2 start src/bot.js --name "service-desk-telegram-bot"

# Сохранение конфигурации PM2
pm2 save

# Настройка автозапуска PM2
pm2 startup
```

Для frontend рекомендуется собрать статические файлы и раздавать их через Nginx:

```bash
cd ../frontend
npm run build

# Установка Nginx
sudo apt install nginx

# Настройка Nginx
sudo nano /etc/nginx/sites-available/service-desk
```

Содержимое конфигурации Nginx:

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        root /path/to/service-desk/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активация конфигурации Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/service-desk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Безопасность

### Проверка уязвимостей

Перед запуском в production среде рекомендуется выполнить проверку уязвимостей:

```bash
# Проверка уязвимостей в зависимостях
cd ../backend
npm audit

cd ../frontend
npm audit

cd ../telegram-bot
npm audit

# Исправление уязвимостей (если возможно)
npm audit fix
```

### Рекомендации по безопасности

1. **Защита переменных окружения**:
   - Используйте сложные пароли и секретные ключи
   - Не храните .env файлы в репозитории
   - Ограничьте доступ к .env файлам на сервере

2. **Настройка брандмауэра**:
   ```bash
   # Установка и настройка UFW
   sudo apt install ufw
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow http
   sudo ufw allow https
   sudo ufw enable
   ```

3. **Настройка HTTPS**:
   ```bash
   # Установка Certbot для Let's Encrypt
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your_domain.com
   ```

4. **Регулярное обновление системы**:
   ```bash
   sudo apt update
   sudo apt upgrade
   ```

5. **Настройка резервного копирования базы данных**:
   ```bash
   # Создание скрипта для резервного копирования
   cat > backup.sh << EOF
   #!/bin/bash
   BACKUP_DIR="/path/to/backups"
   TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
   BACKUP_FILE="\$BACKUP_DIR/servicedesk_\$TIMESTAMP.sql"
   
   # Создание резервной копии
   pg_dump -U servicedesk_user -d servicedesk > \$BACKUP_FILE
   
   # Сжатие файла
   gzip \$BACKUP_FILE
   
   # Удаление старых резервных копий (старше 30 дней)
   find \$BACKUP_DIR -name "servicedesk_*.sql.gz" -type f -mtime +30 -delete
   EOF
   
   chmod +x backup.sh
   
   # Добавление задачи в crontab
   (crontab -l 2>/dev/null; echo "0 2 * * * /path/to/backup.sh") | crontab -
   ```

6. **Ограничение доступа к API**:
   - Используйте rate limiting для предотвращения DDoS атак
   - Настройте CORS для ограничения доступа к API
   - Используйте валидацию входных данных

## Структура проекта

```
service-desk/
├── backend/                # Backend API
│   ├── src/
│   │   ├── config/         # Конфигурация
│   │   ├── controllers/    # Контроллеры
│   │   ├── middleware/     # Middleware
│   │   ├── models/         # Модели данных
│   │   ├── routes/         # Маршруты API
│   │   ├── services/       # Сервисы
│   │   ├── tests/          # Тесты
│   │   ├── utils/          # Утилиты
│   │   └── app.js          # Точка входа
│   ├── .env                # Переменные окружения
│   └── package.json        # Зависимости
├── frontend/               # Frontend Dashboard
│   ├── public/             # Статические файлы
│   ├── src/
│   │   ├── components/     # Компоненты
│   │   ├── contexts/       # Контексты
│   │   ├── layouts/        # Макеты
│   │   ├── pages/          # Страницы
│   │   ├── services/       # Сервисы API
│   │   ├── utils/          # Утилиты
│   │   ├── App.js          # Главный компонент
│   │   └── index.js        # Точка входа
│   └── package.json        # Зависимости
└── telegram-bot/           # Telegram Bot
    ├── src/
    │   ├── handlers/       # Обработчики команд
    │   ├── services/       # Сервисы
    │   ├── utils/          # Утилиты
    │   └── bot.js          # Точка входа
    ├── .env                # Переменные окружения
    └── package.json        # Зависимости
```

## Лицензия

MIT License

Copyright (c) 2025 Service Desk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.