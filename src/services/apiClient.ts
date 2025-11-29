import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  Project, User, Counterparty, Estimate, Payment,
  ProjectEvent, EstimateItem, Company, UserRole, 
  EstimateStatus, VatMode, PaymentDirection, 
  AIConfiguration, AITaskType, CompanySettings
} from '../types';
import { MOCK_USERS, MOCK_PROJECTS, MOCK_COUNTERPARTIES, MOCK_ESTIMATES } from './mockData';
import { v4 as uuidv4 } from 'uuid';

// API Base Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
const USE_MOCK_API = true; // Force mock API for prototype

// Types for API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface PaginatedResponse<T> {
  data: T;
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  tokens: {
    access_token: string;
    refresh_token: string;
  };
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role?: string;
  company_id?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

// Base API client
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    try {
      this.token = localStorage.getItem('access_token');
    } catch (e) {
      console.warn('LocalStorage access failed:', e);
      this.token = null;
    }
  }

  // Public method to update token
  setToken(token: string | null) {
    this.token = token;
  }

  // Public method for custom requests (used by service wrappers)
  async customRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error((data as any).error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    retryOn401: boolean = true
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // Если получили 401 и это не запрос на refresh, пытаемся обновить токен
      if (response.status === 401 && retryOn401 && endpoint !== '/auth/refresh') {
        let refreshToken: string | null = null;
        try {
            refreshToken = localStorage.getItem('refresh_token');
        } catch (e) {
            console.warn('LocalStorage access failed:', e);
        }

        if (refreshToken) {
          try {
            await this.refreshToken(refreshToken);
            // Повторяем запрос с новым токеном
            return this.request<T>(endpoint, options, false);
          } catch (refreshError) {
            // Если refresh не удался, очищаем токены и пробрасываем ошибку
            this.token = null;
            try {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
            } catch (e) {
                console.warn('LocalStorage clear failed:', e);
            }
            throw new Error('Session expired. Please login again.');
          }
        }
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    if (USE_MOCK_API) {
      // Find user by email
      const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      // In mock mode, we accept any password if user exists
      if (user) {
        const response: ApiResponse<LoginResponse> = {
          success: true,
          data: {
            user,
            tokens: {
              access_token: `mock_token_${user.id}`,
              refresh_token: `mock_refresh_${user.id}`
            }
          }
        };

        this.token = response.data!.tokens.access_token;
        try {
            localStorage.setItem('access_token', this.token);
            localStorage.setItem('refresh_token', response.data!.tokens.refresh_token);
        } catch (e) {
            console.warn('LocalStorage save failed:', e);
        }
        
        return response;
      }
      
      return {
        success: false,
        error: 'Неверный email или пароль'
      };
    }

    const response = await this.request<ApiResponse<LoginResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.tokens) {
      this.token = response.data.tokens.access_token;
      try {
        localStorage.setItem('access_token', this.token);
        if (response.data.tokens.refresh_token) {
          localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
        }
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }

    return response;
  }

  async register(data: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    if (USE_MOCK_API) {
      const existingUser = MOCK_USERS.find(u => u.email.toLowerCase() === data.email.toLowerCase());
      if (existingUser) {
        return { success: false, error: 'Пользователь с таким email уже существует' };
      }

      const newUser: User = {
        id: uuidv4(),
        name: data.name,
        email: data.email,
        role: (data.role as UserRole) || UserRole.Director,
        avatar_initials: data.name.substring(0, 2).toUpperCase(),
        is_active: true,
        company_id: data.company_id,
        // Defaults
        balance: 0,
        earnings_history: [],
        skills: [],
        companies: []
      };

      MOCK_USERS.push(newUser);

      const response: ApiResponse<LoginResponse> = {
        success: true,
        data: {
          user: newUser,
          tokens: {
            access_token: `mock_token_${newUser.id}`,
            refresh_token: `mock_refresh_${newUser.id}`
          }
        }
      };

      this.token = response.data!.tokens.access_token;
      try {
        localStorage.setItem('access_token', this.token);
        localStorage.setItem('refresh_token', response.data!.tokens.refresh_token);
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }

      return response;
    }

    const response = await this.request<ApiResponse<LoginResponse>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.data?.tokens) {
      this.token = response.data.tokens.access_token;
      try {
        localStorage.setItem('access_token', this.token);
        if (response.data.tokens.refresh_token) {
          localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
        }
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }

    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    if (USE_MOCK_API) {
      if (!this.token) {
         return { success: false, error: 'No token' };
      }
      
      // Try to extract ID from mock token
      if (this.token.startsWith('mock_token_')) {
          const userId = this.token.replace('mock_token_', '');
          const user = MOCK_USERS.find(u => u.id === userId);
          if (user) {
              return { success: true, data: { user } };
          }
      }
      // Fallback for default token or testing
      return { success: true, data: { user: MOCK_USERS[0] } };
    }
    return this.request<ApiResponse<{ user: User }>>('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      if (!USE_MOCK_API) {
        await this.request('/auth/logout', { method: 'POST' });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      this.token = null;
      try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } catch (e) {
        console.warn('LocalStorage clear failed:', e);
      }
    }
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
    const response = await this.request<ApiResponse<{ access_token: string; refresh_token: string }>>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.success && response.data) {
      this.token = response.data.access_token;
      try {
        localStorage.setItem('access_token', response.data.access_token);
        if (response.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.refresh_token);
        }
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }

    return response;
  }

  // Projects
  async getProjects(params?: {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_desc?: boolean;
  }): Promise<ApiResponse<PaginatedResponse<Project[]>>> {
    if (USE_MOCK_API) {
        return {
            success: true,
            data: {
                data: MOCK_PROJECTS,
                total: MOCK_PROJECTS.length,
                page: 1,
                limit: 1000,
                total_pages: 1,
                has_next: false,
                has_prev: false
            }
        };
    }

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params?.sort_desc) queryParams.append('sort_desc', params.sort_desc.toString());

    const endpoint = `/projects${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request<ApiResponse<PaginatedResponse<Project[]>>>(endpoint);
  }

  async getProject(id: string): Promise<ApiResponse<{ project: Project }>> {
    return this.request<ApiResponse<{ project: Project }>>(`/projects/${id}`);
  }

  async createProject(data: Partial<Project>): Promise<ApiResponse<{ project: Project }>> {
    if (USE_MOCK_API) {
        const newProject = {
            ...data,
            id: uuidv4(),
            status: data.status || 'Active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Project;
        
        return {
            success: true,
            data: { project: newProject }
        };
    }

    return this.request<ApiResponse<{ project: Project }>>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: Partial<Project>): Promise<ApiResponse<{ project: Project }>> {
    if (USE_MOCK_API) {
        return {
            success: true,
            data: { project: { ...data, id } as Project }
        };
    }
    return this.request<ApiResponse<{ project: Project }>>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    if (USE_MOCK_API) {
        return { success: true };
    }
    return this.request<ApiResponse<void>>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Companies
  async getCompanies(params?: {
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_desc?: boolean;
  }): Promise<ApiResponse<PaginatedResponse<Company[]>>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params?.sort_desc) queryParams.append('sort_desc', params.sort_desc.toString());

    const endpoint = `/companies${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request<ApiResponse<PaginatedResponse<Company[]>>>(endpoint);
  }

  async getCompany(id: string): Promise<ApiResponse<{ company: Company }>> {
    return this.request<ApiResponse<{ company: Company }>>(`/companies/${id}`);
  }

  async createCompany(data: Partial<Company>): Promise<ApiResponse<{ company: Company }>> {
    return this.request<ApiResponse<{ company: Company }>>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompany(id: string, data: Partial<Company>): Promise<ApiResponse<{ company: Company }>> {
    return this.request<ApiResponse<{ company: Company }>>(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Project Teams
  async getProjectTeam(projectId: string): Promise<ApiResponse<{
    project_id: string;
    team_members: Array<{
      project_id: string;
      user_id: string;
      role: string;
      joined_at: string;
      user: User;
    }>;
    count: number;
  }>> {
    return this.request<ApiResponse<{
      project_id: string;
      team_members: Array<{
        project_id: string;
        user_id: string;
        role: string;
        joined_at: string;
        user: User;
      }>;
      count: number;
    }>>(`/projects/${projectId}/team`);
  }

  async addTeamMember(projectId: string, userId: string, role: string): Promise<ApiResponse<{
    team_member: {
      project_id: string;
      user_id: string;
      role: string;
      user: User;
    };
  }>> {
    return this.request<ApiResponse<{
      team_member: {
        project_id: string;
        user_id: string;
        role: string;
        user: User;
      };
    }>>(`/projects/${projectId}/team`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role }),
    });
  }

  async updateMemberRole(projectId: string, userId: string, role: string): Promise<ApiResponse<{
    team_member: {
      user_id: string;
      role: string;
      user: User;
    };
  }>> {
    return this.request<ApiResponse<{
      team_member: {
        user_id: string;
        role: string;
        user: User;
      };
    }>>(`/projects/${projectId}/team/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async removeTeamMember(projectId: string, userId: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/projects/${projectId}/team/${userId}`, {
      method: 'DELETE',
    });
  }

  // Counterparties
  async getCounterparties(params?: {
    page?: number;
    limit?: number;
    type?: string;
  }): Promise<ApiResponse<PaginatedResponse<Counterparty[]>>> {
    if (USE_MOCK_API) {
        return {
            success: true,
            data: {
                data: MOCK_COUNTERPARTIES,
                total: MOCK_COUNTERPARTIES.length,
                page: 1,
                limit: 1000,
                total_pages: 1,
                has_next: false,
                has_prev: false
            }
        };
    }

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);

    const endpoint = `/counterparties${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return this.request<ApiResponse<PaginatedResponse<Counterparty[]>>>(endpoint);
  }

  async createCounterparty(data: Partial<Counterparty>): Promise<ApiResponse<{ counterparty: Counterparty }>> {
    if (USE_MOCK_API) {
        const newCounterparty = {
            ...data,
            id: uuidv4(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        } as Counterparty;
        
        return {
            success: true,
            data: { counterparty: newCounterparty }
        };
    }
    return this.request<ApiResponse<{ counterparty: Counterparty }>>('/counterparties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Estimates
  async getEstimates(projectId?: string, params?: {
    page?: number;
    limit?: number;
    status?: EstimateStatus;
  }): Promise<ApiResponse<PaginatedResponse<Estimate[]>>> {
    if (USE_MOCK_API) {
        let estimates = MOCK_ESTIMATES;
        if (projectId) {
            estimates = estimates.filter(e => e.project_id === projectId);
        }
        return {
            success: true,
            data: {
                data: estimates,
                total: estimates.length,
                page: 1,
                limit: 1000,
                total_pages: 1,
                has_next: false,
                has_prev: false
            }
        };
    }

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);

    let endpoint = '/estimates';
    if (projectId) {
      endpoint = `/projects/${projectId}/estimates`;
    }
    if (queryParams.toString()) {
      endpoint += '?' + queryParams.toString();
    }

    return this.request<ApiResponse<PaginatedResponse<Estimate[]>>>(endpoint);
  }

  async getEstimate(id: string): Promise<ApiResponse<{ estimate: Estimate; items: EstimateItem[] }>> {
    return this.request<ApiResponse<{ estimate: Estimate; items: EstimateItem[] }>>(`/estimates/${id}`);
  }

  async createEstimate(data: {
    project_id: string;
    name: string;
    status: EstimateStatus;
    vat_mode: VatMode;
    description?: string;
    payment_conditions?: string;
  }): Promise<ApiResponse<{ estimate: Estimate }>> {
    return this.request<ApiResponse<{ estimate: Estimate }>>('/estimates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEstimate(id: string, data: Partial<Estimate>): Promise<ApiResponse<{ estimate: Estimate }>> {
    return this.request<ApiResponse<{ estimate: Estimate }>>(`/estimates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // AI Configuration
  async getAIConfiguration(): Promise<ApiResponse<AIConfiguration>> {
    return this.request<ApiResponse<AIConfiguration>>('/ai/configuration');
  }

  async updateAIConfiguration(config: AIConfiguration): Promise<ApiResponse<AIConfiguration>> {
    return this.request<ApiResponse<AIConfiguration>>('/ai/configuration', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async testAIProvider(providerId: string): Promise<ApiResponse<{ status: string; message: string }>> {
    return this.request<ApiResponse<{ status: string; message: string }>>(`/ai/test/${providerId}`, {
      method: 'POST',
    });
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; database?: string; timestamp: string; service?: string }> {
    return this.request<{ status: string; database?: string; timestamp: string; service?: string }>('/health');
  }

  async databaseHealth(): Promise<{ status: string; time: string }> {
    return this.request<{ status: string; time: string }>('/health/database');
  }
}

// Create API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Authentication Context
export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      let savedToken: string | null = null;
      try {
        savedToken = localStorage.getItem('access_token');
      } catch (e) {
        console.warn('LocalStorage access failed:', e);
      }

      if (savedToken) {
        try {
          const response = await apiClient.getCurrentUser();
          if (response.success && response.data?.user) {
            setUser(response.data.user);
            setToken(savedToken);
            apiClient.setToken(savedToken);
          } else {
            try {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
            } catch (e) {
                console.warn('LocalStorage clear failed:', e);
            }
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          try {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          } catch (e) {
            console.warn('LocalStorage clear failed:', e);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiClient.login(email, password);
      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.tokens.access_token);
        if (response.data.tokens.refresh_token) {
          try {
            localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
          } catch (e) {
            console.warn('LocalStorage save failed:', e);
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (data: RegisterRequest): Promise<boolean> => {
    try {
      const response = await apiClient.register(data);
      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.tokens.access_token);
        if (response.data.tokens.refresh_token) {
          try {
            localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
          } catch (e) {
            console.warn('LocalStorage save failed:', e);
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = async () => {
    await apiClient.logout();
    setUser(null);
    setToken(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    updateUser, // Expose this
    isAuthenticated: !!user,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};