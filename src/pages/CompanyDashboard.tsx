import React from 'react';
import { useApp } from '../App'; // Still need currentUser
import { Wallet, TrendingUp, Building2, ArrowUpRight, ArrowDownLeft, Activity, Loader2 } from 'lucide-react';
import { PaymentDirection, UserRole, ProjectStatus } from '../types';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFinanceStats, useTransactions } from '../hooks/useFinance';
import { useProjects } from '../hooks/useProjects';

export const CompanyDashboard = () => {
  const { currentUser } = useApp(); // Keep currentUser from context
  const navigate = useNavigate();

  // Data Fetching
  const { data: stats, isLoading: isStatsLoading } = useFinanceStats();
  const { data: recentTransactions, isLoading: isTxLoading } = useTransactions({ limit: 5 });
  const { data: projectsData, isLoading: isProjectsLoading } = useProjects({ limit: 1000 }); // Fetch all for count, optimize later

  const isDirectorOrAdmin = [UserRole.Director, UserRole.Admin].includes(currentUser?.role || UserRole.Director);

  if (!currentUser) return <Loader2 className="animate-spin mx-auto mt-10" />;

  if (!isDirectorOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-slate-500">
        <Activity size={64} className="mb-4 opacity-20" />
        <h1 className="text-2xl font-bold text-slate-700">Добро пожаловать, {currentUser.name}</h1>
        <p className="mb-6">Перейдите в раздел "Проекты" для начала работы.</p>
        <button 
          onClick={() => navigate('/projects')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          К списку проектов
        </button>
      </div>
    );
  }

  const balance = stats?.balance || 0;
  // Receivables calculation requires Acts which are not yet API-enabled. 
  // Setting to 0 for now or we can use a separate hook later.
  const receivables = 0; 

  // Calculate active projects from API data
  const activeProjectsCount = projectsData?.data?.filter(p => p.status === ProjectStatus.Active).length || 0;

  // Chart Data
  const chartData = [
    { name: 'План', income: 12000000, expense: 8500000 }, // TODO: Fetch planned values
    { name: 'Факт', income: stats?.income || 0, expense: stats?.expense || 0 },
  ];

  const isLoading = isStatsLoading || isTxLoading || isProjectsLoading;

  if (isLoading) {
      return (
          <div className="flex justify-center items-center h-64">
              <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <h1 className="text-2xl font-bold text-slate-800">Глобальный Дашборд Компании</h1>
      
      {/* Global Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
            <div className={`p-4 rounded-full ${balance >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <Wallet size={24} />
            </div>
            <div>
                <p className="text-slate-500 text-sm font-medium">Баланс в кассе</p>
                <h3 className="text-2xl font-bold text-slate-800">{balance.toLocaleString('ru-RU')} ₽</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
            <div className="p-4 rounded-full bg-blue-100 text-blue-600">
                <TrendingUp size={24} />
            </div>
            <div>
                <p className="text-slate-500 text-sm font-medium">Дебиторская задолженность</p>
                <h3 className="text-2xl font-bold text-slate-800">{receivables.toLocaleString('ru-RU')} ₽</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/projects')}>
            <div className="p-4 rounded-full bg-indigo-100 text-indigo-600">
                <Building2 size={24} />
            </div>
            <div>
                <p className="text-slate-500 text-sm font-medium">Активные проекты</p>
                <h3 className="text-2xl font-bold text-slate-800">{activeProjectsCount}</h3>
            </div>
          </div>
      </div>

      {/* Financial Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Сводка Приход / Расход</h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000000}M`} />
                  <Tooltip formatter={(val: number) => val.toLocaleString('ru-RU') + ' ₽'} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="income" name="Приход" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Расход" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Последние операции</h3>
           <div className="space-y-4 overflow-y-auto max-h-64 pr-2">
              {recentTransactions?.map(p => (
                 <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                       <div className={`p-2 rounded-full ${p.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {p.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                       </div>
                       <div>
                          <div className="text-sm font-medium text-slate-800">{p.description || 'Без описания'}</div>
                          <div className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString('ru-RU')}</div>
                       </div>
                    </div>
                    <span className={`font-bold text-sm ${p.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                       {p.type === 'income' ? '+' : '-'}{p.amount.toLocaleString('ru-RU')} ₽
                    </span>
                 </div>
              ))}
              {recentTransactions?.length === 0 && <p className="text-center text-slate-400 text-sm">Нет операций</p>}
           </div>
        </div>
      </div>
    </div>
  );
};