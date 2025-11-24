import { 
  Transaction, 
  TransactionStatus, 
  OperationType, 
  UserRole,
  Estimate,
  EstimatePaymentScheduleItem,
  CashAccount,
  Counterparty,
  Project,
  FinancialArticle
} from '../types';
import { AIService } from './aiService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Сервис для быстрого создания платежей с учетом строительной специфики
 */

export interface QuickPaymentRequest {
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  project_id?: string;
  counterparty_id?: string;
  article_id?: string;
  account_from_id?: string;
  account_to_id?: string;
  estimate_id?: string;
  payment_schedule_id?: string;
}

export interface QuickPaymentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  aiRecommendations?: {
    suggestedAmount?: number;
    suggestedDate?: string;
    riskFactors?: string[];
    cashFlowImpact?: string;
  };
}

export class QuickPaymentService {
  /**
   * Валидация и AI-анализ перед созданием платежа
   */
  static async validateAndAnalyzePayment(
    request: QuickPaymentRequest,
    context: {
      currentUser: any;
      projects: Project[];
      transactions: Transaction[];
      cashAccounts: CashAccount[];
      counterparties: Counterparty[];
      estimates: Estimate[];
      aiConfig?: any;
    }
  ): Promise<QuickPaymentValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Базовая валидация
    if (!request.amount || request.amount <= 0) {
      errors.push('Сумма должна быть больше 0');
    }
    
    if (!request.date || !this.isValidDate(request.date)) {
      errors.push('Укажите корректную дату');
    }
    
    if (!request.description?.trim()) {
      errors.push('Добавьте описание платежа');
    }
    
    // Строительная бизнес-логика
    if (request.type === 'income') {
      await this.validateIncomePayment(request, context, errors, warnings);
    } else {
      await this.validateExpensePayment(request, context, errors, warnings);
    }
    
    // AI-анализ если доступен
    let aiRecommendations;
    if (context.aiConfig && errors.length === 0) {
      aiRecommendations = await this.getAIRecommendations(request, context);
      warnings.push(...(aiRecommendations.riskFactors || []));
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      aiRecommendations
    };
  }
  
  /**
   * Валидация поступлений
   */
  private static async validateIncomePayment(
    request: QuickPaymentRequest,
    context: any,
    errors: string[],
    warnings: string[]
  ) {
    // Проверка связи с проектом
    if (request.project_id) {
      const project = context.projects.find(p => p.id === request.project_id);
      if (!project) {
        errors.push('Проект не найден');
        return;
      }
      
      // Проверка по сметам
      const projectEstimates = context.estimates.filter(e => e.project_id === request.project_id);
      if (projectEstimates.length === 0) {
        warnings.push('По проекту нет смет - проверьте корректность');
      }
      
      // Проверка графиков платежей
      const relevantPayments = projectEstimates.flatMap(e => e.payment_schedule || []);
      const expectedAmount = relevantPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const receivedAmount = context.transactions
        .filter(t => t.project_id === request.project_id && t.operation_type === OperationType.Income)
        .reduce((sum, t) => sum + t.amount, 0);
      
      if (receivedAmount + request.amount > expectedAmount * 1.1) {
        warnings.push('Сумма превышает ожидаемую по сметам на 10%');
      }
    }
    
    // Проверка контрагента
    if (!request.counterparty_id) {
      warnings.push('Укажите заказчика для лучшего учета');
    }
  }
  
  /**
   * Валидация расходов
   */
  private static async validateExpensePayment(
    request: QuickPaymentRequest,
    context: any,
    errors: string[],
    warnings: string[]
  ) {
    // Проверка наличия средств
    if (request.account_from_id) {
      const account = context.cashAccounts.find(a => a.id === request.account_from_id);
      if (account && account.balance < request.amount) {
        errors.push(`Недостаточно средств на счете. Доступно: ${account.balance.toLocaleString()} ₽`);
      }
    } else {
      warnings.push('Укажите счет списания для контроля кэшфлоу');
    }
    
    // Проверка статьи расходов
    if (!request.article_id) {
      warnings.push('Укажите статью расходов для аналитики');
    }
    
    // Проверка бюджета проекта
    if (request.project_id && request.article_id) {
      const projectExpenses = context.transactions
        .filter(t => 
          t.project_id === request.project_id && 
          t.operation_type === OperationType.Expense &&
          t.status === TransactionStatus.Paid
        )
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Простая проверка (можно усложнить с реальными бюджетами)
      if (projectExpenses > 1000000) { // 1млн порог
        warnings.push('Расходы по проекту значительны - проверьте бюджет');
      }
    }
  }
  
  /**
   * AI-рекомендации
   */
  private static async getAIRecommendations(
    request: QuickPaymentRequest,
    context: any
  ) {
    try {
      const prompt = `
        Проанализируй платеж в строительной компании:
        
        Тип: ${request.type}
        Сумма: ${request.amount} ₽
        Дата: ${request.date}
        Описание: ${request.description}
        Проект: ${context.projects.find(p => p.id === request.project_id)?.name || 'Не указан'}
        
        Дай рекомендации по:
        1. Оптимальной сумме (если кажется завышенной/заниженной)
        2. Лучшей дате для кэшфлоу
        3. Факторам риска
        4. Влиянию на денежный поток
        
        Ответ в формате JSON:
        {
          "suggestedAmount": число,
          "suggestedDate": "YYYY-MM-DD",
          "riskFactors": ["фактор1", "фактор2"],
          "cashFlowImpact": "описание влияния"
        }
      `;
      
      const response = await AIService.chat([{role: 'user', text: prompt}], 'payment-analysis', context.aiConfig);
      
      // Попытка распарсить JSON
      try {
        return JSON.parse(response);
      } catch {
        return {
          riskFactors: ['AI-анализ недоступен'],
          cashFlowImpact: 'Проверьте влияние вручную'
        };
      }
    } catch (error) {
      return {
        riskFactors: ['Ошибка AI-анализа'],
        cashFlowImpact: 'Анализ недоступен'
      };
    }
  }
  
  /**
   * Создание быстрого платежа
   */
  static createQuickPayment(
    request: QuickPaymentRequest,
    context: {
      currentUser: any;
      aiConfig?: any;
    }
  ): Transaction {
    const now = new Date().toISOString().split('T')[0];
    
    const transaction: Transaction = {
      id: uuidv4(),
      date: request.date,
      amount: request.amount,
      operation_type: request.type === 'income' ? OperationType.Income : OperationType.Expense,
      status: this.determineInitialStatus(request, context.currentUser),
      
      // Связи
      project_id: request.project_id,
      estimate_id: request.estimate_id,
      counterparty_id: request.counterparty_id,
      article_id: request.article_id,
      account_from_id: request.account_from_id,
      account_to_id: request.account_to_id,
      
      // Метаданные
      description: request.description,
      created_by: context.currentUser.id,
      
      // Планирование
      is_planned: false,
      original_payment_schedule_id: request.payment_schedule_id
    };
    
    return transaction;
  }
  
  /**
   * Определение начального статуса
   */
  private static determineInitialStatus(
    request: QuickPaymentRequest,
    currentUser: any
  ): TransactionStatus {
    // Директор может сразу создавать одобренные платежи
    if (currentUser.role === UserRole.Director || currentUser.role === UserRole.Admin) {
      return TransactionStatus.Approved;
    }
    
    // Остальные создают в статусе черновика или ожидания
    return request.amount > 50000 ? TransactionStatus.Pending : TransactionStatus.Draft;
  }
  
  /**
   * Исполнение платежа из графика смет
   */
  static executePaymentFromSchedule(
    paymentItem: EstimatePaymentScheduleItem,
    estimate: Estimate,
    context: {
      currentUser: any;
      account_to_id?: string;
    }
  ): Transaction {
    const now = new Date().toISOString().split('T')[0];
    
    return {
      id: uuidv4(),
      date: now,
      amount: paymentItem.amount,
      operation_type: OperationType.Income,
      status: TransactionStatus.Approved,
      
      // Связи с сметой
      project_id: estimate.project_id,
      estimate_id: estimate.id,
      counterparty_id: estimate.manager_id, // Заказчик (упрощенно)
      account_to_id: context.account_to_id,
      
      // Метаданные
      description: `${estimate.name}: ${paymentItem.description}`,
      created_by: context.currentUser.id,
      approved_by: context.currentUser.id,
      
      // Отметки об исполнении
      is_planned: false,
      executed_date: now,
      execution_progress: 100,
      original_payment_schedule_id: paymentItem.id
    };
  }
  
  /**
   * Валидация даты
   */
  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime()) && date >= new Date('2020-01-01');
  }
  
  /**
   * Получение типичных статей расходов для строительства
   */
  static getConstructionExpenseArticles(): Array<{id: string, name: string, category: string}> {
    return [
      { id: 'materials', name: 'Строительные материалы', category: 'Прямые затраты' },
      { id: 'subcontractors', name: 'Работы субподрядчиков', category: 'Прямые затраты' },
      { id: 'equipment', name: 'Аренда техники', category: 'Прямые затраты' },
      { id: 'salary', name: 'Зарплата рабочих', category: 'Прямые затраты' },
      { id: 'transport', name: 'Транспортные расходы', category: 'Накладные' },
      { id: 'utilities', name: 'Коммунальные платежи', category: 'Накладные' },
      { id: 'admin', name: 'Административные расходы', category: 'Накладные' },
      { id: 'insurance', name: 'Страхование', category: 'Накладные' },
      { id: 'taxes', name: 'Налоги и сборы', category: 'Накладные' },
      { id: 'other', name: 'Прочие расходы', category: 'Прочее' }
    ];
  }
  
  /**
   * Получение типичных контрагентов для строительства
   */
  static getConstructionCounterparties(): Array<{type: string, examples: string[]}> {
    return [
      {
        type: 'supplier',
        examples: ['Леруа Мерлен', 'Петрович', 'Стройматериалы', 'Цементный завод', 'Кровельные материалы']
      },
      {
        type: 'contractor',
        examples: ['Прораб.ру', 'СтройМастер', 'ЭлектрикПрофи', 'СантехСервис', 'ОтделочниПро']
      },
      {
        type: 'client',
        examples: ['Иванов И.И.', 'ООО "СтройИнвест"', 'Петров А.В.', 'Застройщик', 'Частный заказчик']
      }
    ];
  }
}
