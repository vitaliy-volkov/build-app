# План выполнения проекта (по фазам и задачам)

## Цели
- Довести систему до production-ready состояния по backend и frontend.
- Убрать рассинхрон API-контрактов между UI и сервером.
- Перевести ключевые пользовательские сценарии с mock-данных на реальные API.
- Подготовить воспроизводимый деплой backend + PostgreSQL + Redis на VPS.

---

## Общие правила выполнения
- Работаем короткими итерациями (1–3 дня) с измеримым результатом.
- Каждая задача закрывается только при наличии:
  - кода,
  - проверок (lint/test/smoke),
  - обновлённой документации,
  - понятного changelog в PR.
- Не начинаем новую фазу, пока не закрыты критические задачи текущей.

---

## PHASE A — API Contract Stabilization (критический путь)
**Цель:** синхронизировать backend роуты и frontend API-клиент.
**Оценка:** 3–5 рабочих дней.

### A1. Инвентаризация API
- [x] Собрать фактический список backend endpoint'ов (auth, company, projects, finance, ai, health).
- [x] Собрать список endpoint'ов, которые вызывает frontend.
- [x] Составить mapping «Frontend call -> Backend route».

**Definition of Done:**
- Единая таблица маршрутов в docs.
- Выявлены все рассинхроны (префикс, имена, payload/response).

### A2. Нормализация префиксов и базового URL
- [x] Зафиксировать единый префикс: `/api/v1` (кроме `/health` и `/auth`, если оставляем отдельно).
- [x] Привести `runtimeConfig.apiUrl` и `apiClient` к единой схеме.
- [x] Актуализировать Vite proxy для локальной разработки.

**Definition of Done:**
- Frontend в dev и prod указывает в один понятный API base.
- Нет «скрытых» fallback путей, ломающих прод.

### A3. Выравнивание контрактов response/request
- [ ] Привести критичные endpoint'ы к единому JSON-формату (`success/data/error/message`).
- [ ] Уточнить refresh token flow (структура `data.tokens` vs `data`).
- [ ] Зафиксировать коды ошибок (401/403/422/500) и поля ошибок.

**Definition of Done:**
- API-документация совпадает с реальными ответами сервера.
- Frontend больше не требует ad-hoc парсинга под каждый endpoint.

### A4. Smoke suite для контракта
- [x] Написать минимальный smoke (auth -> me -> projects list -> company list).
- [x] Подготовить набор curl-команд для ручной проверки.

**Definition of Done:**
- Контрактный smoke проходит локально.

**Статус:**
- Добавлен `scripts/smoke_api_contract.sh`.
- Поддерживает запуск без кредов (проверка health), и расширенный режим с `EMAIL/PASSWORD` для защищённых маршрутов.

---

## PHASE B — Backend Feature Completion
**Цель:** закрыть недостающие серверные модули для рабочих экранов.
**Оценка:** 1–2 недели.

### B1. Подключение неиспользуемых модулей
- [x] Подключить в `main.go` модули, уже присутствующие в коде (payment/fileupload/websocket — по приоритету).
- [x] Проверить middleware/авторизацию/namespace.

### B2. CRUD-покрытие ключевых сущностей
- [ ] Доделать/проверить endpoints для estimates.
- [ ] Доделать/проверить endpoints для counterparties.
- [ ] Закрыть файлы/документы (upload/list/delete).

### B3. Транзакции/финансы
- [ ] Проверить корректность маршрутов finance и бизнес-валидаций.
- [ ] Добавить недостающие индексы и пагинацию.

### B4. Качество backend
- [ ] Unit/integration тесты на критические сценарии.
- [ ] Обновить swagger/API docs.

**Definition of Done:**
- Backend закрывает все ключевые операции UI без mock fallback.

---

## PHASE C — Frontend Integration Completion
**Цель:** полностью перейти с mock-данных на реальный backend.
**Оценка:** 1–2 недели.

### C1. Удаление mock-зависимостей (по приоритету)
- [ ] Auth + profile + onboarding компании.
- [ ] Projects + company dashboard.
- [ ] Finance + estimates + AI.

### C2. Единый data layer
- [ ] Перевести загрузки на единый API client/hooks.
- [ ] Централизовать error states/loading/empty states.

### C3. UX-стабилизация
- [ ] Глобальная обработка 401 + refresh/relogin UX.
- [ ] Проверка форм и валидаций под backend constraints.

**Definition of Done:**
- Основные пользовательские сценарии работают полностью через реальный API.

---

## PHASE D — Production Readiness & VPS Deploy
**Цель:** безопасный и воспроизводимый прод-деплой.
**Оценка:** 5–7 дней.

### D1. Инфраструктура и безопасность
- [ ] Секреты (JWT/DB/Redis/SMTP/API keys).
- [ ] CORS для конкретных доменов.
- [ ] HTTPS (Nginx + Let's Encrypt).

### D2. Эксплуатация
- [ ] Health checks + логирование.
- [ ] Бэкапы БД + проверка восстановления.
- [ ] Базовый мониторинг.

### D3. Release checklist
- [ ] Smoke в проде.
- [ ] Rollback-инструкция.
- [ ] Runbook для поддержки.

**Definition of Done:**
- Сервис стабильно поднимается на VPS и обслуживает прод-нагрузку MVP.

---

## Приоритетный backlog (первые 10 задач)
1. Составить и зафиксировать таблицу API-маршрутов (backend vs frontend).
2. Утвердить единый base URL и префикс API.
3. Исправить `apiClient` маршруты под backend.
4. Привести refresh/login response-парсинг к фактическому контракту.
5. Проверить/исправить Vite proxy для локальной работы.
6. Добавить контрактный smoke script (curl/bash).
7. Подключить payment router в main.
8. Подключить fileupload router в main.
9. Решить стратегию подключения websocket router.
10. Убрать первый слой mock-данных (auth/projects).

---

## Пошаговый старт (что делаем прямо сейчас)
### Шаг 1 (текущая итерация): Phase A / A1
- Сформировать документ "API Route Matrix".
- Зафиксировать рассинхроны.
- Подготовить правки в `src/services/apiClient.ts` и config.

### Шаг 2: Phase A / A2-A3
- Внести правки в API-клиент и runtime конфиги.
- Прогнать сборку frontend + smoke auth/projects.

### Шаг 3: Phase A / A4
- Добавить и прогнать минимальный контрактный smoke.

---

## Риски
- Большой объём legacy/mock-логики во frontend.
- Неполное покрытие backend endpoints для UI ожиданий.
- Несовпадение документации и фактической реализации.

## Меры снижения
- Идти вертикальными срезами (auth -> projects -> finance).
- Фиксировать контракт перед крупным рефакторингом.
- На каждый срез делать smoke и обновлять docs.
