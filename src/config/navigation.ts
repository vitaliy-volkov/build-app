import {
  BarChart3,
  FolderKanban,
  FileText,
  Ruler,
  Calendar,
  Paintbrush,
  Truck,
  PackageCheck,
  Folder,
  ScrollText,
  MessagesSquare,
  Camera,
  Megaphone,
  Banknote,
  Briefcase,
  Users,
  BookOpen,
  Settings,
  LucideIcon,
} from 'lucide-react';
import { UserRole } from '../types';

export type NavigationAccess = 'all' | 'admin_or_director' | 'finance' | 'crm';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  access: NavigationAccess;
  exact?: boolean;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    id: 'main',
    label: 'Главное',
    items: [
      { id: 'dashboard', label: 'Дашборд', path: '/', icon: BarChart3, access: 'all', exact: true },
      { id: 'projects', label: 'Проекты', path: '/projects', icon: FolderKanban, access: 'all' },
      { id: 'estimates', label: 'Сметы', path: '/estimates', icon: FileText, access: 'all' },
    ],
  },
  {
    id: 'project-workflow',
    label: 'Проектный контур',
    items: [
      { id: 'measurements', label: 'Замеры', path: '/measurements', icon: Ruler, access: 'all' },
      { id: 'schedule', label: 'Графики', path: '/schedule', icon: Calendar, access: 'all' },
      { id: 'design', label: 'Дизайн', path: '/design', icon: Paintbrush, access: 'all' },
      { id: 'supply', label: 'Снабжение', path: '/supply', icon: Truck, access: 'all' },
      { id: 'complectation', label: 'Комплектация', path: '/complectation', icon: PackageCheck, access: 'all' },
      { id: 'docs', label: 'Документы', path: '/docs', icon: Folder, access: 'all' },
      { id: 'acts', label: 'Акты', path: '/acts', icon: ScrollText, access: 'all' },
      { id: 'chats', label: 'Чаты', path: '/chats', icon: MessagesSquare, access: 'all' },
      { id: 'photos', label: 'Фотоотчеты', path: '/photos', icon: Camera, access: 'all' },
    ],
  },
  {
    id: 'business',
    label: 'Бизнес',
    items: [
      { id: 'crm', label: 'CRM', path: '/crm', icon: Megaphone, access: 'crm' },
      { id: 'finance', label: 'Финансы', path: '/finance', icon: Banknote, access: 'finance' },
      { id: 'resources', label: 'Загрузка', path: '/resources', icon: Briefcase, access: 'admin_or_director' },
      { id: 'directories', label: 'Справочники', path: '/directories', icon: Users, access: 'all' },
    ],
  },
  {
    id: 'system',
    label: 'Система',
    items: [
      { id: 'knowledge', label: 'База знаний', path: '/knowledge-base', icon: BookOpen, access: 'all' },
      { id: 'settings', label: 'Настройки', path: '/settings', icon: Settings, access: 'admin_or_director' },
    ],
  },
];

export const canAccessNavigationItem = (role: UserRole | string, access: NavigationAccess): boolean => {
  const roleValue = String(role);
  const adminOrDirector = roleValue === 'admin' || roleValue === 'director' || role === UserRole.Admin || role === UserRole.Director;
  const financeRoles = ['director', 'admin', 'project_manager', 'estimator'];
  const crmRoles = ['director', 'admin', 'project_manager', 'manager'];

  switch (access) {
    case 'all':
      return true;
    case 'admin_or_director':
      return adminOrDirector;
    case 'finance':
      return financeRoles.includes(roleValue) || [UserRole.Director, UserRole.Admin, UserRole.ProjectManager, UserRole.Estimator].includes(role as UserRole);
    case 'crm':
      return crmRoles.includes(roleValue) || [UserRole.Director, UserRole.Admin, UserRole.ProjectManager, UserRole.Manager].includes(role as UserRole);
    default:
      return false;
  }
};
