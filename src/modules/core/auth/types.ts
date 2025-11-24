// Copied from src/types.ts

// New Auth Types
export enum UserRole {
  Director = "Директор",
  ProjectManager = "Руководитель проекта",
  Foreman = "Прораб",
  Estimator = "Сметчик",
  SupplyManager = "Снабженец",
  Admin = "Администратор",
  Client = "Заказчик",
  Manager = "Менеджер" // Added for Client Portal
}

export interface UserCompany {
  id: string;
  name: string;
  role: UserRole;
  is_current: boolean;
}

export interface EarningRecord {
  date: string;
  amount: number;
}

export interface UserStats {
  tenureDays: number; // Days working in company
  tasksCompleted: number;
  projectsCompleted: number;
  profitGenerated: number; // For priority calc
  kpiScore: number; // 0-100
  onTimeRate: number; // 0-100%
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar_initials: string;
  email?: string;
  phone?: string;     // NEW
  location?: string;  // NEW
  telegram?: string;  // NEW
  bio?: string;       // NEW
  skills?: string[];  // NEW
  is_active?: boolean;

  // Ecosystem & Profile v2.0
  companies?: UserCompany[]; // Multi-company support
  external_rating?: number; // 0-5 stars
  internal_score?: number; // Algorithmic priority score
  balance?: number;
  earnings_history?: EarningRecord[];
  stats?: UserStats;
  referral_code?: string;
  referral_balance?: number;
  referral_count?: number;
}
