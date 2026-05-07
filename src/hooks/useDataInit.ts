import { useState, useEffect, useCallback, useRef } from 'react';
import { tokenManager } from '../services/tokenManager';
import { apiClient } from '../services/apiClient';
import { Project, User, Counterparty } from '../types';
import { MOCK_PROJECTS, MOCK_COUNTERPARTIES } from '../services/mockData';

interface DataInitState {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  projects: Project[];
  counterparties: Counterparty[];
  currentUser: User | null;
}

interface DataInitOptions {
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export const useDataInit = (options: DataInitOptions = {}) => {
  const { onError, onSuccess } = options;
  const [state, setState] = useState<DataInitState>({
    isReady: false,
    isLoading: true,
    error: null,
    projects: [],
    counterparties: [],
    currentUser: null,
  });

  const initStarted = useRef(false);

  const initialize = useCallback(async () => {
    if (initStarted.current) return;
    initStarted.current = true;

    console.log('useDataInit: starting initialization...');

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check authentication
      const token = tokenManager.getAccessToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Set token in apiClient
      apiClient.setToken(token);

      // Load current user
      const userRes = await apiClient.getCurrentUser();
      if (!userRes.success || !userRes.data?.user) {
        throw new Error('Failed to load user data');
      }
      const currentUser = userRes.data.user;

      // Load projects with fallback
      let projects: Project[] = [];
      try {
        const projectsRes = await apiClient.getProjects({ limit: 100 });
        if (projectsRes.success && projectsRes.data?.data) {
          projects = projectsRes.data.data;
          console.log(`useDataInit: loaded ${projects.length} projects from API`);
        } else {
          console.warn('useDataInit: API returned no projects, using mock data');
          projects = MOCK_PROJECTS;
        }
      } catch (projectsError) {
        console.warn('useDataInit: failed to load projects from API, using mock data', projectsError);
        projects = MOCK_PROJECTS;
      }

      // Load counterparties from localStorage + mock
      const stored = localStorage.getItem('custom_counterparties');
      const customCounterparties = stored ? JSON.parse(stored) : [];
      const counterparties = [...MOCK_COUNTERPARTIES, ...customCounterparties];

      setState({
        isReady: true,
        isLoading: false,
        error: null,
        projects,
        counterparties,
        currentUser,
      });

      onSuccess?.();
      console.log('useDataInit: initialization complete');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('useDataInit: initialization failed', error);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        isReady: false,
      }));

      onError?.(errorMessage);
    }
  }, [onError, onSuccess]);

  const retry = useCallback(() => {
    initStarted.current = false;
    initialize();
  }, [initialize]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    initialize,
    retry,
  };
};
