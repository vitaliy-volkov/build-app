
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FolderKanban, Users, BookOpen, Settings, Menu,
  X, ChevronLeft, ChevronRight, Bell, CheckCircle2, AlertTriangle, Info,
  BarChart3, Banknote, Megaphone, LogOut, FileText, Briefcase, Calendar,
  Paintbrush, Truck, PackageCheck, ScrollText, MessagesSquare, Camera, Folder, Ruler,
  Search, User as UserIcon, File, Box
} from 'lucide-react';
import { clsx } from 'clsx';
import { useApp } from '../App';
import { UserRole, NotificationType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const NavItem = ({ to, icon: Icon, label, active, collapsed }: { to: string; icon: any; label: string; active: boolean; collapsed: boolean }) => (
  <Link
    to={to}
    className={clsx(
      "flex items-center py-3 rounded-lg transition-all duration-200 mb-1 relative group",
      active 
        ? "bg-blue-600 text-white shadow-md" 
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      collapsed ? "justify-center px-2" : "px-4 space-x-3"
    )}
    title={collapsed ? label : undefined}
  >
    <Icon size={20} className="flex-shrink-0" />
    {!collapsed && <span className="font-medium truncate transition-opacity duration-200">{label}</span>}
    
    {/* Tooltip for collapsed state */}
    {collapsed && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
            {label}
        </div>
    )}
  </Link>
);

// --- Global Search Component ---
const GlobalSearch = () => {
    const { projects, estimates, estimateItems, documents, counterparties, leads, users } = useApp();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const results = useMemo(() => {
        if (!query) return [];
        const lowerQuery = query.toLowerCase();
        const res: { type: string, title: string, subtitle?: string, link: string, icon: any }[] = [];

        // Projects
        projects.filter(p => p.name.toLowerCase().includes(lowerQuery) || p.address.toLowerCase().includes(lowerQuery)).forEach(p => {
            res.push({ type: 'Проект', title: p.name, subtitle: p.address, link: `/project/${p.id}`, icon: FolderKanban });
        });

        // Estimates
        estimates.filter(e => e.name.toLowerCase().includes(lowerQuery)).forEach(e => {
            res.push({ type: 'Смета', title: e.name, subtitle: 'Смета', link: `/project/${e.project_id}/estimate/${e.id}`, icon: FileText });
        });

        // Counterparties
        counterparties.filter(c => c.full_name.toLowerCase().includes(lowerQuery) || c.phone?.includes(lowerQuery)).forEach(c => {
            res.push({ type: 'Контрагент', title: c.full_name, subtitle: c.type, link: `/directories`, icon: Users });
        });

        // Users (Employees)
        users.filter(u => 
            u.name.toLowerCase().includes(lowerQuery) || 
            u.email?.toLowerCase().includes(lowerQuery) ||
            u.phone?.includes(lowerQuery)
        ).forEach(u => {
            res.push({ type: 'Сотрудник', title: u.name, subtitle: u.role, link: `/settings`, icon: UserIcon });
        });

        // Leads (CRM)
        leads.filter(l => l.name.toLowerCase().includes(lowerQuery) || l.phone.includes(lowerQuery)).forEach(l => {
            res.push({ type: 'Лид', title: l.name, subtitle: l.status, link: `/crm`, icon: Megaphone });
        });

        // Documents
        documents.filter(d => d.name.toLowerCase().includes(lowerQuery)).forEach(d => {
            res.push({ type: 'Документ', title: d.name, link: `/project/${d.project_id}?tab=docs`, icon: File });
        });

        return res.slice(0, 8); // Limit results
    }, [query, projects, estimates, counterparties, leads, documents, users]);

    return (
        <div ref={searchRef} className="relative flex-1 max-w-xl mx-4">
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input 
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm outline-none transition-all"
                    placeholder="Поиск по системе..."
                />
            </div>
            {isOpen && query && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    {results.length > 0 ? (
                        <div className="py-2">
                            {results.map((item, idx) => (
                                <button 
                                    key={idx}
                                    onClick={() => { navigate(item.link); setIsOpen(false); setQuery(''); }}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center space-x-3 group border-b border-slate-50 last:border-0"
                                >
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                        <item.icon size={18} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">{item.title}</div>
                                        {item.subtitle && <div className="text-xs text-slate-500">{item.subtitle}</div>}
                                    </div>
                                    <div className="ml-auto text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{item.type}</div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-400 text-sm">Ничего не найдено</div>
                    )}
                </div>
            )}
        </div>
    );
};

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const { currentUser, notifications, markNotificationAsRead, processApproval, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => {
      if (path === '/' && location.pathname === '/') return true;
      if (path !== '/' && location.pathname.startsWith(path)) return true;
      return false;
  };

  const isAdminOrDirector = currentUser.role === UserRole.Admin || currentUser.role === UserRole.Director;
  const hasFinanceAccess = [UserRole.Director, UserRole.Admin, UserRole.ProjectManager, UserRole.Estimator].includes(currentUser.role);
  const hasCrmAccess = [UserRole.Director, UserRole.Admin, UserRole.ProjectManager, UserRole.Manager].includes(currentUser.role);

  // Filter notifications for current user
  const myNotifications = notifications.filter(n => {
    if (n.target_user_id) return n.target_user_id === currentUser.id;
    if (n.target_role) return n.target_role === currentUser.role;
    if (!n.target_user_id && !n.target_role) return true;
    return false;
  });

  const unreadCount = myNotifications.filter(n => !n.is_read).length;

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header (Sticky) */}
      <div className="md:hidden bg-white p-4 flex justify-between items-center shadow-sm z-40 sticky top-0">
        <div className="flex items-center space-x-2 font-bold text-blue-700 text-xl">
          <LayoutDashboard />
          <span>Строй-Контроль</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-600">
           {sidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={clsx(
        "fixed md:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 z-50 md:z-30 transform transition-all duration-300 ease-in-out flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        sidebarCollapsed ? "md:w-20" : "md:w-64"
      )}>
        {/* Sidebar Header */}
        <div className={clsx("h-16 border-b border-slate-100 flex items-center relative transition-all", sidebarCollapsed ? "justify-center" : "justify-start px-6")}>
           {!sidebarCollapsed ? (
             <div className="flex items-center space-x-2 overflow-hidden transition-opacity duration-200">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <LayoutDashboard size={18} />
                </div>
                <span className="text-xl font-bold text-slate-800 truncate">Строй-Контроль</span>
             </div>
           ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <LayoutDashboard size={18} />
              </div>
           )}
           
           {/* Collapse Toggle */}
           <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex absolute -right-3 top-5 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-all z-20"
           >
              {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
           </button>
        </div>

        {/* Nav Items */}
        <nav className="p-3 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {!sidebarCollapsed && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 mt-2 px-3 transition-opacity duration-200">Главное</div>}
          
          <NavItem to="/" icon={BarChart3} label="Дашборд" active={location.pathname === '/'} collapsed={sidebarCollapsed} />
          <NavItem to="/projects" icon={FolderKanban} label="Проекты" active={location.pathname === '/projects'} collapsed={sidebarCollapsed} />
          <NavItem to="/estimates" icon={FileText} label="Сметы" active={location.pathname.startsWith('/estimates')} collapsed={sidebarCollapsed} />
          
          {!sidebarCollapsed && <div className="border-t border-slate-100 my-3 mx-2"></div>}
          
          <NavItem to="/measurements" icon={Ruler} label="Замеры" active={isActive('/measurements')} collapsed={sidebarCollapsed} />
          <NavItem to="/schedule" icon={Calendar} label="Графики" active={isActive('/schedule')} collapsed={sidebarCollapsed} />
          <NavItem to="/design" icon={Paintbrush} label="Дизайн" active={isActive('/design')} collapsed={sidebarCollapsed} />
          <NavItem to="/supply" icon={Truck} label="Снабжение" active={isActive('/supply')} collapsed={sidebarCollapsed} />
          <NavItem to="/complectation" icon={PackageCheck} label="Комплектация" active={isActive('/complectation')} collapsed={sidebarCollapsed} />
          <NavItem to="/docs" icon={Folder} label="Документы" active={isActive('/docs')} collapsed={sidebarCollapsed} />
          <NavItem to="/acts" icon={ScrollText} label="Акты" active={isActive('/acts')} collapsed={sidebarCollapsed} />
          <NavItem to="/chats" icon={MessagesSquare} label="Чаты" active={isActive('/chats')} collapsed={sidebarCollapsed} />
          <NavItem to="/photos" icon={Camera} label="Фотоотчеты" active={isActive('/photos')} collapsed={sidebarCollapsed} />

          {!sidebarCollapsed && <div className="border-t border-slate-100 my-3 mx-2"></div>}

          {hasCrmAccess && (
            <NavItem to="/crm" icon={Megaphone} label="CRM" active={isActive('/crm')} collapsed={sidebarCollapsed} />
          )}

          {hasFinanceAccess && (
             <NavItem to="/finance" icon={Banknote} label="Финансы" active={isActive('/finance')} collapsed={sidebarCollapsed} />
          )}

          {isAdminOrDirector && (
             <NavItem to="/resources" icon={Briefcase} label="Загрузка" active={isActive('/resources')} collapsed={sidebarCollapsed} />
          )}

          <NavItem to="/directories" icon={Users} label="Справочники" active={isActive('/directories')} collapsed={sidebarCollapsed} />
          
          {!sidebarCollapsed && <div className="border-t border-slate-100 my-3 mx-2"></div>}
          
          <NavItem to="/knowledge" icon={BookOpen} label="База знаний" active={isActive('/knowledge')} collapsed={sidebarCollapsed} />
          
          {isAdminOrDirector && (
            <NavItem to="/settings" icon={Settings} label="Настройки" active={isActive('/settings')} collapsed={sidebarCollapsed} />
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 z-20 sticky top-0 shadow-sm">
            <div className="flex items-center flex-1">
                {/* Global Search */}
                <GlobalSearch />
            </div>

            <div className="flex items-center space-x-3 md:space-x-5">
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button 
                        onClick={() => setNotificationsOpen(!notificationsOpen)}
                        className="relative p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                        )}
                    </button>

                    {notificationsOpen && (
                        <div className="absolute top-12 right-0 w-80 md:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
                            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-800 text-sm">Уведомления</h3>
                                {unreadCount > 0 && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{unreadCount} новых</span>}
                            </div>
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                {myNotifications.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                                        <Bell size={32} className="mb-2 opacity-20" />
                                        <p className="text-xs">Нет новых уведомлений</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {myNotifications.map(notif => (
                                            <div key={notif.id} className={`p-4 hover:bg-slate-50 transition-colors ${!notif.is_read ? 'bg-blue-50/30' : ''}`}>
                                                <div className="flex items-start space-x-3">
                                                    <div className={`mt-0.5 p-1.5 rounded-full flex-shrink-0 ${
                                                        notif.type === NotificationType.Success ? 'bg-green-100 text-green-600' :
                                                        notif.type === NotificationType.Warning ? 'bg-amber-100 text-amber-600' :
                                                        notif.type === NotificationType.ActionRequired ? 'bg-purple-100 text-purple-600' :
                                                        'bg-blue-100 text-blue-600'
                                                    }`}>
                                                        {notif.type === NotificationType.Success ? <CheckCircle2 size={14} /> :
                                                        notif.type === NotificationType.Warning ? <AlertTriangle size={14} /> :
                                                        notif.type === NotificationType.ActionRequired ? <AlertTriangle size={14} /> :
                                                        <Info size={14} />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className={`text-sm font-semibold ${!notif.is_read ? 'text-slate-900' : 'text-slate-700'}`}>{notif.title}</h4>
                                                            {!notif.is_read && (
                                                                <button onClick={() => markNotificationAsRead(notif.id)} className="text-[10px] text-blue-600 hover:underline">
                                                                    Прочит.
                                                                </button>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-slate-600 mt-1 leading-snug">{notif.message}</p>
                                                        
                                                        {notif.type === NotificationType.ActionRequired && notif.action_payload && !notif.is_read && (
                                                            <div className="mt-3 flex space-x-2">
                                                                <button onClick={() => processApproval(notif.id, true)} className="flex-1 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 font-medium">Да</button>
                                                                <button onClick={() => processApproval(notif.id, false)} className="flex-1 py-1.5 bg-slate-100 text-slate-700 text-xs rounded hover:bg-slate-200 font-medium">Нет</button>
                                                            </div>
                                                        )}
                                                        <span className="text-[10px] text-slate-400 mt-2 block">{new Date(notif.created_at).toLocaleString('ru-RU')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Profile Dropdown */}
                <div className="relative" ref={userMenuRef}>
                    <button 
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        className="flex items-center space-x-3 hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
                    >
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-slate-800">{currentUser.name}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase">{currentUser.role}</div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md border-2 border-white">
                            {currentUser.avatar_initials}
                        </div>
                    </button>

                    {userMenuOpen && (
                        <div className="absolute top-14 right-0 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                            <div className="p-4 border-b border-slate-100 bg-slate-50 md:hidden">
                                <div className="font-bold text-slate-800">{currentUser.name}</div>
                                <div className="text-xs text-slate-500">{currentUser.role}</div>
                            </div>
                            <div className="py-1">
                                <Link 
                                    to="/profile" 
                                    className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center"
                                    onClick={() => setUserMenuOpen(false)}
                                >
                                    <UserIcon size={16} className="mr-2"/> Мой профиль
                                </Link>
                                {isAdminOrDirector && (
                                    <Link 
                                        to="/settings" 
                                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center"
                                        onClick={() => setUserMenuOpen(false)}
                                    >
                                        <Settings size={16} className="mr-2"/> Настройки
                                    </Link>
                                )}
                                <div className="border-t border-slate-100 my-1"></div>
                                <button 
                                    onClick={logout} 
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center"
                                >
                                    <LogOut size={16} className="mr-2"/> Выйти
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-hidden bg-slate-50 relative">
            <div className="h-full overflow-y-auto p-4 md:p-8 custom-scrollbar">
                {children}
            </div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
