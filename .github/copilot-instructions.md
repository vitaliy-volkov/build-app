# Copilot / AI Agent Instructions — build-app

Purpose: quickly orient an AI coding agent to this repository so it can make productive, safe changes.

High-level architecture
- Frontend: React + Vite (root files: `index.tsx`, `App.tsx`, `vite.config.ts`). UI pages live in `pages/` and reusable UI lives in `components/`.
- AI/LLM layer: core logic lives in `services/`:
  - `services/aiService.ts` — orchestration of tasks (chat, estimate analysis, risk assessment, image generation, etc.).
  - `services/llmAdapters.ts` — provider adapters (Google GenAI, OpenAI-compatible, Anthropic, Ollama). Use this when adding or debugging provider integrations.
- Types and contracts: `types.ts` contains the canonical TypeScript interfaces (notably `AIConfiguration`, `AIProviderConfig`, `AITaskType`, `LLMProvider`). Update types.ts when adding new provider types or task outputs.

Key developer workflows and commands
- Install deps: `npm install` (see `package.json`).
- Dev server: `npm run dev` (Vite). Build/preview: `npm run build` / `npm run preview`.
- Environment: README suggests `.env.local` with `GEMINI_API_KEY` for local testing. Adapter code often reads API keys from `ctx.apiKey` or `process.env.API_KEY` (see `ensureApiKey` in `services/llmAdapters.ts`).

Project-specific patterns and conventions
- Adapters & capability flags: each adapter exposes `supports` flags (`multimodal`, `json`, `image`). `aiService.callLLM` checks these and throws clear errors — preserve that behavior when changing routing.
- Task routing: `AIConfiguration.taskDefaults` maps `AITaskType` (e.g. `chat`, `estimate_analysis`) to a providerId+model. `aiService.resolveTaskRoute` picks provider from `config.providers` and calls the adapter returned by `getLLMAdapter(provider.providerType)`.
- Prompts: system prompts are stored inside `AIConfiguration.prompts` and mapped by `promptMap` in `services/aiService.ts`. When editing system prompts, update the `promptMap` or the keys in `AIConfiguration.prompts` accordingly.
- JSON responses: many AI endpoints expect strict JSON returned inside code blocks (e.g. ```json [...] ```). `aiService` uses `cleanJsonString` to strip markdown fences before parsing — keep that when generating or parsing responses and prefer returning JSON inside a fenced block.
- Multimodal parts: prompt parts support two shapes: `{type:'text', text}` and `{type:'data', mimeType, data}`. Non-text parts are encoded as base64 and adapters map them to provider APIs (see `services/llmAdapters.ts`).

Integration points and what to look for when editing
- Adding a provider: update `types.ts` (LLMProvider), add adapter in `services/llmAdapters.ts`, and ensure `AIProviderConfig` (in settings UI or seed config) can reference it.
- Changing response format handling: maintain the `responseFormat: 'json'` checks in adapters and the `cleanJsonString` usage in callers (`aiService` methods). Tests or runtime errors will surface malformed JSON from the model.
- Image/audio handling: `aiService` has explicit handling for data URIs and `dataPart` creation. If you change how files are passed, update all callers that prepare `parts` and the adapters that unpack them.

Concrete examples from the codebase (copy or inspect these when modifying behavior)
- Chat: `components/AIAssistant.tsx` calls `AIService.chat(history, contextData, aiConfig)` — it builds a simple JSON `contextData` and sends `history` as role/text pairs.
- Estimate (file): `AIService.generateEstimateFromFile(fileData, priceList, config)` constructs multipart prompts and sets `responseFormat: 'json'`. The function expects an array of `EstimateItem` objects in the returned JSON.
- Adapters: `services/llmAdapters.ts` contains these providers: `google`, `openai`, `groq`, `openrouter`, `custom`, `anthropic`, `ollama`. The Google adapter uses `@google/genai`; openai-compatible adapters POST to `<baseUrl>/chat/completions`.

Error and logging conventions
- Errors are thrown with Russian messages in `aiService` and `llmAdapters` — follow the same language/format when adding new messages to keep UX consistent.
- `aiService` functions catch errors, log to console, and often return user-friendly Russian fallbacks. If you change behavior, maintain clear logs (`console.error`) for dev debugging and human-readable messages for users.

Quick checklist for safe edits
- When adding a new LLM-related feature:
  - Update `types.ts` if adding provider/task types.
  - Add or update adapter in `services/llmAdapters.ts` and export it via `getLLMAdapter`.
  - Update routing in `aiService.resolveTaskRoute` only if necessary; prefer configuring `AIConfiguration.taskDefaults` at runtime.
  - Ensure `ensureApiKey` behaviour is preserved or intentionally changed; document new env var names in README.
  - If expecting JSON back, keep `cleanJsonString` parsing flow and return clear parse errors.

Files to consult when coding
- `services/aiService.ts` — primary LLM orchestration.
- `services/llmAdapters.ts` — provider adapters and HTTP wiring.
- `types.ts` — canonical types and `AIConfiguration` shape.
- `components/AIAssistant.tsx` — example of how UI calls the AI layer.
- `README.md` and `docs/AI_INTEGRATION_PLAN.md` — run instructions and design notes.

If anything is unclear or you'd like deeper examples (e.g., unit tests for adapters, a small harness to mock adapters, or a sample `AIConfiguration` JSON), tell me which area to expand and I will update this file.

---
Request: Please review the above and tell me any missing details (secrets management, CI workflow, or desired error-handling changes) so I can iterate.
