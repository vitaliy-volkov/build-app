// src/modules/core/auth/types.ts
import { UserRole } from '../../../types';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_initials: string;
  is_active: boolean;
  token?: string;
  refreshToken?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
