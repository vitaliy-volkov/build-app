
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PublicLayout } from './components/PublicLayout';
import { AIAssistant } from './components/AIAssistant';
import { LoadingState } from './components/LoadingState';
import { 
  MOCK_USERS, MOCK_PROJECTS, MOCK_ESTIMATES, MOCK_ESTIMATE_ITEMS, MOCK_PAYMENTS, MOCK_EVENTS,
  MOCK_SUPPLY_REQUESTS, MOCK_DOCUMENTS, MOCK_COUNTERPARTIES,
  MOCK_NOTIFICATIONS, MOCK_ACTS, MOCK_PRICE_CATEGORIES, MOCK_PRICE_ITEMS,
  MOCK_DESIGN_FILES, MOCK_SPECIFICATIONS, MOCK_TASKS, MOCK_CHAT, MOCK_PHOTOSTREAM,
  MOCK_CASH_ACCOUNTS, MOCK_FINANCIAL_ARTICLES, MOCK_TRANSACTIONS, MOCK_LEADS,
  MOCK_TEMPLATES, MOCK_OPERATION_TEMPLATES, MOCK_OPERATION_TEMPLATE_ITEMS,
  MOCK_COMPANY_SETTINGS, MOCK_AI_CONFIG, MOCK_MEASUREMENTS
} from './services/mockData';
import { 
  Project, Counterparty, Estimate, EstimateItem, 
  Payment, ProjectEvent, EstimateItemType, ProjectStatus,
  User, SupplyRequest, ProjectDocument, UserRole,
  AppNotification, NotificationType, EstimateStatus,
  WorkCompletionAct, PriceListCategory, PriceListItem,
  DesignFile, SpecificationItem, ProjectTask, ChatMessage, PhotoStreamPost, PaymentDirection,
  CashAccount, FinancialArticle, Transaction, TransactionStatus, OperationType,
  Lead, LeadStatus, CounterpartyType, ProjectTemplate, OperationTemplate, OperationTemplateItem,
  CompanySettings, AIConfiguration, MeasurementProject
} from './types';
import { ProjectDashboard } from './pages/ProjectDashboard';
import { EstimateEditor } from './pages/EstimateEditor';
import { Directories } from './pages/Directories';
import { Settings } from './pages/Settings';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { CompanyDashboard } from './pages/CompanyDashboard';
import { ProjectList } from './pages/ProjectList';
import { Finance } from './pages/Finance';
import { CRM } from './pages/CRM';
import { EstimatesList } from './pages/EstimatesList';
import { Resources } from './pages/Resources';
import { Measurements } from './pages/Measurements';
import { Landing } from './pages/Landing';
import { Profile } from './pages/Profile';
import { EstimatesPromo, FinancePromo, AIPromo, SupplyPromo } from './pages/PromoPages';
import { About, Contacts } from './pages/InfoPages';
import { Blog, BlogPost } from './pages/Blog';
import { v4 as uuidv4 } from 'uuid';
import { ArrowRight } from 'lucide-react';
import { apiClient, useAuth } from './services/apiClient';
import { AppProviders } from './providers/AppProviders';

// --- State Management (Context) ---
interface AppState {
  isAuthenticated: boolean;
  currentUser: User | null;
  users: User[];
  projects: Project[];
  counterparties: Counterparty[];
  estimates: Estimate[];
  estimateItems: EstimateItem[];
  payments: Payment[];
  events: ProjectEvent[];
  supplyRequests: SupplyRequest[];
  documents: ProjectDocument[];
  notifications: AppNotification[];
  acts: WorkCompletionAct[];
  priceListCategories: PriceListCategory[];
  priceListItems: PriceListItem[];
  // New Modules
  designFiles: DesignFile[];
  specifications: SpecificationItem[];
  tasks: ProjectTask[];
  chatMessages: ChatMessage[];
  photoStream: PhotoStreamPost[];
  // Finance Module
  cashAccounts: CashAccount[];
  financialArticles: FinancialArticle[];
  transactions: Transaction[];
  // CRM Module
  leads: Lead[];
  // Templates
  templates: ProjectTemplate[];
  operationTemplates: OperationTemplate[];
  operationTemplateItems: OperationTemplateItem[];
  // Measurements Module
  measurements: MeasurementProject[];
  
  // Settings & Config (v7.1)
  companySettings: CompanySettings;
  aiConfig: AIConfiguration;

  // Loading states
  isLoading: boolean;
  loading: {
    projects: boolean;
    users: boolean;
    estimates: boolean;
    counterparties: boolean;
    payments: boolean;
    global: boolean;
  };

  // Error states
  hasError: boolean;
  errors: {
    projects: string | null;
    users: string | null;
    estimates: string | null;
    counterparties: string | null;
    payments: string | null;
    global: string | null;
  };

  // Actions
  login: (email: string, name?: string) => Promise<void>;
  logout: () => void;
  setCurrentUser: (user: User) => void;
  updateUser: (user: User) => void; 
  addUser: (user: User) => void; // NEW: Add user action
  addProject: (project: Project) => Promise<string>; 
  updateProject: (project: Project) => void;
  addPayment: (payment: Payment) => void;
  updateEstimateItem: (item: EstimateItem) => void;
  bulkUpdateEstimateItems: (items: EstimateItem[]) => void;
  addEstimateItem: (item: EstimateItem) => void;
  deleteEstimateItem: (id: string) => void;
  addSupplyRequest: (req: SupplyRequest) => void;
  updateSupplyRequest: (req: SupplyRequest) => void;
  addDocument: (doc: ProjectDocument) => void;
  addAct: (act: WorkCompletionAct) => void;
  updateAct: (act: WorkCompletionAct) => void;
  deleteAct: (id: string) => void; // Added delete
  sendNotification: (notif: Partial<AppNotification>) => void;
  markNotificationAsRead: (id: string) => void;
  processApproval: (notificationId: string, approved: boolean) => void;
  addEstimate: (estimate: Estimate) => void; // Added
  updateEstimate: (estimate: Estimate) => void;
  createEstimateVersion: (estimateId: string) => string; // RETURNS NEW ID
  addPriceListCategory: (cat: PriceListCategory) => void;
  updatePriceListCategory: (cat: PriceListCategory) => void;
  deletePriceListCategory: (id: string) => void;
  addPriceListItem: (item: PriceListItem) => void;
  updatePriceListItem: (item: PriceListItem) => void;
  deletePriceListItem: (id: string) => void;
  // New Actions
  addDesignFile: (file: DesignFile) => void;
  updateDesignFile: (file: DesignFile) => void;
  addSpecItem: (item: SpecificationItem) => void;
  updateSpecItem: (item: SpecificationItem) => void;
  addTask: (task: ProjectTask) => void;
  updateTask: (task: ProjectTask) => void;
  addChatMessage: (msg: ChatMessage) => void;
  addPhotoStreamPost: (post: PhotoStreamPost) => void;
  // Finance Actions
  addTransaction: (t: Transaction) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addCashAccount: (a: CashAccount) => void;
  updateCashAccount: (a: CashAccount) => void;
  addFinancialArticle: (a: FinancialArticle) => void;
  updateFinancialArticle: (a: FinancialArticle) => void;
  deleteFinancialArticle: (id: string) => void;
  // Counterparty Actions
  addCounterparty: (counterparty: Counterparty) => void;
  // CRM Actions
  addLead: (lead: Lead) => void;
  updateLead: (lead: Lead) => void;
  convertLeadToProject: (lead: Lead) => void;
  // Template Actions
  saveProjectAsTemplate: (projectId: string, templateName: string) => void;
  createProjectFromTemplate: (templateId: string, projectData: Partial<Project>) => void;
  // Operation Template Actions
  addOperationTemplate: (t: OperationTemplate) => void;
  updateOperationTemplate: (t: OperationTemplate) => void;
  deleteOperationTemplate: (id: string) => void;
  addOperationTemplateItem: (i: OperationTemplateItem) => void;
  updateOperationTemplateItem: (i: OperationTemplateItem) => void;
  deleteOperationTemplateItem: (id: string) => void;
  // Measurement Actions
  addMeasurementProject: (mp: MeasurementProject) => void;
  updateMeasurementProject: (mp: MeasurementProject) => void;
  // New Helpers for Estimate Context Menu
  addItemToPriceList: (item: EstimateItem) => void;
  addItemToOperationTemplate: (item: EstimateItem, templateName?: string) => void;
  // Settings Actions
  updateCompanySettings: (settings: CompanySettings) => void;
  updateAIConfig: (config: AIConfiguration) => void;
  // Data initialization
  initializeData: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Используем состояние из AuthProvider через useAuth
  const auth = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(auth.isAuthenticated);
  const [currentUser, setCurrentUser] = useState(auth.user);
  
  // Синхронизация состояния с AuthProvider
  useEffect(() => {
    setIsAuthenticated(auth.isAuthenticated);
    setCurrentUser(auth.user);
  }, [auth.isAuthenticated, auth.user]);
  
  // State for data
  const [users, setUsersState] = useState<User[]>(MOCK_USERS);
  const [projects, setProjectsState] = useState<Project[]>([]);
  const [estimates, setEstimatesState] = useState<Estimate[]>(MOCK_ESTIMATES);
  const [estimateItems, setEstimateItemsState] = useState<EstimateItem[]>(MOCK_ESTIMATE_ITEMS);
  const [counterparties, setCounterpartiesState] = useState<Counterparty[]>([]);
  const [payments, setPaymentsState] = useState<Payment[]>(MOCK_PAYMENTS);
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [supplyRequests, setSupplyRequests] = useState(MOCK_SUPPLY_REQUESTS);
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [acts, setActs] = useState(MOCK_ACTS);
  const [priceListCategories, setPriceListCategories] = useState(MOCK_PRICE_CATEGORIES);
  const [priceListItems, setPriceListItems] = useState(MOCK_PRICE_ITEMS);
  const [designFiles, setDesignFiles] = useState(MOCK_DESIGN_FILES);
  const [specifications, setSpecifications] = useState(MOCK_SPECIFICATIONS);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [chatMessages, setChatMessages] = useState(MOCK_CHAT);
  const [photoStream, setPhotoStream] = useState(MOCK_PHOTOSTREAM);
  const [cashAccounts, setCashAccounts] = useState(MOCK_CASH_ACCOUNTS);
  const [financialArticles, setFinancialArticles] = useState(MOCK_FINANCIAL_ARTICLES);
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [leads, setLeads] = useState(MOCK_LEADS);
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const [operationTemplates, setOperationTemplates] = useState(MOCK_OPERATION_TEMPLATES);
  const [operationTemplateItems, setOperationTemplateItems] = useState(MOCK_OPERATION_TEMPLATE_ITEMS);
  const [measurements, setMeasurements] = useState<MeasurementProject[]>(MOCK_MEASUREMENTS);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(MOCK_COMPANY_SETTINGS);
  const [aiConfig, setAiConfig] = useState(MOCK_AI_CONFIG);
  
  // Loading and error states
  const [loading, setLoading] = useState({
    projects: false,
    users: false,
    estimates: false,
    counterparties: false,
    payments: false,
    global: false
  });

  const [errors, setErrors] = useState({
    projects: null as string | null,
    users: null as string | null,
    estimates: null as string | null,
    counterparties: null as string | null,
    payments: null as string | null,
    global: null as string | null
  });

  // Computed values
  const isLoading = auth.isLoading || loading.global || loading.projects || loading.users || loading.estimates || loading.counterparties || loading.payments;
  const hasError = !!(errors.global || errors.projects || errors.users || errors.estimates || errors.counterparties || errors.payments);

  // Initialize data function
  const initializeData = async () => {
    setLoading(prev => ({ ...prev, global: true }));
    setErrors(prev => ({ ...prev, global: null }));
    
    try {
      console.log('initializeData: isAuthenticated=', isAuthenticated);
      if (!isAuthenticated) {
        console.log('initializeData: not authenticated, skipping');
        return;
      }

      const token = localStorage.getItem('access_token');
      console.log('initializeData: token=', token ? token.substring(0, 20) + '...' : 'null');
      
      // Проверим что токен установлен в apiClient
      console.log('initializeData: apiClient token set');
      
      const projectsRes = await apiClient.getProjects({ limit: 1000 });
      console.log('initializeData: projects response success=', projectsRes.success, 'count=', projectsRes.data?.data?.length || 0);

      if (projectsRes.success && projectsRes.data) {
        setProjectsState(projectsRes.data.data);
        console.log('initializeData: projects loaded into state');
      } else {
        console.error('initializeData: failed to load projects', projectsRes.error);
        throw new Error(projectsRes.error || 'Failed to load projects');
      }

      // Counterparties API is not implemented on the backend yet.
      // Use localStorage + mock data
      const stored = localStorage.getItem('custom_counterparties');
      const customCounterparties = stored ? JSON.parse(stored) : [];
      setCounterpartiesState([...MOCK_COUNTERPARTIES, ...customCounterparties]);
      
    } catch (error) {
      console.error('Failed to initialize data:', error);
      setProjectsState(MOCK_PROJECTS);
      const stored = localStorage.getItem('custom_counterparties');
      const customCounterparties = stored ? JSON.parse(stored) : [];
      setCounterpartiesState([...MOCK_COUNTERPARTIES, ...customCounterparties]);
      setErrors(prev => ({ ...prev, global: null }));
    } finally {
      setLoading(prev => ({ ...prev, global: false }));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
        initializeData();
    }
  }, [isAuthenticated, currentUser?.company_id]);

  // Sync Company Settings and Users from Current User
  useEffect(() => {
    if (isAuthenticated && currentUser) {
        // 1. Sync Company Settings
        if (currentUser.company) {
             const c = currentUser.company;
             setCompanySettings(prev => ({
                 ...prev,
                 id: c.id,
                 name: c.name,
                 address: c.address,
                 taxId: c.inn || prev.taxId,
                 email: c.email || prev.email,
                 phone: c.phone || prev.phone,
                 website: c.website || prev.website,
                 bankDetails: prev.bankDetails, // Not in Company model yet
             }));
        }

        // 2. Sync Users List (At least put current user there)
        // Check if current user is in the list
        setUsersState(prev => {
            const exists = prev.some(u => u.id === currentUser.id);
            if (!exists) {
                // If we are strictly using real data, we might want to replace MOCKs.
                // But to be safe, let's append.
                // HOWEVER, if the user sees "mock data used", maybe we should replace if the list contains ONLY mocks?
                // MOCK_USERS come from mockData. 
                // Let's just append for now to be safe against breaking other things.
                return [...prev, currentUser];
            }
            return prev.map(u => u.id === currentUser.id ? currentUser : u);
        });
    }
  }, [isAuthenticated, currentUser]);


  // Auth Actions
  // Устаревший метод - используется только для обратной совместимости
  // Auth.tsx теперь использует useAuth() из apiClient напрямую
  const login = async (email: string, name?: string) => {
    // Этот метод больше не используется в Auth.tsx
    // Оставлен для обратной совместимости
    console.warn('login(email, name) is deprecated. Use apiClient.login() or useAuth().login() instead.');
    if (name) {
      // Для обратной совместимости создаем временного пользователя
      const newUser: User = {
        id: uuidv4(),
        name: name,
        email: email,
        role: UserRole.Director, 
        avatar_initials: name.substring(0,2).toUpperCase(),
        is_active: true
      };
      setCurrentUser(newUser);
      setIsAuthenticated(true);
    } else {
      const firstUser = users.length > 0 ? users[0] : null;
      setCurrentUser(firstUser);
      setIsAuthenticated(true);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
    }
  };

  const addProject = async (project: Project): Promise<string> => {
    try {
      setLoading(prev => ({ ...prev, projects: true }));
      // Backend требует customer_id как FK на existing company. 
      // Так как заказчики хранятся локально, не отправляем customer_id на бэкенд,
      // но сохраняем его локально для отображения.
      const localCustomerId = project.customer_id;
      const projectForBackend = { ...project };
      delete (projectForBackend as any).customer_id;
      delete (projectForBackend as any).general_contractor_id;
      delete (projectForBackend as any).contact_person_id;
      delete (projectForBackend as any).team;
      
      const response = await apiClient.createProject(projectForBackend);
      
      if (response.success && response.data) {
        // Восстанавливаем локальный customer_id для отображения
        const projectWithLocalData = { ...response.data.project, customer_id: localCustomerId };
        setProjectsState(prev => [...prev, projectWithLocalData]);
        // Возвращаем ID созданного проекта (серверный)
        return response.data.project.id;
      } else {
        throw new Error(response.error || 'Failed to create project');
      }
    } catch (error) {
       console.error('Failed to create project:', error);
       setErrors(prev => ({ ...prev, projects: error instanceof Error ? error.message : String(error) }));
       throw error;
    } finally {
      setLoading(prev => ({ ...prev, projects: false }));
    }
  };

  const updateProject = async (updatedProject: Project) => {
    try {
        setLoading(prev => ({ ...prev, projects: true }));
        const response = await apiClient.updateProject(updatedProject.id, updatedProject);
        
        if (response.success && response.data) {
           const savedProject = response.data.project;
           setProjectsState(prev => prev.map(p => p.id === savedProject.id ? savedProject : p));
        } else {
           throw new Error(response.error || 'Failed to update project');
        }
    } catch (error) {
        console.error('Failed to update project:', error);
        setErrors(prev => ({ ...prev, projects: error instanceof Error ? error.message : String(error) }));
        // Optimistic update rollback could be here
    } finally {
        setLoading(prev => ({ ...prev, projects: false }));
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
        // If updating current user, call API
        if (currentUser && currentUser.id === updatedUser.id) {
             const res = await apiClient.updateProfile({
                 name: updatedUser.name,
                 email: updatedUser.email,
                 phone: updatedUser.phone,
             });
             if (res.success && res.data?.user) {
                 updatedUser = { ...updatedUser, ...res.data.user };
             }
        }
        
        setUsersState(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        if (currentUser && currentUser.id === updatedUser.id) {
            setCurrentUser(updatedUser);
        }
    } catch (e) {
        console.error("Failed to update user", e);
    }
  };

  const updateCompanySettings = async (settings: CompanySettings) => {
      try {
          if (currentUser?.company_id) {
               await apiClient.updateCompany(currentUser.company_id, {
                   name: settings.name,
                   address: settings.address,
                   inn: settings.taxId,
                   email: settings.email,
                   phone: settings.phone,
                   website: settings.website,
               });
          }
          setCompanySettings(settings);
      } catch (e) {
          console.error("Failed to update company", e);
      }
  };


  const addUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const addPayment = (payment: Payment) => {
    setPayments(prev => [...prev, payment]);
    sendNotification({
      title: 'Новый платеж',
      message: `Зарегистрирован платеж: ${payment.amount.toLocaleString()} руб.`,
      type: NotificationType.Success,
      target_role: UserRole.Director
    });
  };

  const updateEstimateItem = (updatedItem: EstimateItem) => {
    setEstimateItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const bulkUpdateEstimateItems = (updatedItems: EstimateItem[]) => {
    const updatesMap = new Map(updatedItems.map(i => [i.id, i]));
    setEstimateItems(prev => prev.map(item => updatesMap.get(item.id) || item));
  };

  const addEstimateItem = (item: EstimateItem) => {
    setEstimateItems(prev => [...prev, item]);
  }

  const deleteEstimateItem = (id: string) => {
      const getAllIdsToDelete = (rootId: string, items: EstimateItem[]): string[] => {
        const children = items.filter(i => i.parent_id === rootId);
        let ids = [rootId];
        children.forEach(child => {
            ids = [...ids, ...getAllIdsToDelete(child.id, items)];
        });
        return ids;
      }
      const idsToDelete = getAllIdsToDelete(id, estimateItems);
      setEstimateItems(prev => prev.filter(i => !idsToDelete.includes(i.id)));
  }

  const addSupplyRequest = (req: SupplyRequest) => {
    setSupplyRequests(prev => [...prev, req]);
    sendNotification({
      title: 'Новая заявка',
      message: `Заявка на ${req.name} (${req.quantity} ${req.unit})`,
      type: NotificationType.Info,
      target_role: UserRole.SupplyManager
    });
  }

  const updateSupplyRequest = (req: SupplyRequest) => {
    setSupplyRequests(prev => prev.map(r => r.id === req.id ? req : r));
  }

  const addDocument = (doc: ProjectDocument) => {
    setDocuments(prev => [...prev, doc]);
  }

  const addAct = (act: WorkCompletionAct) => {
    setActs(prev => [...prev, act]);
    sendNotification({
      title: 'Новый Акт выполненных работ',
      message: `${act.number} создан пользователем ${currentUser?.name || 'неизвестным'}`,
      type: NotificationType.Info,
      target_role: UserRole.ProjectManager
    });
  }

  const updateAct = (act: WorkCompletionAct) => {
    setActs(prev => prev.map(a => a.id === act.id ? act : a));
    if (act.status === 'Signed') {
       act.items.forEach(actItem => {
          const estItem = estimateItems.find(i => i.id === actItem.estimate_item_id);
          if (estItem) {
             const allSignedActs = acts.map(a => a.id === act.id ? act : a).filter(a => a.status === 'Signed' && a.project_id === act.project_id);
             let totalDone = 0;
             allSignedActs.forEach(a => {
                const ai = a.items.find(i => i.estimate_item_id === estItem.id);
                if (ai) totalDone += ai.quantity_done;
             });
             const newProgress = Math.min(100, (totalDone / estItem.quantity) * 100);
             updateEstimateItem({ ...estItem, progress: newProgress });
          }
       });
    }
  };

  const deleteAct = (id: string) => {
    setActs(prev => prev.filter(a => a.id !== id));
  };

  const addEstimate = (estimate: Estimate) => {
    setEstimates(prev => [...prev, estimate]);
  };

  const updateEstimate = (updatedEstimate: Estimate) => {
    setEstimates(prev => prev.map(e => e.id === updatedEstimate.id ? updatedEstimate : e));
  };

  // NEW: Versioning
  const createEstimateVersion = (estimateId: string): string => {
     const sourceEstimate = estimates.find(e => e.id === estimateId);
     if (!sourceEstimate) throw new Error("Estimate not found");

     const newVersionId = uuidv4();
     const rootId = sourceEstimate.original_estimate_id || sourceEstimate.id;
     const nextVersion = (estimates.filter(e => (e.original_estimate_id === rootId) || (e.id === rootId)).length) + 1;

     const newEstimate: Estimate = {
        ...sourceEstimate,
        id: newVersionId,
        original_estimate_id: rootId,
        version: nextVersion,
        name: `${sourceEstimate.name} (v${nextVersion})`,
        status: EstimateStatus.Draft,
        created_at: new Date().toISOString().split('T')[0]
     };

     const sourceItems = estimateItems.filter(i => i.estimate_id === estimateId);
     const idMap = new Map<string, string>();
     sourceItems.forEach(i => idMap.set(i.id, uuidv4()));

     const newItems = sourceItems.map(item => ({
        ...item,
        id: idMap.get(item.id)!,
        estimate_id: newVersionId,
        parent_id: item.parent_id ? idMap.get(item.parent_id) : undefined,
        dependencies: item.dependencies?.map(d => idMap.get(d) || d), // Try to map dependencies within same estimate
        progress: 0 // Reset progress for new version
     }));

     setEstimates(prev => [...prev, newEstimate]);
     setEstimateItems(prev => [...prev, ...newItems]);
     
     return newVersionId;
  };

  // --- Price List CRUD ---
  const addPriceListCategory = (cat: PriceListCategory) => {
    setPriceListCategories(prev => [...prev, cat]);
  };

  const updatePriceListCategory = (cat: PriceListCategory) => {
    setPriceListCategories(prev => prev.map(c => c.id === cat.id ? cat : c));
  };

  const deletePriceListCategory = (id: string) => {
    const getDescendantIds = (parentId: string, allCats: PriceListCategory[]): string[] => {
      const children = allCats.filter(c => c.parent_id === parentId);
      let ids = [parentId];
      children.forEach(child => {
        ids = [...ids, ...getDescendantIds(child.id, allCats)];
      });
      return ids;
    };
    const idsToDelete = getDescendantIds(id, priceListCategories);
    setPriceListCategories(prev => prev.filter(c => !idsToDelete.includes(c.id)));
    setPriceListItems(prev => prev.filter(i => !idsToDelete.includes(i.category_id)));
  };

  const addPriceListItem = (item: PriceListItem) => {
    setPriceListItems(prev => [...prev, item]);
  };

  const updatePriceListItem = (item: PriceListItem) => {
    setPriceListItems(prev => prev.map(i => i.id === item.id ? item : i));
  };

  const deletePriceListItem = (id: string) => {
    setPriceListItems(prev => prev.filter(i => i.id !== id));
  };

  // --- New Module Actions ---
  const addDesignFile = (file: DesignFile) => setDesignFiles(prev => [...prev, file]);
  const updateDesignFile = (file: DesignFile) => setDesignFiles(prev => prev.map(f => f.id === file.id ? file : f));
  
  const addSpecItem = (item: SpecificationItem) => setSpecifications(prev => [...prev, item]);
  const updateSpecItem = (item: SpecificationItem) => setSpecifications(prev => prev.map(i => i.id === item.id ? item : i));
  
  const addTask = (task: ProjectTask) => setTasks(prev => [...prev, task]);
  const updateTask = (task: ProjectTask) => setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  
  const addChatMessage = (msg: ChatMessage) => setChatMessages(prev => [...prev, msg]);
  const addPhotoStreamPost = (post: PhotoStreamPost) => setPhotoStream(prev => [post, ...prev]);

  // --- FINANCE ACTIONS ---
  const addTransaction = (t: Transaction) => {
     setTransactions(prev => [...prev, t]);
     if (t.status === TransactionStatus.Pending) {
        sendNotification({
           title: 'Финансовая операция на согласовании',
           message: `${t.operation_type}: ${t.amount.toLocaleString()} руб.`,
           type: NotificationType.ActionRequired,
           target_role: UserRole.Director,
           action_payload: { type: 'approve_payment', entity_id: t.id }
        });
     }
  };

  const updateTransaction = (t: Transaction) => {
     setTransactions(prev => prev.map(tr => tr.id === t.id ? t : tr));
  };

  const deleteTransaction = (id: string) => {
     setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const addCashAccount = (a: CashAccount) => setCashAccounts(prev => [...prev, a]);
  const updateCashAccount = (a: CashAccount) => setCashAccounts(prev => prev.map(acc => acc.id === a.id ? a : acc));
  
  const addFinancialArticle = (a: FinancialArticle) => setFinancialArticles(prev => [...prev, a]);
  const updateFinancialArticle = (a: FinancialArticle) => setFinancialArticles(prev => prev.map(art => art.id === a.id ? a : art));
  const deleteFinancialArticle = (id: string) => {
     const hasChildren = financialArticles.some(f => f.parent_id === id);
     if (hasChildren) {
        alert('Нельзя удалить статью, у которой есть подкатегории');
        return;
     }
     setFinancialArticles(prev => prev.filter(a => a.id !== id));
  };

  // --- COUNTERPARTY ACTIONS ---
  const addCounterparty = (counterparty: Counterparty) => {
    setCounterpartiesState(prev => {
      const updated = [...prev, counterparty];
      // Save to localStorage
      const stored = localStorage.getItem('custom_counterparties');
      const existing = stored ? JSON.parse(stored) : [];
      localStorage.setItem('custom_counterparties', JSON.stringify([...existing, counterparty]));
      return updated;
    });
  };

  // --- CRM ACTIONS ---
  const addLead = (lead: Lead) => setLeads(prev => [...prev, lead]);
  const updateLead = (lead: Lead) => setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
  
  const convertLeadToProject = (lead: Lead) => {
      const newClient: Counterparty = {
          id: uuidv4(),
          full_name: lead.name,
          type: CounterpartyType.Client,
          phone: lead.phone,
          email: lead.email,
          description: `Создан из лида: ${lead.id}`
      };
      setCounterpartiesState(prev => [...prev, newClient]);

      const newProject: Project = {
          id: uuidv4(),
          name: lead.description ? lead.description.split('.')[0] : `Проект ${lead.name}`,
          address: lead.address || 'Адрес не указан',
          contract_number: 'Б/Н',
          contract_date: new Date().toISOString().split('T')[0],
          description: lead.description || '',
          customer_id: newClient.id,
          general_contractor_id: '',
          contact_person_id: newClient.id,
          status: ProjectStatus.Planning,
          team: []
      };
      addProject(newProject);

      updateLead({ ...lead, status: LeadStatus.Success });

      sendNotification({
          title: 'Лид конвертирован в проект',
          message: `Проект "${newProject.name}" успешно создан.`,
          type: NotificationType.Success,
          target_role: UserRole.Director
      });
  };

  // --- TEMPLATE ACTIONS ---
  const saveProjectAsTemplate = (projectId: string, templateName: string) => {
    const projEstimates = estimates.filter(e => e.project_id === projectId);
    const projItems = estimateItems.filter(i => projEstimates.some(e => e.id === i.estimate_id));
    const projTasks = tasks.filter(t => t.project_id === projectId);

    const newTemplate: ProjectTemplate = {
      id: uuidv4(),
      name: templateName,
      description: `Создан из проекта ${projects.find(p => p.id === projectId)?.name}`,
      created_at: new Date().toISOString().split('T')[0],
      estimates: JSON.parse(JSON.stringify(projEstimates)),
      estimateItems: JSON.parse(JSON.stringify(projItems)),
      tasks: JSON.parse(JSON.stringify(projTasks))
    };

    setTemplates(prev => [...prev, newTemplate]);
    sendNotification({ title: 'Шаблон создан', message: `Шаблон "${templateName}" успешно сохранен.`, type: NotificationType.Success });
  };

  const createProjectFromTemplate = (templateId: string, projectData: Partial<Project>) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const newProjectId = uuidv4();
    const newProject: Project = {
        id: newProjectId,
        name: projectData.name || 'Новый проект из шаблона',
        address: projectData.address || '',
        contract_number: projectData.contract_number || '',
        contract_date: projectData.contract_date || new Date().toISOString().split('T')[0],
        description: template.description,
        customer_id: projectData.customer_id || '',
        general_contractor_id: '',
        contact_person_id: '',
        status: ProjectStatus.Planning,
        team: []
    };

    const idMap = new Map<string, string>(); 

    template.estimates.forEach(est => {
       const newEstId = uuidv4();
       idMap.set(est.id, newEstId);
       addEstimateItem({} as any);
       setEstimates(prev => [...prev, {
          ...est,
          id: newEstId,
          project_id: newProjectId,
          status: EstimateStatus.Draft,
          created_at: new Date().toISOString().split('T')[0]
       }]);
    });

    const itemMap = new Map<string, string>();
    template.estimateItems.forEach(item => itemMap.set(item.id, uuidv4()));

    template.estimateItems.forEach(item => {
       const newEstId = idMap.get(item.estimate_id);
       if (newEstId) {
         setEstimateItems(prev => [...prev, {
             ...item,
             id: itemMap.get(item.id)!,
             estimate_id: newEstId,
             parent_id: item.parent_id ? itemMap.get(item.parent_id) : undefined,
             dependencies: item.dependencies?.map(d => itemMap.get(d) || d),
             progress: 0
         }]);
       }
    });

    template.tasks.forEach(task => {
        setTasks(prev => [...prev, {
            ...task,
            id: uuidv4(),
            project_id: newProjectId,
            status: 'Todo',
            created_at: new Date().toISOString().split('T')[0]
        }]);
    });

    addProject(newProject);
    sendNotification({ title: 'Проект создан', message: `Проект "${newProject.name}" создан из шаблона.`, type: NotificationType.Success });
  };

  const sendNotification = (notif: Partial<AppNotification>) => {
    const newNotif: AppNotification = {
      id: uuidv4(),
      title: notif.title || 'Уведомление',
      message: notif.message || '',
      type: notif.type || NotificationType.Info,
      is_read: false,
      created_at: new Date().toISOString(),
      target_role: notif.target_role,
      target_user_id: notif.target_user_id,
      action_payload: notif.action_payload
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const processApproval = (notificationId: string, approved: boolean) => {
    const notif = notifications.find(n => n.id === notificationId);
    if (!notif || !notif.action_payload) return;

    if (notif.action_payload.type === 'approve_estimate') {
      const estimateId = notif.action_payload.entity_id;
      if (approved) {
        setEstimates(prev => prev.map(e => e.id === estimateId ? { ...e, status: EstimateStatus.InWork } : e));
        sendNotification({
          title: 'Смета согласована',
          message: `Смета успешно переведена в статус "В работе"`,
          type: NotificationType.Success,
          target_role: UserRole.ProjectManager
        });
      } else {
        setEstimates(prev => prev.map(e => e.id === estimateId ? { ...e, status: EstimateStatus.Draft } : e));
        sendNotification({
          title: 'Смета отклонена',
          message: `Смета возвращена на доработку`,
          type: NotificationType.Warning,
          target_role: UserRole.ProjectManager
        });
      }
    } else if (notif.action_payload.type === 'approve_payment') {
        const transId = notif.action_payload.entity_id;
        if (approved) {
           setTransactions(prev => prev.map(t => t.id === transId ? { ...t, status: TransactionStatus.Approved, approved_by: currentUser?.id || '' } : t));
        } else {
           setTransactions(prev => prev.map(t => t.id === transId ? { ...t, status: TransactionStatus.Rejected } : t));
        }
    }
    markNotificationAsRead(notificationId);
  };

  // --- Operation Templates Actions ---
  const addOperationTemplate = (t: OperationTemplate) => setOperationTemplates(prev => [...prev, t]);
  const updateOperationTemplate = (t: OperationTemplate) => setOperationTemplates(prev => prev.map(tm => tm.id === t.id ? t : tm));
  const deleteOperationTemplate = (id: string) => {
     setOperationTemplates(prev => prev.filter(t => t.id !== id));
     setOperationTemplateItems(prev => prev.filter(i => i.template_id !== id));
  };
  const addOperationTemplateItem = (i: OperationTemplateItem) => setOperationTemplateItems(prev => [...prev, i]);
  const updateOperationTemplateItem = (i: OperationTemplateItem) => setOperationTemplateItems(prev => prev.map(it => it.id === i.id ? i : it));
  const deleteOperationTemplateItem = (id: string) => setOperationTemplateItems(prev => prev.filter(i => i.id !== id));

  // --- Measurement Actions ---
  const addMeasurementProject = useCallback((mp: MeasurementProject) => {
      console.log('App: addMeasurementProject called', mp.id, mp.projectId);
      setMeasurements(prev => [...prev, mp]);
  }, []);
  const updateMeasurementProject = useCallback((mp: MeasurementProject) => {
      setMeasurements(prev => prev.map(m => m.id === mp.id ? mp : m));
  }, []);

  // --- Helpers for Copying ---
  const addItemToPriceList = (item: EstimateItem) => {
      const newItem: PriceListItem = {
          id: uuidv4(),
          category_id: priceListCategories[0]?.id || 'unknown', // Default to first category
          name: item.name,
          unit: item.unit || 'шт',
          cost_price: item.cost_price,
          markup: item.markup
      };
      addPriceListItem(newItem);
      sendNotification({title: 'Сохранено', message: `Позиция "${item.name}" добавлена в справочник`, type: NotificationType.Success});
  };

  const addItemToOperationTemplate = (item: EstimateItem, templateName?: string) => {
      // Logic to create a new template from an item/group
      const newTmplId = uuidv4();
      const newTemplate: OperationTemplate = {
          id: newTmplId,
          name: templateName || item.name,
          unit: 'шт', // default
          base_quantity: 1
      };
      addOperationTemplate(newTemplate);
      
      // If it's a group, we should add children. For now just adding the item itself if it's a position
      if (item.item_type === EstimateItemType.Position) {
          addOperationTemplateItem({
              id: uuidv4(),
              template_id: newTmplId,
              resource_type: item.resource_type || EstimateItemType.Position as any,
              name: item.name,
              unit: item.unit || 'шт',
              cost_price: item.cost_price,
              markup: item.markup,
              quantity_factor: 1
          });
      }
      sendNotification({title: 'Сохранено', message: `Создан шаблон "${newTemplate.name}"`, type: NotificationType.Success});
  };

  // --- Settings Actions ---
  const updateAIConfig = (config: AIConfiguration) => setAiConfig(config);

  return (
    <AppContext.Provider value={{ 
      isAuthenticated, login, logout,
      currentUser, users, projects, counterparties, estimates, estimateItems, payments, events, supplyRequests, documents, notifications, acts, priceListCategories, priceListItems,
      designFiles, specifications, tasks, chatMessages, photoStream,
      cashAccounts, financialArticles, transactions, leads, templates, 
      operationTemplates, operationTemplateItems,
      measurements,
      companySettings, aiConfig,
      isLoading, loading, hasError, errors,
      setCurrentUser, updateUser, addUser, addProject, updateProject, addPayment, updateEstimateItem, bulkUpdateEstimateItems, addEstimateItem, deleteEstimateItem, addSupplyRequest, updateSupplyRequest, addDocument, addAct, updateAct, deleteAct,
      sendNotification, markNotificationAsRead, processApproval, addEstimate, updateEstimate, createEstimateVersion,
      addPriceListCategory, updatePriceListCategory, deletePriceListCategory, addPriceListItem, updatePriceListItem, deletePriceListItem,
      addDesignFile, updateDesignFile, addSpecItem, updateSpecItem, addTask, updateTask, addChatMessage, addPhotoStreamPost,
      addTransaction, updateTransaction, deleteTransaction, addCashAccount, updateCashAccount, addFinancialArticle, updateFinancialArticle, deleteFinancialArticle,
      addCounterparty,
      addLead, updateLead, convertLeadToProject,
      saveProjectAsTemplate, createProjectFromTemplate,
      addOperationTemplate, updateOperationTemplate, deleteOperationTemplate, addOperationTemplateItem, updateOperationTemplateItem, deleteOperationTemplateItem,
      addMeasurementProject, updateMeasurementProject,
      addItemToPriceList, addItemToOperationTemplate,
      updateCompanySettings, updateAIConfig,
      initializeData
    }}>
      {children}
      {isAuthenticated && <AIAssistant />}
    </AppContext.Provider>
  );
};

// --- Generic Global Module Placeholder ---
const GlobalModulePage = ({ title, type }: { title: string, type: string }) => {
  const { projects } = useApp();
  
  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col animate-in fade-in duration-300">
        <div className="flex-none">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">{title} (Все проекты)</h1>
            <p className="text-slate-500">Сводная информация по всем активным объектам.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
            <div className="grid gap-6">
                {projects.map(project => (
                    <div key={project.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-slate-800">{project.name}</h3>
                            <Link 
                                to={`/project/${project.id}?tab=${type}`} 
                                className="text-sm text-blue-600 hover:underline flex items-center"
                            >
                                Перейти к проекту <ArrowRight size={16} className="ml-1"/>
                            </Link>
                        </div>
                        <div className="text-slate-500 text-sm bg-slate-50 p-4 rounded-lg text-center border border-dashed border-slate-200">
                            Данные модуля "{title}" для этого проекта доступны внутри карточки проекта.
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { CreateCompany } from './pages/Onboarding/CreateCompany';

const AppRoutes = () => {
  const { isAuthenticated, isLoading, hasError, errors, initializeData, currentUser } = useApp();

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
        error={errors.global}
        onRetry={initializeData}
      >
        <div />
      </LoadingState>
     );
  }

  if (!isAuthenticated) {
    return (
      <PublicLayout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/estimates-promo" element={<EstimatesPromo />} />
            <Route path="/finance-promo" element={<FinancePromo />} />
            <Route path="/ai-promo" element={<AIPromo />} />
            <Route path="/supply-promo" element={<SupplyPromo />} />
            <Route path="/about" element={<About />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </PublicLayout>
    );
  }

  // Onboarding Check: User is authenticated but has no company
  const needsOnboarding = !currentUser?.company_id || currentUser.company_id === '00000000-0000-0000-0000-000000000001';
  
  if (needsOnboarding) {
      return (
        <Routes>
             <Route path="/onboarding/create-company" element={<CreateCompany />} />
             <Route path="*" element={<Navigate to="/onboarding/create-company" replace />} />
        </Routes>
      );
  }

  // Main App Layout
  return (
    <Layout>
          <Routes>
            <Route path="/" element={<CompanyDashboard />} />
            <Route path="/projects" element={<ProjectList />} />
            <Route path="/projects/:id" element={<ProjectDashboard />} />
            <Route path="/estimates" element={<EstimatesList />} />
            <Route path="/estimates/:id" element={<EstimateEditor />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/directories" element={<Directories />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/measurements" element={<Measurements />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/profile" element={<Profile />} />

            {/* Promo Pages */}
            <Route path="/estimates-promo" element={<EstimatesPromo />} />
            <Route path="/finance-promo" element={<FinancePromo />} />
            <Route path="/ai-promo" element={<AIPromo />} />
            <Route path="/supply-promo" element={<SupplyPromo />} />
            <Route path="/about" element={<About />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPost />} />

            {/* Global Module Pages */}
            <Route path="/supply" element={<GlobalModulePage title="Снабжение" type="supply" />} />
            <Route path="/complectation" element={<GlobalModulePage title="Комплектация" type="complectation" />} />
            <Route path="/docs" element={<GlobalModulePage title="Документооборот" type="docs" />} />
            <Route path="/acts" element={<GlobalModulePage title="Акты (КС-2/КС-3)" type="acts" />} />
            <Route path="/chats" element={<GlobalModulePage title="Чаты и Коммуникации" type="team" />} />
            <Route path="/photos" element={<GlobalModulePage title="Фотоотчеты" type="photos" />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
    </Layout>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export const App: React.FC = () => {
  return (
    <AppProviders>
      <AppProvider>
        <HashRouter>
          <ScrollToTop />
          <AppRoutes />
        </HashRouter>
      </AppProvider>
    </AppProviders>
  );
};

export default App;
