import { 
  Transaction, 
  TransactionStatus, 
  OperationType, 
  Project,
  Estimate,
  CashAccount,
  Counterparty,
  CounterpartyType
} from '../types';
import { AIService } from './aiService';

/**
 * Сервис для аналитики и оптимизации платежей в строительной компании
 */

export interface PaymentAnalytics {
  // Общие метрики
  totalTransactions: number;
  totalAmount: number;
  averageTransactionSize: number;
  
  // По типам операций
  incomeStats: {
    count: number;
    amount: number;
    averageSize: number;
    growthRate: number; // % роста
  };
  
  expenseStats: {
    count: number;
    amount: number;
    averageSize: number;
    topCategories: Array<{category: string; amount: number; percentage: number}>;
  };
  
  accountabilityStats: {
    issued: number;
    returned: number;
    outstanding: number;
    topEmployees: Array<{employee: string; issued: number; returned: number; balance: number}>;
  };
  
  // Временные метрики
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
    netCashFlow: number;
    transactionCount: number;
  }>;
  
  // Проектная аналитика
  projectAnalytics: Array<{
    projectId: string;
    projectName: string;
    totalBudget: number;
    actualExpenses: number;
    remainingBudget: number;
    budgetUtilization: number; // %
    profitability: number; // %
    paymentScheduleCompliance: number; // %
  }>;
  
  // Кэшфлоу прогноз
  cashFlowForecast: Array<{
    date: string;
    projectedBalance: number;
    inflow: number;
    outflow: number;
    confidence: number; // 0-100
    riskFactors: string[];
  }>;
  
  // AI инсайты
  aiInsights: {
    cashFlowHealth: 'excellent' | 'good' | 'warning' | 'critical';
    recommendations: string[];
    riskAlerts: string[];
    optimizationOpportunities: string[];
  };
}

export interface PaymentOptimization {
  // Оптимизация сроков
  timingOptimizations: Array<{
    transactionId: string;
    currentDate: string;
    suggestedDate: string;
    impact: number; // финансовое влияние
    reasoning: string;
  }>;
  
  // Оптимизация сумм
  amountOptimizations: Array<{
    transactionId: string;
    currentAmount: number;
    suggestedAmount: number;
    savings: number;
    reasoning: string;
  }>;
  
  // Оптимизация контрагентов
  supplierOptimizations: Array<{
    supplierId: string;
    supplierName: string;
    currentTerms: string;
    suggestedTerms: string;
    potentialSavings: number;
    riskReduction: string;
  }>;
}

export class PaymentAnalyticsService {
  /**
   * Генерация полной аналитики платежей
   */
  static async generatePaymentAnalytics(
    transactions: Transaction[],
    projects: Project[],
    estimates: Estimate[],
    cashAccounts: CashAccount[],
    counterparties: Counterparty[],
    aiConfig?: any
  ): Promise<PaymentAnalytics> {
    // Базовые метрики
    const totalTransactions = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageTransactionSize = totalAmount / totalTransactions || 0;
    
    // Аналитика по поступлениям
    const incomeTransactions = transactions.filter(t => t.operation_type === OperationType.Income);
    const incomeStats = {
      count: incomeTransactions.length,
      amount: incomeTransactions.reduce((sum, t) => sum + t.amount, 0),
      averageSize: incomeTransactions.reduce((sum, t) => sum + t.amount, 0) / incomeTransactions.length || 0,
      growthRate: this.calculateGrowthRate(incomeTransactions)
    };
    
    // Аналитика по расходам
    const expenseTransactions = transactions.filter(t => t.operation_type === OperationType.Expense);
    const expenseStats = {
      count: expenseTransactions.length,
      amount: expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
      averageSize: expenseTransactions.reduce((sum, t) => sum + t.amount, 0) / expenseTransactions.length || 0,
      topCategories: this.getTopExpenseCategories(expenseTransactions)
    };
    
    // Аналитика по подотчетности
    const accountabilityTransactions = transactions.filter(t => 
      t.operation_type === OperationType.AccountabilityIssue || 
      t.operation_type === OperationType.AccountabilityReturn ||
      t.operation_type === OperationType.Expense && t.accountable_person_id
    );
    const accountabilityStats = this.calculateAccountabilityStats(accountabilityTransactions, counterparties);
    
    // Месячные тренды
    const monthlyTrend = this.calculateMonthlyTrends(transactions);
    
    // Проектная аналитика
    const projectAnalytics = this.calculateProjectAnalytics(transactions, projects, estimates);
    
    // Прогноз кэшфлоу
    const cashFlowForecast = await this.generateCashFlowForecast(transactions, cashAccounts, aiConfig);
    
    // AI инсайты
    const aiInsights = await this.generateAIInsights(
      { incomeStats, expenseStats, accountabilityStats, cashFlowForecast },
      aiConfig
    );
    
    return {
      totalTransactions,
      totalAmount,
      averageTransactionSize,
      incomeStats,
      expenseStats,
      accountabilityStats,
      monthlyTrend,
      projectAnalytics,
      cashFlowForecast,
      aiInsights
    };
  }
  
  /**
   * Расчет темпа роста
   */
  private static calculateGrowthRate(transactions: Transaction[]): number {
    if (transactions.length < 2) return 0;
    
    const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const midPoint = Math.floor(sortedTransactions.length / 2);
    
    const firstHalf = sortedTransactions.slice(0, midPoint);
    const secondHalf = sortedTransactions.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, t) => sum + t.amount, 0) / firstHalf.length || 0;
    const secondHalfAvg = secondHalf.reduce((sum, t) => sum + t.amount, 0) / secondHalf.length || 0;
    
    return ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
  }
  
  /**
   * Топ категории расходов
   */
  private static getTopExpenseCategories(transactions: Transaction[]): Array<{category: string; amount: number; percentage: number}> {
    const categoryMap = new Map<string, number>();
    
    transactions.forEach(t => {
      if (t.article_id) {
        const current = categoryMap.get(t.article_id) || 0;
        categoryMap.set(t.article_id, current + t.amount);
      }
    });
    
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / total) * 100
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }
  
  /**
   * Расчет статистики подотчетности
   */
  private static calculateAccountabilityStats(
    transactions: Transaction[],
    counterparties: Counterparty[]
  ) {
    const employees = counterparties.filter(cp => cp.type === CounterpartyType.Employee);
    
    const stats = {
      issued: 0,
      returned: 0,
      outstanding: 0,
      topEmployees: [] as Array<{employee: string; issued: number; returned: number; balance: number}>
    };
    
    employees.forEach(employee => {
      const employeeTransactions = transactions.filter(t => t.accountable_person_id === employee.id);
      
      const issued = employeeTransactions
        .filter(t => t.operation_type === OperationType.AccountabilityIssue)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const returned = employeeTransactions
        .filter(t => t.operation_type === OperationType.AccountabilityReturn || 
                     (t.operation_type === OperationType.Expense && t.accountable_person_id))
        .reduce((sum, t) => sum + t.amount, 0);
      
      const balance = issued - returned;
      
      stats.issued += issued;
      stats.returned += returned;
      stats.outstanding += Math.max(0, balance);
      
      if (issued > 0) {
        stats.topEmployees.push({
          employee: employee.full_name,
          issued,
          returned,
          balance: Math.max(0, balance)
        });
      }
    });
    
    stats.topEmployees.sort((a, b) => b.balance - a.balance);
    
    return stats;
  }
  
  /**
   * Месячные тренды
   */
  private static calculateMonthlyTrends(transactions: Transaction[]) {
    const monthlyMap = new Map<string, { income: number; expense: number; count: number }>();
    
    transactions.forEach(t => {
      const month = t.date.substring(0, 7); // YYYY-MM
      
      const current = monthlyMap.get(month) || { income: 0, expense: 0, count: 0 };
      
      if (t.operation_type === OperationType.Income) {
        current.income += t.amount;
      } else {
        current.expense += t.amount;
      }
      
      current.count += 1;
      monthlyMap.set(month, current);
    });
    
    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expense: data.expense,
        netCashFlow: data.income - data.expense,
        transactionCount: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Последние 12 месяцев
  }
  
  /**
   * Проектная аналитика
   */
  private static calculateProjectAnalytics(
    transactions: Transaction[],
    projects: Project[],
    estimates: Estimate[]
  ) {
    return projects.map(project => {
      const projectTransactions = transactions.filter(t => t.project_id === project.id);
      const projectEstimates = estimates.filter(e => e.project_id === project.id);
      
      // Бюджет из смет (расчет на основе элементов сметы)
      const totalBudget = projectEstimates.reduce((sum, e) => {
        // TODO: Добавить расчет общей стоимости сметы на основе estimateItems
        return sum; // Временно возвращаем 0, пока не реализован расчет
      }, 0);
      
      // Фактические расходы
      const actualExpenses = projectTransactions
        .filter(t => t.operation_type === OperationType.Expense)
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Поступления
      const actualIncome = projectTransactions
        .filter(t => t.operation_type === OperationType.Income)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const remainingBudget = totalBudget - actualExpenses;
      const budgetUtilization = totalBudget > 0 ? (actualExpenses / totalBudget) * 100 : 0;
      const profitability = totalBudget > 0 ? ((actualIncome - actualExpenses) / totalBudget) * 100 : 0;
      
      // Соблюдение графика платежей
      const scheduledPayments = projectEstimates.flatMap(e => e.payment_schedule || []);
      const executedPayments = scheduledPayments.filter(payment => 
        projectTransactions.some(t => t.original_payment_schedule_id === payment.id)
      );
      const paymentScheduleCompliance = scheduledPayments.length > 0 
        ? (executedPayments.length / scheduledPayments.length) * 100 
        : 0;
      
      return {
        projectId: project.id,
        projectName: project.name,
        totalBudget,
        actualExpenses,
        remainingBudget,
        budgetUtilization,
        profitability,
        paymentScheduleCompliance
      };
    });
  }
  
  /**
   * Прогноз кэшфлоу с AI
   */
  private static async generateCashFlowForecast(
    transactions: Transaction[],
    cashAccounts: CashAccount[],
    aiConfig?: any
  ) {
    const forecastPeriod = 30; // 30 дней вперед
    const forecast = [];
    
    const currentBalance = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const today = new Date();
    
    // Базовый прогноз без AI
    for (let i = 1; i <= forecastPeriod; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Простой прогноз на основе исторических данных
      const dayOfWeek = date.getDay();
      const historicalAverage = this.getHistoricalAverageForDay(transactions, dayOfWeek);
      
      forecast.push({
        date: dateStr,
        projectedBalance: currentBalance + (historicalAverage.income - historicalAverage.expense) * i,
        inflow: historicalAverage.income,
        outflow: historicalAverage.expense,
        confidence: 70, // Базовая уверенность
        riskFactors: []
      });
    }
    
    // Улучшение прогноза с AI
    if (aiConfig) {
      try {
        const aiForecast = await this.enhanceForecastWithAI(forecast, transactions, aiConfig);
        return aiForecast;
      } catch (error) {
        console.warn('AI forecast enhancement failed, using basic forecast:', error);
      }
    }
    
    return forecast;
  }
  
  /**
   * Исторические средние по дням недели
   */
  private static getHistoricalAverageForDay(transactions: Transaction[], dayOfWeek: number) {
    const dayTransactions = transactions.filter(t => {
      const transactionDay = new Date(t.date).getDay();
      return transactionDay === dayOfWeek;
    });
    
    const income = dayTransactions
      .filter(t => t.operation_type === OperationType.Income)
      .reduce((sum, t) => sum + t.amount, 0) / Math.max(dayTransactions.filter(t => t.operation_type === OperationType.Income).length, 1);
    
    const expense = dayTransactions
      .filter(t => t.operation_type !== OperationType.Income)
      .reduce((sum, t) => sum + t.amount, 0) / Math.max(dayTransactions.filter(t => t.operation_type !== OperationType.Income).length, 1);
    
    return { income, expense };
  }
  
  /**
   * Улучшение прогноза с AI
   */
  private static async enhanceForecastWithAI(
    basicForecast: any[],
    transactions: Transaction[],
    aiConfig: any
  ) {
    const prompt = `
      Проанализируй финансовые данные строительной компании и улучши прогноз кэшфлоу:
      
      Текущие данные:
      - Транзакций: ${transactions.length}
      - Общая сумма: ${transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()} ₽
      - Период анализа: последние 3 месяца
      
      Базовый прогноз на 30 дней предоставлен.
      
      Улучши прогноз учитывая:
      1. Сезонность строительного бизнеса
      2. Типичные задержки платежей
      3. Риски крупных расходов
      4. Праздничные периоды
      
      Ответ в формате JSON с массивом улучшенных прогнозов:
      [
        {
          "date": "YYYY-MM-DD",
          "projectedBalance": число,
          "inflow": число,
          "outflow": число,
          "confidence": 0-100,
          "riskFactors": ["фактор1", "фактор2"]
        }
      ]
    `;
    
    try {
      const response = await AIService.chat([{role: 'user', text: prompt}], 'cash-flow-forecast', aiConfig);
      const enhancedForecast = JSON.parse(response);
      
      // Объединяем базовый и AI прогноз
      return basicForecast.map((basic, index) => {
        const enhanced = enhancedForecast[index];
        if (enhanced) {
          return {
            ...basic,
            projectedBalance: enhanced.projectedBalance || basic.projectedBalance,
            inflow: enhanced.inflow || basic.inflow,
            outflow: enhanced.outflow || basic.outflow,
            confidence: enhanced.confidence || basic.confidence,
            riskFactors: enhanced.riskFactors || []
          };
        }
        return basic;
      });
    } catch (error) {
      return basicForecast;
    }
  }
  
  /**
   * Генерация AI инсайтов
   */
  private static async generateAIInsights(
    analyticsData: any,
    aiConfig?: any
  ) {
    if (!aiConfig) {
      return {
        cashFlowHealth: 'good' as const,
        recommendations: ['Настройте AI для получения персонализированных рекомендаций'],
        riskAlerts: [],
        optimizationOpportunities: []
      };
    }
    
    try {
      const prompt = `
        Проанализируй финансовые показатели строительной компании и дай рекомендации:
        
        Данные:
        - Поступления: ${analyticsData.incomeStats.amount.toLocaleString()} ₽ (${analyticsData.incomeStats.count} транзакций)
        - Расходы: ${analyticsData.expenseStats.amount.toLocaleString()} ₽ (${analyticsData.expenseStats.count} транзакций)
        - Подотчетность: выдано ${analyticsData.accountabilityStats.issued.toLocaleString()} ₽, возвращено ${analyticsData.accountabilityStats.returned.toLocaleString()} ₽
        - Средний размер транзакции: ${analyticsData.totalAmount / analyticsData.totalTransactions} ₽
        
        Оцени здоровье кэшфлоу и дай рекомендации по:
        1. Оптимизации расходов
        2. Улучшению поступлений
        3. Управлению рисками
        4. Возможностям для оптимизации
        
        Ответ в формате JSON:
        {
          "cashFlowHealth": "excellent|good|warning|critical",
          "recommendations": ["рекомендация1", "рекомендация2"],
          "riskAlerts": ["риск1", "риск2"],
          "optimizationOpportunities": ["возможность1", "возможность2"]
        }
      `;
      
      const response = await AIService.chat([{role: 'user', text: prompt}], 'financial-insights', aiConfig);
      return JSON.parse(response);
    } catch (error) {
      return {
        cashFlowHealth: 'good' as const,
        recommendations: ['Ошибка AI-анализа. Проверьте настройки.'],
        riskAlerts: [],
        optimizationOpportunities: []
      };
    }
  }
  
  /**
   * Генерация оптимизационных предложений
   */
  static async generatePaymentOptimizations(
    transactions: Transaction[],
    counterparties: Counterparty[],
    aiConfig?: any
  ): Promise<PaymentOptimization> {
    // TODO: Реализовать оптимизационные алгоритмы
    return {
      timingOptimizations: [],
      amountOptimizations: [],
      supplierOptimizations: []
    };
  }
  
  /**
   * Экспорт аналитики в Excel/CSV
   */
  static exportAnalytics(analytics: PaymentAnalytics, format: 'excel' | 'csv' = 'excel'): string {
    // TODO: Реализовать экспорт
    return 'Export functionality to be implemented';
  }
}
