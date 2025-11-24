# План интеграции фронтенд-бэкенд системы "Строй-Контроль"

## Обзор интеграции

Данный документ описывает процесс интеграции готового React фронтенда с разрабатываемым Go бэкендом для системы "Строй-Контроль".

### Текущее состояние
- ✅ **Фронтенд**: Полностью готов и использует mock данные
- 🔄 **Бэкенд**: В разработке
- ❌ **Интеграция**: Не начата

## Архитектура интеграции

### Текущая архитектура (Mock данные)
```
┌─────────────────────────────┐
│     React Frontend          │
├─────────────────────────────┤
│  ┌─────────────────────────┐ │
│  │  Mock Data Services     │ │
│  │  - mockData.ts          │ │
│  │  - aiService.ts         │ │
│  │  - llmAdapters.ts       │ │
│  └─────────────────────────┘ │
└─────────────────────────────┘
```

### Целевая архитектура (API интеграция)
```
┌─────────────────────────────┐
│     React Frontend          │
├─────────────────────────────┤
│  ┌─────────────────────────┐ │
│  │  API Services           │ │
│  │  - AuthService          │ │
│  │  - ProjectService       │ │
│  │  - EstimateService      │ │
│  │  - FinanceService       │ │
│  │  - CRMService           │ │
│  └─────────────────────────┘ │
│  ┌─────────────────────────┐ │
│  │  HTTP Client            │ │
│  │  - Axios interceptors   │ │
│  │  - Error handling       │ │
│  │  - Token management     │ │
│  └─────────────────────────┘ │
└─────────────────────────────┘
              │
              │ HTTP/WebSocket
              ▼
┌─────────────────────────────┐
│     Go Backend              │
├─────────────────────────────┤
│  ┌─────────────────────────┐ │
│  │  REST API Endpoints     │ │
│  │  - Authentication       │ │
│  │  - CRUD operations      │ │
│  │  - File uploads         │ │
│  └─────────────────────────┘ │
└─────────────────────────────┘
```

## Этапы интеграции

### Этап 1: Подготовка фронтенда (1 неделя)

#### 1.1 Создание API клиента
```typescript
// services/apiClient.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor для токенов
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor для обработки ошибок
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const original = error.config;
        
        if (error.response?.status === 401 && original) {
          // Попытка обновления токена
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const response = await this.refreshToken(refreshToken);
              const { access_token } = response.data;
              
              localStorage.setItem('access_token', access_token);
              original.headers.Authorization = `Bearer ${access_token}`;
              
              return this.client(original);
            } catch (refreshError) {
              // Перенаправление на логин
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/auth/login';
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(refreshToken: string) {
    return this.client.post('/auth/refresh', { refresh_token: refreshToken });
  }

  // HTTP методы
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }
}

export const apiClient = new ApiClient(process.env.VITE_API_URL || 'http://localhost:8080/api/v1');
```

#### 1.2 Создание сервисов для каждого модуля
```typescript
// services/authService.ts
import { apiClient } from './apiClient';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiClient.post('/auth/login', credentials);
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    return apiClient.post('/auth/register', data);
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async getProfile(): Promise<User> {
    return apiClient.get('/auth/profile');
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return apiClient.put('/auth/profile', data);
  },
};

// services/projectService.ts
export const projectService = {
  async getProjects(): Promise<Project[]> {
    return apiClient.get('/projects');
  },

  async getProject(id: string): Promise<Project> {
    return apiClient.get(`/projects/${id}`);
  },

  async createProject(data: CreateProjectRequest): Promise<Project> {
    return apiClient.post('/projects', data);
  },

  async updateProject(id: string, data: UpdateProjectRequest): Promise<Project> {
    return apiClient.put(`/projects/${id}`, data);
  },

  async deleteProject(id: string): Promise<void> {
    return apiClient.delete(`/projects/${id}`);
  },

  async getProjectTeam(id: string): Promise<ProjectMember[]> {
    return apiClient.get(`/projects/${id}/team`);
  },

  async addTeamMember(id: string, userId: string, role: ProjectRole): Promise<ProjectMember> {
    return apiClient.post(`/projects/${id}/team`, { user_id: userId, role });
  },
};
```

### Этап 2: Аутентификация (1 неделя)

#### 2.1 Обновление компонента Auth
```typescript
// pages/Auth.tsx (обновление)
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';

const Auth = () => {
  const { login, register, isLoading } = useAuth();

  const handleLogin = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      login(response.user, response.access_token, response.refresh_token);
      navigate('/dashboard');
    } catch (error) {
      setError('Неверные учетные данные');
    }
  };

  // Остальная логика...
};

// contexts/AuthContext.tsx (создание)
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Проверка валидности токена
      authService.getProfile()
        .then(userData => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (userData: User, accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const updatedUser = await authService.updateProfile(data);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### 2.2 Защищенные маршруты
```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
```

### Этап 3: Основные модули (2 недели)

#### 3.1 Проекты
```typescript
// pages/ProjectList.tsx (обновление)
import { useState, useEffect } from 'react';
import { projectService } from '../services/projectService';
import { useAuth } from '../contexts/AuthContext';

const ProjectList = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить проект?')) {
      try {
        await projectService.deleteProject(id);
        setProjects(projects.filter(p => p.id !== id));
      } catch (error) {
        alert('Ошибка при удалении проекта');
      }
    }
  };

  // Остальная логика...
};
```

#### 3.2 Сметы
```typescript
// pages/EstimateEditor.tsx (обновление)
import { useState, useEffect } from 'react';
import { estimateService } from '../services/estimateService';

const EstimateEditor = ({ estimateId }: { estimateId?: string }) => {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (estimateId) {
      loadEstimate();
    }
  }, [estimateId]);

  const loadEstimate = async () => {
    try {
      setIsLoading(true);
      const estimateData = await estimateService.getEstimate(estimateId!);
      const itemsData = await estimateService.getEstimateItems(estimateId!);
      
      setEstimate(estimateData);
      setItems(itemsData);
    } catch (error) {
      console.error('Failed to load estimate:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await estimateService.updateEstimate(estimateId!, estimate!);
      // Показать уведомление об успехе
    } catch (error) {
      console.error('Failed to save estimate:', error);
      // Показать ошибку
    } finally {
      setIsLoading(false);
    }
  };

  // AI анализ сметы
  const handleAIAnalysis = async () => {
    try {
      const analysis = await estimateService.analyzeEstimate(estimateId!);
      // Обработка результатов анализа
    } catch (error) {
      console.error('AI analysis failed:', error);
    }
  };

  // Остальная логика...
};
```

### Этап 4: Реальное время (1 неделя)

#### 4.1 WebSocket интеграция
```typescript
// services/websocketService.ts
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectInterval: number = 5000;
  private listeners: Map<string, Function[]> = new Map();

  connect(token: string) {
    const wsUrl = `ws://localhost:8080/ws?token=${token}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.notifyListeners(data.type, data.payload);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      setTimeout(() => this.connect(token), this.reconnectInterval);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  subscribe(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  unsubscribe(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const websocketService = new WebSocketService();

// hooks/useNotifications.ts
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user && websocketService) {
      websocketService.subscribe('notification', handleNewNotification);
      websocketService.connect(localStorage.getItem('access_token')!);
    }

    return () => {
      websocketService.unsubscribe('notification', handleNewNotification);
      websocketService.disconnect();
    };
  }, [user]);

  const handleNewNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    // Показать toast уведомление
  };

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
  };

  return { notifications, markAsRead };
};
```

### Этап 5: Файловая система (1 неделя)

#### 5.1 Загрузка файлов
```typescript
// services/fileService.ts
export const fileService = {
  async uploadFile(file: File, projectId?: string): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (projectId) {
      formData.append('project_id', projectId);
    }

    return apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async getFileUrl(fileId: string): Promise<{ url: string }> {
    return apiClient.get(`/files/${fileId}/url`);
  },

  async deleteFile(fileId: string): Promise<void> {
    return apiClient.delete(`/files/${fileId}`);
  },

  async getProjectFiles(projectId: string): Promise<File[]> {
    return apiClient.get(`/projects/${projectId}/files`);
  },
};

// components/FileUpload.tsx
const FileUpload = ({ projectId, onUploadComplete }: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const response = await fileService.uploadFile(file, projectId);
      onUploadComplete(response);
      
      setUploadProgress(100);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Ошибка при загрузке файла');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="file-upload">
      <input
        type="file"
        onChange={handleFileSelect}
        disabled={isUploading}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
      />
      {isUploading && (
        <div className="upload-progress">
          <div 
            className="progress-bar" 
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
};
```

## Управление состоянием

### Использование React Query (рекомендуется)
```typescript
// hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { projectService } from '../services/projectService';

export const useProjects = () => {
  return useQuery('projects', projectService.getProjects);
};

export const useProject = (id: string) => {
  return useQuery(['project', id], () => projectService.getProject(id));
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation(projectService.createProject, {
    onSuccess: () => {
      queryClient.invalidateQueries('projects');
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ id, data }: { id: string; data: UpdateProjectRequest }) =>
      projectService.updateProject(id, data),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries('projects');
        queryClient.setQueryData(['project', variables.id], data);
      },
    }
  );
};
```

## Обработка ошибок

### Глобальная обработка ошибок
```typescript
// utils/errorHandler.ts
export const errorHandler = {
  handle: (error: any) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          window.location.href = '/auth/login';
          break;
        case 403:
          // Forbidden
          showError('У вас нет прав для выполнения этого действия');
          break;
        case 404:
          showError('Запрашиваемый ресурс не найден');
          break;
        case 422:
          // Validation error
          showError(data.message || 'Ошибка валидации данных');
          break;
        case 500:
          showError('Внутренняя ошибка сервера');
          break;
        default:
          showError(data.message || 'Произошла неизвестная ошибка');
      }
    } else if (error.request) {
      // Network error
      showError('Ошибка соединения с сервером');
    } else {
      // Other error
      showError('Произошла ошибка');
    }
  },
};

const showError = (message: string) => {
  // Используйте вашу систему уведомлений
  console.error(message);
};
```

## Тестирование интеграции

### Unit тесты для сервисов
```typescript
// tests/services/authService.test.ts
import { authService } from '../../services/authService';
import { apiClient } from '../../services/apiClient';

jest.mock('../../services/apiClient');

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should login successfully', async () => {
    const mockResponse = {
      access_token: 'token',
      refresh_token: 'refresh',
      user: { id: '1', email: 'test@example.com', name: 'Test User' }
    };

    (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

    const result = await authService.login({
      email: 'test@example.com',
      password: 'password'
    });

    expect(result).toEqual(mockResponse);
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'test@example.com',
      password: 'password'
    });
  });
});
```

### Integration тесты
```typescript
// tests/integration/auth.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Auth } from '../../pages/Auth';
import { authService } from '../../services/authService';

jest.mock('../../services/authService');

describe('Authentication Integration', () => {
  test('should login and redirect to dashboard', async () => {
    const mockLogin = jest.spyOn(authService, 'login');
    mockLogin.mockResolvedValue({
      access_token: 'token',
      refresh_token: 'refresh',
      user: { id: '1', email: 'test@example.com', name: 'Test User' }
    });

    render(<Auth />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
    });
  });
});
```

## Миграция с mock данных

### Поэтапная замена
1. **Этап 1**: Заменить authService на реальный API
2. **Этап 2**: Заменить projectService и estimateService
3. **Этап 3**: Заменить все остальные сервисы
4. **Этап 4**: Удалить все mock данные

### Удаление mock данных
```bash
# Команды для удаления mock файлов после полной интеграции
rm services/mockData.ts
rm services/__mocks__/mockData.ts

# Обновление импортов в компонентах
find . -name "*.tsx" -o -name "*.ts" | xargs grep -l "mockData" | head -10
```

---

*План интеграции создан: 24.11.2024*
*Версия: 1.0*
*Ожидаемое время выполнения: 6 недель*