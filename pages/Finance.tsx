import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, ComposedChart, Area
} from 'recharts';
import { 
  LayoutDashboard, List, Calendar, Users, 
  TrendingUp, TrendingDown, Wallet, Filter, Plus,
  CheckCircle2, XCircle, Clock, MoreHorizontal, User, Download,
  PieChart as PieIcon, BarChart3
} from 'lucide-react';
import { 
  Transaction, TransactionStatus, OperationType, UserRole, CashAccount, CounterpartyType, Project 
} from '../types';
import { 
  convertPaymentScheduleToTransactions, 
  groupTransactionsByDate,
  isPaymentScheduleTransaction,
  createEstimateLink,
  PaymentScheduleTransaction 
} from '../services/paymentScheduleAdapter';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';

export const Finance = () => {
  const { transactions, cashAccounts, financialArticles, projects, counterparties, currentUser, addTransaction, updateTransaction, estimates, estimateItems } = useApp();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'registry' | 'calendar' | 'accountable' | 'analytics'>('dashboard');
  
  const isDirector = currentUser.role === UserRole.Director || currentUser.role === UserRole.Admin;

  // --- Derived Data ---
  const totalBalance = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  // --- Dashboard Data Preparation ---
  const dashboardData = useMemo(() => {
    // Monthly P&L / CashFlow
    const monthlyStats = new Map<string, { income: number, expense: number }>();
    
    transactions
      .filter(t => t.status === TransactionStatus.Paid)
      .forEach(t => {
         const month = t.date.substring(0, 7); // YYYY-MM
         const current = monthlyStats.get(month) || { income: 0, expense: 0 };
         
         if (t.operation_type === OperationType.Income) current.income += t.amount;
         if (t.operation_type === OperationType.Expense) current.expense += t.amount;
         
         monthlyStats.set(month, current);
      });

    const barData = Array.from(monthlyStats.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, val]) => ({ name, ...val }));

    // Expense Structure by Article
    const expenseStructure = new Map<string, number>();
    transactions
      .filter(t => t.status === TransactionStatus.Paid && t.operation_type === OperationType.Expense && t.article_id)
      .forEach(t => {
         const article = financialArticles.find(a => a.id === t.article_id);
         // Find root category if needed, currently simplified
         const name = article?.name || 'Прочее';
         expenseStructure.set(name, (expenseStructure.get(name) || 0) + t.amount);
      });

    const pieData = Array.from(expenseStructure.entries()).map(([name, value]) => ({ name, value }));

    return { barData, pieData };
  }, [transactions, financialArticles]);

  // --- Accountable Persons Data ---
  const accountableData = useMemo(() => {
      const persons = counterparties.filter(c => c.type === CounterpartyType.Employee);
      return persons.map(p => {
          // Issued (Expense for company, Income for person's virtual pocket)
          const issued = transactions
            .filter(t => t.status === TransactionStatus.Paid && t.operation_type === OperationType.AccountabilityIssue && t.accountable_person_id === p.id)
            .reduce((sum, t) => sum + t.amount, 0);
          
          // Reported (Expense for person)
          const reported = transactions
            .filter(t => t.status === TransactionStatus.Paid && t.operation_type === OperationType.Expense && t.accountable_person_id === p.id)
            .reduce((sum, t) => sum + t.amount, 0);
            
          // Returned
          const returned = transactions
            .filter(t => t.status === TransactionStatus.Paid && t.operation_type === OperationType.AccountabilityReturn && t.accountable_person_id === p.id)
            .reduce((sum, t) => sum + t.amount, 0);

          return {
              id: p.id,
              name: p.full_name,
              balance: issued - reported - returned,
              issued,
              reported,
              returned
          };
      }).filter(d => d.issued > 0 || d.reported > 0);
  }, [transactions, counterparties]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
       <div className="flex justify-between items-end">
          <div>
             <h1 className="text-2xl font-bold text-slate-800">Финансы и Казначейство</h1>
             <p className="text-slate-500">Управление денежными потоками и бюджетом</p>
          </div>
          <div className="flex space-x-4">
             <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 flex flex-col items-end">
                <span className="text-xs text-slate-500 uppercase">Общий остаток</span>
                <span className="font-bold text-xl text-slate-800">{totalBalance.toLocaleString()} ₽</span>
             </div>
          </div>
       </div>

       {/* Tabs */}
       <div className="border-b border-slate-200 flex space-x-6 overflow-x-auto">
          <button onClick={() => setActiveTab('dashboard')} className={`pb-3 px-1 font-medium text-sm flex items-center space-x-2 border-b-2 transition-colors ${activeTab === 'dashboard' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
             <LayoutDashboard size={18}/><span>Дашборд</span>
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`pb-3 px-1 font-medium text-sm flex items-center space-x-2 border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
             <PieIcon size={18}/><span>Аналитика</span>
          </button>
          <button onClick={() => setActiveTab('registry')} className={`pb-3 px-1 font-medium text-sm flex items-center space-x-2 border-b-2 transition-colors ${activeTab === 'registry' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
             <List size={18}/><span>Реестр операций</span>
          </button>
          <button onClick={() => setActiveTab('calendar')} className={`pb-3 px-1 font-medium text-sm flex items-center space-x-2 border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
             <Calendar size={18}/><span>Платежный календарь</span>
          </button>
          <button onClick={() => setActiveTab('accountable')} className={`pb-3 px-1 font-medium text-sm flex items-center space-x-2 border-b-2 transition-colors ${activeTab === 'accountable' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
             <Users size={18}/><span>Подотчетные лица</span>
          </button>
       </div>

       {/* --- DASHBOARD CONTENT --- */}
       {activeTab === 'dashboard' && (
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 col-span-2">
                    <h3 className="font-bold text-lg mb-4">Движение денежных средств (Cash Flow)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={dashboardData.barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis tickFormatter={(val) => `${val/1000}k`} />
                                <Tooltip formatter={(val: number) => val.toLocaleString() + ' ₽'} />
                                <Legend />
                                <Bar dataKey="income" name="Поступления" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="Выплаты" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg mb-4">Структура расходов</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie 
                                   data={dashboardData.pieData} 
                                   dataKey="value" 
                                   nameKey="name" 
                                   cx="50%" cy="50%" 
                                   outerRadius={80} 
                                   fill="#8884d8" 
                                   label={({cx, cy, midAngle, innerRadius, outerRadius, percent, index}) => {
                                       return `${(percent * 100).toFixed(0)}%`;
                                   }}
                                >
                                   {dashboardData.pieData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'][index % 5]} />
                                   ))}
                                </Pie>
                                <Tooltip formatter={(val: number) => val.toLocaleString() + ' ₽'} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {cashAccounts.map(acc => (
                     <div key={acc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
                         <div className="flex justify-between items-start mb-2">
                             <span className="text-sm text-slate-500">{acc.type === 'Bank' ? 'Банк' : 'Касса'}</span>
                             <span className={`px-2 py-0.5 rounded text-xs ${acc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {acc.is_active ? 'Активен' : 'Архив'}
                             </span>
                         </div>
                         <h4 className="font-bold text-slate-800 mb-1">{acc.name}</h4>
                         <div className="mt-auto">
                             <span className="text-2xl font-bold text-slate-700">{acc.balance.toLocaleString()} {acc.currency}</span>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
       )}

       {/* --- ANALYTICS CONTENT --- */}
       {activeTab === 'analytics' && (
          <FinancialAnalytics 
            transactions={transactions} 
            projects={projects} 
            estimates={estimates} 
            estimateItems={estimateItems} 
            financialArticles={financialArticles}
          />
       )}

       {/* --- REGISTRY CONTENT --- */}
       {activeTab === 'registry' && (
          <OperationsRegistry 
             transactions={transactions} 
             counterparties={counterparties} 
             projects={projects} 
             articles={financialArticles} 
             accounts={cashAccounts}
             onAdd={addTransaction}
             onUpdate={updateTransaction}
             currentUser={currentUser}
             isDirector={isDirector}
          />
       )}

       {/* --- CALENDAR CONTENT --- */}
       {activeTab === 'calendar' && (
          <PaymentCalendar 
            transactions={transactions} 
            estimates={estimates}
            projects={projects}
            navigate={navigate}
          />
       )}

       {/* --- ACCOUNTABLE CONTENT --- */}
       {activeTab === 'accountable' && (
          <AccountablePersonsTable data={accountableData} />
       )}
    </div>
  );
};

// --- Financial Analytics Component ---
const FinancialAnalytics = ({ transactions, projects, estimates, estimateItems, financialArticles }: any) => {
   
   const projectStats = useMemo(() => {
      return projects.map((proj: Project) => {
         // Fact
         const projTx = transactions.filter((t: Transaction) => t.project_id === proj.id && t.status === TransactionStatus.Paid);
         const income = projTx.filter((t: Transaction) => t.operation_type === OperationType.Income).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
         const expense = projTx.filter((t: Transaction) => t.operation_type === OperationType.Expense || t.operation_type === OperationType.Salary).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
         
         // Plan (Budget from Estimates)
         const projEstimates = estimates.filter((e: any) => e.project_id === proj.id);
         const estimatedCost = estimateItems
            .filter((i: any) => projEstimates.some((e: any) => e.id === i.estimate_id))
            .reduce((sum: number, i: any) => sum + (i.cost_price * i.quantity), 0);
         const estimatedRevenue = estimateItems
            .filter((i: any) => projEstimates.some((e: any) => e.id === i.estimate_id))
            .reduce((sum: number, i: any) => sum + (i.cost_price * i.quantity * (1 + i.markup/100)), 0);

         return {
            id: proj.id,
            name: proj.name,
            income,
            expense,
            profit: income - expense,
            margin: income > 0 ? ((income - expense) / income) * 100 : 0,
            planCost: estimatedCost,
            planRevenue: estimatedRevenue
         };
      }).sort((a: any, b: any) => b.income - a.income); // Sort by revenue
   }, [projects, transactions, estimates, estimateItems]);

   const dynamicsData = useMemo(() => {
      const monthly = new Map<string, { income: number, expense: number, profit: number }>();
      transactions.filter((t: Transaction) => t.status === TransactionStatus.Paid).forEach((t: Transaction) => {
         const month = t.date.substring(0, 7);
         const curr = monthly.get(month) || { income: 0, expense: 0, profit: 0 };
         if (t.operation_type === OperationType.Income) curr.income += t.amount;
         if (t.operation_type === OperationType.Expense) curr.expense += t.amount;
         curr.profit = curr.income - curr.expense;
         monthly.set(month, curr);
      });
      return Array.from(monthly.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([name, val]) => ({name, ...val}));
   }, [transactions]);

   return (
      <div className="space-y-8">
         {/* Top Level Stats */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-lg mb-4 flex items-center"><BarChart3 size={20} className="mr-2 text-blue-600"/>Рентабельность Проектов</h3>
               <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                     <BarChart data={projectStats} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} />
                        <XAxis type="number" tickFormatter={(val) => `${val/1000}k`} />
                        <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11}} />
                        <Tooltip formatter={(val: number) => val.toLocaleString() + ' ₽'} />
                        <Legend />
                        <Bar dataKey="income" name="Выручка (Факт)" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                        <Bar dataKey="expense" name="Затраты (Факт)" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-lg mb-4 flex items-center"><TrendingUp size={20} className="mr-2 text-purple-600"/>Финансовая Динамика</h3>
               <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                     <ComposedChart data={dynamicsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(val) => `${val/1000}k`} />
                        <Tooltip formatter={(val: number) => val.toLocaleString() + ' ₽'} />
                        <Legend />
                        <Area type="monotone" dataKey="income" name="Доход" fill="#dcfce7" stroke="#10b981" />
                        <Line type="monotone" dataKey="expense" name="Расход" stroke="#ef4444" strokeWidth={2} dot={{r: 4}} />
                        <Line type="monotone" dataKey="profit" name="Прибыль" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" />
                     </ComposedChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>

         {/* Detailed Project Table */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <h3 className="font-bold text-lg mb-4">Сводный анализ по проектам (План/Факт)</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                         <th className="p-3">Проект</th>
                         <th className="p-3 text-right">Бюджет (План)</th>
                         <th className="p-3 text-right">Расходы (Факт)</th>
                         <th className="p-3 text-right">Отклонение</th>
                         <th className="p-3 text-right">Выручка (Факт)</th>
                         <th className="p-3 text-right">Прибыль</th>
                         <th className="p-3 text-right">Маржа</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {projectStats.map((p: any) => {
                         const deviation = p.planCost - p.expense;
                         const isOverBudget = deviation < 0;
                         return (
                            <tr key={p.id} className="hover:bg-slate-50">
                               <td className="p-3 font-medium text-slate-800">{p.name}</td>
                               <td className="p-3 text-right text-slate-500">{p.planCost.toLocaleString()} ₽</td>
                               <td className="p-3 text-right text-slate-800">{p.expense.toLocaleString()} ₽</td>
                               <td className={`p-3 text-right font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                                  {deviation > 0 ? '+' : ''}{deviation.toLocaleString()} ₽
                               </td>
                               <td className="p-3 text-right text-blue-700">{p.income.toLocaleString()} ₽</td>
                               <td className={`p-3 text-right font-bold ${p.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {p.profit.toLocaleString()} ₽
                               </td>
                               <td className="p-3 text-right">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${p.margin > 20 ? 'bg-green-100 text-green-700' : p.margin > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                     {p.margin.toFixed(1)}%
                                  </span>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
         </div>
      </div>
   );
};

// --- Subcomponents ---

const OperationsRegistry = ({ transactions, counterparties, projects, articles, accounts, onAdd, onUpdate, currentUser, isDirector }: any) => {
   const [filterType, setFilterType] = useState<string>('All');
   const [isModalOpen, setModalOpen] = useState(false);
   const [editingTx, setEditingTx] = useState<Transaction | null>(null);

   const filtered = transactions
      .filter((t: Transaction) => filterType === 'All' || t.operation_type === filterType)
      .sort((a: Transaction, b: Transaction) => new Date(b.date).getTime() - new Date(a.date).getTime());

   return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[calc(100vh-14rem)]">
         <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <div className="flex space-x-2">
               <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
               >
                  <option value="All">Все типы операций</option>
                  {Object.values(OperationType).map(type => (
                     <option key={type} value={type}>{type}</option>
                  ))}
               </select>
            </div>
            <button 
               onClick={() => { setEditingTx(null); setModalOpen(true); }}
               className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center"
            >
               <Plus size={16} className="mr-2"/> Создать операцию
            </button>
         </div>
         
         <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                     <th className="p-3">Дата</th>
                     <th className="p-3">Тип</th>
                     <th className="p-3">Контрагент / Проект</th>
                     <th className="p-3">Статья / Назначение</th>
                     <th className="p-3 text-right">Сумма</th>
                     <th className="p-3">Статус</th>
                     <th className="p-3 text-right">Действия</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filtered.map((t: Transaction) => (
                     <tr key={t.id} className="hover:bg-slate-50">
                        <td className="p-3">{t.date}</td>
                        <td className="p-3">{t.operation_type}</td>
                        <td className="p-3">
                           <div className="font-medium">{counterparties.find((c:any) => c.id === t.counterparty_id)?.full_name || '-'}</div>
                           <div className="text-xs text-slate-400">{projects.find((p:any) => p.id === t.project_id)?.name}</div>
                        </td>
                        <td className="p-3">
                           <div>{articles.find((a:any) => a.id === t.article_id)?.name || t.description}</div>
                           <div className="text-xs text-slate-400">{accounts.find((a:any) => a.id === t.account_from_id || a.id === t.account_to_id)?.name}</div>
                        </td>
                        <td className={`p-3 text-right font-bold ${t.operation_type === OperationType.Income ? 'text-green-600' : 'text-red-600'}`}>
                           {t.operation_type === OperationType.Income ? '+' : '-'}{t.amount.toLocaleString()}
                        </td>
                        <td className="p-3">
                           <StatusBadge status={t.status} />
                        </td>
                        <td className="p-3 text-right">
                           {t.status === TransactionStatus.Pending && isDirector && (
                              <div className="flex justify-end space-x-1">
                                 <button onClick={() => onUpdate({...t, status: TransactionStatus.Approved, approved_by: currentUser.id})} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Согласовать"><CheckCircle2 size={16}/></button>
                                 <button onClick={() => onUpdate({...t, status: TransactionStatus.Rejected})} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Отклонить"><XCircle size={16}/></button>
                              </div>
                           )}
                           {t.status === TransactionStatus.Draft && (
                               <button onClick={() => onUpdate({...t, status: TransactionStatus.Pending})} className="text-blue-600 hover:underline">Отправить</button>
                           )}
                           {t.status === TransactionStatus.Approved && (
                               <button onClick={() => onUpdate({...t, status: TransactionStatus.Paid})} className="text-blue-600 hover:underline">Оплатить</button>
                           )}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {isModalOpen && (
            <TransactionModal 
               onClose={() => setModalOpen(false)} 
               onSave={(t: Transaction) => {
                  if (editingTx) onUpdate(t);
                  else onAdd(t);
                  setModalOpen(false);
               }}
               initial={editingTx}
               counterparties={counterparties}
               projects={projects}
               articles={articles}
               accounts={accounts}
               currentUser={currentUser}
            />
         )}
      </div>
   );
};

const PaymentCalendar = ({ 
  transactions, 
  estimates, 
  projects,
  navigate
}: { 
  transactions: Transaction[]; 
  estimates: any[]; 
  projects: any[]; 
  navigate: any;
}) => {
    // Convert payment schedule to transactions
    const paymentTransactions = useMemo(() => {
        return convertPaymentScheduleToTransactions(estimates);
    }, [estimates]);

    // Combine all transactions
    const allTransactions = useMemo(() => {
        return [...transactions, ...paymentTransactions];
    }, [transactions, paymentTransactions]);

    // Group by date
    const calendar = useMemo(() => {
       const pending = allTransactions.filter(t => 
           t.status === TransactionStatus.Pending || 
           t.status === TransactionStatus.Approved
       );
       const grouped = new Map<string, (Transaction | PaymentScheduleTransaction)[]>();
       pending.forEach(t => {
           const list = grouped.get(t.date) || [];
           list.push(t);
           grouped.set(t.date, list);
       });
       return Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [allTransactions]);

    // Статистика по платежам из смет
    const paymentStats = useMemo(() => {
        const scheduleTransactions = paymentTransactions;
        const total = scheduleTransactions.length;
        const pending = scheduleTransactions.filter(t => t.status === TransactionStatus.Pending).length;
        const approved = scheduleTransactions.filter(t => t.status === TransactionStatus.Approved).length;
        const highRisk = scheduleTransactions.filter(t => t.ai_score !== undefined && t.ai_score < 50).length;
        
        return { total, pending, approved, highRisk };
    }, [paymentTransactions]);

    return (
       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-y-auto h-[600px]">
          <div className="flex justify-between items-start mb-6">
             <h3 className="font-bold text-lg">Платежный календарь (Ожидаемые операции)</h3>
             
             {/* Статистика по платежам из смет */}
             {paymentStats.total > 0 && (
                <div className="flex items-center gap-4 text-sm">
                   <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="text-slate-600">График платежей:</span>
                      <span className="font-medium">{paymentStats.total}</span>
                   </div>
                   {paymentStats.highRisk > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                         <span>⚠️</span>
                         <span>Высокий риск: {paymentStats.highRisk}</span>
                      </div>
                   )}
                </div>
             )}
          </div>
          
          <div className="space-y-6">
             {calendar.length === 0 && <div className="text-slate-400 text-center">Нет запланированных платежей</div>}
             {calendar.map(([date, items]) => (
                <div key={date} className="relative pl-6 border-l-2 border-blue-200">
                   <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                   <h4 className="font-bold text-slate-800 mb-2">{new Date(date).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                   <div className="space-y-2">
                      {items.map(t => {
                         const isPaymentSchedule = isPaymentScheduleTransaction(t);
                         const project = projects.find(p => p.id === t.project_id);
                         
                         return (
                            <div 
                               key={t.id} 
                               className={`p-3 rounded-lg border flex justify-between items-center ${
                                  isPaymentSchedule 
                                     ? 'bg-purple-50 border-purple-200' 
                                     : 'bg-slate-50 border-slate-100'
                               }`}
                            >
                               <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                     <div className="text-sm font-medium">
                                        {t.description || t.operation_type}
                                     </div>
                                     
                                     {/* Индикатор источника */}
                                     {isPaymentSchedule && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                           График платежей
                                        </span>
                                     )}
                                     
                                     {/* AI индикатор для платежей из смет */}
                                     {isPaymentSchedule && t.ai_score !== undefined && (
                                        <div className="flex items-center gap-1">
                                           <div className={`w-2 h-2 rounded-full ${
                                              t.ai_score >= 75 ? 'bg-green-500' : 
                                              t.ai_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                           }`} />
                                           <span className={`text-xs font-medium ${
                                              t.ai_score >= 75 ? 'text-green-600' : 
                                              t.ai_score >= 50 ? 'text-yellow-600' : 'text-red-600'
                                           }`}>
                                              AI {t.ai_score}/100
                                           </span>
                                        </div>
                                     )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                     <span>{t.operation_type === OperationType.Income ? 'Поступление' : 'Списание'}</span>
                                     
                                     {/* Название проекта */}
                                     {project && (
                                        <>
                                           <span>•</span>
                                           <span>{project.name}</span>
                                        </>
                                     )}
                                     
                                     {/* Процент платежа для графиков */}
                                     {isPaymentSchedule && (
                                        <>
                                           <span>•</span>
                                           <span>{t.payment_percent}%</span>
                                        </>
                                     )}
                                  </div>
                                  
                                  {/* AI риски для платежей из смет */}
                                  {isPaymentSchedule && t.ai_risk_factors && t.ai_risk_factors.length > 0 && (
                                     <div className="mt-1 flex flex-wrap gap-1">
                                        {t.ai_risk_factors.slice(0, 2).map((risk, i) => (
                                           <span key={i} className="px-1.5 py-0.5 bg-red-50 text-red-700 text-xs rounded">
                                              ⚠️ {risk}
                                           </span>
                                        ))}
                                        {t.ai_risk_factors.length > 2 && (
                                           <span className="px-1.5 py-0.5 bg-red-50 text-red-700 text-xs rounded">
                                              +{t.ai_risk_factors.length - 2}
                                           </span>
                                        )}
                                     </div>
                                  )}
                               </div>
                               
                               <div className="flex items-center gap-2">
                                  {/* Сумма */}
                                  <span className={`font-bold ${
                                     t.operation_type === OperationType.Income ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                     {t.operation_type === OperationType.Income ? '+' : '-'}{t.amount.toLocaleString()} ₽
                                  </span>
                                  
                                  {/* Кнопка перехода к смете */}
                                  {isPaymentSchedule && (
                                     <button
                                        onClick={() => {
                                           const link = `/project/${t.project_id}/estimate/${t.estimate_id}`;
                                           navigate(link);
                                        }}
                                        className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                                        title="Перейти к смете"
                                     >
                                        <Calendar size={14} />
                                     </button>
                                  )}
                                  
                                  {/* Статус */}
                                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                                     t.status === TransactionStatus.Approved 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                     {t.status === TransactionStatus.Approved ? 'Одобрено' : 'Ожидает'}
                                  </div>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                </div>
             ))}
          </div>
       </div>
    );
};

const AccountablePersonsTable = ({ data }: { data: any[] }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-bold text-lg mb-4">Подотчетные лица</h3>
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                    <th className="p-3">Сотрудник</th>
                    <th className="p-3 text-right">Выдано</th>
                    <th className="p-3 text-right">Отчитано</th>
                    <th className="p-3 text-right">Возвращено</th>
                    <th className="p-3 text-right">Текущий долг</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {data.map((p: any) => (
                    <tr key={p.id}>
                        <td className="p-3 font-medium">{p.name}</td>
                        <td className="p-3 text-right">{p.issued.toLocaleString()}</td>
                        <td className="p-3 text-right">{p.reported.toLocaleString()}</td>
                        <td className="p-3 text-right">{p.returned.toLocaleString()}</td>
                        <td className={`p-3 text-right font-bold ${p.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {p.balance.toLocaleString()}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// --- Transaction Modal (Simplified) ---
const TransactionModal = ({ onClose, onSave, initial, counterparties, projects, articles, accounts, currentUser }: any) => {
    const [form, setForm] = useState<Partial<Transaction>>(initial || {
        date: new Date().toISOString().split('T')[0],
        operation_type: OperationType.Expense,
        status: TransactionStatus.Draft,
        amount: 0,
        description: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: initial?.id || uuidv4(),
            created_by: initial?.created_by || currentUser.id,
            ...form
        } as Transaction);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{initial ? 'Редактировать операцию' : 'Новая операция'}</h3>
                    <button onClick={onClose}><XCircle size={24} className="text-slate-400"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Тип операции</label>
                            <select className="w-full p-2 border rounded" value={form.operation_type} onChange={e => setForm({...form, operation_type: e.target.value as OperationType})}>
                                {Object.values(OperationType).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Дата</label>
                            <input type="date" className="w-full p-2 border rounded" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Сумма</label>
                        <input type="number" className="w-full p-2 border rounded font-bold" value={form.amount} onChange={e => setForm({...form, amount: Number(e.target.value)})} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Контрагент</label>
                            <select className="w-full p-2 border rounded" value={form.counterparty_id || ''} onChange={e => setForm({...form, counterparty_id: e.target.value})}>
                                <option value="">Не выбран</option>
                                {counterparties.map((c:any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Проект</label>
                            <select className="w-full p-2 border rounded" value={form.project_id || ''} onChange={e => setForm({...form, project_id: e.target.value})}>
                                <option value="">Не выбран</option>
                                {projects.map((p:any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Статья ДДС</label>
                        <select className="w-full p-2 border rounded" value={form.article_id || ''} onChange={e => setForm({...form, article_id: e.target.value})}>
                            <option value="">Не выбрана</option>
                            {articles.map((a:any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Назначение платежа</label>
                        <input className="w-full p-2 border rounded" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                    </div>

                    <div className="flex space-x-2 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200">Отмена</button>
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const StatusBadge = ({ status }: { status: TransactionStatus }) => {
    const styles = {
        [TransactionStatus.Draft]: 'bg-slate-100 text-slate-600',
        [TransactionStatus.Pending]: 'bg-yellow-100 text-yellow-700',
        [TransactionStatus.Approved]: 'bg-blue-100 text-blue-700',
        [TransactionStatus.Paid]: 'bg-green-100 text-green-700',
        [TransactionStatus.Rejected]: 'bg-red-100 text-red-700'
    };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status]}`}>{status}</span>;
};