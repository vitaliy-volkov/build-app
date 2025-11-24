// src/modules/core/auth/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User } from './types';
import { MOCK_USERS } from '../../../services/mockData';
import { UserRole } from '../../../types';
import { v4 as uuidv4 } from 'uuid';

interface AuthActions {
  login: (email: string, name?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, name?: string) => {
        set({ isLoading: true, error: null });

        try {
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 500));

          let user: User;

          // Check if mock user exists (simple logic for now)
          const mockUser = MOCK_USERS.find(u => u.email === email);

          if (mockUser) {
             user = {
                 id: mockUser.id,
                 name: mockUser.name,
                 email: mockUser.email || email,
                 role: mockUser.role,
                 avatar_initials: mockUser.avatar_initials,
                 is_active: mockUser.is_active || true
             };
          } else if (name) {
             // Register new mock user
             user = {
                id: uuidv4(),
                name: name,
                email: email,
                role: UserRole.Director,
                avatar_initials: name.substring(0, 2).toUpperCase(),
                is_active: true
             };
          } else {
              // Fallback for demo
              user = {
                  id: MOCK_USERS[0].id,
                  name: MOCK_USERS[0].name,
                  email: MOCK_USERS[0].email || 'demo@example.com',
                  role: MOCK_USERS[0].role,
                  avatar_initials: MOCK_USERS[0].avatar_initials,
                  is_active: true
              };
          }

          const fakeToken = `mock-jwt-${Date.now()}`;

          set({
            user,
            token: fakeToken,
            isAuthenticated: true,
            isLoading: false
          });

        } catch (err) {
          set({
            error: 'Failed to login',
            isLoading: false
          });
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null
        }));
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);
