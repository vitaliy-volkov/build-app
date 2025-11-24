import { create } from 'zustand';
import { User, UserRole } from './types';
import { MOCK_USERS } from '../../../services/mockData';
import { v4 as uuidv4 } from 'uuid';

interface AuthState {
  isAuthenticated: boolean;
  currentUser: User;
  users: User[];

  // Actions
  login: (email: string, name?: string) => void;
  logout: () => void;
  setCurrentUser: (user: User) => void;
  updateUser: (user: User) => void;
  addUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  // Initial user is the first one from mock data, but we are not authenticated yet.
  // App.tsx was setting MOCK_USERS[0] as default.
  currentUser: MOCK_USERS[0],
  users: MOCK_USERS,

  login: (email: string, name?: string) => {
    if (name) {
      // Logic from App.tsx
      const newUser: User = {
        id: uuidv4(),
        name: name,
        email: email,
        role: UserRole.Director,
        avatar_initials: name.substring(0,2).toUpperCase(),
        is_active: true
      };
      set((state) => ({
        users: [...state.users, newUser],
        currentUser: newUser,
        isAuthenticated: true
      }));
    } else {
      // Simple login, resetting to default user as per App.tsx logic?
      // App.tsx: setCurrentUser(MOCK_USERS[0]); setIsAuthenticated(true);
      // It seems it doesn't look up user by email in the mock logic in App.tsx
      // But maybe we should improve it slightly?
      // "Use mock data for now (mirroring `MOCK_USERS` from `src/services/mockData.ts`)"
      // I will stick to App.tsx logic to not break behavior.
      set({
        currentUser: MOCK_USERS[0],
        isAuthenticated: true
      });
    }
  },

  logout: () => {
    set({ isAuthenticated: false });
  },

  setCurrentUser: (user: User) => {
    set({ currentUser: user });
  },

  updateUser: (updatedUser: User) => {
    set((state) => {
      const newUsers = state.users.map(u => u.id === updatedUser.id ? updatedUser : u);
      // If current user is updated, update it too
      const newCurrentUser = state.currentUser.id === updatedUser.id ? updatedUser : state.currentUser;
      return {
        users: newUsers,
        currentUser: newCurrentUser
      };
    });
  },

  addUser: (user: User) => {
    set((state) => ({ users: [...state.users, user] }));
  }
}));
