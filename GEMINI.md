This is a complex, multi-component project for a construction management system called "Строй-Контроль".

Here's a breakdown of the project:

### Project Overview

*   **Purpose:** A web platform for managing construction projects, estimates, finances, and client relationships, with AI-powered features.
*   **Architecture:**
    *   **Frontend:** React (Vite, TypeScript)
    *   **Backend:** Go (Gin framework)
    *   **AI Gateway:** Python (FastAPI) to interface with various AI models (Gemini, OpenAI, etc.).
    *   **Database:** PostgreSQL for primary data, Redis for caching.
    *   **File Storage:** MinIO/S3 compatible storage.
    *   **Monitoring:** Prometheus and Grafana.

### Frontend (React)

*   **Location:** `src/`
*   **Framework:** React 19 with Vite and TypeScript.
*   **Key Dependencies:** `react`, `react-dom`, `react-router-dom`, `zustand` (for state management), `recharts` (for charts).
*   **Styling:** Tailwind CSS.

**Commands:**

*   **Install Dependencies:**
    ```bash
    npm install
    ```
    or
    ```bash
    pnpm install
    ```
*   **Run Development Server:**
    ```bash
    npm run dev
    ```
    (The application will be available at `http://localhost:3000`)
*   **Build for Production:**
    ```bash
    npm run build
    ```
*   **Preview Production Build:**
    ```bash
    npm run preview
    ```

### Backend (Go)

*   **Location:** `backend/`
*   **Framework:** Gin
*   **Key Dependencies:** `gorm` (ORM), `go-redis`, `jwt-go` (for authentication).

**Commands (from within the `backend` directory):**

*   **Install/Tidy Dependencies:**
    ```bash
    go mod tidy
    ```
*   **Run Development Server:**
    ```bash
    make run
    ```
    or
    ```bash
    go run cmd/server/main.go
    ```
*   **Build for Production:**
    ```bash
    make build
    ```

### AI Gateway (Python)

*   **Location:** `ai-gateway/`
*   **Framework:** FastAPI
*   **Key Dependencies:** `fastapi`, `uvicorn`, `openai`, `google-generativeai`, `anthropic`.

**Commands (from within the `ai-gateway` directory):**

*   **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
*   **Run Development Server:**
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    (This is inferred from `app/main.py` and standard FastAPI practice. Port may vary based on configuration.)

### Development Conventions

*   **Modular Architecture:** The project is divided into distinct frontend, backend, and AI gateway services.
*   **Environment Variables:** Configuration is managed through environment variables. The frontend uses `.env` files, the backend likely uses a similar mechanism (e.g., loaded via Viper), and the `ai-gateway` uses a `pydantic-settings` approach.
*   **API-Driven:** The frontend communicates with the backend and AI gateway via APIs.
*   **Tooling:**
    *   `npm` or `pnpm` for frontend package management.
    *   `go modules` for backend package management.
    *   `pip` and `requirements.txt` for Python package management.
    *   `docker-compose` for local development and orchestration.
    *   `Makefile` for backend build tasks.
*   **Documentation:** A `docs/` directory contains extensive project documentation.

This information should provide a good starting point for working on this project.
