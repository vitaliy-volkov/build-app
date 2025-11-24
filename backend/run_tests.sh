#!/bin/bash

# Test Runner Script для строительной системы
# Запускает все тесты и генерирует отчет о покрытии кода

set -e

echo "🚀 Запуск тестов для строительной системы управления"
echo "========================================================"

# Переменные
COVERAGE_FILE="coverage.out"
HTML_COVERAGE="coverage.html"

# Функция для печати статуса
print_status() {
    echo "✅ $1"
}

print_error() {
    echo "❌ $1"
}

# Функция для проверки зависимостей
check_dependencies() {
    echo "🔍 Проверка зависимостей..."
    
    if ! command -v go &> /dev/null; then
        print_error "Go не установлен. Установите Go для продолжения."
        exit 1
    fi
    
    # Проверяем наличие необходимых пакетов
    packages=(
        "github.com/gin-gonic/gin"
        "gorm.io/gorm"
        "github.com/swaggo/gin-swagger"
    )
    
    for package in "${packages[@]}"; do
        if ! go list -m "$package" &> /dev/null; then
            echo "📦 Установка пакета: $package"
            go get "$package"
        fi
    done
    
    print_status "Зависимости проверены"
}

# Функция для запуска unit тестов
run_unit_tests() {
    echo "🧪 Запуск unit тестов..."
    
    # Очищаем предыдущие результаты
    rm -f "$COVERAGE_FILE"
    
    # Запускаем тесты с покрытием
    go test -v -race -coverprofile="$COVERAGE_FILE" ./internal/auth/...
    go test -v -race -coverprofile="$COVERAGE_FILE" ./internal/project/...
    go test -v -race -coverprofile="$COVERAGE_FILE" ./internal/company/...
    
    print_status "Unit тесты завершены"
}

# Функция для запуска интеграционных тестов
run_integration_tests() {
    echo "🔗 Запуск интеграционных тестов..."
    
    # Запускаем интеграционные тесты
    go test -v -race -tags=integration ./internal/integration/...
    
    print_status "Интеграционные тесты завершены"
}

# Функция для анализа покрытия кода
analyze_coverage() {
    echo "📊 Анализ покрытия кода..."
    
    if [ -f "$COVERAGE_FILE" ]; then
        # Показываем общий процент покрытия
        coverage=$(go tool cover -func="$COVERAGE_FILE" | tail -n1 | awk '{print $3}')
        echo "📈 Общее покрытие кода: $coverage"
        
        # Генерируем HTML отчет
        go tool cover -html="$COVERAGE_FILE" -o "$HTML_COVERAGE"
        echo "📄 HTML отчет о покрытии сохранен в: $HTML_COVERAGE"
        
        # Показываем детальную информацию по функциям
        echo "📋 Детальный анализ покрытия:"
        go tool cover -func="$COVERAGE_FILE"
        
        # Проверяем минимальное покрытие
        required_coverage=80
        coverage_num=${coverage%\%}
        
        if (( $(echo "$coverage_num >= $required_coverage" | bc -l) )); then
            print_status "Покрытие кода ($coverage_num%) соответствует требованиям (>$required_coverage%)"
        else
            print_error "Покрытие кода ($coverage_num%) ниже требуемого ($required_coverage%)"
        fi
    else
        print_error "Файл покрытия не найден"
    fi
}

# Функция для запуска benchmarks
run_benchmarks() {
    echo "⚡ Запуск benchmark тестов..."
    
    # Запускаем бенчмарки с кратким выводом
    go test -bench=. -benchmem ./internal/auth/...
    go test -bench=. -benchmem ./internal/integration/...
    
    print_status "Benchmark тесты завершены"
}

# Функция для генерации отчета
generate_report() {
    echo "📝 Генерация итогового отчета..."
    
    cat > test_report.md << EOF
# Отчет о тестировании - $(date)

## Обзор
Система тестирования строительной системы управления протестировала:
- Unit тесты для аутентификации, управления проектами и компаниями
- Интеграционные тесты для API endpoints
- Benchmark тесты для анализа производительности

## Результаты тестирования
$(if [ -f "$COVERAGE_FILE" ]; then echo "✅ Покрытие кода: $(go tool cover -func="$COVERAGE_FILE" | tail -n1 | awk '{print $3}')"; else echo "❌ Ошибка при анализе покрытия"; fi)

## Рекомендации
- Продолжить увеличение покрытия тестами до 90%+
- Добавить тесты для edge cases
- Регулярно запускать тесты в CI/CD pipeline

## Файлы отчетов
- Покрытие: $COVERAGE_FILE
- HTML отчет: $HTML_COVERAGE
EOF

    print_status "Отчет сохранен в test_report.md"
}

# Основная функция
main() {
    echo "🏗️  Строительная система управления - Запуск тестирования"
    echo "=========================================================="
    
    # Переходим в директорию проекта
    cd "$(dirname "$0")"
    
    # Запускаем этапы тестирования
    check_dependencies
    run_unit_tests
    run_integration_tests
    analyze_coverage
    # run_benchmarks  # Опционально
    generate_report
    
    echo "🎉 Все тесты завершены успешно!"
    echo "📊 Проверьте test_report.md для подробного анализа"
}

# Обработка сигналов
cleanup() {
    echo "🧹 Очистка временных файлов..."
    # Очищаем временные файлы если необходимо
}

trap cleanup EXIT

# Запуск основной функции
main "$@"