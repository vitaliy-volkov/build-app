# 🤖 AI Gateway для Строй-Контроль

Комплексный AI Gateway с поддержкой анализа смет, чат-ассистента и computer vision для строительной платформы Строй-Контроль.

## 🚀 Функциональность

### ✅ **Реализовано:**
- **Анализ строительных смет** - AI анализ рисков и оптимизации затрат
- **Чат-ассистент** - Контекстные ответы по строительству
- **Computer Vision** - Анализ изображений и чертежей
- **Интеллектуальное кэширование** - Redis для оптимизации
- **Мониторинг** - Prometheus метрики
- **Health checks** - Проверка здоровья сервисов

### 🔄 **В разработке:**
- Векторная база для семантического поиска
- Fine-tuned модели под строительство
- Batch обработка запросов
- Rate limiting и безопасность

## 📋 Требования

- Python 3.11+
- Redis 6.0+
- PostgreSQL 13+
- OpenAI API ключ

## 🛠️ Установка и запуск

### 1. Клонирование и установка зависимостей
```bash
cd ai-gateway
pip install -r requirements.txt
```

### 2. Настройка окружения
```bash
cp .env.example .env
# Отредактируйте .env с вашими API ключами
```

### 3. Запуск Redis
```bash
# Docker
docker run -d -p 6379:6379 redis:6-alpine

# Или локально
redis-server
```

### 4. Запуск приложения
```bash
# Development
uvicorn app.main:app --reload

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 5. Docker запуск
```bash
docker build -t ai-gateway .
docker run -p 8000:8000 --env-file .env ai-gateway
```

## 📚 API Документация

После запуска доступна по адресу:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Основные эндпоинты

#### Анализ смет
```http
POST /api/v1/estimates/analyze
Content-Type: application/json

{
  "estimate_id": "est-123",
  "estimate_data": {
    "name": "Ремонт квартиры",
    "total_cost": 1500000,
    "items": [...]
  },
  "options": {
    "check_risks": true,
    "optimize_costs": true
  }
}
```

#### Чат-ассистент
```http
POST /api/v1/chat/assistant
Content-Type: application/json

{
  "message": "Как рассчитать стоимость ремонта?",
  "context": {
    "user_role": "project_manager"
  }
}
```

#### Анализ изображений
```http
POST /api/v1/vision/analyze
Content-Type: application/json

{
  "image_base64": "data:image/jpeg;base64,...",
  "analysis_type": "defect_detection"
}
```

## 🔧 Конфигурация

Основные параметры в `.env`:

```bash
# AI провайдеры
OPENAI_API_KEY="sk-..."
GOOGLE_API_KEY="..."

# Базы данных
REDIS_URL="redis://localhost:6379"
DATABASE_URL="postgresql+asyncpg://..."

# Настройки AI
DEFAULT_MODEL="gpt-4"
MAX_TOKENS_PER_REQUEST=4000
TEMPERATURE=0.7
```

## 📊 Мониторинг

### Prometheus метрики
- `ai_gateway_requests_total` - общее количество запросов
- `ai_gateway_request_duration_seconds` - время обработки
- `ai_gateway_tokens_used_total` - использованные токены
- `ai_gateway_cache_hit_rate` - hit rate кэша

### Health checks
- `/health` - общее состояние
- `/api/v1/estimates/health` - сервис смет
- `/api/v1/chat/health` - чат сервис
- `/api/v1/vision/health` - vision сервис

## 🏗️ Архитектура

```
ai-gateway/
├── app/
│   ├── main.py              # FastAPI приложение
│   ├── config.py            # Конфигурация
│   ├── core/                # Core сервисы
│   │   ├── cache_service.py # Redis кэширование
│   │   └── monitoring.py    # Метрики
│   ├── services/            # AI сервисы
│   │   └── llm_service.py   # LLM провайдеры
│   ├── routers/             # API роутеры
│   │   ├── estimates.py     # Анализ смет
│   │   ├── chat.py          # Чат-ассистент
│   │   └── vision.py        # Computer Vision
│   └── models/              # Pydantic модели
│       ├── requests.py      # Запросы
│       └── responses.py     # Ответы
├── tests/                   # Тесты
├── docker/                  # Docker конфигурация
└── requirements.txt         # Зависимости
```

## 🚀 Производительность

### Целевые метрики
- **Response time**: < 200ms (P95)
- **Cache hit rate**: > 80%
- **Concurrent users**: 1000+
- **Uptime**: 99.9%

### Оптимизации
- Асинхронная обработка запросов
- Интеллектуальное кэширование
- Connection pooling
- Rate limiting

## 🔒 Безопасность

- PII фильтрация перед отправкой в AI
- Rate limiting per user
- Audit logging всех операций
- Валидация входных данных

## 🧪 Тестирование

```bash
# Запуск тестов
pytest tests/

# С покрытием
pytest --cov=app tests/

# Нагрузочное тестирование
k6 run tests/load/api-load-test.js
```

## 📝 Разработка

### Добавление новых AI функций

1. Создать модель запроса в `models/requests.py`
2. Создать модель ответа в `models/responses.py`
3. Реализовать сервис в `services/`
4. Добавить роутер в `routers/`
5. Зарегистрировать в `main.py`

### Пример добавления нового эндпоинта

```python
# routers/new_feature.py
@router.post("/analyze")
async def analyze_feature(request: NewFeatureRequest):
    result = await new_service.analyze(request.data)
    return NewFeatureResponse(**result)
```

## 🤝 Участие

1. Fork проекта
2. Создать feature branch
3. Сделать изменения
4. Добавить тесты
5. Создать Pull Request

## 📄 Лицензия

MIT License

## 📞 Поддержка

- Telegram: @stroy-control-dev
- Email: dev@stroy-control.ru
