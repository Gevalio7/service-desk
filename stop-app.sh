#!/bin/bash

# Скрипт для остановки Service Desk приложения

echo "🛑 Остановка Service Desk приложения..."

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
sleep 2

# Безопасная очистка портов только для наших процессов
echo "🧹 Проверяем и освобождаем порты нашего приложения..."
safe_kill_port 3000 "Frontend React"
safe_kill_port 3007 "Backend API"
safe_kill_port 3001 "Telegram Bot"

echo ""
echo "✅ Service Desk приложение остановлено!"
echo "🔄 Для запуска используйте: ./restart-app.sh"