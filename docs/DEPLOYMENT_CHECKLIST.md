# Deployment Checklist

This document serves as a step-by-step guide for operators deploying the **Stroy Control** platform. It covers the deployment of the Frontend to **Vercel** and the Backend/Services to **Railway**.

---

## 1. Preflight Checklist

Before starting the deployment process, ensure the following requirements are met:

- [ ] **Repository Status**
  - [ ] Git branch is clean and up-to-date with `main` (or the target release branch).
  - [ ] `git status` shows no uncommitted changes.
  - [ ] All tests pass locally (`npm test` for frontend, `go test ./...` for backend).

- [ ] **Tool Versions**
  - [ ] Node.js: v20+ (Frontend)
  - [ ] Go: v1.23+ (Backend)
  - [ ] Python: v3.11+ (AI Gateway)
  - [ ] Docker & Docker Compose (for local testing/verification)

- [ ] **Environment Files**
  - [ ] `backend/.env.production` is prepared based on `backend/.env.template`.
  - [ ] Frontend environment variables (Vercel) are ready.
  - [ ] AI Gateway environment variables are ready.

---

## 2. Vercel Setup (Frontend)

Deploy the React frontend to Vercel.

- [ ] **Connect Repository**
  - [ ] Log in to Vercel dashboard.
  - [ ] Click **"Add New..."** -> **"Project"**.
  - [ ] Import the `stroy-control` repository.
  - [ ] Framework Preset: Select **Vite**.
  - [ ] Root Directory: `./` (default).

- [ ] **Configure Environment Variables**
  - [ ] Go to **Settings** -> **Environment Variables**.
  - [ ] Add the following variables:
    - `VITE_API_URL`: The public URL of your Railway Backend (e.g., `https://stroy-backend.up.railway.app/api/v1`).
    - `VITE_AI_GATEWAY_URL`: (Optional) If frontend talks directly to AI Gateway.

- [ ] **Deploy & Verify**
  - [ ] Click **Deploy**.
  - [ ] Wait for the build to complete.
  - [ ] **Verify Build Output**: Check the deployment logs for any warnings or errors.
  - [ ] Visit the deployment URL and ensure the app loads (it might show network errors until the backend is up).

---

## 3. Railway Setup (Backend & AI Gateway)

Deploy the Go Backend, PostgreSQL, Redis, and Python AI Gateway to Railway.

### 3.1. Create Project & Services

- [ ] **Initialize Project**
  - [ ] Log in to Railway.
  - [ ] Create a **New Project** -> **Provision PostgreSQL**.
  - [ ] Add **Redis** service.

- [ ] **Deploy Backend Service**
  - [ ] Click **"New"** -> **"GitHub Repo"** -> Select `stroy-control`.
  - [ ] Configure the service:
    - **Root Directory**: `/backend`
    - **Build Command**: (Railway usually detects Go, verify `go build`)
    - **Start Command**: `./server` (or `go run cmd/server/main.go` if raw source)
    - **Watch Paths**: `/backend/**`

- [ ] **Deploy AI Gateway Service** (Optional/If used)
  - [ ] Click **"New"** -> **"GitHub Repo"** -> Select `stroy-control`.
  - [ ] Configure the service:
    - **Root Directory**: `/ai-gateway`
    - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

### 3.2. Configure Variables (Backend)

- [ ] **Seed Environment Variables**
  - [ ] Go to the Backend Service -> **Variables**.
  - [ ] Add variables from `backend/.env.template` (use "Raw Editor" to paste JSON/Env format if available, or add manually):
    - `SERVER_PORT`: `8080` (or usage `PORT` provided by Railway)
    - `DATABASE_HOST`: `${{PostgreSQL.HOST}}`
    - `DATABASE_PORT`: `${{PostgreSQL.PORT}}`
    - `DATABASE_USER`: `${{PostgreSQL.USER}}`
    - `DATABASE_PASSWORD`: `${{PostgreSQL.PASSWORD}}`
    - `DATABASE_DBNAME`: `${{PostgreSQL.DATABASE}}`
    - `DATABASE_SSL_MODE`: `require` (or `disable` depending on Railway internal net)
    - `REDIS_HOST`: `${{Redis.HOST}}`
    - `REDIS_PORT`: `${{Redis.PORT}}`
    - `REDIS_PASSWORD`: `${{Redis.PASSWORD}}`
    - `JWT_SECRET`: (Generate a strong secret)
    - `CORS_ALLOWED_ORIGINS`: Add your Vercel frontend URL (e.g., `https://your-project.vercel.app`)

### 3.3. Database Migrations

Since the backend uses SQL migrations, you must apply them manually or via a startup script.

- [ ] **Option A: Connect via CLI**
  - [ ] Install Railway CLI (`npm i -g @railway/cli`) or use the local `psql`.
  - [ ] Get the connection string from Railway PostgreSQL service -> **Connect**.
  - [ ] Run the migration files in order:
    ```bash
    # Example using psql
    export DATABASE_URL="postgresql://user:pass@host:port/dbname"
    cd backend/migrations
    psql $DATABASE_URL -f 001_initial_schema.sql
    psql $DATABASE_URL -f 002_test_data.sql
    # ... apply others as needed
    ```

- [ ] **Option B: Using Railway Query Tab**
  - [ ] Open the PostgreSQL service in Railway.
  - [ ] Go to the **Data** tab.
  - [ ] Copy content of `backend/migrations/*.sql` files and execute them one by one.

---

## 4. Integration Validation

Once both Frontend and Backend are running:

- [ ] **Smoke Test API**
  - [ ] Check Backend Health: `GET <BACKEND_URL>/health` should return `200 OK`.
  - [ ] Check Database Connection: `GET <BACKEND_URL>/api/v1/health/database`.

- [ ] **Frontend <-> Backend Connection**
  - [ ] Open the Vercel Frontend URL.
  - [ ] Open Browser DevTools -> **Network**.
  - [ ] Refresh the page.
  - [ ] Verify that XHR/Fetch requests are going to the Railway Backend URL.
  - [ ] Verify there are no **CORS errors** in the Console.

- [ ] **Login Flow**
  - [ ] Attempt to log in with test credentials (e.g., `admin@stroy-master.ru` / `admin123`).
  - [ ] Verify you receive a JWT token and are redirected to the dashboard.

---

## 5. Manual QA Scenarios

Run through these critical paths to ensure the deployment is stable.

- [ ] **Project Management**
  - [ ] Create a new Project.
  - [ ] Edit project details.
  - [ ] Verify the project appears in the list.

- [ ] **Estimates**
  - [ ] Open an estimate.
  - [ ] Add a new line item.
  - [ ] Verify calculations update.

- [ ] **AI Features** (If AI Gateway is deployed)
  - [ ] Open the AI Assistant chat.
  - [ ] Send a message (e.g., "Help me with an estimate").
  - [ ] Verify a response is received.

- [ ] **Real-time Updates**
  - [ ] Open the app in two tabs.
  - [ ] Update an item in one tab.
  - [ ] Check if the other tab updates (if WebSocket is enabled).

---

## 6. Troubleshooting

Common issues and their fixes.

- [ ] **Build Errors (Frontend)**
  - *Symptom*: Vercel build fails.
  - *Fix*: Check `package-lock.json` consistency. Ensure node version in Vercel settings matches local.

- [ ] **502 Bad Gateway (Backend)**
  - *Symptom*: Railway returns 502.
  - *Fix*: Check Railway logs. Ensure the app is listening on `0.0.0.0` and the correct `PORT`.
  - *Note*: Railway injects a `PORT` env var. Ensure Go app uses it: `cfg.Server.Port` should bind to it.

- [ ] **Database Connection Failed**
  - *Symptom*: Backend logs show "connection refused" or "password authentication failed".
  - *Fix*: Verify `DATABASE_URL` or host/user/pass variables. Ensure `DATABASE_SSL_MODE` is correct for the environment.

- [ ] **CORS Errors**
  - *Symptom*: Browser blocks requests to backend.
  - *Fix*: Update `CORS_ALLOWED_ORIGINS` in Railway Backend variables to include the exact Vercel URL (no trailing slash).
