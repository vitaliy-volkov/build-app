# Техническое задание: Бэкенд для системы "Строй-Контроль"

## 1. Общие требования

### 1.1 Назначение системы
Разработка RESTful API сервера для системы управления строительными проектами "Строй-Контроль" с использованием технологического стека Go + Gin + PostgreSQL.

### 1.2 Цели и задачи
- Создать масштабируемый и производительный API сервер
- Обеспечить безопасность данных и операций
- Интегрировать с AI сервисами для автоматизации
- Поддержать множественную аутентификацию и авторизацию
- Обеспечить высокую доступность и надежность

## 2. Технические требования

### 2.1 Архитектура
- **Язык программирования**: Go 1.21+
- **Web Framework**: Gin HTTP Web Framework
- **База данных**: PostgreSQL 15+
- **ORM**: GORM v2 или sqlx
- **Кэширование**: Redis 7+
- **Аутентификация**: JWT токены + Refresh Token
- **Валидация**: go-playground/validator
- **Документация API**: Swagger/OpenAPI 3.0
- **Логирование**: Logrus или Zerolog
- **Тестирование**: Testify, Ginkgo

### 2.2 Системные требования
- **Производительность**: < 200ms время ответа для 95% запросов
- **Масштабируемость**: Поддержка 1000+ одновременных пользователей
- **Контейнеризация**: Docker + Docker Compose
- **Мониторинг**: Health checks, метрики
- **Безопасность**: HTTPS, CORS, Rate Limiting, SQL Injection защита

## 3. Функциональные модули

### 3.1 Система аутентификации и авторизации (Auth Module)

#### Эндпоинты:
```
POST   /api/v1/auth/register          - Регистрация пользователя
POST   /api/v1/auth/login             - Вход в систему  
POST   /api/v1/auth/logout            - Выход из системы
POST   /api/v1/auth/refresh           - Обновление токена
POST   /api/v1/auth/forgot-password   - Восстановление пароля
POST   /api/v1/auth/reset-password    - Сброс пароля
GET    /api/v1/auth/profile           - Профиль пользователя
PUT    /api/v1/auth/profile           - Обновление профиля
GET    /api/v1/auth/users             - Список пользователей (Admin)
POST   /api/v1/auth/users             - Создание пользователя (Admin)
PUT    /api/v1/auth/users/:id         - Обновление пользователя (Admin)
DELETE /api/v1/auth/users/:id         - Удаление пользователя (Admin)
```

#### Модели данных:
```go
type User struct {
    ID          string     `json:"id" gorm:"primaryKey"`
    Email       string     `json:"email" gorm:"uniqueIndex;not null"`
    Name        string     `json:"name" gorm:"not null"`
    Password    string     `json:"-" gorm:"not null"` // не возвращается в JSON
    Role        UserRole   `json:"role" gorm:"not null"`
    AvatarURL   *string    `json:"avatar_url"`
    Phone       *string    `json:"phone"`
    IsActive    bool       `json:"is_active" gorm:"default:true"`
    LastLoginAt *time.Time `json:"last_login_at"`
    CreatedAt   time.Time  `json:"created_at"`
    UpdatedAt   time.Time  `json:"updated_at"`
}
```

#### Роли пользователей:
- `admin` - Полный доступ к системе
- `director` - Руководство компании
- `project_manager` - Руководитель проекта
- `foreman` - Прораб
- `estimator` - Сметчик
- `supply_manager` - Снабженец
- `client` - Клиент

### 3.2 Управление проектами (Projects Module)

#### Эндпоинты:
```
GET    /api/v1/projects               - Список проектов
POST   /api/v1/projects               - Создание проекта
GET    /api/v1/projects/:id           - Получение проекта
PUT    /api/v1/projects/:id           - Обновление проекта
DELETE /api/v1/projects/:id           - Удаление проекта
GET    /api/v1/projects/:id/team      - Команда проекта
POST   /api/v1/projects/:id/team      - Добавление в команду
PUT    /api/v1/projects/:id/team/:userId - Обновление роли в команде
DELETE /api/v1/projects/:id/team/:userId - Удаление из команды
GET    /api/v1/projects/:id/overview  - Обзор проекта
GET    /api/v1/projects/dashboard     - Дашборд проектов
```

#### Модели данных:
```go
type Project struct {
    ID                    string       `json:"id" gorm:"primaryKey"`
    Name                  string       `json:"name" gorm:"not null"`
    Address               string       `json:"address" gorm:"not null"`
    ContractNumber        string       `json:"contract_number" gorm:"not null"`
    ContractDate          time.Time    `json:"contract_date" gorm:"not null"`
    Description           string       `json:"description"`
    CustomerID            string       `json:"customer_id" gorm:"not null"`
    GeneralContractorID   string       `json:"general_contractor_id"`
    ContactPersonID       string       `json:"contact_person_id"`
    Status                ProjectStatus `json:"status" gorm:"not null"`
    Team                  []ProjectMember `json:"team" gorm:"many2many:project_team"`
    CreatedAt             time.Time    `json:"created_at"`
    UpdatedAt             time.Time    `json:"updated_at"`
}
```

### 3.3 Система смет (Estimates Module)

#### Эндпоинты:
```
GET    /api/v1/projects/:projectId/estimates     - Список смет проекта
POST   /api/v1/projects/:projectId/estimates     - Создание сметы
GET    /api/v1/estimates/:id                      - Получение сметы
PUT    /api/v1/estimates/:id                      - Обновление сметы
DELETE /api/v1/estimates/:id                      - Удаление сметы
POST   /api/v1/estimates/:id/version              - Создание версии сметы
GET    /api/v1/estimates/:id/versions             - История версий
GET    /api/v1/estimates/:id/items                - Позиции сметы
POST   /api/v1/estimates/:id/items                - Добавление позиции
PUT    /api/v1/estimates/:id/items/:itemId        - Обновление позиции
DELETE /api/v1/estimates/:id/items/:itemId        - Удаление позиции
POST   /api/v1/estimates/:id/items/bulk-update    - Массовое обновление позиций
GET    /api/v1/estimates/:id/analysis             - AI анализ сметы
POST   /api/v1/estimates/from-file                - Создание сметы из файла
GET    /api/v1/estimates/:id/export/csv           - Экспорт в CSV
GET    /api/v1/estimates/:id/export/pdf           - Экспорт в PDF
```

#### Модели данных:
```go
type Estimate struct {
    ID                string          `json:"id" gorm:"primaryKey"`
    ProjectID         string          `json:"project_id" gorm:"not null"`
    Name              string          `json:"name" gorm:"not null"`
    Status            EstimateStatus  `json:"status" gorm:"not null"`
    ManagerID         string          `json:"manager_id"`
    EstimatorID       string          `json:"estimator_id"`
    VatMode           VatMode         `json:"vat_mode" gorm:"not null"`
    Version           int             `json:"version" gorm:"default:1"`
    OriginalEstimateID string         `json:"original_estimate_id"`
    CreatedAt         time.Time       `json:"created_at"`
    UpdatedAt         time.Time       `json:"updated_at"`
}

type EstimateItem struct {
    ID                  string          `json:"id" gorm:"primaryKey"`
    EstimateID          string          `json:"estimate_id" gorm:"not null"`
    ParentID            *string         `json:"parent_id"`
    ItemType            EstimateItemType `json:"item_type" gorm:"not null"`
    ResourceType        *ResourceType   `json:"resource_type"`
    Name                string          `json:"name" gorm:"not null"`
    Unit                string          `json:"unit"`
    Quantity            float64         `json:"quantity" gorm:"not null"`
    CostPrice           float64         `json:"cost_price" gorm:"not null"`
    Markup              float64         `json:"markup" gorm:"not null"`
    AssignedContractorID *string        `json:"assigned_contractor_id"`
    Order               int             `json:"order" gorm:"not null"`
    StartDate           *time.Time      `json:"start_date"`
    EndDate             *time.Time      `json:"end_date"`
    Progress            float64         `json:"progress" gorm:"default:0"`
    CreatedAt           time.Time       `json:"created_at"`
    UpdatedAt           time.Time       `json:"updated_at"`
}
```

### 3.4 Финансовый модуль (Finance Module)

#### Эндпоинты:
```
GET    /api/v1/finance/transactions         - Список транзакций
POST   /api/v1/finance/transactions         - Создание транзакции
GET    /api/v1/finance/transactions/:id     - Получение транзакции
PUT    /api/v1/finance/transactions/:id     - Обновление транзакции
DELETE /api/v1/finance/transactions/:id     - Удаление транзакции
POST   /api/v1/finance/transactions/:id/approve - Одобрение транзакции
GET    /api/v1/finance/accounts             - Список касс/счетов
POST   /api/v1/finance/accounts             - Создание кассы/счета
PUT    /api/v1/finance/accounts/:id         - Обновление кассы/счета
GET    /api/v1/finance/articles             - Список статей
POST   /api/v1/finance/articles             - Создание статьи
PUT    /api/v1/finance/articles/:id         - Обновление статьи
GET    /api/v1/finance/dashboard            - Финансовый дашборд
GET    /api/v1/finance/reports/pnl          - Отчет P&L
GET    /api/v1/finance/reports/cashflow     - Отчет Cash Flow
```

### 3.5 CRM модуль (CRM Module)

#### Эндпоинты:
```
GET    /api/v1/crm/leads              - Список лидов
POST   /api/v1/crm/leads              - Создание лида
GET    /api/v1/crm/leads/:id          - Получение лида
PUT    /api/v1/crm/leads/:id          - Обновление лида
DELETE /api/v1/crm/leads/:id          - Удаление лида
POST   /api/v1/crm/leads/:id/convert  - Конвертация лида в проект
GET    /api/v1/crm/counterparties     - Список контрагентов
POST   /api/v1/crm/counterparties     - Создание контрагента
PUT    /api/v1/crm/counterparties/:id - Обновление контрагента
GET    /api/v1/crm/dashboard          - CRM дашборд
```

### 3.6 Документооборот (Documents Module)

#### Эндпоинты:
```
GET    /api/v1/projects/:projectId/documents     - Документы проекта
POST   /api/v1/projects/:projectId/documents     - Загрузка документа
GET    /api/v1/documents/:id                     - Получение документа
DELETE /api/v1/documents/:id                     - Удаление документа
GET    /api/v1/projects/:projectId/acts          - Акты проекта
POST   /api/v1/projects/:projectId/acts          - Создание акта
PUT    /api/v1/acts/:id                          - Обновление акта
POST   /api/v1/acts/:id/sign                     - Подписание акта
GET    /api/v1/acts/:id/export/pdf               - Экспорт акта в PDF
```

### 3.7 Система уведомлений (Notifications Module)

#### Эндпоинты:
```
GET    /api/v1/notifications           - Уведомления пользователя
POST   /api/v1/notifications/:id/read  - Отметка как прочитанное
POST   /api/v1/notifications/:id/approve - Одобрение действия
GET    /api/v1/admin/notifications     - Все уведомления (Admin)
POST   /api/v1/admin/notifications     - Создание уведомления
```

### 3.8 AI интеграция (AI Module)

#### Эндпоинты:
```
POST   /api/v1/ai/chat                 - AI чат ассистент
POST   /api/v1/ai/estimate-analysis    - Анализ сметы
POST   /api/v1/ai/generate-image       - Генерация изображений
POST   /api/v1/ai/materials-analysis   - Анализ материалов с изображения
POST   /api/v1/ai/schedule-optimize    - Оптимизация расписания
POST   /api/v1/ai/voice-to-estimate    - Создание сметы из аудио
GET    /api/v1/ai/config               - Конфигурация AI провайдеров
PUT    /api/v1/ai/config               - Обновление конфигурации AI
```

### 3.9 Система замеров (Measurements Module)

#### Эндпоинты:
```
GET    /api/v1/projects/:projectId/measurements  - Замеры проекта
POST   /api/v1/projects/:projectId/measurements  - Создание замера
GET    /api/v1/measurements/:id                  - Получение замера
PUT    /api/v1/measurements/:id                  - Обновление замера
POST   /api/v1/measurements/:id/rooms            - Добавление комнаты
PUT    /api/v1/measurements/:id/rooms/:roomId    - Обновление комнаты
```

## 4. Требования к безопасности

### 4.1 Аутентификация
- JWT токены с коротким сроком жизни (15 минут)
- Refresh токены с долгим сроком жизни (7 дней)
- Хеширование паролей с помощью bcrypt
- Rate limiting для попыток входа
- Блокировка аккаунта после неудачных попыток

### 4.2 Авторизация
- RBAC (Role-Based Access Control)
- Middleware проверки ролей для каждого эндпоинта
- Проверка доступа к проектам (изоляция данных)
- Audit trail для критических операций

### 4.3 Защита данных
- HTTPS только
- CORS настройки
- SQL Injection защита через ORM
- XSS защита
- CSRF токены для форм
- Rate limiting для API

## 5. Требования к производительности

### 5.1 Кэширование
- Redis для сессий пользователей
- Кэширование частых запросов (проекты, пользователи)
- Кэширование результатов AI анализа
- ETags для статических данных

### 5.2 Оптимизация БД
- Индексы на все внешние ключи
- Индексы на часто используемые фильтры
- Пагинация для списков (по 20-50 элементов)
- Lazy loading для связей
- Batch операции для множественных изменений

### 5.3 Асинхронные операции
- Очередь для AI анализа (Redis/RabbitMQ)
- Фоновые задачи для отчетов
- Асинхронная отправка уведомлений
- Обработка загрузки файлов в фоне

## 6. Требования к развертыванию

### 6.1 Контейнеризация
- Docker для API сервера
- Docker Compose для локальной разработки
- Многоэтапная сборка для оптимизации размера образа
- Health checks в контейнерах

### 6.2 Конфигурация
- Environment переменные для конфигурации
- Поддержка множественных окружений (dev, staging, prod)
- Секреты через environment или Docker secrets
- Graceful shutdown

### 6.3 Мониторинг и логирование
- Structuring логирование в JSON
- Метрики для мониторинга (время ответа, количество запросов)
- Health check endpoint
- Tracing для отладки (опционально)

## 7. Требования к тестированию

### 7.1 Unit тесты
- Покрытие минимум 80% кода
- Тесты для всех публичных функций
- Моки для внешних сервисов
- Database тесты с тестовой БД

### 7.2 Integration тесты
- Тестирование API эндпоинтов
- Тестирование с реальной базой данных
- Тесты аутентификации и авторизации
- Тесты интеграции с AI сервисами

### 7.3 Нагрузочные тесты
- Тестирование производительности API
- Проверка масштабируемости
- Memory leak тесты

## 8. Требования к документации

### 8.1 API документация
- OpenAPI/Swagger спецификация
- Примеры запросов и ответов
- Коды ошибок и их описания
- Инструкции по аутентификации

### 8.2 Код документация
- Комментарии к функциям и структурам
- README с инструкциями по запуску
- Contributing guide
- Changelog

---

*Документ создан: 24.11.2024*
*Версия: 1.0*