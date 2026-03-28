import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  Project, User, Counterparty, Estimate, Payment,
  ProjectEvent, EstimateItem, Company, UserRole, 
  EstimateStatus, VatMode, PaymentDirection, 
  AIConfiguration, AITaskType, CompanySettings
} from '../types';
import { runtimeConfig } from '../config/runtime';

// API Base Configuration
const API_BASE_URL = runtimeConfig.apiUrl;

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

type PaginatedCollection<T> = PaginatedResponse<T[] | Record<string, T[]>>;
type InformationalApiResponse = {
  success?: boolean;
  data?: void;
  message?: string;
  error?: string;
};

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
  requestPasswordReset: (email: string) => Promise<boolean>;
  confirmPasswordReset: (data: { email: string; code: string; new_password: string }) => Promise<boolean>;
  changePassword: (data: { current_password: string; new_password: string }) => Promise<boolean>;
}

// Base API client
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token');
  }

  // Public method to update token
  setToken(token: string | null) {
    this.token = token;
  }

  private isSuccessfulResponse(response: { success?: boolean; error?: string }): boolean {
    return response.success !== false && !response.error;
  }

  private normalizePaginatedCollection<T>(
    response: ApiResponse<PaginatedCollection<T>>,
    collectionKey?: string
  ): ApiResponse<PaginatedResponse<T[]>> {
    if (!response.data) {
      return response as ApiResponse<PaginatedResponse<T[]>>;
    }

    const payload = response.data.data;
    let items: T[] = [];

    if (Array.isArray(payload)) {
      items = payload;
    } else if (payload && typeof payload === 'object') {
      if (collectionKey) {
        const keyedValue = (payload as Record<string, unknown>)[collectionKey];
        if (Array.isArray(keyedValue)) {
          items = keyedValue as T[];
        }
      }

      if (!items.length) {
        const firstArrayValue = Object.values(payload as Record<string, unknown>).find(Array.isArray);
        if (Array.isArray(firstArrayValue)) {
          items = firstArrayValue as T[];
        }
      }
    }

    return {
      ...response,
      success: response.success !== false,
      data: {
        ...response.data,
        data: items,
      },
    };
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
        throw new Error((data as any).error || (data as any).message || `HTTP ${response.status}`);
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
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            await this.refreshToken(refreshToken);
            // Повторяем запрос с новым токеном
            return this.request<T>(endpoint, options, false);
          } catch (refreshError) {
            // Если refresh не удался, очищаем токены и пробрасываем ошибку
            this.token = null;
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            throw new Error('Session expired. Please login again.');
          }
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Authentication
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<ApiResponse<LoginResponse>>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data?.tokens) {
      this.token = response.data.tokens.access_token;
      localStorage.setItem('access_token', this.token);
      if (response.data.tokens.refresh_token) {
        localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
      }
    }

    return response;
  }

  async register(data: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<ApiResponse<LoginResponse>>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success && response.data?.tokens) {
      this.token = response.data.tokens.access_token;
      localStorage.setItem('access_token', this.token);
      if (response.data.tokens.refresh_token) {
        localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
      }
    }

    return response;
  }

  async requestPasswordReset(email: string): Promise<boolean> {
    const response = await this.request<InformationalApiResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    return this.isSuccessfulResponse(response);
  }

  async confirmPasswordReset(data: { email: string; code: string; new_password: string }): Promise<boolean> {
    const response = await this.request<InformationalApiResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return this.isSuccessfulResponse(response);
  }

  async changePassword(data: { current_password: string; new_password: string }): Promise<boolean> {
    const response = await this.request<InformationalApiResponse>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return this.isSuccessfulResponse(response);
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    return this.request<ApiResponse<{ user: User }>>('/auth/me');
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    return this.request<ApiResponse<{ user: User }>>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      this.token = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
    const response = await this.request<ApiResponse<{ access_token: string; refresh_token: string }>>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.success && response.data) {
      this.token = response.data.access_token;
      localStorage.setItem('access_token', response.data.access_token);
      if (response.data.refresh_token) {
        localStorage.setItem('refresh_token', response.data.refresh_token);
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
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params?.sort_desc) queryParams.append('sort_desc', params.sort_desc.toString());

    const endpoint = `/projects${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request<ApiResponse<PaginatedCollection<Project>>>(endpoint);
    return this.normalizePaginatedCollection(response, 'projects');
  }

  async getProject(id: string): Promise<ApiResponse<{ project: Project }>> {
    return this.request<ApiResponse<{ project: Project }>>(`/projects/${id}`);
  }

  async createProject(data: Partial<Project>): Promise<ApiResponse<{ project: Project }>> {
    return this.request<ApiResponse<{ project: Project }>>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(id: string, data: Partial<Project>): Promise<ApiResponse<{ project: Project }>> {
    return this.request<ApiResponse<{ project: Project }>>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
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
    const response = await this.request<ApiResponse<PaginatedCollection<Company>>>(endpoint);
    return this.normalizePaginatedCollection(response, 'companies');
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
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);

    const endpoint = `/counterparties${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const response = await this.request<ApiResponse<PaginatedCollection<Counterparty>>>(endpoint);
    return this.normalizePaginatedCollection(response, 'counterparties');
  }

  async createCounterparty(data: Partial<Counterparty>): Promise<ApiResponse<{ counterparty: Counterparty }>> {
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
      const savedToken = localStorage.getItem('access_token');
      if (savedToken) {
        try {
          const response = await apiClient.getCurrentUser();
          if (response.success && response.data?.user) {
            setUser(response.data.user);
            setToken(savedToken);
            apiClient.setToken(savedToken);
          } else {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const response = await apiClient.login(email, password);
    if (response.success && response.data) {
      setUser(response.data.user);
      setToken(response.data.tokens.access_token);
      if (response.data.tokens.refresh_token) {
        localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
      }
      return true;
    }

    throw new Error(response.error || response.message || 'Не удалось выполнить вход');
  };

  const register = async (data: RegisterRequest): Promise<boolean> => {
    try {
      const response = await apiClient.register(data);
      if (response.success && response.data) {
        setUser(response.data.user);
        setToken(response.data.tokens.access_token);
        if (response.data.tokens.refresh_token) {
          localStorage.setItem('refresh_token', response.data.tokens.refresh_token);
        }
        return true;
      }
      throw new Error(response.error || response.message || 'Не удалось выполнить регистрацию');
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
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

  const requestPasswordReset = async (email: string): Promise<boolean> => {
    try {
      return await apiClient.requestPasswordReset(email);
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  };

  const confirmPasswordReset = async (data: { email: string; code: string; new_password: string }): Promise<boolean> => {
    try {
      return await apiClient.confirmPasswordReset(data);
    } catch (error) {
      console.error('Password reset confirmation failed:', error);
      throw error;
    }
  };

  const changePassword = async (data: { current_password: string; new_password: string }): Promise<boolean> => {
    try {
      return await apiClient.changePassword(data);
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    requestPasswordReset,
    confirmPasswordReset,
    changePassword,
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};
