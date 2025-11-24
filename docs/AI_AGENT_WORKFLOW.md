# AI Agent Workflow Prompts

This document contains specialized prompts for assigning tasks to different AI agents or development sessions. Use these prompts to parallelize the work.

---

## 🤖 **Backend Agent: Go Foundation**

**Context**: We are building a "Stroy-Control" system with Go + Gin + PostgreSQL. The folder structure `backend/` is already created.

**Task**: Initialize the Go project and create the server skeleton.

**Prompt**:
```text
You are an expert Go Backend Engineer. Your task is to initialize the backend foundation for "Stroy-Control".

**Prerequisites:**
- The directory `backend/` exists.
- We use "Vertical Slice Architecture" (Feature-based).

**Steps:**
1. Initialize Go module: `go mod init stroy-control-backend`.
2. Create `backend/cmd/server/main.go`:
   - Setup a basic Gin server.
   - Add a health check endpoint `/health`.
   - Use `viper` for configuration.
3. Create `backend/internal/config/config.go`:
   - Define a `Config` struct (Server, Database).
   - Load config from env variables.
4. Create `backend/internal/server/server.go`:
   - Logic to start the server.
5. Create a simple `Makefile` for running the server.

**Constraints:**
- Use strictly standard Go project layout adapted for vertical slices.
- Do NOT implement business logic yet, just the skeleton.
- Ensure the code compiles.
```

---

## 🎨 **Frontend Agent: Auth Refactoring**

**Context**: We have a React application in `src/`. Currently, Auth logic is mixed in `src/App.tsx`. We need to move it to `src/modules/core/auth`.

**Task**: Refactor Authentication to use Zustand.

**Prompt**:
```text
You are an expert React/TypeScript Frontend Engineer. Your task is to refactor the Authentication logic from `src/App.tsx` to a modular Zustand store.

**Prerequisites:**
- `zustand` is installed.
- Files are located in `src/`.

**Steps:**
1. Create `src/modules/core/auth/store.ts`:
   - Define `AuthState` interface (user, token, isAuthenticated).
   - Implement `useAuthStore` with `login` and `logout` actions.
   - Use mock data for now (mirroring `MOCK_USERS` from `src/services/mockData.ts`).
2. Create `src/modules/core/auth/types.ts`:
   - Move `User` and `UserRole` types here from `src/types.ts`.
3. Create `src/modules/core/auth/AuthGuard.tsx`:
   - A component to protect routes that require auth.
4. Update `src/App.tsx`:
   - Remove `useState` for user/auth.
   - Use `useAuthStore` instead.
   - Wrap protected routes with `AuthGuard`.

**Constraints:**
- Do not break the existing UI.
- Keep using mock data for now.
```

---

## 🐘 **Database Agent: Schema Design**

**Context**: We need to design the initial PostgreSQL schema for the Core and Projects modules.

**Task**: Create SQL migration files.

**Prompt**:
```text
You are an expert Database Architect. Your task is to design the PostgreSQL schema for the "Stroy-Control" system.

**Prerequisites:**
- We use PostgreSQL 15+.
- We need tables for Users, Roles, Companies, and Projects.

**Steps:**
1. Create `backend/migrations/001_initial_schema.sql`.
2. Define tables:
   - `users` (id, email, password_hash, role, ...).
   - `companies` (id, name, ...).
   - `projects` (id, company_id, name, status, ...).
3. Add appropriate indexes and Foreign Keys.
4. Use UUIDs for primary keys.
5. Add `created_at` and `updated_at` with triggers.

**Constraints:**
- Follow the `BACKEND_SPECIFICATION.md` document.
- Ensure 3NF normalization.
```

---

## 🧠 **AI Agent: Logic Implementation**

**Context**: We need to define the contract for the AI Analysis module.

**Task**: Create TypeScript interfaces and mock service.

**Prompt**:
```text
You are an AI Integration Specialist. Your task is to define the frontend contracts for AI features.

**Steps:**
1. Create `src/modules/ai/types.ts`:
   - Define interfaces for `AIAnalysisRequest`, `AIAnalysisResponse`, `DefectDetectionResult`.
   - Refer to `AI_TECHNICAL_SUPERVISION_PLAN.md`.
2. Create `src/modules/ai/service.ts`:
   - Create a mock service `AIService` with methods:
     - `analyzeDrawing(file: File)`
     - `detectDefects(imageUrl: string)`
     - `chatWithAssistant(message: string)`
3. Create a simple hook `useAIAnalysis` in `src/modules/ai/hooks.ts`.

**Constraints:**
- Use strict TypeScript types.
- Document the interfaces clearly.
```
