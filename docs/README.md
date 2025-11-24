# 📚 Документация системы "Строй-Контроль"

## 🏗️ Текущий технологический стек

### Backend
- **Язык**: Go 1.21+
- **Framework**: Gin HTTP Web Framework  
- **База данных**: PostgreSQL 15+
- **ORM**: GORM v2
- **Кэш**: Redis 7+
- **Хранилище**: MinIO/S3
- **AI интеграция**: Python FastAPI Gateway

### Frontend
- **Framework**: React 19 + TypeScript
- **Сборщик**: Vite
- **State**: Zustand + React Query
- **UI**: TailwindCSS
- **Мобильное**: React Native (в планах)

## 📋 Структура документации

### 🎯 **Основные документы (АКТУАЛЬНЫЕ)**
| Документ | Назначение | Стек | Статус |
|----------|------------|------|--------|
| `AI_TECHNICAL_SUPERVISION_PLAN.md` | План ИИ-технадзора с PDF | Go+React | ✅ Актуален |
| `BACKEND_SPECIFICATION.md` | ТЗ на бэкенд | Go | ✅ Актуален |
| `BACKEND_API_SPECIFICATION_GO.md` | API спецификация | Go | ✅ Актуален |
| `DRAWING_ARCHITECTURE_GO.md` | Архитектура PDF обработки | Go | ✅ Актуален |
| `DEVELOPMENT_PLAN.md` | План разработки | Go+React | ✅ Актуален |
| `AI_INTEGRATION_PLAN_GO.md` | AI интеграция под Go | Go+Python | ✅ Актуален |
| `FRONTEND_IMPROVEMENTS_GO.md` | Frontend оптимизация под Go | React+Go | ✅ Актуален |
| `MODULAR_ARCHITECTURE_GO.md` | Модульная архитектура | Go+React | ✅ Актуален |
| `ARCHITECTURE_GO_COMPREHENSIVE.md` | Комплексная архитектура | Go+React+Python | ✅ Актуален |

### 📊 **Архитектура и планирование**
| Документ | Назначение | Стек | Статус |
|----------|------------|------|--------|
| `ARCHITECTURE.md` | Общая архитектура системы | Go+React | ✅ Актуален |
| `SYSTEM_ARCHITECTURE_DIAGRAM.md` | Диаграммы архитектуры | Go+React | ✅ Актуален |
| `INTEGRATION_PLAN.md` | План интеграции | Go+React | ✅ Актуален |
| `DEPLOYMENT_PLAN.md` | План развертывания | Go+React | ✅ Актуален |
| `SECURITY_PLAN.md` | План безопасности | Go+React | ✅ Актуален |

### 🚀 **Разработка и оптимизация**
| Документ | Назначение | Стек | Статус |
|----------|------------|------|--------|
| `DATA_MIGRATION_PLAN.md` | План миграции данных | Go | ✅ Актуален |
| `PERFORMANCE_OPTIMIZATION_PLAN.md` | Оптимизация производительности | Go+React | ✅ Актуален |
| `TESTING_PLAN.md` | План тестирования | Go+React | ✅ Актуален |
| `TECHNICAL_DOCUMENTATION.md` | Техническая документация | Go+React | ✅ Актуален |

### 📱 **Frontend и мобильные**
| Документ | Назначение | Стек | Статус |
|----------|------------|------|--------|
| `FRONTEND_COMPONENTS_ARCHITECTURE.md` | Архитектура компонентов | React | ✅ Актуален |
| `MOBILE_APP_PLAN.md` | План мобильного приложения | React Native | ✅ Актуален |
| `FRONTEND_IMPROVEMENTS_AND_MODULAR_ARCHITECTURE_PLAN.md` | Модульная архитектура | React | ✅ Актуален |

### ❌ **УСТАРЕВШИЕ документы (удалены)**
| Документ | Причина удаления | Замена |
|----------|----------------|--------|
| `BACKEND_API_SPECIFICATION.md` | Node.js версия, неактуальна | `BACKEND_API_SPECIFICATION_GO.md` |
| `DRAWING_ARCHITECTURE_SPECIFICATION.md` | Node.js версия, неактуальна | `DRAWING_ARCHITECTURE_GO.md` |
| `AI_INTEGRATION_PLAN.md` | Общий план, заменен конкретным | `AI_INTEGRATION_PLAN_GO.md` |
| `NEW_ARCHITECTURE_DIAGRAM.md` | Дублирует SYSTEM_ARCHITECTURE_DIAGRAM.md | `ARCHITECTURE_GO_COMPREHENSIVE.md` |
| `FRONTEND_IDEAS_AND_IMPROVEMENTS.md` | Идеи без реализации | `FRONTEND_IMPROVEMENTS_GO.md` |
| `FRONTEND_IMPROVEMENT_PLAN.md` | Дублирует улучшенный план | `FRONTEND_IMPROVEMENTS_GO.md` |
| `MODULAR_ARCHITECTURE_STRATEGY.md` | Интегрирован в другие документы | `MODULAR_ARCHITECTURE_GO.md` |
| `USER_QUESTIONS_AND_DECISIONS.md` | Временный документ | Интегрирован в планы |

---

## 🎯 **Глобальные правила работы с документацией**

### 1. **Иерархия документов**
```
📋 README.md (этот файл)
├── 🎯 Основные документы (приоритет 1)
├── 📊 Архитектура (приоритет 2) 
├── 🚀 Разработка (приоритет 3)
└── 📱 Frontend (приоритет 4)
```

### 2. **Кто за что отвечает**
| Роль | Ответственные документы |
|------|------------------------|
| **Backend разработчик** | BACKEND_SPECIFICATION.md, BACKEND_API_SPECIFICATION_GO.md, DRAWING_ARCHITECTURE_GO.md |
| **Frontend разработчик** | FRONTEND_COMPONENTS_ARCHITECTURE.md, FRONTEND_IMPROVEMENTS_AND_MODULAR_ARCHITECTURE_PLAN.md |
| **DevOps/Инфраструктура** | DEPLOYMENT_PLAN.md, SECURITY_PLAN.md |
| **AI разработчик** | AI_TECHNICAL_SUPERVISION_PLAN.md |
| **Team Lead/Архитектор** | ARCHITECTURE.md, SYSTEM_ARCHITECTURE_DIAGRAM.md, DEVELOPMENT_PLAN.md |
| **QA/Тестировщик** | TESTING_PLAN.md |
| **Data Engineer** | DATA_MIGRATION_PLAN.md |

### 3. **Процесс обновления документов**
1. **Основные документы** - обновляются при изменении требований
2. **Архитектура** - обновляется при изменении стеке или структуры
3. **Планы разработки** - обновляются еженедельно
4. **Технические спецификации** - обновляются при изменении API

### 4. **Правила именования файлов**
- ✅ **Использовать**: `snake_case.md` с понятными названиями
- ❌ **Не использовать**: `CamelCase.md` или сокращения
- ✅ **Примеры**: `BACKEND_API_SPECIFICATION_GO.md`, `AI_TECHNICAL_SUPERVISION_PLAN.md`

### 5. **Структура каждого документа**
```markdown
# Название документа

## 📋 Обзор
Краткое описание назначения и области применения

## 🎯 Цели
Основные цели документа

## 🏗️ Технические требования
Конкретные технические детали

## 📊 Реализация
Практическая реализация

## 🔄 Процесс
Процессы и workflow

## 📝 Примечания
Дополнительная информация
```

### 6. **Версионирование документов**
- Каждое изменение должно иметь дату и автора
- Крупные изменения должны увеличивать версию документа
- Версия формата: `v1.0.0` (major.minor.patch)

---

## 🚀 **Текущий фокус разработки**

### **Phase 1: Backend (Go + Gin)**
1. ✅ Спецификация готова (`BACKEND_SPECIFICATION.md`)
2. ✅ API документация готова (`BACKEND_API_SPECIFICATION_GO.md`)
3. ✅ Архитектура PDF обработки готова (`DRAWING_ARCHITECTURE_GO.md`)
4. 🔄 **В работе**: Реализация базовых модулей

### **Phase 2: Frontend (React)**
1. ✅ Архитектура компонентов готова (`FRONTEND_COMPONENTS_ARCHITECTURE.md`)
2. ✅ Модульная архитектура спланирована
3. 🔄 **В работе**: Рефакторинг существующего кода

### **Phase 3: AI интеграция**
1. ✅ План ИИ-технадзора готов (`AI_TECHNICAL_SUPERVISION_PLAN.md`)
2. 🔄 **В работе**: Настройка Python AI Gateway
3. ⏳ **Планируется**: Интеграция с Go бэкендом

---

## 📞 **Контакты и коммуникация**

### **По вопросам документации:**
- **Team Lead**: Ответственный за структуру и актуальность
- **Технические писатели**: Обновление спецификаций
- **Разработчики**: Актуализация технических деталей

### **Процесс согласования:**
1. Изменения в основных документах → Team Lead approval
2. Изменения в API → Backend Lead approval  
3. Изменения в архитектуре → Architect approval
4. Изменения в планах разработки → All team review

---

**⚠️ Важно**: Перед работой с любым документом проверьте его актуальность в таблице выше. Используйте только документы со статусом "✅ Актуален".
