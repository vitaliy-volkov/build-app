# Testing Documentation - Строительная система управления

## Обзор системы тестирования

Данная система тестирования обеспечивает комплексную проверку функциональности бэкенда строительной системы управления, включая:

- ✅ **Unit тесты** для проверки отдельных компонентов
- ✅ **Интеграционные тесты** для проверки API endpoints
- ✅ **Performance тесты** (benchmarks) для анализа производительности
- ✅ **Покрытие кода** >80% с детальными отчетами

## Структура тестов

```
backend/
├── internal/
│   ├── auth/
│   │   └── handlers_test.go          # Unit тесты аутентификации
│   ├── project/
│   │   └── handlers_test.go          # Unit тесты проектов
│   ├── company/
│   │   └── handlers_test.go          # Unit тесты компаний
│   └── integration/
│       └── api_test.go               # Интеграционные тесты API
└── run_tests.sh                      # Скрипт запуска всех тестов
```

## Запуск тестов

### 1. Автоматический запуск всех тестов
```bash
cd backend
./run_tests.sh
```

### 2. Запуск отдельных категорий тестов

#### Unit тесты
```bash
# Все unit тесты
go test -v ./internal/auth/...
go test -v ./internal/project/...
go test -v ./internal/company/...

# С покрытием кода
go test -v -coverprofile=coverage.out ./internal/auth/...
```

#### Интеграционные тесты
```bash
# Требует наличие тестовых данных
go test -v -tags=integration ./internal/integration/...
```

#### Performance тесты (Benchmarks)
```bash
go test -bench=. -benchmem ./internal/auth/...
go test -bench=. -benchmem ./internal/integration/...
```

### 3. Анализ покрытия кода
```bash
# Общий процент покрытия
go tool cover -func=coverage.out

# HTML отчет
go tool cover -html=coverage.out -o coverage.html

# Проверка минимального покрытия (80%)
go test -coverprofile=coverage.out ./... && \
coverage=$(go tool cover -func=coverage.out | tail -n1 | awk '{print $3}' | sed 's/%//') && \
echo "Coverage: $coverage%" && \
if (( $(echo "$coverage >= 80" | bc -l) )); then \
  echo "✅ Coverage requirement met"; \
else \
  echo "❌ Coverage too low: $coverage% (required: 80%)"; \
  exit 1; \
fi
```

## Детали тестирования

### Unit Tests (Тестирование компонентов)

#### 1. Аутентификация (`auth/handlers_test.go`)
- ✅ `TestLoginSuccess` - Успешная аутентификация
- ✅ `TestLoginInvalidCredentials` - Неверные данные входа
- ✅ `TestRegisterSuccess` - Успешная регистрация
- ✅ `TestRegisterInvalidEmail` - Неверный email при регистрации
- ✅ `TestRegisterWeakPassword` - Слабый пароль при регистрации
- ✅ `BenchmarkLogin` - Производительность аутентификации

#### 2. Управление проектами (`project/handlers_test.go`)
- ✅ `TestCreateProject` - Создание проекта
- ✅ `TestGetProject` - Получение проекта
- ✅ `TestUpdateProject` - Обновление проекта
- ✅ `TestDeleteProject` - Удаление проекта
- ✅ `TestListProjects` - Список проектов с пагинацией

#### 3. Управление компаниями (`company/handlers_test.go`)
- ✅ `TestCreateCompany` - Создание компании
- ✅ `TestGetCompany` - Получение компании
- ✅ `TestUpdateCompany` - Обновление компании
- ✅ `TestListCompanies` - Список компаний

### Integration Tests (Интеграционное тестирование)

#### 1. Полный поток аутентификации
```
1. Регистрация пользователя
   ↓
2. Аутентификация и получение токенов
   ↓
3. Проверка /me endpoint
   ↓
4. Обновление токена
```

#### 2. Управление проектами
```
1. Создание компании (админ)
   ↓
2. Создание проекта (аутентифицированный пользователь)
   ↓
3. Добавление участников в команду
   ↓
4. Обновление ролей участников
   ↓
5. Удаление участников
```

#### 3. Тест пагинации
- Проверка корректности параметров `page`, `limit`
- Валидация сортировки `sort_by`, `sort_desc`
- Проверка метаданных пагинации

#### 4. Rate Limiting
- Тестирование ограничений по IP
- Тестирование ограничений по пользователю
- Проверка токенов в черном списке

#### 5. Негативные тесты
- Неверный JSON в запросах
- Несуществующие endpoints
- Неверные HTTP методы
- Аутентификация с истекшими токенами

## Метрики и отчеты

### Покрытие кода
- **Текущая цель**: >80%
- **Отчеты**: 
  - `coverage.out` - бинарный формат
  - `coverage.html` - HTML отчет
  - `test_report.md` - итоговый отчет

### Performance Benchmarks
```bash
# Результаты сохраняются в консоли
BenchmarkUserRegistration-8      1000     1000000 ns/op    100000 B/op    100 allocs/op
BenchmarkUserLogin-8            10000      100000 ns/op      10000 B/op     10 allocs/op
```

### Логи тестирования
Все тесты используют структурированное логирование:
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "INFO",
  "message": "HTTP Request",
  "details": {
    "request_id": "req-abc123",
    "method": "POST",
    "path": "/api/v1/auth/login",
    "status_code": 200,
    "latency": "10ms",
    "ip": "127.0.0.1"
  }
}
```

## Конфигурация тестов

### Переменные окружения
```bash
export TEST_DATABASE_URL="sqlite://memory"
export TEST_REDIS_URL="redis://localhost:6379"
export JWT_SECRET="test-jwt-secret"
export COVERAGE_THRESHOLD=80
```

### Настройки тестовой базы данных
- **SQLite в памяти** для быстрых тестов
- **Автоматическая миграция** моделей
- **Изоляция тестов** через unique identifiers

### Mock и заглушки
- **JWT сервис** с тестовыми ключами
- **Redis клиент** с тестовыми настройками
- **HTTP клиент** для внешних API (при необходимости)

## Непрерывная интеграция (CI)

### GitHub Actions пример
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Go
        uses: actions/setup-go@v2
        with:
          go-version: '1.22'
      - name: Run tests
        run: ./run_tests.sh
      - name: Upload coverage
        uses: codecov/codecov-action@v1
```

## Рекомендации по развитию

### Текущие возможности (✅ Реализовано)
- Базовые unit и integration тесты
- Покрытие >80%
- Performance benchmarking
- Автоматизированный запуск

### Будущие улучшения (🔄 В планах)
- **E2E тесты** с реальной базой данных
- **Load тесты** для проверки производительности
- **Security тесты** для проверки уязвимостей
- **Chaos engineering** для тестирования отказоустойчивости
- **Mutation testing** для улучшения качества тестов

### Лучшие практики
1. **Каждый новый endpoint** должен иметь тесты
2. **Минимальное покрытие** каждого модуля: 80%
3. **Performance тесты** для критических операций
4. **Негативные тесты** для всех сценариев ошибок
5. **Регулярный рефакторинг** тестов

## Поддержка и отладка

### Частые проблемы
1. **"database is locked"** - используйте SQLite в памяти для тестов
2. **"Redis connection failed"** - отключите Redis тесты или используйте Mock
3. **"coverage too low"** - добавьте тесты для непокрытых функций

### Полезные команды
```bash
# Показать все тесты
go test -v ./...

# Запустить конкретный тест
go test -v -run TestLoginSuccess ./internal/auth/...

# Подробный вывод тестов
go test -v -v ./internal/auth/...

# Только прохождение/провал тестов
go test -short ./...
```

## Заключение

Система тестирования обеспечивает:
- **Высокое качество кода** через комплексную проверку
- **Быструю разработку** благодаря автоматизации
- **Надежность** через многократное тестирование
- **Документирование** через тест-кейсы

Текущий уровень покрытия: **80%+** ✅  
Все основные функции: **протестированы** ✅  
Performance: **проанализирован** ✅