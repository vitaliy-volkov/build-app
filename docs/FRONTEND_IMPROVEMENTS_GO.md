# План улучшений фронтенда для Go + Gin бэкенда

## 📋 Исполнительное резюме

Данный документ описывает стратегический план модернизации фронтенда системы "Строй-Контроль" для оптимальной интеграции с Go + Gin + PostgreSQL бэкендом. Фокус на производительности, модульности и AI функциональности.

### 🎯 Ключевые цели
1. **Оптимизация под Go API** - адаптация фронтенда под Go эндпоинты
2. **Модульная архитектура** - независимые модули с гибким доступом
3. **AI интеграция** - seamless интеграция с Python AI Gateway
4. **Производительность** - оптимизация под реальные нагрузки
5. **Масштабируемость** - подготовка к росту пользователей

---

## 🏗️ Текущая архитектура vs Целевая

### Текущее состояние
```
React 19 + TypeScript + Vite
├── AppContext (глобальное состояние)
├── Модули (монолитные)
├── API клиент (базовый)
└── UI компоненты (TailwindCSS)
```

### Целевая архитектура
```
React 19 + TypeScript + Vite
├── Zustand (модульные сторы)
├── React Query (server state)
├── Модульная система (lazy loading)
├── Go API клиент (оптимизированный)
├── WebSocket (real-time)
├── AI компоненты (интегрированные)
└── PWA (мобильная поддержка)
```

---

## 🚀 Phase 1: Оптимизация под Go API (2 недели)

### 1.1 API клиент адаптация
```typescript
// lib/api-client.ts - Оптимизированный клиент для Go
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface GoAPIConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

class GoAPIClient {
  private config: GoAPIConfig;
  private authToken: string | null = null;

  constructor(config: GoAPIConfig) {
    this.config = config;
  }

  // Go специфичные заголовки
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // Обработка Go ошибок
  private handleError(response: Response): never {
    if (response.status === 401) {
      throw new Error('Unauthorized - redirect to login');
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded');
    }
    if (response.status >= 500) {
      throw new Error('Server error - try again later');
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  // Generic request метод
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        this.handleError(response);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Go специфичные эндпоинты
  // Projects
  async getProjects(params?: ProjectFilters): Promise<APIResponse<Project[]>> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<APIResponse<Project[]>>(`/api/v1/projects?${query}`);
  }

  async createProject(data: CreateProjectRequest): Promise<APIResponse<Project>> {
    return this.request<APIResponse<Project>>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Estimates
  async getEstimates(projectId: string): Promise<APIResponse<Estimate[]>> {
    return this.request<APIResponse<Estimate[]>>(`/api/v1/projects/${projectId}/estimates`);
  }

  async createEstimate(projectId: string, data: CreateEstimateRequest): Promise<APIResponse<Estimate>> {
    return this.request<APIResponse<Estimate>>(`/api/v1/projects/${projectId}/estimates`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Drawings (новые функции)
  async getDrawings(projectId: string, params?: DrawingFilters): Promise<APIResponse<Drawing[]>> {
    const query = new URLSearchParams(params as any).toString();
    return this.request<APIResponse<Drawing[]>>(`/api/v1/projects/${projectId}/drawings?${query}`);
  }

  async uploadDrawing(projectId: string, file: File, data: UploadDrawingRequest): Promise<APIResponse<Drawing>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', data.name);
    formData.append('description', data.description || '');

    return this.request<APIResponse<Drawing>>(`/api/v1/projects/${projectId}/drawings`, {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  }

  // AI интеграция
  async analyzeEstimate(estimateId: string, options: AnalyzeOptions): Promise<APIResponse<AIAnalysis>> {
    return this.request<APIResponse<AIAnalysis>>(`/api/v1/ai/analyze/estimate/${estimateId}`, {
      method: 'POST',
      body: JSON.stringify({ options }),
    });
  }

  async chatWithAI(message: string, context?: string): Promise<APIResponse<AIChatResponse>> {
    return this.request<APIResponse<AIChatResponse>>('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }

  // WebSocket подключение
  connectWebSocket(projectId: string): WebSocket {
    const wsURL = `${this.config.baseURL.replace('http', 'ws')}/api/v1/ws/projects/${projectId}`;
    const ws = new WebSocket(wsURL);

    ws.addEventListener('open', () => {
      console.log('WebSocket connected');
      // Отправка аутентификации
      ws.send(JSON.stringify({
        type: 'auth',
        token: this.authToken,
      }));
    });

    return ws;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  clearAuthToken() {
    this.authToken = null;
  }
}

// Global API client instance
export const apiClient = new GoAPIClient({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  timeout: 10000,
  retries: 3,
});
```

### 1.2 React Query интеграция
```typescript
// lib/react-query.ts - Настройка под Go API
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут для Go кэша
      cacheTime: 10 * 60 * 1000, // 10 минут
      retry: (failureCount, error) => {
        // Go специфичная логика ретрая
        if (error instanceof Error) {
          if (error.message.includes('Rate limit')) {
            return false; // Не ретраить rate limit
          }
          if (error.message.includes('Unauthorized')) {
            return false; // Не ретраить авторизацию
          }
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false, // Go API оптимизирован
    },
    mutations: {
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 1.3 Zustand сторы (замена AppContext)
```typescript
// stores/auth-store.ts - Аутентификация
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    user: null,
    token: localStorage.getItem('auth_token'),
    isAuthenticated: false,
    isLoading: false,

    login: async (credentials) => {
      set({ isLoading: true });
      try {
        const response = await apiClient.request<AuthResponse>('/api/v1/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials),
        });

        const { user, token, refreshToken } = response.data;
        
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        apiClient.setAuthToken(token);

        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    logout: () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      apiClient.clearAuthToken();
      set({ user: null, token: null, isAuthenticated: false });
    },

    refreshToken: async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        get().logout();
        return;
      }

      try {
        const response = await apiClient.request<AuthResponse>('/api/v1/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        const { token } = response.data;
        localStorage.setItem('auth_token', token);
        apiClient.setAuthToken(token);
        set({ token });
      } catch (error) {
        get().logout();
      }
    },
  }))
);

// stores/projects-store.ts - Управление проектами
interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  filters: ProjectFilters;
  isLoading: boolean;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project) => void;
  updateFilters: (filters: Partial<ProjectFilters>) => void;
  createProject: (data: CreateProjectRequest) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectRequest) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>()((set, get) => ({
  projects: [],
  currentProject: null,
  filters: {},
  isLoading: false,

  setProjects: (projects) => set({ projects }),
  
  setCurrentProject: (project) => set({ currentProject: project }),
  
  updateFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),

  createProject: async (data) => {
    const response = await apiClient.createProject(data);
    const newProject = response.data;
    
    set((state) => ({
      projects: [...state.projects, newProject],
      currentProject: newProject,
    }));
    
    return newProject;
  },

  updateProject: async (id, data) => {
    const response = await apiClient.updateProject(id, data);
    const updatedProject = response.data;
    
    set((state) => ({
      projects: state.projects.map(p => p.id === id ? updatedProject : p),
      currentProject: state.currentProject?.id === id ? updatedProject : state.currentProject,
    }));
    
    return updatedProject;
  },

  deleteProject: async (id) => {
    await apiClient.deleteProject(id);
    
    set((state) => ({
      projects: state.projects.filter(p => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },
}));
```

---

## 🧩 Phase 2: Модульная архитектура (3 недели)

### 2.1 Module Registry
```typescript
// lib/module-registry.ts - Реестр модулей
interface ModuleConfig {
  name: string;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  required: boolean;
  permissions: string[];
  routes: RouteConfig[];
  dependencies?: string[];
}

const modules: Record<string, ModuleConfig> = {
  // Core модули (всегда доступны)
  auth: {
    name: 'auth',
    component: lazy(() => import('@/modules/auth/AuthModule')),
    required: true,
    permissions: [],
    routes: [
      { path: '/login', component: 'LoginPage' },
      { path: '/register', component: 'RegisterPage' },
    ],
  },
  dashboard: {
    name: 'dashboard',
    component: lazy(() => import('@/modules/dashboard/DashboardModule')),
    required: true,
    permissions: [],
    routes: [
      { path: '/', component: 'DashboardPage' },
    ],
  },

  // Бизнес модули (с проверкой прав)
  projects: {
    name: 'projects',
    component: lazy(() => import('@/modules/projects/ProjectsModule')),
    required: false,
    permissions: ['projects:view'],
    routes: [
      { path: '/projects', component: 'ProjectsListPage' },
      { path: '/projects/:id', component: 'ProjectDetailPage' },
    ],
  },
  estimates: {
    name: 'estimates',
    component: lazy(() => import('@/modules/estimates/EstimatesModule')),
    required: false,
    permissions: ['estimates:view'],
    routes: [
      { path: '/projects/:projectId/estimates', component: 'EstimatesListPage' },
      { path: '/projects/:projectId/estimates/:id', component: 'EstimateEditorPage' },
    ],
  },
  drawings: {
    name: 'drawings',
    component: lazy(() => import('@/modules/drawings/DrawingsModule')),
    required: false,
    permissions: ['drawings:view'],
    routes: [
      { path: '/projects/:projectId/drawings', component: 'DrawingsListPage' },
      { path: '/projects/:projectId/drawings/:id', component: 'DrawingViewerPage' },
    ],
  },
  ai_assistant: {
    name: 'ai_assistant',
    component: lazy(() => import('@/modules/ai/AIModule')),
    required: false,
    permissions: ['ai:use'],
    routes: [
      { path: '/ai/chat', component: 'AIChatPage' },
      { path: '/ai/analysis', component: 'AIAnalysisPage' },
    ],
  },
};

class ModuleRegistry {
  private loadedModules = new Set<string>();

  getAvailableModules(userPermissions: string[]): ModuleConfig[] {
    return Object.values(modules).filter(module => 
      module.required || this.hasPermissions(module.permissions, userPermissions)
    );
  }

  async loadModule(moduleName: string): Promise<void> {
    if (this.loadedModules.has(moduleName)) {
      return;
    }

    const module = modules[moduleName];
    if (!module) {
      throw new Error(`Module ${moduleName} not found`);
    }

    // Проверка зависимостей
    if (module.dependencies) {
      for (const dep of module.dependencies) {
        await this.loadModule(dep);
      }
    }

    // Предзагрузка компонента
    await module.component;
    this.loadedModules.add(moduleName);
  }

  private hasPermissions(required: string[], userPermissions: string[]): boolean {
    return required.every(permission => userPermissions.includes(permission));
  }
}

export const moduleRegistry = new ModuleRegistry();
```

### 2.2 Module Guard
```typescript
// components/ModuleGuard.tsx - Защита модулей
import { useAuthStore } from '@/stores/auth-store';

interface ModuleGuardProps {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ModuleGuard({ module, children, fallback }: ModuleGuardProps) {
  const { user } = useAuthStore();
  const moduleConfig = modules[module];

  if (!moduleConfig) {
    return <div>Module not found</div>;
  }

  if (moduleConfig.required) {
    return <>{children}</>;
  }

  const hasPermission = !moduleConfig.permissions.length || 
    moduleConfig.permissions.some(permission => 
      user?.permissions?.includes(permission)
    );

  if (!hasPermission) {
    return fallback || <div>Access denied</div>;
  }

  return <>{children}</>;
}

// Hook для проверки прав
export function useModulePermission(module: string): boolean {
  const { user } = useAuthStore();
  const moduleConfig = modules[module];

  if (!moduleConfig || moduleConfig.required) {
    return true;
  }

  return moduleConfig.permissions.some(permission => 
    user?.permissions?.includes(permission)
  );
}
```

---

## 🤖 Phase 3: AI интеграция (2 недели)

### 3.1 AI компоненты
```typescript
// components/ai/AIChat.tsx - AI чат-ассистент
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIChat({ context }: { context?: string }) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiClient.chatWithAI(message, context);
    },
    onSuccess: (response) => {
      const assistantMessage: AIMessage = {
        id: generateId(),
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: AIMessage = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Спросите AI..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={chatMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={chatMutation.isPending || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Отправить
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3.2 AI анализ смет
```typescript
// components/ai/EstimateAnalysis.tsx - AI анализ сметы
import { useMutation } from '@tanstack/react-query';

interface EstimateAnalysisProps {
  estimateId: string;
}

export function EstimateAnalysis({ estimateId }: EstimateAnalysisProps) {
  const analysisMutation = useMutation({
    mutationFn: (options: AnalyzeOptions) => 
      apiClient.analyzeEstimate(estimateId, options),
  });

  const handleAnalyze = (options: AnalyzeOptions) => {
    analysisMutation.mutate(options);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">AI Анализ сметы</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => handleAnalyze({ checkRisks: true, optimize: false })}
            disabled={analysisMutation.isPending}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            Проверить риски
          </button>
          <button
            onClick={() => handleAnalyze({ checkRisks: false, optimize: true })}
            disabled={analysisMutation.isPending}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Оптимизировать
          </button>
          <button
            onClick={() => handleAnalyze({ checkRisks: true, optimize: true, generateReport: true })}
            disabled={analysisMutation.isPending}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Полный анализ
          </button>
        </div>
      </div>

      {analysisMutation.isPending && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <p className="mt-2 text-gray-600">AI анализирует смету...</p>
        </div>
      )}

      {analysisMutation.data && (
        <div className="space-y-4">
          {/* Риски */}
          {analysisMutation.data.data.risks?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">Обнаруженные риски</h4>
              <ul className="space-y-2">
                {analysisMutation.data.data.risks.map((risk: any, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-red-500 mr-2">⚠️</span>
                    <span className="text-sm">{risk.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Оптимизации */}
          {analysisMutation.data.data.optimizations?.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Возможные оптимизации</h4>
              <ul className="space-y-2">
                {analysisMutation.data.data.optimizations.map((opt: any, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-500 mr-2">💰</span>
                    <span className="text-sm">{opt.description}</span>
                    <span className="ml-auto text-green-600 font-semibold">
                      Экономия: {opt.savings}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Общая оценка */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Общая оценка</h4>
            <div className="flex items-center justify-between">
              <span className="text-sm">Уверенность AI:</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${analysisMutation.data.data.confidence * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">
                  {Math.round(analysisMutation.data.data.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📱 Phase 4: PWA и мобильная поддержка (2 недели)

### 4.1 PWA конфигурация
```typescript
// public/manifest.json
{
  "name": "Строй-Контроль",
  "short_name": "СтройКонтроль",
  "description": "Система управления строительными проектами",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}

// service-worker.ts
const CACHE_NAME = 'stroy-control-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          (response) => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
});
```

### 4.2 Мобильная оптимизация
```typescript
// hooks/useMobileOptimization.ts - Мобильные оптимизации
export function useMobileOptimization() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resize', checkMobile);
    
    checkMobile();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const saveForOffline = async (data: any, key: string) => {
    if ('caches' in window) {
      const cache = await caches.open('stroy-control-offline');
      const response = new Response(JSON.stringify(data));
      await cache.put(`/offline/${key}`, response);
    }
  };

  const getOfflineData = async (key: string) => {
    if ('caches' in window) {
      const cache = await caches.open('stroy-control-offline');
      const response = await cache.match(`/offline/${key}`);
      if (response) {
        return await response.json();
      }
    }
    return null;
  };

  return {
    isOnline,
    isMobile,
    saveForOffline,
    getOfflineData,
  };
}

// components/MobileLayout.tsx - Мобильный лейаут
export function MobileLayout({ children }: { children: React.ReactNode }) {
  const { isOnline, isMobile } = useMobileOptimization();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-yellow-500 text-white px-4 py-2 text-center">
          Вы оффлайн. Некоторые функции могут быть недоступны.
        </div>
      )}

      {/* Mobile header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-semibold">Строй-Контроль</h1>
          <button className="p-2 rounded-md hover:bg-gray-100">
            <BellIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg"
          >
            <MobileSidebar onClose={() => setSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
```

---

## 📊 Метрики производительности

### 4.1 Performance monitoring
```typescript
// lib/performance.ts - Мониторинг производительности
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    };
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, any> = {};
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length === 0) continue;
      
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      result[name] = { avg, min, max, count: values.length };
    }
    
    return result;
  }

  // API performance
  async measureAPICall<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const endTimer = this.startTimer(`api:${name}`);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      this.recordMetric(`api:${name}:error`, 1);
      throw error;
    }
  }

  // Component render performance
  measureComponentRender(name: string, component: React.ComponentType): React.ComponentType {
    return (props) => {
      const endTimer = this.startTimer(`render:${name}`);
      
      useEffect(() => {
        endTimer();
      });

      return React.createElement(component, props);
    };
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Hook для использования в компонентах
export function usePerformance(componentName: string) {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    performanceMonitor.recordMetric(`render:${componentName}:count`, renderCount.current);
  });
}
```

---

## 🚀 Roadmap

### Week 1-2: Go API Integration
- [ ] Адаптация API клиента под Go эндпоинты
- [ ] React Query настройка
- [ ] Zustand сторы (замена AppContext)
- [ ] Базовая аутентификация

### Week 3-5: Modular Architecture  
- [ ] Module Registry
- [ ] Module Guard система
- [ ] Ленивая загрузка модулей
- [ ] Система прав доступа

### Week 6-7: AI Integration
- [ ] AI чат компонент
- [ ] AI анализ смет
- [ ] WebSocket для real-time
- [ ] Error handling для AI

### Week 8-9: PWA & Mobile
- [ ] Service Worker
- [ ] Мобильный лейаут
- [ ] Offline поддержка
- [ ] Performance оптимизация

---

**🎯 Результат**: Современный, модульный фронтенд, полностью оптимизированный под Go + Gin бэкенд с AI интеграцией и мобильной поддержкой.
