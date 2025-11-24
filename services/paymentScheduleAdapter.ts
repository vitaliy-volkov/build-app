import { 
  Estimate, 
  EstimatePaymentScheduleItem, 
  Transaction, 
  TransactionStatus, 
  OperationType 
} from '../types';

/**
 * Адаптер для конвертации платежей из графиков смет в формат транзакций
 * для отображения в платежном календаре
 */

export interface PaymentScheduleTransaction extends Transaction {
  // Дополнительные поля для идентификации источника
  source: 'payment_schedule';
  estimate_id: string;
  payment_schedule_id: string;
  estimate_name: string;
  payment_percent: number;
  ai_score?: number;
  ai_risk_factors?: string[];
}

/**
 * Конвертирует платежи из графиков смет в формат транзакций
 */
export const convertPaymentScheduleToTransactions = (
  estimates: Estimate[]
): PaymentScheduleTransaction[] => {
  return estimates.flatMap(estimate => {
    if (!estimate.payment_schedule || estimate.payment_schedule.length === 0) {
      return [];
    }

    return estimate.payment_schedule
      .filter(payment => !payment.is_paid) // Только неоплаченные платежи
      .map(payment => ({
        // Базовые поля Transaction
        id: `schedule_${estimate.id}_${payment.id}`,
        date: payment.date,
        amount: payment.amount,
        operation_type: OperationType.Income, // Поступление от клиента
        status: getTransactionStatus(payment),
        
        // Связи
        project_id: estimate.project_id,
        estimate_id: estimate.id,
        
        // Описание и метаданные
        description: `${estimate.name}: ${payment.description}`,
        created_by: estimate.manager_id || estimate.estimator_id || 'system',
        
        // Дополнительные поля для идентификации
        source: 'payment_schedule' as const,
        payment_schedule_id: payment.id,
        estimate_name: estimate.name,
        payment_percent: payment.percent,
        
        // AI поля (если есть)
        ai_score: payment.ai_score,
        ai_risk_factors: payment.ai_risk_factors,
      }));
  });
};

/**
 * Определяет статус транзакции на основе данных платежа
 */
const getTransactionStatus = (payment: EstimatePaymentScheduleItem): TransactionStatus => {
  // Если есть AI score, используем его для определения статуса
  if (payment.ai_score !== undefined) {
    if (payment.ai_score >= 90) {
      return TransactionStatus.Approved; // Авто-одобрение
    } else if (payment.ai_score >= 75) {
      return TransactionStatus.Approved; // Сильная рекомендация
    } else if (payment.ai_score >= 50) {
      return TransactionStatus.Pending;  // Требует внимания
    } else {
      return TransactionStatus.Pending;  // Высокий риск - требует проверки
    }
  }
  
  // По умолчанию - ожидает согласования
  return TransactionStatus.Pending;
};

/**
 * Фильтрует и сортирует транзакции из платежного графика
 */
export const filterAndSortPaymentTransactions = (
  transactions: PaymentScheduleTransaction[],
  filterStatus?: TransactionStatus
): PaymentScheduleTransaction[] => {
  let filtered = transactions;
  
  // Фильтрация по статусу
  if (filterStatus) {
    filtered = filtered.filter(t => t.status === filterStatus);
  }
  
  // Сортировка по дате (ближайшие первые)
  return filtered.sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Группирует транзакции по датам для календаря
 */
export const groupTransactionsByDate = (
  transactions: PaymentScheduleTransaction[]
): Map<string, PaymentScheduleTransaction[]> => {
  const grouped = new Map<string, PaymentScheduleTransaction[]>();
  
  transactions.forEach(transaction => {
    const existing = grouped.get(transaction.date) || [];
    existing.push(transaction);
    grouped.set(transaction.date, existing);
  });
  
  return grouped;
};

/**
 * Получает статистику по платежам из смет
 */
export const getPaymentScheduleStats = (
  transactions: PaymentScheduleTransaction[]
): {
  total: number;
  pending: number;
  approved: number;
  averageAmount: number;
  highRiskCount: number;
  nextPayment?: PaymentScheduleTransaction;
} => {
  const total = transactions.length;
  const pending = transactions.filter(t => t.status === TransactionStatus.Pending).length;
  const approved = transactions.filter(t => t.status === TransactionStatus.Approved).length;
  
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const averageAmount = total > 0 ? totalAmount / total : 0;
  
  const highRiskCount = transactions.filter(t => 
    t.ai_score !== undefined && t.ai_score < 50
  ).length;
  
  // Ближайший предстоящий платеж
  const upcoming = transactions
    .filter(t => t.status !== TransactionStatus.Paid && new Date(t.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date));
  
  const nextPayment = upcoming.length > 0 ? upcoming[0] : undefined;
  
  return {
    total,
    pending,
    approved,
    averageAmount,
    highRiskCount,
    nextPayment
  };
};

/**
 * Проверяет, является ли транзакция платежом из графика смет
 */
export const isPaymentScheduleTransaction = (
  transaction: Transaction
): transaction is PaymentScheduleTransaction => {
  return (transaction as any).source === 'payment_schedule';
};

/**
 * Создает ссылку на смету для навигации
 */
export const createEstimateLink = (transaction: PaymentScheduleTransaction): string => {
  return `/project/${transaction.project_id}/estimate/${transaction.estimate_id}`;
};
