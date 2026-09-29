import { MOCK_USERS } from './mockData';
import type { User } from '../types';

export const DEMO_EMAIL = 'admin@stroy-master.ru';
export const DEMO_PASSWORD = 'admin123';
export const DEMO_TOKEN = 'stroy-control-demo-session';
const DEMO_USER_KEY = 'demo_user';

export const createDemoUser = (): User => ({
  ...MOCK_USERS.find(user => user.id === 'u-admin')!,
  email: DEMO_EMAIL,
  company_id: 'comp-1',
});

export const readDemoUser = (): User | null => {
  try {
    const value = localStorage.getItem(DEMO_USER_KEY);
    return value ? JSON.parse(value) as User : null;
  } catch {
    return null;
  }
};

export const saveDemoUser = (user: User): void => {
  localStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
};

export const clearDemoUser = (): void => {
  localStorage.removeItem(DEMO_USER_KEY);
};
