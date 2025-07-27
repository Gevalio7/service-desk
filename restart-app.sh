#!/bin/bash

# Скрипт для перезапуска Service Desk приложения
# Очищает занятые порты и запускает все компоненты

echo "🔄 Перезапуск Service Desk приложения..."

# Функция для безопасной остановки процессов нашего приложения на портах
safe_kill_port() {
    local port=$1
    local service_name=$2
    echo "🔍 Проверяем $service_name на порту $port..."
    
    # Находим процессы на порту и проверяем, что они относятся к нашему приложению
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        for pid in $pids; do
            # Проверяем командную строку процесса
            local cmd=$(ps -p $pid -o cmd= 2>/dev/null || echo "")
            if [[ "$cmd" == *"service-desk"* ]] || [[ "$cmd" == *"react-scripts"* ]] || [[ "$cmd" == *"nodemon"* ]] || [[ "$cmd" == *"node src/app.js"* ]] || [[ "$cmd" == *"npm"* ]]; then
                echo "⚠️  Найден процесс нашего приложения на порту $port: $pid"
                echo "🔪 Останавливаем процесс $pid..."
                kill -TERM $pid 2>/dev/null
                sleep 2
                # Если процесс не остановился, принудительно завершаем
                if kill -0 $pid 2>/dev/null; then
                    echo "🔪 Принудительно завершаем процесс $pid..."
                    kill -9 $pid 2>/dev/null
                fi
                echo "✅ Процесс $service_name остановлен"
            else
                echo "ℹ️  На порту $port работает сторонний процесс (PID: $pid), пропускаем"
            fi
        done
    else
        echo "✅ Порт $port свободен"
    fi
}

# Остановка процессов нашего приложения по имени
echo "🛑 Останавливаем процессы Service Desk..."
pkill -f "service-desk.*backend" 2>/dev/null || true
pkill -f "service-desk.*frontend" 2>/dev/null || true
pkill -f "service-desk.*telegram-bot" 2>/dev/null || true
pkill -f "react-scripts.*service-desk" 2>/dev/null || true
pkill -f "nodemon.*service-desk" 2>/dev/null || true
sleep 3

# Безопасная очистка портов только для наших процессов
echo "🧹 Проверяем и освобождаем порты нашего приложения..."
safe_kill_port 3000 "Frontend React"
safe_kill_port 3007 "Backend API"
safe_kill_port 3001 "Telegram Bot"

# Проверяем доступность lsof
if ! command -v lsof &> /dev/null; then
    echo "📦 Устанавливаем lsof..."
    apt-get update && apt-get install -y lsof
fi

echo ""
echo "🚀 Запускаем компоненты..."

# Переходим в директорию проекта
cd "$(dirname "$0")"

# Запуск Backend
echo "🔧 Запускаем Backend..."
cd backend
npm run dev &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
cd ..

# Ждем запуска backend
sleep 5

# Запуск Frontend
echo "🎨 Запускаем Frontend..."
cd frontend
npm start &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
cd ..

# Запуск Telegram Bot (опционально)
echo "🤖 Запускаем Telegram Bot..."
cd telegram-bot
npm run dev &
BOT_PID=$!
echo "Telegram Bot PID: $BOT_PID"
cd ..

echo ""
echo "✅ Все компоненты запущены!"
echo "📊 Backend API: http://localhost:3007/api"
echo "🌐 Frontend: http://localhost:3000"
echo "🤖 Telegram Bot: активен (webhook: http://localhost:3001)"
echo "📚 API Documentation: http://localhost:3007/api-docs"
echo ""
echo "📝 PIDs процессов:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo "   Telegram Bot: $BOT_PID"
echo ""
echo "🔍 Для безопасной остановки используйте: ./stop-app.sh"
echo "⚠️  Не используйте kill -9 на портах - это может затронуть другие сервисы!"
echo ""
echo "🎉 Service Desk готов к работе!"