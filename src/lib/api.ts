import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Define the API URL
// In Vite, we use import.meta.env
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let token: string | null = null;
    try {
      token = localStorage.getItem('access_token');
    } catch (e) {
      console.warn('LocalStorage access failed:', e);
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 (Unauthorized)
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        let refreshToken: string | null = null;
        try {
            refreshToken = localStorage.getItem('refresh_token');
        } catch (e) {
            console.warn('LocalStorage access failed:', e);
        }

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Attempt to refresh tokens
        // We use a separate axios instance or raw fetch to avoid circular loops
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data.data; // Adjust based on actual backend response structure

        try {
            localStorage.setItem('access_token', access_token);
            if (newRefreshToken) {
              localStorage.setItem('refresh_token', newRefreshToken);
            }
        } catch (e) {
            console.warn('LocalStorage save failed:', e);
        }

        // Update header and retry original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        try {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        } catch (e) {
            console.warn('LocalStorage clear failed:', e);
        }
        window.location.href = '/login'; // Or use a more graceful redirect
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
