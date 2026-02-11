# Отчёт по статусу проекта (обновлено)

## Что уже сделано

### Phase A — стабилизация API-контракта
- Сформирована матрица маршрутов API и зафиксированы рассинхроны (`docs/API_ROUTE_MATRIX.md`).
- Базовый frontend API префикс приведён к `/api/v1`.
- Добавлена совместимость auth-роутов: поддерживаются `/api/v1/auth/*` и legacy `/auth/*`.
- Добавлен versioned health endpoint `/api/v1/health`.
- Добавлен контрактный smoke-скрипт `scripts/smoke_api_contract.sh`.
- Исправлена обработка ответов password-reset в frontend для случаев, когда backend возвращает только `message`.

### Phase B — backend modules
- Подключены в `backend/cmd/server/main.go`:
  - payment router,
  - fileupload router,
  - websocket router.

### Frontend/UI
- Улучшен mobile/tablet адаптив (layout/public layout, hero form на landing).
- Выполнен ребрендинг на **Build App AI** в ключевых пользовательских местах.
- Обновлены публичные контакты:
  - `+7 (929) 20-20-33`
  - `help@build-app.ru`
  - `г. Екатеринбург, ул. Розы Люксембург 22`
- Удалены реквизиты из раздела контактов (по запросу).

---

## Что осталось сделать

### Phase A (добить до полного закрытия)
1. Полностью унифицировать формат ошибок и коды (`401/403/422/500`) во всех модулях backend.
2. Синхронизировать/сократить два frontend API-клиента (`src/services/apiClient.ts` и `src/lib/api.ts`) до одной точки правды.
3. Прогнать полный smoke с живым backend и тестовым пользователем (не только health).

### Phase B (feature completeness)
1. Проверить реальные endpoint-контракты payment/fileupload/websocket после подключения в `main.go`.
2. Закрыть недостающий CRUD по estimates/counterparties/file docs там, где UI ожидает API.
3. Добавить/обновить backend unit+integration тесты для новых подключённых роутов.
4. Обновить swagger и API документацию по факту роутов.

### Phase C (frontend integration)
1. Поэтапно убрать зависимости от mockData в ключевых бизнес-сценариях.
2. Привести data layer к единому подходу (react-query + единый клиент).
3. Укрепить UX обработки ошибок/empty/loading состояний.

### Phase D (production readiness)
1. Финализировать prod env/secrets/CORS.
2. Настроить HTTPS + backup + мониторинг.
3. Выполнить прод smoke + release runbook + rollback инструкцию.

---

## Следующий практический шаг (рекомендация)
1. Прогнать backend локально и выполнить полный `scripts/smoke_api_contract.sh` с `EMAIL/PASSWORD`.
2. После этого — пройтись по payment/fileupload/websocket endpoint-ам и зафиксировать результаты в `docs/API_ROUTE_MATRIX.md`.
