# API Route Matrix (Шаг 1 — инвентаризация)

## Backend routes (фактически зарегистрированные)

### Public / system
- `GET /health`
- `GET /api/v1/health/database`

### Auth (`/auth`)
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/logout` (protected)
- `GET /auth/me` (protected)
- `PUT /auth/me` (protected)
- `POST /auth/change-password` (protected)

### Projects
- `GET /api/v1/public/projects`
- `GET /api/v1/projects` (protected)
- `POST /api/v1/projects` (protected)
- `GET /api/v1/projects/:id` (protected)
- `PUT /api/v1/projects/:id` (protected)
- `DELETE /api/v1/projects/:id` (protected)
- `GET /api/v1/projects/:id/team` (protected)
- `POST /api/v1/projects/:id/team` (protected)
- `PUT /api/v1/projects/:id/team/:user_id` (protected)
- `DELETE /api/v1/projects/:id/team/:user_id` (protected)

### Companies
- `GET /api/v1/companies` (protected)
- `POST /api/v1/companies` (protected)
- `GET /api/v1/companies/:id` (protected)
- `PUT /api/v1/companies/:id` (protected)

### Finance
- `GET /api/v1/finance/transactions` (protected)
- `POST /api/v1/finance/transactions` (protected)
- `GET /api/v1/finance/stats` (protected)

### AI
- `GET /api/v1/ai/health`
- `POST /api/v1/ai/estimates/analyze` (protected)
- `POST /api/v1/ai/chat` (protected)
- `POST /api/v1/ai/risks/predict` (protected)
- `GET /api/v1/ai/metrics` (protected)
- `GET /api/v1/ai/history` (protected)

---

## Frontend expected routes (текущий apiClient)
- `/auth/*` — в целом совпадает.
- `/projects*` — **рассинхрон**: backend ожидает `/api/v1/projects*`.
- `/companies*` — **рассинхрон**: backend ожидает `/api/v1/companies*`.
- `/health/database` — **рассинхрон**: backend имеет `/api/v1/health/database`.
- `/public/projects` — **рассинхрон**: backend имеет `/api/v1/public/projects`.

---

## Критичные рассинхроны (исправлять в Phase A / A2-A3)
1. Единый префикс `/api/v1` не применён в frontend-клиенте для domain routes.
2. Разные ожидания структуры `refresh`/`login` response в разных клиентах (`src/lib/api.ts` и `src/services/apiClient.ts`).
3. В проекте одновременно используются два API-клиента с разными assumptions.

---

## Решение (target)
- Ввести единый base URL с включённым `/api/v1` для доменных маршрутов.
- Либо:
  - `auth` тоже перевести на `/api/v1/auth`,
  - либо оставить `auth` отдельно и документировать это как исключение.
- Убрать дублирующую логику клиентов либо привести к единой реализации.
