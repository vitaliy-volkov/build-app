import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Target, TrendingUp, TrendingDown, AlertTriangle, Brain, BarChart3 } from 'lucide-react';
import { Transaction, TransactionStatus, OperationType, Project, CashAccount } from '../types';
import { AIService } from '../services/aiService';

interface PlanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plannedTransaction: Transaction) => void;
  context: {
    currentUser: any;
    projects: Project[];
    cashAccounts: CashAccount[];
    transactions: Transaction[];
    aiConfig?: any;
  };
}

interface CashFlowForecast {
  date: string;
  projected_balance: number;
  inflow: number;
  outflow: number;
  risk_level: 'low' | 'medium' | 'high';
}

export const PlanPaymentModal: React.FC<PlanPaymentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  context
}) => {
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: 0,
    planned_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
    project_id: '',
    counterparty_name: '',
    account_from_id: '',
    account_to_id: ''
  });

  const [forecast, setForecast] = useState<CashFlowForecast[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState({
    suggestedDate: '',
    riskFactors: [] as string[],
    cashFlowImpact: '',
    alternativeOptions: [] as string[]
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showForecast, setShowForecast] = useState(false);

  // Генерация прогноза кэшфлоу
  const generateCashFlowForecast = async () => {
    const today = new Date();
    const forecastPeriod = 90; // 90 дней вперед
    
    const forecastData: CashFlowForecast[] = [];
    let runningBalance = context.cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    
    // Текущие транзакции для прогноза
    const upcomingTransactions = context.transactions
      .filter(t => new Date(t.date) > today && t.status !== TransactionStatus.Paid)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (let i = 0; i < forecastPeriod; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      
      let dailyInflow = 0;
      let dailyOutflow = 0;
      
      // Добавляем транзакции за этот день
      const dayTransactions = upcomingTransactions.filter(t => t.date === dateStr);
      dayTransactions.forEach(t => {
        if (t.operation_type === OperationType.Income) {
          dailyInflow += t.amount;
        } else {
          dailyOutflow += t.amount;
        }
      });
      
      // Добавляем планируемый платеж если он на эту дату
      if (dateStr === form.planned_date) {
        if (form.type === 'income') {
          dailyInflow += form.amount;
        } else {
          dailyOutflow += form.amount;
        }
      }
      
      runningBalance += dailyInflow - dailyOutflow;
      
      // Оценка риска
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (runningBalance < 50000) riskLevel = 'high';
      else if (runningBalance < 200000) riskLevel = 'medium';
      
      forecastData.push({
        date: dateStr,
        projected_balance: runningBalance,
        inflow: dailyInflow,
        outflow: dailyOutflow,
        risk_level: riskLevel
      });
    }
    
    setForecast(forecastData);
  };

  // AI-анализ планирования
  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    
    try {
      // Генерация прогноза
      await generateCashFlowForecast();
      
      // AI-рекомендации
      if (context.aiConfig) {
        const prompt = `
          Проанализируй планируемый платеж в строительной компании:
          
          Тип: ${form.type === 'income' ? 'Поступление' : 'Расход'}
          Сумма: ${form.amount} ₽
          Планируемая дата: ${form.planned_date}
          Описание: ${form.description}
          Проект: ${context.projects.find(p => p.id === form.project_id)?.name || 'Не указан'}
          Текущий баланс: ${context.cashAccounts.reduce((sum, acc) => sum + acc.balance, 0).toLocaleString()} ₽
          
          Дай рекомендации по:
          1. Оптимальной дате для кэшфлоу
          2. Факторам риска
          3. Влиянию на денежный поток
          4. Альтернативным вариантам
          
          Ответ в формате JSON:
          {
            "suggestedDate": "YYYY-MM-DD",
            "riskFactors": ["фактор1", "фактор2"],
            "cashFlowImpact": "описание",
            "alternativeOptions": ["вариант1", "вариант2"]
          }
        `;
        
        const response = await AIService.chat([{role: 'user', text: prompt}], 'payment-planning', context.aiConfig);
        
        try {
          const aiData = JSON.parse(response);
          setAiRecommendations(aiData);
        } catch {
          setAiRecommendations({
            suggestedDate: form.planned_date,
            riskFactors: ['AI-анализ недоступен'],
            cashFlowImpact: 'Проверьте влияние вручную',
            alternativeOptions: []
          });
        }
      }
      
      setShowForecast(true);
    } catch (error) {
      console.error('AI analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Применить AI-рекомендации
  const applyAIRecommendations = () => {
    if (aiRecommendations.suggestedDate) {
      setForm(prev => ({ ...prev, planned_date: aiRecommendations.suggestedDate }));
    }
  };

  // Сохранение планируемого платежа
  const handleSave = () => {
    const plannedTransaction: Transaction = {
      id: `planned_${Date.now()}`,
      date: form.planned_date,
      amount: form.amount,
      operation_type: form.type === 'income' ? OperationType.Income : OperationType.Expense,
      status: TransactionStatus.Pending, // Планируемые платежи в статусе ожидания
      
      // Связи
      project_id: form.project_id || undefined,
      account_from_id: form.account_from_id || undefined,
      account_to_id: form.account_to_id || undefined,
      
      // Метаданные
      description: `[ПЛАН] ${form.description}`,
      created_by: context.currentUser.id,
      
      // Планирование
      is_planned: true,
      planned_date: form.planned_date,
      execution_progress: 0
    };
    
    onSave(plannedTransaction);
    onClose();
  };

  // Получение прогноза на конкретную дату
  const getForecastForDate = (date: string): CashFlowForecast | null => {
    return forecast.find(f => f.date === date) || null;
  };

  if (!isOpen) return null;

  const isIncome = form.type === 'income';
  const Icon = isIncome ? TrendingUp : TrendingDown;
  const iconColor = isIncome ? 'text-green-600' : 'text-red-600';
  
  const dayForecast = getForecastForDate(form.planned_date);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
              <Target size={20} className={iconColor} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Планирование платежа</h3>
              <p className="text-sm text-slate-500">
                {isIncome ? 'Планирование поступления' : 'Планирование расхода'} с AI-анализом
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Тип операции */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setForm(prev => ({ ...prev, type: 'income' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                isIncome 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <TrendingUp size={24} className="mx-auto mb-2" />
              <div className="font-bold">Поступление</div>
              <div className="text-xs opacity-75">От заказчика</div>
            </button>
            <button
              onClick={() => setForm(prev => ({ ...prev, type: 'expense' }))}
              className={`p-4 rounded-lg border-2 transition-all ${
                !isIncome 
                  ? 'border-red-500 bg-red-50 text-red-700' 
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <TrendingDown size={24} className="mx-auto mb-2" />
              <div className="font-bold">Расход</div>
              <div className="text-xs opacity-75">Поставщику</div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Форма */}
            <div className="space-y-4">
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
                      className="w-full p-2 pl-9 border border-slate-300 rounded-lg font-bold text-lg"
                      value={form.amount}
                      onChange={(e) => setForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Планируемая дата
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="date"
                      className="w-full p-2 pl-9 border border-slate-300 rounded-lg"
                      value={form.planned_date}
                      onChange={(e) => setForm(prev => ({ ...prev, planned_date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
              </div>

              {/* Описание */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Описание платежа
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Например: Оплата поставщику материалов"
                />
              </div>

              {/* Проект */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Проект
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

              {/* Контрагент */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {isIncome ? 'Заказчик' : 'Поставщик'}
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  value={form.counterparty_name}
                  onChange={(e) => setForm(prev => ({ ...prev, counterparty_name: e.target.value }))}
                  placeholder="Наименование контрагента"
                />
              </div>

              {/* Счета */}
              {isIncome ? (
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
              ) : (
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
              )}
            </div>

            {/* AI-анализ и прогноз */}
            <div className="space-y-4">
              {/* Кнопка анализа */}
              <button
                onClick={analyzeWithAI}
                disabled={isAnalyzing || !form.amount || !form.planned_date}
                className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    AI-анализ...
                  </>
                ) : (
                  <>
                    <Brain size={16} className="mr-2" />
                    Проанализировать с AI
                  </>
                )}
              </button>

              {/* Прогноз кэшфлоу */}
              {showForecast && dayForecast && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-3 flex items-center">
                    <BarChart3 size={16} className="mr-2" />
                    Прогноз на {new Date(form.planned_date).toLocaleDateString('ru-RU')}
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Прогнозируемый баланс:</span>
                      <span className={`font-bold ${
                        dayForecast.projected_balance < 0 ? 'text-red-600' : 
                        dayForecast.projected_balance < 50000 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {dayForecast.projected_balance.toLocaleString()} ₽
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Поступления:</span>
                      <span className="text-green-600">+{dayForecast.inflow.toLocaleString()} ₽</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Расходы:</span>
                      <span className="text-red-600">-{dayForecast.outflow.toLocaleString()} ₽</span>
                    </div>
                    
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span>Уровень риска:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        dayForecast.risk_level === 'high' ? 'bg-red-100 text-red-700' :
                        dayForecast.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {dayForecast.risk_level === 'high' ? 'Высокий' :
                         dayForecast.risk_level === 'medium' ? 'Средний' : 'Низкий'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI-рекомендации */}
              {showForecast && aiRecommendations.riskFactors.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-blue-800 flex items-center">
                      <Brain size={16} className="mr-2" />
                      AI Рекомендации
                    </h4>
                    {aiRecommendations.suggestedDate !== form.planned_date && (
                      <button
                        onClick={applyAIRecommendations}
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                      >
                        Применить
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    {aiRecommendations.suggestedDate && (
                      <div>
                        <span className="font-medium">Рекомендуемая дата:</span>{' '}
                        {new Date(aiRecommendations.suggestedDate).toLocaleDateString('ru-RU')}
                      </div>
                    )}
                    
                    {aiRecommendations.cashFlowImpact && (
                      <div>
                        <span className="font-medium">Влияние на кэшфлоу:</span>{' '}
                        {aiRecommendations.cashFlowImpact}
                      </div>
                    )}
                    
                    {aiRecommendations.riskFactors.length > 0 && (
                      <div>
                        <span className="font-medium">Факторы риска:</span>
                        <ul className="mt-1 ml-4 space-y-1">
                          {aiRecommendations.riskFactors.map((risk, i) => (
                            <li key={i} className="flex items-center">
                              <AlertTriangle size={12} className="mr-2 text-yellow-600" />
                              {risk}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {aiRecommendations.alternativeOptions.length > 0 && (
                      <div>
                        <span className="font-medium">Альтернативы:</span>
                        <ul className="mt-1 ml-4 space-y-1">
                          {aiRecommendations.alternativeOptions.map((option, i) => (
                            <li key={i} className="text-blue-700">• {option}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!form.amount || !form.planned_date || !form.description}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold"
            >
              Запланировать платеж
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
