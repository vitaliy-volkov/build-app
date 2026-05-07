import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { tokenManager } from '../services/tokenManager';
import { apiClient } from '../services/apiClient';
import { User } from '../types';
import { LoadingState } from './LoadingState';

interface AuthGuardProps {
  children: React.ReactNode;
  onAuthSuccess?: (user: User) => void;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, onAuthSuccess }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasError, setHasError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = tokenManager.getAccessToken();
        
        if (!token) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }

        // Check if token is expired and try to refresh
        if (tokenManager.isTokenExpired()) {
          const newToken = await tokenManager.refreshAccessToken();
          if (!newToken) {
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }
        }

        // Verify token by fetching current user
        apiClient.setToken(tokenManager.getAccessToken());
        const response = await apiClient.getCurrentUser();
        
        if (response.success && response.data?.user) {
          setIsAuthenticated(true);
          onAuthSuccess?.(response.data.user);
        } else {
          tokenManager.clearTokens();
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        tokenManager.clearTokens();
        setHasError(true);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [onAuthSuccess]);

  if (isLoading) {
    return (
      <LoadingState
        isLoading={true}
        hasError={false}
        error={null}
        onRetry={() => {}}
      >
        <div />
      </LoadingState>
    );
  }

  if (hasError) {
    return (
      <LoadingState
        isLoading={false}
        hasError={true}
        error="Ошибка проверки авторизации. Пожалуйста, попробуйте снова."
        onRetry={() => window.location.reload()}
      >
        <div />
      </LoadingState>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
