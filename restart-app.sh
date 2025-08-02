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

# Функция для обнаружения и устранения зависших процессов
kill_stuck_processes() {
    echo "🔍 Поиск и устранение зависших процессов..."
    
    # Поиск зависших Node.js процессов связанных с нашим проектом
    echo "🔍 Ищем зависшие Node.js процессы..."
    local stuck_node_pids=$(ps aux | grep -E "(node.*sequelize|node.*service-desk|nodemon.*service-desk)" | grep -v grep | awk '{print $2}' | head -10)
    
    if [ ! -z "$stuck_node_pids" ]; then
        echo "⚠️  Найдены зависшие Node.js процессы:"
        for pid in $stuck_node_pids; do
            local cmd=$(ps -p $pid -o cmd= 2>/dev/null || echo "процесс завершен")
            echo "   PID $pid: $cmd"
            echo "🔪 Принудительно завершаем процесс $pid..."
            kill -9 $pid 2>/dev/null || true
        done
        echo "✅ Зависшие Node.js процессы устранены"
    else
        echo "✅ Зависших Node.js процессов не найдено"
    fi
    
    # Поиск зависших git процессов
    echo "🔍 Ищем зависшие git процессы..."
    local stuck_git_pids=$(ps aux | grep -E "(git.*commit|git.*push)" | grep -v grep | awk '{print $2}' | head -5)
    
    if [ ! -z "$stuck_git_pids" ]; then
        echo "⚠️  Найдены зависшие git процессы:"
        for pid in $stuck_git_pids; do
            local cmd=$(ps -p $pid -o cmd= 2>/dev/null || echo "процесс завершен")
            echo "   PID $pid: $cmd"
            echo "🔪 Принудительно завершаем процесс $pid..."
            kill -9 $pid 2>/dev/null || true
        done
        echo "✅ Зависшие git процессы устранены"
    else
        echo "✅ Зависших git процессов не найдено"
    fi
    
    # Поиск процессов с высоким временем выполнения (более 1 часа)
    echo "🔍 Ищем долго работающие процессы нашего приложения..."
    local long_running_pids=$(ps -eo pid,etime,cmd | grep -E "(service-desk|react-scripts|nodemon)" | grep -v grep | awk '$2 ~ /^[0-9][0-9]:[0-9][0-9]:[0-9][0-9]/ || $2 ~ /^[0-9]+-/ {print $1}' | head -5)
    
    if [ ! -z "$long_running_pids" ]; then
        echo "⚠️  Найдены долго работающие процессы (>1 часа):"
        for pid in $long_running_pids; do
            local cmd=$(ps -p $pid -o cmd= 2>/dev/null || echo "процесс завершен")
            local etime=$(ps -p $pid -o etime= 2>/dev/null || echo "неизвестно")
            echo "   PID $pid (время: $etime): $cmd"
            echo "🔪 Принудительно завершаем долго работающий процесс $pid..."
            kill -9 $pid 2>/dev/null || true
        done
        echo "✅ Долго работающие процессы устранены"
    else
        echo "✅ Долго работающих процессов не найдено"
    fi
}

# Вызываем функцию поиска и устранения зависших процессов
kill_stuck_processes

# Остановка процессов нашего приложения по имени
echo "🛑 Останавливаем процессы Service Desk..."
pkill -f "service-desk.*backend" 2>/dev/null || true
pkill -f "service-desk.*frontend" 2>/dev/null || true
pkill -f "service-desk.*telegram-bot" 2>/dev/null || true
pkill -f "react-scripts.*service-desk" 2>/dev/null || true
pkill -f "nodemon.*service-desk" 2>/dev/null || true
pkill -f "node.*sequelize" 2>/dev/null || true
pkill -f "git.*commit" 2>/dev/null || true
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
echo "🛡️  НОВЫЙ ФУНКЦИОНАЛ: Скрипт теперь автоматически обнаруживает и устраняет:"
echo "   • Зависшие Node.js процессы (sequelize, service-desk, nodemon)"
echo "   • Зависшие git операции (commit, push)"
echo "   • Долго работающие процессы (>1 часа)"
echo "   • Принудительное завершение проблемных процессов"
echo ""
echo "🎉 Service Desk готов к работе!"