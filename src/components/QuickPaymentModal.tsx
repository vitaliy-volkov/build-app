import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, AlertTriangle, Calendar, DollarSign, FileText, Building2, User } from 'lucide-react';
import { 
  Transaction, 
  TransactionStatus, 
  OperationType, 
  UserRole,
  Project,
  Counterparty,
  CashAccount,
  FinancialArticle
} from '../types';
import { QuickPaymentService, QuickPaymentRequest, QuickPaymentValidation } from '../services/quickPaymentService';

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  initialType?: 'income' | 'expense';
  context: {
    currentUser: any;
    projects: Project[];
    counterparties: Counterparty[];
    cashAccounts: CashAccount[];
    financialArticles: FinancialArticle[];
    estimates: any[];
    transactions: Transaction[];
    aiConfig?: any;
  };
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialType = 'income',
  context
}) => {
  const [form, setForm] = useState<QuickPaymentRequest>({
    type: initialType,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    project_id: '',
    counterparty_id: '',
    article_id: '',
    account_from_id: '',
    account_to_id: ''
  });
  
  const [validation, setValidation] = useState<QuickPaymentValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(false);

  // Автозаполнение при изменении проекта
  useEffect(() => {
    if (form.project_id) {
      const project = context.projects.find(p => p.id === form.project_id);
      if (project && !form.description) {
        setForm(prev => ({
          ...prev,
          description: `${project.name}: ${form.type === 'income' ? 'Поступление' : 'Расход'}`
        }));
      }
      
      // Автовыбор счета для поступлений
      if (form.type === 'income' && !form.account_to_id) {
        const defaultAccount = context.cashAccounts.find(acc => acc.is_active);
        if (defaultAccount) {
          setForm(prev => ({ ...prev, account_to_id: defaultAccount.id }));
        }
      }
    }
  }, [form.project_id, form.type, context.projects, context.cashAccounts, form.description]);

  // Валидация с AI
  const validateWithAI = async () => {
    setIsValidating(true);
    try {
      const result = await QuickPaymentService.validateAndAnalyzePayment(form, context);
      setValidation(result);
      setShowAIRecommendations(true);
    } catch (error) {
      console.error('Validation error:', error);
      setValidation({
        isValid: false,
        errors: ['Ошибка валидации'],
        warnings: []
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Применить AI-рекомендации
  const applyAIRecommendations = () => {
    if (validation?.aiRecommendations) {
      setForm(prev => ({
        ...prev,
        amount: validation.aiRecommendations!.suggestedAmount || prev.amount,
        date: validation.aiRecommendations!.suggestedDate || prev.date
      }));
    }
  };

  // Сохранение
  const handleSave = () => {
    if (!validation?.isValid) {
      validateWithAI();
      return;
    }
    
    const transaction = QuickPaymentService.createQuickPayment(form, context);
    onSave(transaction);
    onClose();
  };

  // Исполнение из графика смет
  const handleExecuteFromSchedule = (estimateId: string, paymentId: string) => {
    const estimate = context.estimates.find(e => e.id === estimateId);
    const payment = estimate?.payment_schedule?.find(p => p.id === paymentId);
    
    if (estimate && payment) {
      const transaction = QuickPaymentService.executePaymentFromSchedule(
        payment,
        estimate,
        { currentUser: context.currentUser }
      );
      onSave(transaction);
      onClose();
    }
  };

  if (!isOpen) return null;

  const isIncome = form.type === 'income';
  const Icon = isIncome ? TrendingUp : TrendingDown;
  const iconColor = isIncome ? 'text-green-600' : 'text-red-600';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
              <Icon size={20} className={iconColor} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {isIncome ? 'Быстрое поступление' : 'Платеж поставщику'}
              </h3>
              <p className="text-sm text-slate-500">
                {isIncome ? 'Оплата от заказчика' : 'Расход на материалы/услуги'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {/* Тип операции */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setForm(prev => ({ ...prev, type: 'income' }))}
              className={`p-3 rounded-lg border-2 transition-all ${
                isIncome 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <TrendingUp size={20} className="mx-auto mb-1" />
              <div className="font-medium">Поступление</div>
              <div className="text-xs opacity-75">От заказчика</div>
            </button>
            <button
              onClick={() => setForm(prev => ({ ...prev, type: 'expense' }))}
              className={`p-3 rounded-lg border-2 transition-all ${
                !isIncome 
                  ? 'border-red-500 bg-red-50 text-red-700' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <TrendingDown size={20} className="mx-auto mb-1" />
              <div className="font-medium">Расход</div>
              <div className="text-xs opacity-75">Поставщику</div>
            </button>
          </div>

          {/* Основные поля */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Сумма ₽
              </label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="number"
                  className="w-full p-2 pl-9 border border-slate-300 rounded-lg font-bold text-lg"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  placeholder="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Дата
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="date"
                  className="w-full p-2 pl-9 border border-slate-300 rounded-lg"
                  value={form.date}
                  onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Описание */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Описание платежа
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                className="w-full p-2 pl-9 pr-9 border border-slate-300 rounded-lg"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Например: Аванс по договору №123"
              />
            </div>
          </div>

          {/* Проект и контрагент */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Проект
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
                <select
                  className="w-full p-2 pl-9 border border-slate-300 rounded-lg"
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
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {isIncome ? 'Заказчик' : 'Поставщик'}
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-slate-400" />
                <select
                  className="w-full p-2 pl-9 border border-slate-300 rounded-lg"
                  value={form.counterparty_id}
                  onChange={(e) => setForm(prev => ({ ...prev, counterparty_id: e.target.value }))}
                >
                  <option value="">Не выбран</option>
                  {context.counterparties
                    .filter(cp => isIncome ? cp.type === 'client' : ['supplier', 'contractor'].includes(cp.type))
                    .map(cp => (
                      <option key={cp.id} value={cp.id}>
                        {cp.full_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Счета для расходов */}
          {!isIncome && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Списать со счета
                </label>
                <select
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={form.account_from_id}
                  onChange={(e) => setForm(prev => ({ ...prev, account_from_id: e.target.value }))}
                >
                  <option value="">Не выбран</option>
                  {context.cashAccounts
                    .filter(acc => acc.is_active)
                    .map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.balance.toLocaleString()} ₽)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Статья расходов
                </label>
                <select
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={form.article_id}
                  onChange={(e) => setForm(prev => ({ ...prev, article_id: e.target.value }))}
                >
                  <option value="">Не выбрана</option>
                  {QuickPaymentService.getConstructionExpenseArticles().map(article => (
                    <option key={article.id} value={article.id}>
                      {article.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Счет для поступлений */}
          {isIncome && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Поступить на счет
              </label>
              <select
                className="w-full p-2 border border-slate-300 rounded-lg"
                value={form.account_to_id}
                onChange={(e) => setForm(prev => ({ ...prev, account_to_id: e.target.value }))}
              >
                <option value="">Не выбран</option>
                {context.cashAccounts
                  .filter(acc => acc.is_active)
                  .map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* AI Рекомендации */}
          {showAIRecommendations && validation?.aiRecommendations && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-800 flex items-center">
                  <AlertTriangle size={16} className="mr-2" />
                  AI Рекомендации
                </h4>
                <button
                  onClick={applyAIRecommendations}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Применить
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                {validation.aiRecommendations.suggestedAmount && (
                  <div>
                    <span className="font-medium">Рекомендуемая сумма:</span>{' '}
                    {validation.aiRecommendations.suggestedAmount.toLocaleString()} ₽
                  </div>
                )}
                
                {validation.aiRecommendations.suggestedDate && (
                  <div>
                    <span className="font-medium">Оптимальная дата:</span>{' '}
                    {new Date(validation.aiRecommendations.suggestedDate).toLocaleDateString('ru-RU')}
                  </div>
                )}
                
                {validation.aiRecommendations.cashFlowImpact && (
                  <div>
                    <span className="font-medium">Влияние на кэшфлоу:</span>{' '}
                    {validation.aiRecommendations.cashFlowImpact}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Валидация */}
          {validation && (
            <div className="space-y-2">
              {validation.errors.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="font-medium text-red-800 mb-1">Ошибки:</div>
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
            </div>
          )}

          {/* Исполнение из графика смет */}
          {isIncome && form.project_id && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-800 mb-3">Исполнить из графика платежей</h4>
              <div className="space-y-2">
                {context.estimates
                  .filter(e => e.project_id === form.project_id && e.payment_schedule)
                  .flatMap(estimate => 
                    estimate.payment_schedule!
                      .filter(payment => !payment.is_paid)
                      .map(payment => ({
                        ...payment,
                        estimate_name: estimate.name,
                        estimate_id: estimate.id
                      }))
                  )
                  .map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-2 bg-white rounded">
                      <div>
                        <div className="font-medium">{payment.estimate_name}: {payment.description}</div>
                        <div className="text-sm text-slate-500">{payment.amount.toLocaleString()} ₽ • {payment.date}</div>
                      </div>
                      <button
                        onClick={() => handleExecuteFromSchedule(payment.estimate_id, payment.id)}
                        className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                      >
                        Исполнить
                      </button>
                    </div>
                  ))}
                
                {context.estimates
                  .filter(e => e.project_id === form.project_id)
                  .flatMap(e => e.payment_schedule || [])
                  .filter(p => !p.is_paid).length === 0 && (
                  <div className="text-sm text-slate-500">Нет неоплаченных платежей в графиках</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between p-6 border-t border-slate-200">
          <button
            onClick={validateWithAI}
            disabled={isValidating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Анализ...
              </>
            ) : (
              <>
                <AlertTriangle size={16} className="mr-2" />
                Проверить с AI
              </>
            )}
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!validation?.isValid}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold"
            >
              Создать платеж
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
