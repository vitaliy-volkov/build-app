import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import { 
  Project, User, Counterparty, Estimate, EstimateItem, 
  Payment, ProjectEvent, SupplyRequest, ProjectDocument,
  AppNotification, WorkCompletionAct, PriceListCategory, PriceListItem,
  DesignFile, SpecificationItem, ProjectTask, ChatMessage, PhotoStreamPost,
  CashAccount, FinancialArticle, Transaction, Lead,
  ProjectTemplate, OperationTemplate, OperationTemplateItem,
  MeasurementProject, CompanySettings, AIConfiguration
} from '../types';

interface LoadingState {
  projects: boolean;
  users: boolean;
  estimates: boolean;
  counterparties: boolean;
  payments: boolean;
  global: boolean;
}

interface ErrorState {
  projects: string | null;
  users: string | null;
  estimates: string | null;
  counterparties: string | null;
  payments: string | null;
  global: string | null;
}

export const useApiData = () => {
  const [loading, setLoading] = useState<LoadingState>({
    projects: false,
    users: false,
    estimates: false,
    counterparties: false,
    payments: false,
    global: false
  });

  const [errors, setErrors] = useState<ErrorState>({
    projects: null,
    users: null,
    estimates: null,
    counterparties: null,
    payments: null,
    global: null
  });

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [estimateItems, setEstimateItems] = useState<EstimateItem[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [supplyRequests, setSupplyRequests] = useState<SupplyRequest[]>([]);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [acts, setActs] = useState<WorkCompletionAct[]>([]);
  const [priceListCategories, setPriceListCategories] = useState<PriceListCategory[]>([]);
  const [priceListItems, setPriceListItems] = useState<PriceListItem[]>([]);
  const [designFiles, setDesignFiles] = useState<DesignFile[]>([]);
  const [specifications, setSpecifications] = useState<SpecificationItem[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [photoStream, setPhotoStream] = useState<PhotoStreamPost[]>([]);
  const [cashAccounts, setCashAccounts] = useState<CashAccount[]>([]);
  const [financialArticles, setFinancialArticles] = useState<FinancialArticle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [operationTemplates, setOperationTemplates] = useState<OperationTemplate[]>([]);
  const [operationTemplateItems, setOperationTemplateItems] = useState<OperationTemplateItem[]>([]);
  const [measurements, setMeasurements] = useState<MeasurementProject[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfiguration | null>(null);

  // Generic error handler
  const handleError = useCallback((key: keyof ErrorState, error: any) => {
    const message = error?.error || error?.message || 'Unknown error occurred';
    setErrors(prev => ({ ...prev, [key]: message }));
    setLoading(prev => ({ ...prev, [key]: false }));
  }, []);

  // Load projects
  const loadProjects = useCallback(async () => {
    setLoading(prev => ({ ...prev, projects: true }));
    setErrors(prev => ({ ...prev, projects: null }));
    
    try {
      // Временно используем публичный эндпоинт для тестирования
      const response = await apiClient.customRequest<ApiResponse<PaginatedResponse<Project[]>>>('/public/projects');
      if (response.success && response.data) {
        setProjects(response.data.data);
      } else {
        throw new Error(response.error || 'Failed to load projects');
      }
    } catch (error) {
      handleError('projects', error);
      setProjects([]);
    } finally {
      setLoading(prev => ({ ...prev, projects: false }));
    }
  }, [handleError]);

  // Load estimates
  const loadEstimates = useCallback(async () => {
    setLoading(prev => ({ ...prev, estimates: true }));
    setErrors(prev => ({ ...prev, estimates: null }));
    
    try {
      const response = await apiClient.getEstimates();
      if (response.success && response.data) {
        setEstimates(response.data.data);
      } else {
        throw new Error(response.error || 'Failed to load estimates');
      }
    } catch (error) {
      handleError('estimates', error);
      setEstimates([]);
    } finally {
      setLoading(prev => ({ ...prev, estimates: false }));
    }
  }, [handleError]);

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(prev => ({ ...prev, users: true }));
    setErrors(prev => ({ ...prev, users: null }));
    
    try {
      // For now, use mock users until we implement user management API
      const { MOCK_USERS } = await import('../services/mockData');
      setUsers(MOCK_USERS);
    } catch (error) {
      handleError('users', error);
      setUsers([]);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  }, [handleError]);

  // Load counterparties
  const loadCounterparties = useCallback(async () => {
    setLoading(prev => ({ ...prev, counterparties: true }));
    setErrors(prev => ({ ...prev, counterparties: null }));
    
    try {
      // For now, use mock counterparties until we implement counterparties API
      const { MOCK_COUNTERPARTIES } = await import('../services/mockData');
      setCounterparties(MOCK_COUNTERPARTIES);
    } catch (error) {
      handleError('counterparties', error);
      setCounterparties([]);
    } finally {
      setLoading(prev => ({ ...prev, counterparties: false }));
    }
  }, [handleError]);

  // Initialize all data
  const initializeData = useCallback(async () => {
    setLoading(prev => ({ ...prev, global: true }));
    setErrors(prev => ({ ...prev, global: null }));

    try {
      await Promise.all([
        loadProjects(),
        loadEstimates(),
        loadUsers(),
        loadCounterparties()
      ]);

      // Load other mock data for now
      const mockData = await import('../services/mockData');
      setEstimateItems(mockData.MOCK_ESTIMATE_ITEMS);
      setPayments(mockData.MOCK_PAYMENTS);
      setEvents(mockData.MOCK_EVENTS);
      setSupplyRequests(mockData.MOCK_SUPPLY_REQUESTS);
      setDocuments(mockData.MOCK_DOCUMENTS);
      setNotifications(mockData.MOCK_NOTIFICATIONS);
      setActs(mockData.MOCK_ACTS);
      setPriceListCategories(mockData.MOCK_PRICE_CATEGORIES);
      setPriceListItems(mockData.MOCK_PRICE_ITEMS);
      setDesignFiles(mockData.MOCK_DESIGN_FILES);
      setSpecifications(mockData.MOCK_SPECIFICATIONS);
      setTasks(mockData.MOCK_TASKS);
      setChatMessages(mockData.MOCK_CHAT);
      setPhotoStream(mockData.MOCK_PHOTOSTREAM);
      setCashAccounts(mockData.MOCK_CASH_ACCOUNTS);
      setFinancialArticles(mockData.MOCK_FINANCIAL_ARTICLES);
      setTransactions(mockData.MOCK_TRANSACTIONS);
      setLeads(mockData.MOCK_LEADS);
      setTemplates(mockData.MOCK_TEMPLATES);
      setOperationTemplates(mockData.MOCK_OPERATION_TEMPLATES);
      setOperationTemplateItems(mockData.MOCK_OPERATION_TEMPLATE_ITEMS);
      setMeasurements(mockData.MOCK_MEASUREMENTS);
      setCompanySettings(mockData.MOCK_COMPANY_SETTINGS);
      setAiConfig(mockData.MOCK_AI_CONFIG);

    } catch (error) {
      handleError('global', error);
    } finally {
      setLoading(prev => ({ ...prev, global: false }));
    }
  }, [loadProjects, loadEstimates, loadUsers, loadCounterparties, handleError]);

  // Auto-initialize on mount
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Check if any data is loading
  const isLoading = loading.global || loading.projects || loading.users || loading.estimates || loading.counterparties || loading.payments;

  // Get first error
  const hasError = errors.global || errors.projects || errors.users || errors.estimates || errors.counterparties || errors.payments;

  return {
    // Data
    projects,
    users,
    estimates,
    estimateItems,
    counterparties,
    payments,
    events,
    supplyRequests,
    documents,
    notifications,
    acts,
    priceListCategories,
    priceListItems,
    designFiles,
    specifications,
    tasks,
    chatMessages,
    photoStream,
    cashAccounts,
    financialArticles,
    transactions,
    leads,
    templates,
    operationTemplates,
    operationTemplateItems,
    measurements,
    companySettings,
    aiConfig,

    // Loading states
    loading,
    isLoading,

    // Error states
    errors,
    hasError,

    // Actions
    loadProjects,
    loadEstimates,
    loadUsers,
    loadCounterparties,
    initializeData,

    // Setters for state management
    setProjects,
    setEstimates,
    setUsers,
    setCounterparties,
    setEstimateItems,
    setPayments,
    setEvents,
    setSupplyRequests,
    setDocuments,
    setNotifications,
    setActs,
    setPriceListCategories,
    setPriceListItems,
    setDesignFiles,
    setSpecifications,
    setTasks,
    setChatMessages,
    setPhotoStream,
    setCashAccounts,
    setFinancialArticles,
    setTransactions,
    setLeads,
    setTemplates,
    setOperationTemplates,
    setOperationTemplateItems,
    setMeasurements,
    setCompanySettings,
    setAiConfig
  };
};
