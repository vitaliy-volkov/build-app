import { apiClient } from './apiClient';

const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

class TokenManager {
  private refreshPromise: Promise<string | null> | null = null;
  private onTokenExpiredCallback: (() => void) | null = null;

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  setTokens(access: string, refresh?: string, expiresIn?: number): void {
    localStorage.setItem(TOKEN_KEY, access);
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
    }
    if (expiresIn) {
      const expiry = Date.now() + expiresIn * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toString());
    }
    apiClient.setToken(access);
  }

  clearTokens(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    apiClient.setToken(null);
  }

  isTokenExpired(): boolean {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (!expiry) return false;
    return Date.now() >= parseInt(expiry, 10) - 60000; // 1 min buffer
  }

  onTokenExpired(callback: () => void): void {
    this.onTokenExpiredCallback = callback;
  }

  async refreshAccessToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearTokens();
      if (this.onTokenExpiredCallback) {
        this.onTokenExpiredCallback();
      }
      return null;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await apiClient.refreshToken(refreshToken);
        if (response.success && response.data) {
          this.setTokens(
            response.data.access_token,
            response.data.refresh_token,
            900 // 15 minutes
          );
          return response.data.access_token;
        }
        throw new Error('Refresh failed');
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.clearTokens();
        if (this.onTokenExpiredCallback) {
          this.onTokenExpiredCallback();
        }
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Setup request interceptor - returns headers with auth token
  async getAuthHeaders(): Promise<Record<string, string>> {
    let token = this.getAccessToken();
    
    if (token && this.isTokenExpired()) {
      token = await this.refreshAccessToken();
    }
    
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    
    return {};
  }
}

export const tokenManager = new TokenManager();
