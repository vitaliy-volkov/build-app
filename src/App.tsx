
import React, { createContext, useContext, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PublicLayout } from './components/PublicLayout';
import { AIAssistant } from './components/AIAssistant';
import { 
  MOCK_PROJECTS, MOCK_COUNTERPARTIES, MOCK_ESTIMATES, 
  MOCK_ESTIMATE_ITEMS, MOCK_PAYMENTS, MOCK_EVENTS,
  MOCK_USERS, MOCK_SUPPLY_REQUESTS, MOCK_DOCUMENTS,
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
import { Auth } from './pages/Auth';
import { Profile } from './pages/Profile';
import { EstimatesPromo, FinancePromo, AIPromo, SupplyPromo } from './pages/PromoPages';
import { About, Contacts } from './pages/InfoPages';
import { Blog, BlogPost } from './pages/Blog';
import { v4 as uuidv4 } from 'uuid';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from './modules/core/auth/store';
import { AuthGuard } from './modules/core/auth/AuthGuard';

// --- State Management (Context) ---
interface AppState {
  isAuthenticated: boolean;
  currentUser: User;
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

  // Actions
  login: (email: string, name?: string) => void;
  logout: () => void;
  setCurrentUser: (user: User) => void;
  updateUser: (user: User) => void; 
  addUser: (user: User) => void; // NEW: Add user action
  addProject: (project: Project) => void; 
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
}

const AppContext = createContext<AppState | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authStore = useAuthStore();
  const [users, setUsers] = useState(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]); // Keep for legacy compatibility for now
  
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [counterparties, setCounterparties] = useState(MOCK_COUNTERPARTIES);
  const [estimates, setEstimates] = useState(MOCK_ESTIMATES);
  const [estimateItems, setEstimateItems] = useState(MOCK_ESTIMATE_ITEMS);
  const [payments, setPayments] = useState(MOCK_PAYMENTS);
  const [events, setEvents] = useState(MOCK_EVENTS);
  const [supplyRequests, setSupplyRequests] = useState(MOCK_SUPPLY_REQUESTS);
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [acts, setActs] = useState(MOCK_ACTS);
  const [priceListCategories, setPriceListCategories] = useState(MOCK_PRICE_CATEGORIES);
  const [priceListItems, setPriceListItems] = useState(MOCK_PRICE_ITEMS);
  
  // New State
  const [designFiles, setDesignFiles] = useState(MOCK_DESIGN_FILES);
  const [specifications, setSpecifications] = useState(MOCK_SPECIFICATIONS);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [chatMessages, setChatMessages] = useState(MOCK_CHAT);
  const [photoStream, setPhotoStream] = useState(MOCK_PHOTOSTREAM);

  // Finance State
  const [cashAccounts, setCashAccounts] = useState(MOCK_CASH_ACCOUNTS);
  const [financialArticles, setFinancialArticles] = useState(MOCK_FINANCIAL_ARTICLES);
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);

  // CRM State
  const [leads, setLeads] = useState(MOCK_LEADS);

  // Templates State
  const [templates, setTemplates] = useState(MOCK_TEMPLATES);
  const [operationTemplates, setOperationTemplates] = useState(MOCK_OPERATION_TEMPLATES);
  const [operationTemplateItems, setOperationTemplateItems] = useState(MOCK_OPERATION_TEMPLATE_ITEMS);

  // Measurements State
  const [measurements, setMeasurements] = useState(MOCK_MEASUREMENTS);

  // Settings State
  const [companySettings, setCompanySettings] = useState(MOCK_COMPANY_SETTINGS);
  const [aiConfig, setAiConfig] = useState(MOCK_AI_CONFIG);

  // Auth Actions - Legacy wrappers for Context compatibility
  const login = (email: string, name?: string) => {
    authStore.login(email, name);
  };

  const logout = () => {
    authStore.logout();
  };

  // Sync Auth Store with Context
  useEffect(() => {
    if (authStore.user) {
        // Map auth store user to context user format if needed
        // For now they are compatible enough
        const contextUser = authStore.user as unknown as User;
        setCurrentUser(contextUser);
    }
  }, [authStore.user]);

  const addProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
  };

  const updateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (currentUser.id === updatedUser.id) {
        setCurrentUser(updatedUser);
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
      message: `${act.number} создан пользователем ${currentUser.name}`,
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
      setCounterparties(prev => [...prev, newClient]);

      const newProject: Project = {
          id: uuidv4(),
          name: lead.description ? lead.description.split('.')[0] : `Проект ${lead.name}`,
          address: lead.address || 'Адрес не указан',
          contract_num: 'Б/Н',
          contract_date: new Date().toISOString().split('T')[0],
          description: lead.description || '',
          customer_id: newClient.id,
          general_contractor_id: '',
          contact_person_id: newClient.id,
          status: ProjectStatus.Planning,
          team: []
      };
      setProjects(prev => [...prev, newProject]);

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
        contract_num: projectData.contract_num || '',
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

    setProjects(prev => [...prev, newProject]);
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
           setTransactions(prev => prev.map(t => t.id === transId ? { ...t, status: TransactionStatus.Approved, approved_by: currentUser.id } : t));
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
  const addMeasurementProject = (mp: MeasurementProject) => setMeasurements(prev => [...prev, mp]);
  const updateMeasurementProject = (mp: MeasurementProject) => setMeasurements(prev => prev.map(m => m.id === mp.id ? mp : m));

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
  const updateCompanySettings = (settings: CompanySettings) => setCompanySettings(settings);
  const updateAIConfig = (config: AIConfiguration) => setAiConfig(config);

  return (
    <AppContext.Provider value={{ 
      isAuthenticated: authStore.isAuthenticated, login, logout,
      currentUser, users, projects, counterparties, estimates, estimateItems, payments, events, supplyRequests, documents, notifications, acts, priceListCategories, priceListItems,
      designFiles, specifications, tasks, chatMessages, photoStream,
      cashAccounts, financialArticles, transactions, leads, templates, 
      operationTemplates, operationTemplateItems,
      measurements,
      companySettings, aiConfig,
      setCurrentUser, updateUser, addUser, addProject, updateProject, addPayment, updateEstimateItem, bulkUpdateEstimateItems, addEstimateItem, deleteEstimateItem, addSupplyRequest, updateSupplyRequest, addDocument, addAct, updateAct, deleteAct,
      sendNotification, markNotificationAsRead, processApproval, addEstimate, updateEstimate, createEstimateVersion,
      addPriceListCategory, updatePriceListCategory, deletePriceListCategory, addPriceListItem, updatePriceListItem, deletePriceListItem,
      addDesignFile, updateDesignFile, addSpecItem, updateSpecItem, addTask, updateTask, addChatMessage, addPhotoStreamPost,
      addTransaction, updateTransaction, deleteTransaction, addCashAccount, updateCashAccount, addFinancialArticle, updateFinancialArticle, deleteFinancialArticle,
      addLead, updateLead, convertLeadToProject,
      saveProjectAsTemplate, createProjectFromTemplate,
      addOperationTemplate, updateOperationTemplate, deleteOperationTemplate, addOperationTemplateItem, updateOperationTemplateItem, deleteOperationTemplateItem,
      addMeasurementProject, updateMeasurementProject,
      addItemToPriceList, addItemToOperationTemplate,
      updateCompanySettings, updateAIConfig
    }}>
      {children}
      {authStore.isAuthenticated && <AIAssistant />}
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

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <ScrollToTop />
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const AppRoutes = () => {
  const { isAuthenticated } = useApp();

  // Note: We keep the check here for Public/Private split,
  // but inside Private routes we can now use AuthGuard for finer control.

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
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PublicLayout>
    );
  }

  return (
    <AuthGuard>
      <Layout>
        <Routes>
          <Route path="/" element={<CompanyDashboard />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/project/:id" element={<ProjectDashboard />} />
          <Route path="/project/:projectId/estimate/:estimateId" element={<EstimateEditor />} />
          <Route path="/estimates" element={<EstimatesList />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/directories" element={<Directories />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/measurements" element={<Measurements />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />

          {/* Global Module Routes */}
          <Route path="/schedule" element={<GlobalModulePage title="Графики работ" type="schedule" />} />
          <Route path="/design" element={<GlobalModulePage title="Дизайн-проекты" type="design" />} />
          <Route path="/supply" element={<GlobalModulePage title="Снабжение" type="supply" />} />
          <Route path="/complectation" element={<GlobalModulePage title="Комплектация" type="complectation" />} />
          <Route path="/docs" element={<GlobalModulePage title="Документооборот" type="docs" />} />
          <Route path="/acts" element={<GlobalModulePage title="Акты (КС-2/КС-3)" type="acts" />} />
          <Route path="/chats" element={<GlobalModulePage title="Чаты и Коммуникации" type="team" />} />
          <Route path="/photos" element={<GlobalModulePage title="Фотоотчеты" type="photos" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AuthGuard>
  );
};
