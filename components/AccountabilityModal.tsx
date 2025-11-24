import React, { useState, useEffect } from 'react';
import { X, Users, DollarSign, Calendar, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Transaction, TransactionStatus, OperationType, UserRole, Counterparty, CashAccount } from '../types';
import { QuickPaymentService } from '../services/quickPaymentService';

interface AccountabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  context: {
    currentUser: any;
    counterparties: Counterparty[];
    cashAccounts: CashAccount[];
    projects: any[];
    transactions: Transaction[];
    aiConfig?: any;
  };
}

export const AccountabilityModal: React.FC<AccountabilityModalProps> = ({
  isOpen,
  onClose,
  onSave,
  context
}) => {
  const [form, setForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    accountable_person_id: '',
    account_from_id: '',
    project_id: '',
    reporting_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [validation, setValidation] = useState({
    isValid: false,
    errors: [] as string[],
    warnings: [] as string[],
    employeeLimit: 0,
    currentBalance: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Валидация при изменении формы
  useEffect(() => {
    validateForm();
  }, [form, context]);

  const validateForm = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Базовая валидация
    if (!form.amount || form.amount <= 0) {
      errors.push('Сумма должна быть больше 0');
    }

    if (!form.description?.trim()) {
      errors.push('Добавьте описание цели выдачи');
    }

    if (!form.accountable_person_id) {
      errors.push('Выберите сотрудника');
    }

    if (!form.account_from_id) {
      errors.push('Выберите счет для выдачи');
    }

    // Проверка лимитов сотрудника
    if (form.accountable_person_id && form.amount) {
      const employee = context.counterparties.find(cp => cp.id === form.accountable_person_id);
      
      // Расчет текущего баланса сотрудника
      const currentBalance = context.transactions
        .filter(t => 
          t.accountable_person_id === form.accountable_person_id &&
          t.status === TransactionStatus.Paid
        )
        .reduce((balance, t) => {
          if (t.operation_type === OperationType.AccountabilityIssue) {
            return balance + t.amount;
          } else if (t.operation_type === OperationType.AccountabilityReturn || 
                     t.operation_type === OperationType.Expense) {
            return balance - t.amount;
          }
          return balance;
        }, 0);

      // Простые лимиты (можно настроить по должностям)
      const positionLimits: Record<string, number> = {
        'Прораб': 50000,
        'Мастер': 30000,
        'Инженер': 75000,
        'Руководитель проекта': 100000,
        'Директор': 200000
      };

      const employeeLimit = positionLimits[employee?.position || ''] || 30000;
      
      if (currentBalance + form.amount > employeeLimit) {
        errors.push(`Превышен лимит сотрудника. Текущий долг: ${currentBalance.toLocaleString()} ₽, лимит: ${employeeLimit.toLocaleString()} ₽`);
      }

      if (currentBalance > 0) {
        warnings.push(`У сотрудника есть невозвращенный долг: ${currentBalance.toLocaleString()} ₽`);
      }

      setValidation({
        isValid: errors.length === 0,
        errors,
        warnings,
        employeeLimit,
        currentBalance
      });
    } else {
      setValidation({
        isValid: false,
        errors,
        warnings,
        employeeLimit: 0,
        currentBalance: 0
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Создание транзакции выдачи подотчетности
      const transaction: Transaction = {
        id: `accountability_${Date.now()}`,
        date: form.date,
        amount: form.amount,
        operation_type: OperationType.AccountabilityIssue,
        status: context.currentUser.role === UserRole.Director ? TransactionStatus.Approved : TransactionStatus.Pending,
        
        // Связи
        accountable_person_id: form.accountable_person_id,
        account_from_id: form.account_from_id,
        project_id: form.project_id || undefined,
        
        // Метаданные
        description: form.description,
        created_by: context.currentUser.id,
        approved_by: context.currentUser.role === UserRole.Director ? context.currentUser.id : undefined
      };

      onSave(transaction);
      onClose();
    } catch (error) {
      console.error('Error creating accountability transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const employee = context.counterparties.find(cp => cp.id === form.accountable_person_id);
  const account = context.cashAccounts.find(acc => acc.id === form.account_from_id);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Выдача подотчетности</h3>
              <p className="text-sm text-slate-500">Выдача наличных сотруднику</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Сотрудник */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Сотрудник
            </label>
            <select
              className="w-full p-2 border border-slate-300 rounded-lg"
              value={form.accountable_person_id}
              onChange={(e) => setForm(prev => ({ ...prev, accountable_person_id: e.target.value }))}
              required
            >
              <option value="">Выберите сотрудника</option>
              {context.counterparties
                .filter(cp => cp.type === 'employee')
                .map(cp => (
                  <option key={cp.id} value={cp.id}>
                    {cp.full_name} {cp.position ? `(${cp.position})` : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Информация по лимитам */}
          {form.accountable_person_id && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Текущий долг:</span>
                <span className={`font-bold ${validation.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {validation.currentBalance.toLocaleString()} ₽
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Лимит сотрудника:</span>
                <span className="font-medium">{validation.employeeLimit.toLocaleString()} ₽</span>
              </div>
              <div className="flex justify-between text-sm mt-1 pt-2 border-t border-slate-200">
                <span>После выдачи:</span>
                <span className={`font-bold ${(validation.currentBalance + form.amount) > validation.employeeLimit ? 'text-red-600' : 'text-green-600'}`}>
                  {(validation.currentBalance + form.amount).toLocaleString()} ₽
                </span>
              </div>
            </div>
          )}

          {/* Сумма и дата */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Сумма ₽
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="number"
                  className="w-full p-2 pl-9 border border-slate-300 rounded-lg font-bold"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Дата выдачи
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  className="w-full p-2 pl-9 border border-slate-300 rounded-lg"
                  value={form.date}
                  onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          {/* Срок отчетности */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Срок отчетности
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="date"
                className="w-full p-2 pl-9 border border-slate-300 rounded-lg"
                value={form.reporting_deadline}
                onChange={(e) => setForm(prev => ({ ...prev, reporting_deadline: e.target.value }))}
                min={form.date}
                required
              />
            </div>
          </div>

          {/* Описание */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Назначение выдачи
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                className="w-full p-2 pl-9 border border-slate-300 rounded-lg"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Например: Закупка материалов, Транспортные расходы"
                required
              />
            </div>
          </div>

          {/* Проект (опционально) */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Проект (необязательно)
            </label>
            <select
              className="w-full p-2 border border-slate-300 rounded-lg"
              value={form.project_id}
              onChange={(e) => setForm(prev => ({ ...prev, project_id: e.target.value }))}
            >
              <option value="">Не выбран</option>
              {context.projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Счет списания */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Выдать со счета
            </label>
            <select
              className="w-full p-2 border border-slate-300 rounded-lg"
              value={form.account_from_id}
              onChange={(e) => setForm(prev => ({ ...prev, account_from_id: e.target.value }))}
              required
            >
              <option value="">Выберите счет</option>
              {context.cashAccounts
                .filter(acc => acc.is_active && acc.type === 'Cash')
                .map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.balance.toLocaleString()} ₽)
                  </option>
                ))}
            </select>
          </div>

          {/* Валидация */}
          {validation.errors.length > 0 && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="font-medium text-red-800 mb-1 flex items-center">
                <AlertTriangle size={16} className="mr-2" />
                Ошибки:
              </div>
              {validation.errors.map((error, i) => (
                <div key={i} className="text-sm text-red-700">• {error}</div>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="font-medium text-yellow-800 mb-1">Предупреждения:</div>
              {validation.warnings.map((warning, i) => (
                <div key={i} className="text-sm text-yellow-700">• {warning}</div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!validation.isValid || isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Создание...
                </>
              ) : (
                <>
                  <CheckCircle size={16} className="mr-2" />
                  Выдать средства
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
