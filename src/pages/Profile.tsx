

import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { User, UserRole, UserCompany } from '../types';
import { 
  User as UserIcon, Camera, Lock, MapPin, Phone, Mail, 
  Briefcase, Send, Save, Shield, Key, Globe, Star,
  LayoutDashboard, Wallet, Award, Gift, TrendingUp, History, PlayCircle, ChevronDown, CreditCard, LogOut, Building2,
  Copy, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// Helper for Algorithmic Priority
const calculatePriority = (user: User) => {
    const stats = user.stats || { tenureDays: 0, tasksCompleted: 0, projectsCompleted: 0, profitGenerated: 0, kpiScore: 0, onTimeRate: 0 };
    
    // Weight coefficients
    const wTenure = 0.1; // 1 point per 10 days
    const wTask = 0.5;   // 0.5 point per task
    const wProfit = 0.00001; // 1 point per 100k profit
    const wKPI = 2;      // 2 points per KPI score (max 200)

    let score = (stats.tenureDays * wTenure) + (stats.tasksCompleted * wTask) + (stats.profitGenerated * wProfit) + (stats.kpiScore * wKPI);
    score = Math.min(1000, Math.round(score)); // Cap at 1000

    let tier = "Новичок";
    if (score > 200) tier = "Специалист";
    if (score > 500) tier = "Профи";
    if (score > 800) tier = "Эксперт";
    if (score > 950) tier = "Легенда";

    return { score, tier, breakdown: { wTenure, wTask, wProfit, wKPI } };
};

export const Profile = () => {
  const { currentUser, updateUser, projects, tasks } = useApp();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'training' | 'settings'>('dashboard');
  const [chartRange, setChartRange] = useState<'Week' | 'Month' | 'Year'>('Month');
  const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);
  
  const { score, tier } = calculatePriority(currentUser);

  // Mock switch company
  const handleSwitchCompany = (companyId: string) => {
      if (!currentUser.companies) return;
      const updated = currentUser.companies.map(c => ({ ...c, is_current: c.id === companyId }));
      const targetComp = updated.find(c => c.id === companyId);
      if(targetComp) {
          updateUser({ ...currentUser, companies: updated, role: targetComp.role });
          alert(`Вы переключились на ${targetComp.name}`);
      }
  };

  const currentCompany = currentUser.companies?.find(c => c.is_current);

  // Prepare Chart Data
  const chartData = useMemo(() => {
      const history = currentUser.earnings_history || [];
      if (chartRange === 'Week') return history.slice(0, 7).reverse();
      if (chartRange === 'Month') return history.slice(0, 30).reverse();
      return history.reverse(); // Simplified for year
  }, [currentUser.earnings_history, chartRange]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 h-[calc(100vh-6rem)] flex flex-col pb-8 animate-in fade-in">
      {/* Header */}
      <div className="flex-none bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
         {/* Background Decor */}
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>

         <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
             <div className="flex items-center gap-6">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-white">
                        {currentUser.avatar_initials}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full border-2 border-white shadow-sm flex items-center">
                        <Star size={12} className="mr-1 fill-yellow-900"/> {currentUser.external_rating || 5.0}
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{currentUser.name}</h1>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center px-2 py-0.5 bg-slate-100 rounded text-slate-600"><Briefcase size={14} className="mr-1"/> {currentUser.role}</span>
                        {currentUser.location && <span className="flex items-center"><MapPin size={14} className="mr-1"/> {currentUser.location}</span>}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide ${tier === 'Легенда' ? 'bg-purple-100 text-purple-700' : tier === 'Эксперт' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {tier}
                        </span>
                        <span className="text-xs text-slate-400">Score: {score}</span>
                    </div>
                </div>
             </div>

             {/* Company Switcher */}
             <div className="flex flex-col items-end">
                 <label className="text-xs font-bold text-slate-400 uppercase mb-1">Текущая компания</label>
                 <div className="relative group">
                     <button className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 transition-colors">
                         <Building2 size={18} className="text-slate-500"/>
                         <span className="font-medium text-slate-700">{currentCompany?.name || 'Не выбрано'}</span>
                         <ChevronDown size={16} className="text-slate-400"/>
                     </button>
                     {currentUser.companies && currentUser.companies.length > 1 && (
                         <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                             {currentUser.companies.map(c => (
                                 <button 
                                    key={c.id} 
                                    onClick={() => handleSwitchCompany(c.id)}
                                    className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 flex items-center justify-between ${c.is_current ? 'bg-blue-50/50 font-bold text-blue-700' : 'text-slate-600'}`}
                                 >
                                     <span>{c.name}</span>
                                     {c.is_current && <div className="w-2 h-2 bg-blue-600 rounded-full"></div>}
                                 </button>
                             ))}
                             <div className="border-t border-slate-100 p-2">
                                 <button className="w-full text-center text-xs text-blue-600 hover:underline py-1">Присоединиться к другой</button>
                             </div>
                         </div>
                     )}
                 </div>
             </div>
         </div>

         {/* Tabs */}
         <div className="flex space-x-6 mt-8 border-b border-slate-100">
            <ProfileTab label="Обзор" icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <ProfileTab label="История работ" icon={History} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
            <ProfileTab label="Обучение" icon={PlayCircle} active={activeTab === 'training'} onClick={() => setActiveTab('training')} />
            <ProfileTab label="Настройки" icon={UserIcon} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
         {/* --- DASHBOARD TAB --- */}
         {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Left Column: Stats */}
                 <div className="lg:col-span-2 space-y-6">
                     {/* Income Chart */}
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <div className="flex justify-between items-center mb-6">
                             <div>
                                 <h3 className="text-lg font-bold text-slate-800">Доходы</h3>
                                 <p className="text-sm text-slate-500">Динамика заработка</p>
                             </div>
                             <div className="flex bg-slate-100 p-1 rounded-lg">
                                 {['Week', 'Month', 'Year'].map((r: any) => (
                                     <button 
                                        key={r} 
                                        onClick={() => setChartRange(r)} 
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartRange === r ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                                     >
                                         {r === 'Week' ? 'Неделя' : r === 'Month' ? 'Месяц' : 'Год'}
                                     </button>
                                 ))}
                             </div>
                         </div>
                         <div className="h-64 w-full">
                             <ResponsiveContainer width="100%" height="100%">
                                 <AreaChart data={chartData}>
                                     <defs>
                                         <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                             <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                                             <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                         </linearGradient>
                                     </defs>
                                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                     <XAxis dataKey="date" hide />
                                     <YAxis hide />
                                     <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(val: number) => [`${val.toLocaleString()} ₽`, 'Доход']}
                                     />
                                     <Area type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                 </AreaChart>
                             </ResponsiveContainer>
                         </div>
                     </div>

                     {/* Internal Priority Breakdown */}
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                         <div className="flex justify-between items-start mb-4 relative z-10">
                             <div>
                                 <h3 className="text-lg font-bold text-slate-800 flex items-center"><Award size={20} className="mr-2 text-amber-500"/> Внутренний Рейтинг</h3>
                                 <p className="text-sm text-slate-500">Влияет на распределение выгодных заказов</p>
                             </div>
                             <div className="text-right">
                                 <div className="text-3xl font-black text-slate-800">{score}<span className="text-base text-slate-400 font-normal">/1000</span></div>
                                 <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">{tier}</div>
                             </div>
                         </div>
                         
                         {/* Progress Bar */}
                         <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-6 relative z-10">
                             <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000" style={{ width: `${score / 10}%` }}></div>
                         </div>

                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
                             <StatBox label="Стаж (дней)" value={currentUser.stats?.tenureDays || 0} subtext="+ очки за лояльность" />
                             <StatBox label="Выполнено задач" value={currentUser.stats?.tasksCompleted || 0} subtext="активность" />
                             <StatBox label="KPI Оценка" value={currentUser.stats?.kpiScore || 0} subtext="качество работы" />
                             <StatBox label="Прибыль (млн)" value={((currentUser.stats?.profitGenerated || 0) / 1000000).toFixed(1)} subtext="финансовый вклад" />
                         </div>
                         
                         {/* Background Effect */}
                         <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-amber-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
                     </div>
                 </div>

                 {/* Right Column: Wallet & Referrals */}
                 <div className="space-y-6">
                     {/* Wallet */}
                     <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-xl relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet size={64}/></div>
                         <h3 className="text-sm font-medium text-slate-400 mb-1">Текущий баланс</h3>
                         <div className="text-3xl font-bold mb-6">{currentUser.balance?.toLocaleString()} ₽</div>
                         
                         <button 
                            onClick={() => setWithdrawModalOpen(true)}
                            className="w-full py-3 bg-white text-slate-900 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center justify-center"
                         >
                             <CreditCard size={18} className="mr-2"/> Вывести средства
                         </button>
                         <p className="text-xs text-center text-slate-500 mt-3">Комиссия 0% на карты партнеров</p>
                     </div>

                     {/* Referral */}
                     <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                         <div className="flex items-center space-x-2 mb-4">
                             <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Gift size={20}/></div>
                             <h3 className="font-bold text-slate-800">Реферальная программа</h3>
                         </div>
                         <p className="text-sm text-slate-500 mb-4">Приглашайте коллег и получайте 1% от их заработка в первый месяц.</p>
                         
                         <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex justify-between items-center mb-4">
                             <code className="text-slate-700 font-mono font-bold">{currentUser.referral_code || 'CODE123'}</code>
                             <button className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-blue-600 transition-colors" title="Копировать"><Copy size={16}/></button>
                         </div>

                         <div className="flex justify-between text-sm border-t border-slate-100 pt-4">
                             <div>
                                 <div className="text-slate-400 text-xs">Приглашено</div>
                                 <div className="font-bold text-slate-800">{currentUser.referral_count || 0} чел.</div>
                             </div>
                             <div className="text-right">
                                 <div className="text-slate-400 text-xs">Заработано</div>
                                 <div className="font-bold text-green-600">+{currentUser.referral_balance?.toLocaleString() || 0} ₽</div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
         )}

         {/* --- HISTORY TAB --- */}
         {activeTab === 'history' && (
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <div className="p-4 border-b border-slate-100 bg-slate-50">
                     <h3 className="font-bold text-slate-800">История проектов и задач</h3>
                 </div>
                 <div className="divide-y divide-slate-100">
                     {projects.slice(0, 5).map(p => (
                         <div key={p.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center">
                             <div>
                                 <div className="font-bold text-slate-800">{p.name}</div>
                                 <div className="text-sm text-slate-500">{p.address}</div>
                                 <div className="flex gap-2 mt-1">
                                     <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Роль: {currentUser.role}</span>
                                     {p.status === 'Завершен' && <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded">Успешно</span>}
                                 </div>
                             </div>
                             <div className="text-right">
                                 <div className="text-sm font-medium text-slate-600">{p.contract_date}</div>
                                 {/* Mock profit share */}
                                 <div className="text-xs text-green-600 font-bold">+{(Math.random() * 50000).toFixed(0)} ₽</div>
                             </div>
                         </div>
                     ))}
                     {projects.length === 0 && <div className="p-8 text-center text-slate-400">История пуста</div>}
                 </div>
             </div>
         )}

         {/* --- TRAINING TAB --- */}
         {activeTab === 'training' && (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                     { title: 'Работа с приложением', duration: '15 мин', type: 'Video' },
                     { title: 'Техника безопасности на высоте', duration: '45 мин', type: 'Course' },
                     { title: 'Заполнение актов КС-2', duration: '10 мин', type: 'Article' },
                     { title: 'Стандарты качества компании', duration: '30 мин', type: 'Video' }
                 ].map((item, i) => (
                     <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                         <div className="h-32 bg-slate-200 relative flex items-center justify-center">
                             <PlayCircle size={48} className="text-white opacity-80 group-hover:scale-110 transition-transform"/>
                         </div>
                         <div className="p-4">
                             <div className="flex justify-between items-start mb-2">
                                 <span className="text-xs font-bold text-blue-600 uppercase">{item.type}</span>
                                 <span className="text-xs text-slate-400">{item.duration}</span>
                             </div>
                             <h4 className="font-bold text-slate-800">{item.title}</h4>
                         </div>
                     </div>
                 ))}
             </div>
         )}

         {/* --- SETTINGS TAB --- */}
         {activeTab === 'settings' && (
             <ProfileSettingsForm currentUser={currentUser} updateUser={updateUser} />
         )}
      </div>

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800">Вывод средств</h3>
                      <button onClick={() => setWithdrawModalOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg mb-6 flex justify-between items-center">
                      <span className="text-slate-600">Доступно:</span>
                      <span className="font-bold text-xl">{currentUser.balance?.toLocaleString()} ₽</span>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Способ вывода</label>
                          <select className="w-full p-3 border border-slate-300 rounded-lg bg-white">
                              <option>Карта Сбербанк (*4242)</option>
                              <option>СБП (по номеру телефона)</option>
                              <option>Расчетный счет ИП</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Сумма</label>
                          <input type="number" className="w-full p-3 border border-slate-300 rounded-lg" placeholder="0.00" />
                      </div>
                      <button 
                        onClick={() => { alert('Заявка на вывод создана!'); setWithdrawModalOpen(false); }}
                        className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                      >
                          Подтвердить
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const ProfileTab = ({ label, icon: Icon, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={clsx(
            "flex items-center space-x-2 pb-3 border-b-2 transition-colors",
            active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
        )}
    >
        <Icon size={18} />
        <span className="font-medium">{label}</span>
    </button>
);

const StatBox = ({ label, value, subtext }: any) => (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div className="text-xs text-slate-500 font-bold uppercase">{label}</div>
        <div className="text-lg font-black text-slate-800 my-1">{value}</div>
        <div className="text-[10px] text-slate-400">{subtext}</div>
    </div>
);

const ProfileSettingsForm = ({ currentUser, updateUser }: { currentUser: User, updateUser: (u: User) => void }) => {
    const [form, setForm] = useState({ ...currentUser });
    const [skillsInput, setSkillsInput] = useState('');

    const handleSave = () => {
        updateUser(form);
        alert('Профиль обновлен!');
    };

    const handleAddSkill = () => {
        if (skillsInput.trim()) {
            setForm(prev => ({ ...prev, skills: [...(prev.skills || []), skillsInput.trim()] }));
            setSkillsInput('');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">ФИО</label>
                    <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                    <input value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Телефон</label>
                    <input value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="+7 (999) 000-00-00"/>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Город</label>
                    <input value={form.location || ''} onChange={e => setForm({...form, location: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">О себе (Био)</label>
                    <textarea rows={3} value={form.bio || ''} onChange={e => setForm({...form, bio: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Опыт, специализация..."/>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Навыки</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {form.skills?.map(skill => (
                            <span key={skill} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm flex items-center">
                                {skill}
                                <button onClick={() => setForm(prev => ({ ...prev, skills: prev.skills?.filter(s => s !== skill) }))} className="ml-2 text-slate-400 hover:text-red-500">×</button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input value={skillsInput} onChange={e => setSkillsInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSkill()} className="flex-1 p-2 border rounded-lg text-sm" placeholder="Добавить навык" />
                        <button onClick={handleAddSkill} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold">+</button>
                    </div>
                </div>
            </div>
            <div className="pt-4 flex justify-end">
                <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center">
                    <Save size={18} className="mr-2"/> Сохранить изменения
                </button>
            </div>
        </div>
    );
};
