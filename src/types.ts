

export enum CounterpartyType {
  Client = "Клиент",
  GeneralContractor = "Генподрядчик",
  Contractor = "Подрядчик",
  Supplier = "Поставщик",
  Employee = "Сотрудник"
}

export enum EmployeeRole {
  Foreman = "Прораб",
  ProjectManager = "Руководитель проекта",
  Manager = "Менеджер",
  SupplyManager = "Снабженец",
  Estimator = "Сметчик",
  Engineer = "Инженер",
  Director = "Директор",
  None = "-"
}

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

export interface Counterparty {
  id: string;
  full_name: string;
  tax_id?: string;
  phone?: string;
  email?: string;
  type: CounterpartyType;
  role?: EmployeeRole;
  description?: string;
}

// --- Price List (Tree Structure) ---
export enum CalculationType {
  FloorArea = "floor_area",
  CeilingArea = "ceiling_area",
  Perimeter = "perimeter",
  WallAreaNet = "wall_area_net",
  WallHeight = "wall_height"
}

export const CalculationTypeLabels: Record<CalculationType, string> = {
  [CalculationType.FloorArea]: "Площадь пола",
  [CalculationType.CeilingArea]: "Площадь потолка",
  [CalculationType.Perimeter]: "Периметр",
  [CalculationType.WallAreaNet]: "Площадь стен",
  [CalculationType.WallHeight]: "Высота стен"
};

export interface PriceListCategory {
  id: string;
  name: string;
  parent_id?: string;
  children?: PriceListCategory[];
}

export interface PriceListItem {
  id: string;
  category_id: string;
  name: string;
  unit: string;
  cost_price: number;
  markup: number;
  customer_price?: number; // Computed on fly usually
  calc_types?: CalculationType[]; // New: Supported auto-calculation types
}

// --- Operation Templates (Tech Cards) ---
export interface OperationTemplate {
  id: string;
  name: string; // e.g. "Plastering Walls"
  unit: string; // e.g. "m2" - base unit for calculation
  description?: string;
  base_quantity?: number;
}

export interface OperationTemplateItem {
  id: string;
  template_id: string;
  resource_type: ResourceType;
  name: string;
  unit: string;
  cost_price: number; // Base cost per unit
  markup: number;
  quantity_factor: number; // Quantity required per 1 unit of the operation template (e.g. 0.5 bags per m2)
  price_list_item_id?: string;
  calc_types?: CalculationType[];
}

export enum ProjectStatus {
  Planning = "Планирование",
  Active = "В работе",
  OnHold = "Приостановлен",
  Completed = "Завершен"
}

export interface Project {
  id: string;
  name: string;
  address: string;
  contract_num: string;
  contract_date: string;
  description: string;
  customer_id: string;
  general_contractor_id: string;
  contact_person_id: string;
  status: ProjectStatus;
  team: { user_id: string; role_in_project: string }[];
}

// --- Templates ---
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  created_at: string;
  // Snapshot data
  estimates: Estimate[];
  estimateItems: EstimateItem[];
  tasks: ProjectTask[];
}

export enum EstimateStatus {
  Draft = "Черновик",
  Review = "На согласовании",
  InWork = "В работе",
  Completed = "Завершена"
}

export enum VatMode {
  Included = "Включен",
  Excluded = "Исключен",
  Added = "Сверху"
}

// --- AI Payment Analysis Types ---
export interface PaymentVersionHistory {
  id: string;
  payment_schedule_id: string;
  changed_at: string;
  changed_by: string;
  changes: {
    field: 'date' | 'amount' | 'percent' | 'description';
    old_value: any;
    new_value: any;
  }[];
  ai_analysis?: {
    risk_level: 'low' | 'medium' | 'high';
    recommendations: string[];
    impact_forecast: string;
  };
  approval_required: boolean;
}

export interface EstimatePaymentScheduleItem {
  id: string;
  date: string;
  amount: number;
  percent: number; // % of total estimate
  description: string;
  is_paid: boolean;
  
  // AI Enhancement Fields
  ai_score?: number;              // Оценка от ИИ (0-100)
  ai_risk_factors?: string[];     // Факторы риска
  ai_recommendations?: string[];   // Рекомендации
  forecast_date?: string;          // Прогнозируемая дата
  version_history: PaymentVersionHistory[];
}

export interface Estimate {
  id: string;
  project_id: string;
  name: string;
  status: EstimateStatus;
  manager_id?: string;
  estimator_id?: string;
  vat_mode: VatMode;
  created_at: string;
  
  description?: string; // NEW
  payment_conditions?: string; // NEW
  payment_schedule?: EstimatePaymentScheduleItem[]; // NEW

  // Measurement Binding
  measurementBinding?: {
    measurementProjectId: string;
    floorId: string;
    roomId: string;
    lastSyncedAt: string;
  };

  // Versioning
  version?: number;
  original_estimate_id?: string; // ID of the first version (root)
}

export enum EstimateItemType {
  Stage = "Stage",
  Group = "Group",
  Position = "Position"
}

export enum ResourceType {
  Work = "Работа",
  Material = "Материал",
  Mechanism = "Механизм",
  Delivery = "Доставка"
}

export interface CalcBinding {
  calculationType: string;
  measurementIds: string[]; // Linked room IDs
  lastValue: number;
  autoEnabled: boolean;
  lastSyncedAt: string;
}

export interface EstimateItem {
  id: string;
  estimate_id: string;
  parent_id?: string; // For tree structure
  item_type: EstimateItemType;
  resource_type?: ResourceType;
  name: string;
  unit?: string;
  quantity: number;
  cost_price: number;
  markup: number;
  price_list_item_id?: string;
  assigned_contractor_id?: string; // New: Contractor assignment
  order: number; // For sorting
  
  // New: Scheduling
  start_date?: string;
  end_date?: string;
  dependencies?: string[]; // IDs of items that must finish before this starts
  
  // Calculated
  progress?: number; // 0-100%

  // New: Auto Volumes
  calcBinding?: CalcBinding;
}

export enum PaymentDirection {
  In = "In", // Income
  Out = "Out" // Expense
}

export interface Payment {
  id: string;
  project_id: string;
  estimate_id?: string;
  payment_date: string;
  amount: number;
  direction: PaymentDirection;
  comment: string;
}

export interface ProjectEvent {
  id: string;
  project_id: string;
  user_id: string;
  timestamp: string;
  event_description: string;
  type: 'info' | 'warning' | 'success';
}

// New: Supply Module (Purchases)
export enum SupplyRequestStatus {
  New = "Новая",
  Ordered = "Заказано",
  Delivered = "Доставлено"
}

export interface SupplyRequest {
  id: string;
  project_id: string;
  estimate_item_id?: string; // Link to estimate item
  estimate_id?: string; // Link to parent estimate
  name: string;
  quantity: number;
  unit: string;
  status: SupplyRequestStatus;
  requested_by: string; // User ID
  created_at: string;
  
  // Procurement details
  supplier_id?: string;
  order_date?: string;
  delivery_date?: string;
  cost_estimated: number; // Budget from estimate
  cost_actual?: number; // Actual spend
  invoice_number?: string;
}

// New: Documents Module
export interface ProjectDocument {
  id: string;
  project_id: string;
  name: string;
  type: 'pdf' | 'doc' | 'img' | 'dwg';
  size: string;
  uploaded_at: string;
  uploaded_by: string;
}

// New: Acts of Work (Выполнение) - Updated for v6.1
export type ActStatus = 'Draft' | 'PendingClient' | 'Signed' | 'Rejected';

export interface ActSignature {
  user_id: string;
  user_name: string;
  signed_at: string;
  signature_hash: string; // Simulation of SES hash
}

export interface WorkCompletionAct {
  id: string;
  project_id: string;
  number: string;
  date: string;
  period_start?: string;
  period_end?: string;
  status: ActStatus;
  author_id: string;
  items: WorkCompletionActItem[];
  photo_urls?: string[];
  
  // Workflow
  manager_signature?: ActSignature;
  client_signature?: ActSignature;
  rejection_reason?: string;
}

export interface WorkCompletionActItem {
  id: string;
  act_id: string;
  estimate_item_id: string;
  quantity_done: number; // Volume closed in this act
  current_price: number; // Price at the moment of closing
  total_amount: number; // quantity * price
}


// Helper type for calculations
export interface CalculatedEstimateItem extends EstimateItem {
  total_cost: number;
  unit_price_customer: number;
  total_price_customer: number;
  profit: number;
  children?: CalculatedEstimateItem[];
}

// --- Notifications System ---
export enum NotificationType {
  Info = "info",
  Success = "success",
  Warning = "warning",
  ActionRequired = "action_required", // For approvals
  AIPaymentRecommendation = "ai_payment_recommendation", // AI payment analysis
  AIInsight = "ai_insight", // AI generated insights
  AIForecast = "ai_forecast" // AI predictions
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  target_role?: UserRole; // If null, for everyone
  target_user_id?: string; // If null, based on role
  
  // Action Payload (e.g. for approving an estimate)
  action_payload?: {
    type: 'approve_estimate' | 'approve_payment' | 'approve_act';
    entity_id: string; // estimate_id or payment_id
  }
  
  // AI Enhancement Fields
  ai_generated?: boolean;
  ai_context?: {
    urgency_level: 'low' | 'medium' | 'high';
    predicted_impact: string;
    suggested_actions: string[];
  };
}

// --- NEW MODULES v5.0 (Design & Repair) ---

// 1. Design Project
export type DesignCategory = 'Moodboard' | 'Drawings' | 'Visualization' | 'Materials';
export type DesignStatus = 'New' | 'Review' | 'Approved' | 'Rejected';

export interface DesignMaterial {
  name: string;
  category: string;
  notes?: string;
  search_query?: string; // What was searched
  links?: { title: string, url: string }[]; // Found links
}

// --- CANVAS TYPES ---
export interface DesignMarker {
  id: string;
  x: number; // Percentage of width (0-100)
  y: number; // Percentage of height (0-100)
  pageIndex: number;
  linkedEntityType?: 'Task' | 'EstimateItem' | 'Material';
  linkedEntityId?: string;
  comment?: string;
  color?: string;
}

export interface DesignStroke {
  id: string;
  pageIndex: number;
  points: { x: number, y: number }[]; // Points for SVG path
  color: string;
  width: number;
}

export interface DesignFile {
  id: string;
  project_id: string;
  category: DesignCategory;
  name: string;
  url: string; // Can be a blob URL or data URL
  type?: 'image' | 'pdf'; // NEW: distinguish between images and PDFs
  status: DesignStatus;
  uploaded_by: string;
  uploaded_at: string;
  comment?: string; // From Client or Reviewer
  
  // AI Fields
  ai_generated?: boolean;
  materials_analysis?: DesignMaterial[]; // JSON structure of found materials
  
  // Canvas Fields
  markers?: DesignMarker[];
  strokes?: DesignStroke[];
}

// 2. Complectation (Specification)
export type SpecClientStatus = 'None' | 'Review' | 'Approved' | 'Rejected';
export type SpecProcurementStatus = 'NotOrdered' | 'Ordered' | 'OnSite';

export interface SpecificationItem {
  id: string;
  project_id: string;
  category: string; // e.g. "Furniture", "Light", "Plumbing"
  name: string;
  article?: string;
  supplier_id?: string;
  link?: string;
  photo_url?: string;
  quantity: number;
  unit: string;
  price_plan: number;
  client_status: SpecClientStatus;
  procurement_status: SpecProcurementStatus;
}

// 3. Tasks (Kanban)
export type TaskStatus = 'Todo' | 'In Progress' | 'Done';

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  deadline?: string;
  status: TaskStatus;
  created_at: string;
}

// 4. Communication
export type ChatType = 'Internal' | 'Client';

export interface ChatAttachment {
  type: 'Act' | 'Estimate' | 'Design' | 'Document';
  id: string;
  title: string;
  subtext?: string; // e.g. amount, status
  status?: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  type: ChatType;
  user_id: string;
  text: string;
  timestamp: string;
  attachment?: ChatAttachment;
}

export interface PhotoStreamPost {
  id: string;
  project_id: string;
  user_id: string;
  photo_url: string;
  caption: string;
  timestamp: string;
}

// --- COMPREHENSIVE FINANCE MODULE TYPES ---

export enum TransactionStatus {
    Draft = "Черновик",
    Pending = "На согласовании",
    Approved = "Согласовано",
    Paid = "Оплачено",
    Rejected = "Отклонено"
}

export enum OperationType {
    Income = "Поступление",
    Expense = "Расход",
    Transfer = "Перевод",
    Salary = "Зарплата",
    AccountabilityIssue = "Выдача под отчет",
    AccountabilityReturn = "Возврат подотчетных"
}

export interface CashAccount {
    id: string;
    name: string;
    currency: string; // 'RUB', 'USD'
    balance: number;
    is_active: boolean;
    description?: string;
    type: 'Cash' | 'Bank';
}

export interface FinancialArticle {
    id: string;
    name: string;
    parent_id?: string;
    type: 'Income' | 'Expense';
    code?: string;
}

export interface Transaction {
    id: string;
    date: string; // YYYY-MM-DD
    amount: number;
    operation_type: OperationType;
    status: TransactionStatus;
    
    // Linkages
    project_id?: string;
    estimate_id?: string;
    counterparty_id?: string; // Payer or Payee
    
    // Classification
    article_id?: string; // Financial Article (Category)
    
    // Money Movement
    account_from_id?: string;
    account_to_id?: string;
    
    // Metadata
    description: string;
    created_by: string; // User ID
    approved_by?: string; // User ID
    
    // For Accountable Persons
    accountable_person_id?: string; // Employee User ID
    
    // Planning & Execution Fields
    is_planned?: boolean;
    planned_date?: string;
    executed_date?: string;
    execution_progress?: number; // 0-100
    original_payment_schedule_id?: string; // Link to payment schedule if executed from it
}

// --- CRM Module ---
export enum LeadStatus {
    New = "Новая заявка",
    InProgress = "В работе",
    Meeting = "Встреча/Замер",
    Calculation = "Расчет сметы",
    ContractSent = "Договор отправлен",
    Success = "Успех (Контракт)",
    Failed = "Отказ"
}

export interface Lead {
    id: string;
    name: string; // Client Name or Title
    phone: string;
    email?: string;
    address?: string;
    source: string; // e.g. "Site", "Referral"
    description?: string;
    estimated_budget?: number;
    status: LeadStatus;
    assignee_id?: string; // Manager
    created_at: string;
}

// --- AI Assistant Types (v7.0) ---
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isLoading?: boolean;
}

export interface ProjectHealthAnalysis {
  riskScore: number; // 0-100 (High Risk)
  sentiment: 'Позитивное' | 'Нейтральное' | 'Негативное';
  riskFactors: string[];
  recommendations: string[];
  lastUpdated: string;
}

// Enhanced Estimate Analysis Result
export interface AIAnalysisResult {
  analysisText: string;
  missingItems: {
    item_type: EstimateItemType;
    resource_type: ResourceType;
    name: string;
    unit: string;
    quantity: number;
    cost_price: number;
    markup: number;
    reason?: string; // Why AI thinks it's missing
  }[];
  optimizations: {
    originalItemName: string;
    suggestion: string;
    potentialSavings: number;
  }[];
}

// --- Settings & Configuration Types (v7.1) ---

export type LLMProvider = 'google' | 'openai' | 'anthropic' | 'groq' | 'ollama' | 'openrouter' | 'custom';

export interface AIProviderConfig {
  id: string; // Unique identifier (can be any string for custom providers)
  providerType: LLMProvider; // Maps to adapter type
  name: string;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string; // For Ollama, OpenRouter, Custom
  models: string[]; // List of available model IDs
  isCustom?: boolean; // Flag to indicate if this is user-added (allows deletion)
}

export type AITaskType = 'chat' | 'estimate_analysis' | 'risk_assessment' | 'generation';

export interface AIConfiguration {
  providers: AIProviderConfig[];
  taskDefaults: Record<AITaskType, { providerId: string, modelId: string }>;
  prompts: {
    chat_system: string;
    estimate_analysis_system: string;
    risk_assessment_system: string;
  };
}

export interface DesignStyleConfig {
  id: string;
  name: string;
  prompt: string; // System prompt/suffix for this style
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  email?: string;
  phone?: string;
  website?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  name: string;
  taxId: string; // INN
  address: string;
  phone: string;
  email: string;
  website?: string;
  currency: string;
  bankDetails?: string;
  logoUrl?: string;
  designStyles: DesignStyleConfig[]; // Preset styles for visualization
}

// --- MEASUREMENT MODULE (v8.0) ---

export interface MeasurementPoint {
  x: number; // Grid coordinates
  y: number;
}

export interface MeasurementOpening {
  id: string;
  type: 'Window' | 'Door';
  width: number; // mm (Real World Dimensions)
  height: number; // mm
  distanceFromStart: number; // mm from the starting point of the wall segment
  wallIndex: number; // Index of the starting point of the wall segment in the room points array
}

// Auto Rectangle Mode Types
export interface AutoRectOpening {
  id: string;
  type: 'Window' | 'Door' | 'Empty';
  width: number; // mm
  height: number; // mm
  depth?: number; // mm (wall thickness)
  distanceFromFloor?: number; // mm
}

export interface AutoRectData {
  length: number; // mm
  width: number; // mm
  height: number; // mm
  openings: AutoRectOpening[];
}

// Manual Mode Types
export interface ManualOpening {
  id: string;
  type: 'Window' | 'Door' | 'Empty'; // Empty = Doorway/Proem
  width: number; // mm
  height: number; // mm
  distanceFromStart: number; // mm
}

export interface ManualWall {
  id: string;
  direction: 'Right' | 'Left' | 'Up' | 'Down';
  length: number; // mm
  openings: ManualOpening[];
}

export interface ManualMeasurementStats {
  floorArea: number; // m2
  ceilingArea: number; // m2
  perimeter: number; // m
  wallHeight: number; // m
  wallAreaNet: number; // m2 (minus openings)
  skirtingPerimeter?: number; // m
  openingsArea?: number; // m2
}

export interface MeasurementRoom {
  id: string;
  name: string;
  height: number; // mm (Default)
  points: MeasurementPoint[]; // Vertices of the floor polygon (Drawing Mode)
  openings: MeasurementOpening[]; // Openings (Drawing Mode)
  
  // Mode Toggle
  mode: 'drawing' | 'manual' | 'auto_rect';
  
  // Auto Rect Data
  autoRectData?: AutoRectData;

  // Manual Override Stats
  manualStats?: ManualMeasurementStats;
  
  // Manual Wall Definitions
  manualWalls?: ManualWall[];
}

export interface MeasurementFloor {
  id: string;
  name: string; // "1st Floor", "2nd Floor"
  rooms: MeasurementRoom[];
}

export interface MeasurementProject {
  id: string;
  projectId: string; // Link to Project
  created_at: string;
  updated_at: string;
  floors: MeasurementFloor[];
}

// --- AI Payment Analysis Types (v9.0) ---

export interface AIAnalysis {
  score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: string[];
  recommendations: string[];
  confidence: number; // 0-100
  analysis_timestamp: string;
}

export interface PaymentContext {
  project_id: string;
  estimate_id: string;
  payment_schedule: EstimatePaymentScheduleItem[];
  total_estimate_amount: number;
  client_history?: {
    on_time_payment_rate: number;
    average_delay_days: number;
    total_projects_completed: number;
  };
  company_cash_flow?: {
    current_balance: number;
    upcoming_expenses: number;
    projected_income: number;
  };
}

export interface CashFlowForecast {
  period_start: string;
  period_end: string;
  projected_income: number;
  projected_expenses: number;
  net_cash_flow: number;
  risk_level: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface UserActivity {
  user_id: string;
  last_active: string;
  notification_response_rate: number;
  preferred_communication_time: string;
  activity_patterns: {
    morning_active: boolean;
    evening_active: boolean;
    weekend_active: boolean;
  };
}

// AI Audit Trail for compliance
export interface AIAuditTrail {
  id: string;
  timestamp: string;
  model_version: string;
  input_data_hash: string;
  final_score: number;
  recommendation: 'approve' | 'review' | 'reject';
  confidence_level: number;
  risk_factors: string[];
  training_consent?: boolean;
  detailed_analysis?: string;
}

// --- Multi-Level Approval Workflow Types ---

export enum ApprovalStatus {
  Draft = "Черновик",
  AIAnalysis = "ИИ-анализ",
  ForemanReview = "Проверка прорабом",
  ManagerReview = "Проверка руководителем",
  DirectorApproval = "Согласование директором",
  Approved = "Одобрено",
  Rejected = "Отклонено",
  Paid = "Оплачено"
}

export enum ApprovalAction {
  Create = "create",
  Submit = "submit",
  AIAnalyze = "ai_analyze",
  ForemanApprove = "foreman_approve",
  ForemanReject = "foreman_reject",
  ManagerApprove = "manager_approve",
  ManagerReject = "manager_reject",
  DirectorApprove = "director_approve",
  DirectorReject = "director_reject",
  MarkPaid = "mark_paid"
}

export interface ApprovalStep {
  id: string;
  role: UserRole;
  required: boolean;
  status: 'pending' | 'completed' | 'skipped';
  completed_at?: string;
  completed_by?: string;
  comments?: string;
  ai_score?: number;
}

export interface PaymentApprovalWorkflow {
  id: string;
  payment_schedule_item_id: string;
  project_id: string;
  estimate_id: string;
  current_status: ApprovalStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Workflow steps
  steps: ApprovalStep[];
  
  // AI Analysis
  ai_analysis?: AIAnalysis;
  ai_recommendation?: 'approve' | 'review' | 'reject';
  
  // Audit trail
  history: PaymentApprovalHistory[];
  
  // Final decision
  final_decision?: {
    approved_by: string;
    approved_at: string;
    decision: 'approve' | 'reject';
    final_comments: string;
  };
}

export interface PaymentApprovalHistory {
  id: string;
  workflow_id: string;
  action: ApprovalAction;
  performed_by: string;
  performed_at: string;
  previous_status: ApprovalStatus;
  new_status: ApprovalStatus;
  comments?: string;
  ai_score_at_time?: number;
  attachments?: string[]; // Document IDs
}

// Multi-level approval configuration
export interface ApprovalWorkflowConfig {
  enabled: boolean;
  auto_ai_analysis: boolean;
  require_foreman_approval: boolean;
  require_manager_approval: boolean;
  require_director_approval: boolean;
  auto_approve_threshold: number; // AI score for auto-approval
  auto_reject_threshold: number; // AI score for auto-rejection
  skip_steps_for_amount: number; // Skip steps for payments below this amount
}