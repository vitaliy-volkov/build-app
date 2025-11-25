#!/bin/bash

# Production Deployment Script for Строительная система управления
# This script handles production deployment with proper security and monitoring

set -e

echo "🚀 Production Deployment - Строительная система управления"
echo "=========================================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка предварительных требований
check_prerequisites() {
    log_info "Проверка системных требований..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен. Установите Docker для продолжения."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose не установлен. Установите Docker Compose для продолжения."
        exit 1
    fi

    # Проверка свободного места (минимум 10GB)
    available_space=$(df . | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 10485760 ]; then  # 10GB in KB
        log_warning "Недостаточно свободного места. Требуется минимум 10GB"
    fi

    log_success "Системные требования проверены"
}

# Проверка конфигурации
check_configuration() {
    log_info "Проверка конфигурации..."
    
    # Проверка .env.production
    if [ ! -f ".env.production" ]; then
        if [ -f ".env.template" ]; then
            log_warning ".env.production не найден. Создаем из шаблона..."
            cp .env.template .env.production
            log_warning "⚠️  Отредактируйте .env.production с вашими реальными настройками!"
        else
            log_error ".env.production не найден"
            exit 1
        fi
    fi

    # Проверка .secrets (опционально)
    if [ ! -f ".secrets" ]; then
        if [ -f ".secrets.template" ]; then
            log_warning ".secrets не найден. Создаем из шаблона..."
            cp .secrets.template .secrets
            log_warning "⚠️  Отредактируйте .secrets с вашими реальными секретами!"
        else
            log_warning "Файл секретов не найден - некоторые функции могут не работать"
        fi
    fi

    # Проверка критических переменных окружения
    if grep -q "CHANGE_ME_TO_STRONG_SECRET" .env.production 2>/dev/null; then
        log_error "⚠️  В .env.production найдены небезопасные значения. Обновите все CHANGE_ME_* значения!"
        exit 1
    fi

    log_success "Конфигурация проверена"
}

# Создание директорий
setup_directories() {
    log_info "Создание необходимых директорий..."
    
    # Создаем структуру директорий
    sudo mkdir -p /opt/stroy-control/{postgres,redis,minio,logs/{backend,ai-gateway,nginx},backups,cache/ai-gateway,elasticsearch}
    
    # Устанавливаем права доступа
    sudo chown -R 1000:1000 /opt/stroy-control
    
    # Локальные директории для разработки
    mkdir -p ./logs ./uploads ./backups
    
    log_success "Директории созданы"
}

# Остановка существующих сервисов
stop_existing_services() {
    log_info "Остановка существующих сервисов..."
    
    # Проверяем, запущены ли уже сервисы
    if docker-compose -f docker-compose.production.yml ps | grep -q "Up"; then
        read -p "🛑 Обнаружены запущенные контейнеры. Остановить их? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Остановка существующих контейнеров..."
            docker-compose -f docker-compose.production.yml down --remove-orphans
        else
            log_info "Пропускаем остановку существующих сервисов"
            return 0
        fi
    fi
}

# Очистка старых данных (опционально)
cleanup_old_data() {
    read -p "🗑️  Удалить старые volumes и данные? Это действие необратимо! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_warning "🗑️  Удаление старых данных..."
        docker-compose -f docker-compose.production.yml down -v --remove-orphans
        # Удаляем старые логи
        sudo rm -rf /opt/stroy-control/logs/*
        log_success "Старые данные удалены"
    fi
}

# Останавливаем все контейнеры если они запущены
echo "🛑 Остановка существующих контейнеров..."
docker-compose -f docker-compose.production.yml down --remove-orphans

# Удаляем старые volumes если нужно
read -p "🗑️  Удалить старые данные базы данных? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Удаление старых volumes..."
    docker-compose -f docker-compose.production.yml down -v
fi

# Запускаем только PostgreSQL сначала для миграций
echo "🗄️  Запуск PostgreSQL для миграций..."
docker-compose -f docker-compose.production.yml up -d postgres

# Ждем пока PostgreSQL будет готов
echo "⏳ Ожидание готовности PostgreSQL..."
for i in {1..30}; do
    if docker-compose -f docker-compose.production.yml exec postgres pg_isready -U stroy_user -d stroy_control; then
        echo "✅ PostgreSQL готов к работе"
        break
    fi
    echo "⏳ Попытка $i/30..."
    sleep 2
done

# Запускаем остальные сервисы
echo "🚀 Запуск остальных сервисов..."
docker-compose -f docker-compose.production.yml up -d redis minio

# Ждем готовности Redis
echo "⏳ Ожидание готовности Redis..."
for i in {1..15}; do
    if docker-compose -f docker-compose.production.yml exec redis redis-cli ping | grep -q PONG; then
        echo "✅ Redis готов к работе"
        break
    fi
    echo "⏳ Попытка $i/15..."
    sleep 2
done

# Запускаем основное приложение
echo "🖥️  Запуск backend приложения..."
docker-compose -f docker-compose.production.yml up -d backend

# Запускаем Nginx как reverse proxy
echo "🌐 Запуск Nginx..."
docker-compose -f docker-compose.production.yml up -d nginx

# Запускаем мониторинг (опционально)
read -p "📊 Запустить систему мониторинга (Prometheus + Grafana)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Запуск системы мониторинга..."
    docker-compose -f docker-compose.production.yml up -d prometheus grafana
fi

# Запускаем ELK Stack для логирования (опционально)
read -p "📋 Запустить систему логирования (ELK Stack)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📋 Запуск системы логирования..."
    docker-compose -f docker-compose.production.yml up -d elasticsearch logstash kibana
fi

echo ""
echo "🎉 Система запущена успешно!"
echo ""
echo "📍 Доступные сервисы:"
echo "   🏠 Frontend:         http://localhost:80"
echo "   ⚙️  Backend API:      http://localhost:8080"
echo "   📚 Swagger Docs:     http://localhost:8080/swagger/index.html"
echo "   📊 Prometheus:       http://localhost:9091"
echo "   📈 Grafana:          http://localhost:3000 (admin/admin_password_change_me)"
echo "   🔍 Kibana:           http://localhost:5601"
echo "   💾 MinIO Console:    http://localhost:9001 (minioadmin/minioadmin)"
echo "   🗄️  PostgreSQL:       localhost:5432"
echo "   🔴 Redis:            localhost:6379"
echo ""
echo "🔐 Тестовые аккаунты:"
echo "   👤 Администратор:    admin@stroy-master.ru / admin123"
echo "   👤 Менеджер:         manager@stroy-master.ru / manager123"
echo ""
echo "📋 Для остановки системы выполните:"
echo "   docker-compose -f docker-compose.production.yml down"
echo ""
echo "📋 Для просмотра логов:"
echo "   docker-compose -f docker-compose.production.yml logs -f [service_name]"
echo ""
echo "💾 Для создания резервной копии БД:"
echo "   ./scripts/backup-database.sh"
echo ""
echo "✅ Готово к работе!"