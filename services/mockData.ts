

import { 
  Project, Counterparty, CounterpartyType, EmployeeRole, 
  ProjectStatus, Estimate, EstimateStatus, VatMode, 
  EstimateItem, EstimateItemType, ResourceType, 
  Payment, PaymentDirection, ProjectEvent,
  User, UserRole, SupplyRequest, SupplyRequestStatus, ProjectDocument,
  AppNotification, NotificationType, WorkCompletionAct, PriceListCategory, PriceListItem,
  DesignFile, SpecificationItem, ProjectTask, ChatMessage, PhotoStreamPost,
  CashAccount, FinancialArticle, Transaction, TransactionStatus, OperationType,
  Lead, LeadStatus, ProjectTemplate, OperationTemplate, OperationTemplateItem,
  CompanySettings, AIConfiguration, MeasurementProject
} from '../types';

// --- Users (Auth Simulation) ---
// Generate some fake earning history
const generateHistory = () => {
    const hist = [];
    const now = new Date();
    for(let i=30; i>=0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        hist.push({
            date: d.toISOString().split('T')[0],
            amount: Math.floor(Math.random() * 15000)
        });
    }
    return hist;
};

export const MOCK_USERS: User[] = [
  { 
    id: 'u-1', 
    name: 'Иван Иванов', 
    role: UserRole.Director, 
    avatar_initials: 'ИИ', 
    email: 'boss@stroy.com', 
    is_active: true,
    phone: '+7 (999) 111-22-33',
    location: 'Москва',
    bio: 'Основатель компании. 15 лет в строительстве. Эксперт по монолиту.',
    skills: ['Управление', 'Финансы', 'Стратегия', 'Бетон'],
    
    // New Profile Data
    companies: [
        { id: 'comp-1', name: 'ООО "Строй-Контроль"', role: UserRole.Director, is_current: true },
        { id: 'comp-2', name: 'ИП Иванов (Личный)', role: UserRole.Director, is_current: false }
    ],
    external_rating: 4.8,
    internal_score: 950, // High score
    balance: 452000,
    earnings_history: generateHistory(),
    stats: {
        tenureDays: 1250,
        tasksCompleted: 342,
        projectsCompleted: 15,
        profitGenerated: 15000000,
        kpiScore: 98,
        onTimeRate: 96
    },
    referral_code: 'IVAN2024',
    referral_balance: 15000,
    referral_count: 12
  },
  { 
    id: 'u-2', 
    name: 'Петр Петров', 
    role: UserRole.ProjectManager, 
    avatar_initials: 'ПП', 
    email: 'pm@stroy.com', 
    is_active: true,
    phone: '+7 (999) 222-33-44',
    location: 'Санкт-Петербург',
    skills: ['PMBOK', 'Снабжение', 'Переговоры'],
    companies: [
        { id: 'comp-1', name: 'ООО "Строй-Контроль"', role: UserRole.ProjectManager, is_current: true }
    ],
    external_rating: 4.5,
    internal_score: 720,
    balance: 85000,
    earnings_history: generateHistory(),
    stats: {
        tenureDays: 365,
        tasksCompleted: 120,
        projectsCompleted: 4,
        profitGenerated: 3000000,
        kpiScore: 88,
        onTimeRate: 90
    }
  },
  { 
    id: 'u-3', 
    name: 'Сергей Сидоров', 
    role: UserRole.Foreman, 
    avatar_initials: 'СС', 
    email: 'foreman@stroy.com', 
    is_active: true,
    phone: '+7 (999) 333-44-55',
    skills: ['Бетонные работы', 'Отделка', 'Электрика']
  },
  { 
    id: 'u-4', 
    name: 'Анна Смирнова', 
    role: UserRole.Estimator, 
    avatar_initials: 'АС', 
    email: 'smeta@stroy.com', 
    is_active: true,
    skills: ['Гранд-Смета', 'Excel', 'Аналитика']
  },
  { id: 'u-5', name: 'Дмитрий Снабженцев', role: UserRole.SupplyManager, avatar_initials: 'ДС', email: 'supply@stroy.com', is_active: true },
  { id: 'u-admin', name: 'Админ Системы', role: UserRole.Admin, avatar_initials: 'АД', email: 'admin@stroy.com', is_active: true },
  { id: 'u-client', name: 'Алексей Заказчиков', role: UserRole.Client, avatar_initials: 'АЗ', email: 'client@mail.com', is_active: true },
];

// --- Counterparties ---
export const MOCK_COUNTERPARTIES: Counterparty[] = [
  { id: 'cp-1', full_name: 'ООО "СтройЗаказ"', type: CounterpartyType.Client, tax_id: '7701234567' },
  { id: 'cp-2', full_name: 'ЗАО "ГенПодрядГрупп"', type: CounterpartyType.GeneralContractor },
  { id: 'cp-3', full_name: 'ИП Петров (Бетон)', type: CounterpartyType.Supplier },
  { id: 'cp-4', full_name: 'Иван Иванов', type: CounterpartyType.Employee, role: EmployeeRole.ProjectManager },
  { id: 'cp-5', full_name: 'Сергей Сергеев', type: CounterpartyType.Employee, role: EmployeeRole.Foreman },
  { id: 'cp-6', full_name: 'Анна Смирнова', type: CounterpartyType.Employee, role: EmployeeRole.Estimator },
  { id: 'cp-7', full_name: 'Алексей Заказчиков', type: CounterpartyType.Client, description: 'Представитель заказчика' },
  { id: 'cp-8', full_name: 'ООО "Кирпичный Двор"', type: CounterpartyType.Supplier },
  { id: 'cp-9', full_name: 'Салон "Свет и Тень"', type: CounterpartyType.Supplier },
  { id: 'cp-10', full_name: 'Мебельная фабрика "Уют"', type: CounterpartyType.Supplier },
  { id: 'cp-11', full_name: 'Бригада "Монолит"', type: CounterpartyType.Contractor },
  { id: 'cp-12', full_name: 'ИП Стеныч', type: CounterpartyType.Contractor },
];

// --- Price List ---
export const MOCK_PRICE_CATEGORIES: PriceListCategory[] = [
  { id: 'cat-1', name: 'Строительные работы' },
  { id: 'cat-1-1', name: 'Бетонные работы', parent_id: 'cat-1' },
  { id: 'cat-1-2', name: 'Кладочные работы', parent_id: 'cat-1' },
  { id: 'cat-2', name: 'Материалы' },
  { id: 'cat-2-1', name: 'Сыпучие', parent_id: 'cat-2' },
];

export const MOCK_PRICE_ITEMS: PriceListItem[] = [
  { id: 'pli-1', category_id: 'cat-1-1', name: 'Устройство фундаментной плиты', unit: 'м3', cost_price: 3500, markup: 20 },
  { id: 'pli-2', category_id: 'cat-1-1', name: 'Вязка арматуры', unit: 'т', cost_price: 15000, markup: 25 },
  { id: 'pli-3', category_id: 'cat-2-1', name: 'Песок речной', unit: 'м3', cost_price: 800, markup: 10 },
  { id: 'pli-4', category_id: 'cat-2-1', name: 'Щебень гранитный 20-40', unit: 'м3', cost_price: 2200, markup: 10 },
];

// --- Operation Templates ---
export const MOCK_OPERATION_TEMPLATES: OperationTemplate[] = [
  { id: 'opt-1', name: 'Оштукатуривание стен (Гипсовая)', unit: 'м2', description: 'Полный цикл: грунтовка, маяки, штукатурка, удаление маяков', base_quantity: 1 },
  { id: 'opt-2', name: 'Стяжка пола (Пескобетон)', unit: 'м2', description: 'Устройство стяжки толщиной до 50мм', base_quantity: 1 }
];

export const MOCK_OPERATION_TEMPLATE_ITEMS: OperationTemplateItem[] = [
  // For Plastering (opt-1)
  { id: 'opt-i-1', template_id: 'opt-1', resource_type: ResourceType.Material, name: 'Грунтовка глубокого проникновения', unit: 'л', quantity_factor: 0.2, cost_price: 150, markup: 10 },
  { id: 'opt-i-2', template_id: 'opt-1', resource_type: ResourceType.Material, name: 'Штукатурка гипсовая (30кг)', unit: 'шт', quantity_factor: 0.45, cost_price: 450, markup: 15 },
  { id: 'opt-i-3', template_id: 'opt-1', resource_type: ResourceType.Material, name: 'Маяк штукатурный 6мм', unit: 'шт', quantity_factor: 0.5, cost_price: 30, markup: 20 },
  { id: 'opt-i-4', template_id: 'opt-1', resource_type: ResourceType.Work, name: 'Оштукатуривание стен по маякам', unit: 'м2', quantity_factor: 1, cost_price: 600, markup: 30 },
  // For Screed (opt-2)
  { id: 'opt-i-5', template_id: 'opt-2', resource_type: ResourceType.Material, name: 'Пескобетон М300 (40кг)', unit: 'шт', quantity_factor: 2.5, cost_price: 300, markup: 15 },
  { id: 'opt-i-6', template_id: 'opt-2', resource_type: ResourceType.Work, name: 'Устройство стяжки', unit: 'м2', quantity_factor: 1, cost_price: 500, markup: 25 },
];

// --- Projects ---
export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'ЖК "Северное Сияние", Корпус 1',
    address: 'г. Москва, ул. Ленина, д. 1',
    contract_num: 'K-2023/10-01',
    contract_date: '2023-10-01',
    description: 'Монолитные работы и кладка стен',
    customer_id: 'cp-1',
    general_contractor_id: 'cp-2',
    contact_person_id: 'cp-7',
    status: ProjectStatus.Active,
    team: [
      { user_id: 'u-2', role_in_project: 'Руководитель проекта' },
      { user_id: 'u-3', role_in_project: 'Прораб' }
    ]
  }
];

// --- Estimates ---
export const MOCK_ESTIMATES: Estimate[] = [
    {
        id: 'est-1',
        project_id: 'proj-1',
        name: 'Смета на монолитные работы',
        status: EstimateStatus.InWork,
        vat_mode: VatMode.Included,
        created_at: '2023-10-05',
        manager_id: 'u-2',
        version: 1
    }
];

export const MOCK_ESTIMATE_ITEMS: EstimateItem[] = [
    { id: 'ei-1', estimate_id: 'est-1', item_type: EstimateItemType.Stage, name: 'Подземная часть', quantity: 1, cost_price: 0, markup: 0, order: 0 },
    { id: 'ei-2', estimate_id: 'est-1', parent_id: 'ei-1', item_type: EstimateItemType.Position, resource_type: ResourceType.Work, name: 'Устройство фундаментной плиты', unit: 'м3', quantity: 500, cost_price: 3500, markup: 20, order: 1 },
    { id: 'ei-3', estimate_id: 'est-1', parent_id: 'ei-1', item_type: EstimateItemType.Position, resource_type: ResourceType.Material, name: 'Бетон В25', unit: 'м3', quantity: 520, cost_price: 4500, markup: 10, order: 2 },
];

// --- Payments ---
export const MOCK_PAYMENTS: Payment[] = [
    { id: 'pay-1', project_id: 'proj-1', payment_date: '2023-10-15', amount: 1000000, direction: PaymentDirection.In, comment: 'Аванс по договору' },
    { id: 'pay-2', project_id: 'proj-1', payment_date: '2023-10-20', amount: 500000, direction: PaymentDirection.Out, comment: 'Закупка бетона' }
];

// --- Events ---
export const MOCK_EVENTS: ProjectEvent[] = [
    { id: 'evt-1', project_id: 'proj-1', user_id: 'u-2', timestamp: '2023-10-05 10:00', event_description: 'Проект создан', type: 'success' }
];

// --- Supply ---
export const MOCK_SUPPLY_REQUESTS: SupplyRequest[] = [
    { id: 'sr-1', project_id: 'proj-1', name: 'Арматура А500С 12мм', quantity: 5, unit: 'т', status: SupplyRequestStatus.New, requested_by: 'u-3', created_at: '2023-10-10', cost_estimated: 250000 }
];

// --- Documents ---
export const MOCK_DOCUMENTS: ProjectDocument[] = [
    { id: 'doc-1', project_id: 'proj-1', name: 'Договор подряда.pdf', type: 'pdf', size: '2.5 MB', uploaded_at: '2023-10-01', uploaded_by: 'u-1' }
];

// --- Notifications ---
export const MOCK_NOTIFICATIONS: AppNotification[] = [
    { id: 'notif-1', title: 'Добро пожаловать', message: 'Система готова к работе', type: NotificationType.Info, is_read: false, created_at: new Date().toISOString() }
];

// --- Acts ---
export const MOCK_ACTS: WorkCompletionAct[] = [];

// --- Design ---
export const MOCK_DESIGN_FILES: DesignFile[] = [];

// --- Specifications ---
export const MOCK_SPECIFICATIONS: SpecificationItem[] = [];

// --- Tasks ---
export const MOCK_TASKS: ProjectTask[] = [
    { id: 'task-1', project_id: 'proj-1', title: 'Заказать бетон', status: 'Todo', created_at: '2023-10-15' }
];

// --- Chat ---
export const MOCK_CHAT: ChatMessage[] = [
    { id: 'msg-1', project_id: 'proj-1', type: 'Internal', user_id: 'u-2', text: 'Коллеги, начинаем работу по объекту.', timestamp: '2023-10-01 09:00' }
];

// --- PhotoStream ---
export const MOCK_PHOTOSTREAM: PhotoStreamPost[] = [];

// --- Finance ---
export const MOCK_CASH_ACCOUNTS: CashAccount[] = [
    { id: 'ca-1', name: 'Основной р/с (Сбер)', currency: 'RUB', balance: 1500000, is_active: true, type: 'Bank' },
    { id: 'ca-2', name: 'Касса (Офис)', currency: 'RUB', balance: 50000, is_active: true, type: 'Cash' }
];

export const MOCK_FINANCIAL_ARTICLES: FinancialArticle[] = [
    { id: 'fa-1', name: 'Выручка от реализации', type: 'Income' },
    { id: 'fa-2', name: 'Материалы', type: 'Expense' },
    { id: 'fa-3', name: 'Зарплата', type: 'Expense' }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
    { id: 'tx-1', date: '2023-10-15', amount: 1000000, operation_type: OperationType.Income, status: TransactionStatus.Paid, project_id: 'proj-1', account_to_id: 'ca-1', article_id: 'fa-1', description: 'Аванс', created_by: 'u-2' }
];

// --- CRM ---
export const MOCK_LEADS: Lead[] = [
    { id: 'lead-1', name: 'ИП Смирнов (Ремонт офиса)', phone: '+79001234567', source: 'Сайт', status: LeadStatus.New, created_at: '2023-11-01' }
];

// --- Templates ---
export const MOCK_TEMPLATES: ProjectTemplate[] = [];

// --- Measurements ---
export const MOCK_MEASUREMENTS: MeasurementProject[] = [
  {
    id: 'mp-1',
    projectId: 'proj-1',
    created_at: '2023-10-02',
    updated_at: '2023-10-02',
    floors: [
      {
        id: 'fl-1',
        name: '1 Этаж',
        rooms: [
          {
            id: 'rm-1',
            name: 'Гостиная',
            height: 2800,
            mode: 'drawing',
            points: [
              { x: 0, y: 0 },
              { x: 5000, y: 0 },
              { x: 5000, y: 4000 },
              { x: 0, y: 4000 }
            ],
            openings: [
              { id: 'op-1', type: 'Window', width: 1500, height: 1500, distanceFromStart: 1500, wallIndex: 1 },
              { id: 'op-2', type: 'Door', width: 900, height: 2100, distanceFromStart: 500, wallIndex: 3 }
            ]
          }
        ]
      }
    ]
  }
];

// --- Settings ---
export const MOCK_COMPANY_SETTINGS: CompanySettings = {
    name: 'ООО "Строй-Контроль"',
    taxId: '7700000000',
    address: 'г. Москва',
    phone: '+7 (495) 000-00-00',
    email: 'info@stroy.com',
    currency: 'RUB',
    designStyles: [
        { id: 'ds-1', name: 'Скандинавский', prompt: 'Scandinavian style, light colors, natural wood, minimalism' },
        { id: 'ds-2', name: 'Лофт', prompt: 'Loft style, concrete walls, industrial lighting, dark accents' }
    ]
};

export const MOCK_AI_CONFIG: AIConfiguration = {
    providers: [
        { id: 'google', name: 'Google Gemini', enabled: true, apiKey: '', models: ['gemini-2.5-flash', 'gemini-3-pro-preview'] },
        { id: 'openai', name: 'OpenAI', enabled: false, models: ['gpt-4o'] }
    ],
    taskDefaults: {
        chat: { providerId: 'google', modelId: 'gemini-2.5-flash' },
        estimate_analysis: { providerId: 'google', modelId: 'gemini-2.5-flash' },
        risk_assessment: { providerId: 'google', modelId: 'gemini-2.5-flash' },
        generation: { providerId: 'google', modelId: 'gemini-2.5-flash-image' }
    },
    prompts: {
        chat_system: 'Ты полезный помощник строителя.',
        estimate_analysis_system: 'Ты опытный сметчик. Проверь цены и состав работ.',
        risk_assessment_system: 'Ты риск-менеджер в строительстве.'
    }
};