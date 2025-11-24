import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, Target, AlertTriangle, 
  Brain, BarChart3, Download, Calendar, Eye, EyeOff
} from 'lucide-react';
import { PaymentAnalytics, PaymentAnalyticsService } from '../services/paymentAnalyticsService';

interface PaymentAnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  context: {
    currentUser: any;
    transactions: any[];
    projects: any[];
    estimates: any[];
    cashAccounts: any[];
    counterparties: any[];
    aiConfig?: any;
  };
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export const PaymentAnalyticsDashboard: React.FC<PaymentAnalyticsDashboardProps> = ({
  isOpen,
  onClose,
  context
}) => {
  const [analytics, setAnalytics] = useState<PaymentAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cashflow' | 'projects' | 'insights'>('overview');
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadAnalytics();
    }
  }, [isOpen, context.transactions]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const analyticsData = await PaymentAnalyticsService.generatePaymentAnalytics(
        context.transactions,
        context.projects,
        context.estimates,
        context.cashAccounts,
        context.counterparties,
        context.aiConfig
      );
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (analytics) {
      const csv = PaymentAnalyticsService.exportAnalytics(analytics, 'csv');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Загрузка аналитики</h3>
            <p className="text-sm text-slate-500 text-center">Анализируем финансовые данные...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Ошибка загрузки</h3>
            <p className="text-sm text-slate-500 mb-4">Не удалось загрузить аналитику</p>
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg">
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  }

  const healthColors = {
    excellent: 'text-green-600 bg-green-100',
    good: 'text-blue-600 bg-blue-100',
    warning: 'text-yellow-600 bg-yellow-100',
    critical: 'text-red-600 bg-red-100'
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <BarChart3 size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Аналитика платежей</h3>
              <p className="text-sm text-slate-500">Полный анализ финансовых потоков</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 text-slate-400 hover:text-slate-600"
              title={showDetails ? 'Скрыть детали' : 'Показать детали'}
            >
              {showDetails ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button
              onClick={exportData}
              className="p-2 text-slate-400 hover:text-slate-600"
              title="Экспорт в CSV"
            >
              <Download size={20} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {[
            { id: 'overview', label: 'Обзор', icon: BarChart3 },
            { id: 'cashflow', label: 'Кэшфлоу', icon: DollarSign },
            { id: 'projects', label: 'Проекты', icon: Target },
            { id: 'insights', label: 'AI Инсайты', icon: Brain }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Обзор */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Ключевые метрики */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Всего транзакций</span>
                    <BarChart3 size={16} className="text-slate-400" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{analytics.totalTransactions}</div>
                  <div className="text-xs text-slate-500">За все время</div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Общий оборот</span>
                    <DollarSign size={16} className="text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    {analytics.totalAmount.toLocaleString()} ₽
                  </div>
                  <div className="text-xs text-slate-500">
                    Средняя: {analytics.averageTransactionSize.toLocaleString()} ₽
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Поступления</span>
                    <TrendingUp size={16} className="text-green-500" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.incomeStats.amount.toLocaleString()} ₽
                  </div>
                  <div className="text-xs text-green-600">
                    +{analytics.incomeStats.growthRate.toFixed(1)}% рост
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-500">Расходы</span>
                    <TrendingDown size={16} className="text-red-500" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {analytics.expenseStats.amount.toLocaleString()} ₽
                  </div>
                  <div className="text-xs text-slate-500">
                    {analytics.expenseStats.count} операций
                  </div>
                </div>
              </div>

              {/* Графики */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Месячные тренды */}
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-4">Месячные тренды</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={analytics.monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" name="Поступления" />
                      <Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" fill="#ef4444" name="Расходы" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Категории расходов */}
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-4">Топ категории расходов</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={analytics.expenseStats.topCategories}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({category, percentage}) => showDetails ? `${category}: ${percentage.toFixed(1)}%` : ''}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {analytics.expenseStats.topCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Подотчетность */}
              {showDetails && (
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                    <Users size={16} className="mr-2" />
                    Подотчетность
                  </h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {analytics.accountabilityStats.issued.toLocaleString()} ₽
                      </div>
                      <div className="text-sm text-slate-500">Выдано</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {analytics.accountabilityStats.returned.toLocaleString()} ₽
                      </div>
                      <div className="text-sm text-slate-500">Возвращено</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {analytics.accountabilityStats.outstanding.toLocaleString()} ₽
                      </div>
                      <div className="text-sm text-slate-500">Невозвращено</div>
                    </div>
                  </div>
                  
                  {analytics.accountabilityStats.topEmployees.length > 0 && (
                    <div>
                      <h5 className="font-medium text-slate-700 mb-2">Топ по задолженности</h5>
                      <div className="space-y-2">
                        {analytics.accountabilityStats.topEmployees.slice(0, 5).map((employee, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                            <span className="text-sm">{employee.employee}</span>
                            <div className="text-right">
                              <div className="text-sm font-bold text-red-600">{employee.balance.toLocaleString()} ₽</div>
                              <div className="text-xs text-slate-500">
                                выдано {employee.issued.toLocaleString()}, возвращено {employee.returned.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Кэшфлоу */}
          {activeTab === 'cashflow' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-4">Прогноз кэшфлоу на 30 дней</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.cashFlowForecast}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="projectedBalance" stroke="#3b82f6" name="Прогноз баланса" />
                    <Line type="monotone" dataKey="inflow" stroke="#10b981" name="Поступления" />
                    <Line type="monotone" dataKey="outflow" stroke="#ef4444" name="Расходы" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Риски кэшфлоу */}
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                  <AlertTriangle size={16} className="mr-2 text-yellow-500" />
                  Факторы риска
                </h4>
                <div className="space-y-2">
                  {analytics.cashFlowForecast
                    .filter(day => day.riskFactors.length > 0)
                    .slice(0, 10)
                    .map((day, i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                        <div>
                          <div className="font-medium text-slate-800">
                            {new Date(day.date).toLocaleDateString('ru-RU')}
                          </div>
                          <div className="text-sm text-slate-600">
                            Прогноз: {day.projectedBalance.toLocaleString()} ₽
                          </div>
                        </div>
                        <div className="text-right">
                          {day.riskFactors.map((risk, j) => (
                            <div key={j} className="text-sm text-yellow-700">⚠️ {risk}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  
                  {analytics.cashFlowForecast.filter(day => day.riskFactors.length > 0).length === 0 && (
                    <div className="text-center text-green-600 py-4">
                      <div className="text-lg mb-2">✅</div>
                      <div>Серьезных рисков кэшфлоу не обнаружено</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Проекты */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-4">Аналитика по проектам</h4>
                <div className="space-y-4">
                  {analytics.projectAnalytics.map((project, i) => (
                    <div key={i} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h5 className="font-medium text-slate-800">{project.projectName}</h5>
                          <div className="text-sm text-slate-500">ID: {project.projectId}</div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          project.profitability >= 20 ? 'bg-green-100 text-green-700' :
                          project.profitability >= 10 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {project.profitability.toFixed(1)}% маржа
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Бюджет:</span>
                          <div className="font-medium">{project.totalBudget.toLocaleString()} ₽</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Расходы:</span>
                          <div className="font-medium text-red-600">{project.actualExpenses.toLocaleString()} ₽</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Остаток:</span>
                          <div className="font-medium text-green-600">{project.remainingBudget.toLocaleString()} ₽</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Использовано:</span>
                          <div className="font-medium">{project.budgetUtilization.toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      {/* Прогресс бар */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Использование бюджета</span>
                          <span>{project.budgetUtilization.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              project.budgetUtilization >= 90 ? 'bg-red-500' :
                              project.budgetUtilization >= 70 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(project.budgetUtilization, 100)}%` }}
                          />
                        </div>
                      </div>
                      
                      {showDetails && (
                        <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between text-xs text-slate-500">
                          <span>Соблюдение графика платежей: {project.paymentScheduleCompliance.toFixed(1)}%</span>
                          <span>Рентабельность: {project.profitability.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AI Инсайты */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              {/* Здоровье кэшфлоу */}
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-4">Здоровье кэшфлоу</h4>
                <div className="flex items-center justify-center">
                  <div className={`px-4 py-2 rounded-full font-medium ${healthColors[analytics.aiInsights.cashFlowHealth]}`}>
                    {analytics.aiInsights.cashFlowHealth === 'excellent' && '🟢 Отличное'}
                    {analytics.aiInsights.cashFlowHealth === 'good' && '🔵 Хорошее'}
                    {analytics.aiInsights.cashFlowHealth === 'warning' && '🟡 Требует внимания'}
                    {analytics.aiInsights.cashFlowHealth === 'critical' && '🔴 Критическое'}
                  </div>
                </div>
              </div>

              {/* AI Рекомендации */}
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                  <Brain size={16} className="mr-2 text-purple-600" />
                  AI Рекомендации
                </h4>
                <div className="space-y-2">
                  {analytics.aiInsights.recommendations.map((recommendation, i) => (
                    <div key={i} className="flex items-start p-3 bg-purple-50 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-purple-600 mt-2 mr-3 flex-shrink-0"></div>
                      <div className="text-sm text-slate-700">{recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Предупреждения */}
              {analytics.aiInsights.riskAlerts.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                    <AlertTriangle size={16} className="mr-2 text-red-500" />
                    Предупреждения о рисках
                  </h4>
                  <div className="space-y-2">
                    {analytics.aiInsights.riskAlerts.map((alert, i) => (
                      <div key={i} className="flex items-start p-3 bg-red-50 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-red-600 mt-2 mr-3 flex-shrink-0"></div>
                        <div className="text-sm text-slate-700">{alert}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Возможности оптимизации */}
              <div className="bg-white p-4 rounded-lg border border-slate-200">
                <h4 className="font-medium text-slate-800 mb-4 flex items-center">
                  <Target size={16} className="mr-2 text-green-600" />
                  Возможности оптимизации
                </h4>
                <div className="space-y-2">
                  {analytics.aiInsights.optimizationOpportunities.map((opportunity, i) => (
                    <div key={i} className="flex items-start p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-green-600 mt-2 mr-3 flex-shrink-0"></div>
                      <div className="text-sm text-slate-700">{opportunity}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
