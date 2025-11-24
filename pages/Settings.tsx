
import React, { useState, useRef } from 'react';
import { useApp } from '../App';
import { UserRole, User, CompanySettings, AIConfiguration, AIProviderConfig, AITaskType, LLMProvider, DesignStyleConfig } from '../types';
import { 
  Users, Shield, Search, Edit2, Lock, Unlock, 
  Building2, Save, Sparkles, Key, Server, MessageSquare, Brain, BarChart,
  CheckCircle2, AlertTriangle, Palette, Plus, X, Trash2, ListChecks, Copy
} from 'lucide-react';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';

export const Settings = () => {
  const { updateUser, currentUser, companySettings, updateCompanySettings, aiConfig, updateAIConfig } = useApp();
  const isAdmin = currentUser.role === UserRole.Admin || currentUser.role === UserRole.Director;
  const [activeTab, setActiveTab] = useState<'general' | 'users' | 'ai'>('general');

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Shield size={64} className="mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-slate-700">Доступ запрещен</h2>
        <p>Только Администраторы и Директора имеют доступ к настройкам.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <h1 className="text-2xl font-bold text-slate-800 flex-none">Настройки и Администрирование</h1>

      {/* Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm flex-none w-fit">
         <TabButton label="Общие" icon={Building2} active={activeTab === 'general'} onClick={() => setActiveTab('general')} />
         <TabButton label="Пользователи" icon={Users} active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
         <TabButton label="AI и Интеграции" icon={Sparkles} active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
         {activeTab === 'general' && (
            <GeneralSettings settings={companySettings} onSave={updateCompanySettings} />
         )}
         {activeTab === 'users' && (
            <UsersManagement />
         )}
         {activeTab === 'ai' && (
            <AISettings config={aiConfig} onSave={updateAIConfig} />
         )}
      </div>
    </div>
  );
};

// --- 1. General Settings ---
const GeneralSettings = ({ settings, onSave }: { settings: CompanySettings, onSave: (s: CompanySettings) => void }) => {
   const [form, setForm] = useState(settings);
   const [styleForm, setStyleForm] = useState({ name: '', prompt: '' });
   const [editingStyleId, setEditingStyleId] = useState<string | null>(null);

   const handleChange = (key: keyof CompanySettings, val: string) => setForm({ ...form, [key]: val });

   const addOrUpdateStyle = () => {
      if (!styleForm.name.trim()) return;
      
      let newStyles = [...(form.designStyles || [])];
      if (editingStyleId) {
          newStyles = newStyles.map(s => s.id === editingStyleId ? { ...s, name: styleForm.name, prompt: styleForm.prompt } : s);
          setEditingStyleId(null);
      } else {
          newStyles.push({
              id: uuidv4(),
              name: styleForm.name,
              prompt: styleForm.prompt
          });
      }
      setForm({ ...form, designStyles: newStyles });
      setStyleForm({ name: '', prompt: '' });
   };

   const removeStyle = (id: string) => {
      setForm({ ...form, designStyles: (form.designStyles || []).filter(s => s.id !== id) });
   };

   const startEditStyle = (style: DesignStyleConfig) => {
       setEditingStyleId(style.id);
       setStyleForm({ name: style.name, prompt: style.prompt });
   };

   const cancelEditStyle = () => {
       setEditingStyleId(null);
       setStyleForm({ name: '', prompt: '' });
   };

   return (
      <div className="max-w-4xl space-y-6 pb-10">
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Building2 size={20} className="mr-2 text-blue-600"/> Реквизиты Компании</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Название организации</label>
                  <input className="w-full p-2 border rounded-lg" value={form.name} onChange={e => handleChange('name', e.target.value)} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ИНН</label>
                  <input className="w-full p-2 border rounded-lg" value={form.taxId} onChange={e => handleChange('taxId', e.target.value)} />
               </div>
               <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Юридический адрес</label>
                  <input className="w-full p-2 border rounded-lg" value={form.address} onChange={e => handleChange('address', e.target.value)} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input className="w-full p-2 border rounded-lg" value={form.email} onChange={e => handleChange('email', e.target.value)} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Телефон</label>
                  <input className="w-full p-2 border rounded-lg" value={form.phone} onChange={e => handleChange('phone', e.target.value)} />
               </div>
               <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Банковские реквизиты</label>
                  <textarea rows={3} className="w-full p-2 border rounded-lg" value={form.bankDetails || ''} onChange={e => handleChange('bankDetails', e.target.value)} />
               </div>
            </div>
         </div>

         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><Palette size={20} className="mr-2 text-purple-600"/> Настройки Дизайна (AI)</h3>
            <p className="text-sm text-slate-500 mb-4">Настройте стили интерьера для генератора изображений. "Системный Промпт" добавляется к запросу пользователя для формирования нужного стиля.</p>
            
            <div className="space-y-3 mb-6">
               {(form.designStyles || []).map(style => (
                  <div key={style.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg bg-slate-50 hover:bg-white hover:shadow-sm transition-all">
                     <div>
                        <div className="font-bold text-sm text-slate-800">{style.name}</div>
                        <div className="text-xs text-slate-500 mt-1 font-mono line-clamp-1">{style.prompt}</div>
                     </div>
                     <div className="flex space-x-2">
                        <button onClick={() => startEditStyle(style)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14}/></button>
                        <button onClick={() => removeStyle(style.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                     </div>
                  </div>
               ))}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-3">{editingStyleId ? 'Редактировать стиль' : 'Добавить новый стиль'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <input 
                            className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-purple-500" 
                            placeholder="Название (напр. Скандинавский)" 
                            value={styleForm.name}
                            onChange={e => setStyleForm({...styleForm, name: e.target.value})}
                        />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                        <input 
                            className="flex-1 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-purple-500 font-mono" 
                            placeholder="Системный промпт (напр. interior design, scandinavian style...)" 
                            value={styleForm.prompt}
                            onChange={e => setStyleForm({...styleForm, prompt: e.target.value})}
                            onKeyDown={e => e.key === 'Enter' && addOrUpdateStyle()}
                        />
                        {editingStyleId && (
                            <button onClick={cancelEditStyle} className="px-3 py-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><X size={18}/></button>
                        )}
                        <button onClick={addOrUpdateStyle} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50" disabled={!styleForm.name}>
                            {editingStyleId ? <Save size={18}/> : <Plus size={18}/>}
                        </button>
                    </div>
                </div>
            </div>
         </div>

         <div className="flex justify-end">
            <button onClick={() => onSave(form)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center shadow-lg shadow-blue-200">
               <Save size={18} className="mr-2" /> Сохранить изменения
            </button>
         </div>
      </div>
   );
};

// --- 2. Users Management (Updated) ---
const UsersManagement = () => {
   const { users, updateUser, addUser } = useApp();
   const [searchTerm, setSearchTerm] = useState('');
   const [isAddModalOpen, setIsAddModalOpen] = useState(false);

   const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
   );

   return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[700px]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div className="relative w-64">
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск сотрудника..." 
                className="w-full pl-9 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" 
              />
           </div>
           <button 
             onClick={() => setIsAddModalOpen(true)}
             className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center shadow-sm"
           >
              <Plus size={16} className="mr-2" /> Добавить сотрудника
           </button>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
              <tr>
                <th className="p-4">Сотрудник</th>
                <th className="p-4">Email</th>
                <th className="p-4">Роль</th>
                <th className="p-4">Статус</th>
                <th className="p-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                        {user.avatar_initials}
                      </div>
                      <span className="font-medium text-slate-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-slate-500">{user.email || '-'}</td>
                  <td className="p-4">
                    <select 
                      value={user.role} 
                      onChange={(e) => updateUser({ ...user, role: e.target.value as UserRole })}
                      className="p-1 border border-slate-300 rounded text-sm bg-white outline-none focus:border-blue-500"
                    >
                      {Object.values(UserRole).map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-4">
                    {user.is_active ? (
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Активен</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">Заблокирован</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => updateUser({ ...user, is_active: !user.is_active })}
                      className={`p-2 rounded hover:bg-slate-200 text-slate-500 ${!user.is_active ? 'text-green-600' : 'text-red-600'}`}
                      title={user.is_active ? "Заблокировать" : "Разблокировать"}
                    >
                      {user.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                 <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">Сотрудники не найдены</td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>

        {isAddModalOpen && (
           <AddUserModal 
              onClose={() => setIsAddModalOpen(false)} 
              onSave={(user) => { addUser(user); setIsAddModalOpen(false); }} 
           />
        )}
      </div>
   );
};

const AddUserModal = ({ onClose, onSave }: { onClose: () => void, onSave: (u: User) => void }) => {
    const [form, setForm] = useState({
        name: '',
        email: '',
        role: UserRole.Manager // Default role
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newUser: User = {
            id: uuidv4(),
            name: form.name,
            email: form.email,
            role: form.role,
            avatar_initials: form.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
            is_active: true,
            companies: [{ id: 'comp-1', name: 'ООО "Строй-Контроль"', role: form.role, is_current: true }]
        };
        onSave(newUser);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Добавить сотрудника</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">ФИО</label>
                        <input 
                            required 
                            value={form.name} 
                            onChange={e => setForm({...form, name: e.target.value})} 
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                            placeholder="Иванов Иван Иванович"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input 
                            type="email"
                            required 
                            value={form.email} 
                            onChange={e => setForm({...form, email: e.target.value})} 
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                            placeholder="ivan@company.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Роль</label>
                        <select 
                            value={form.role} 
                            onChange={e => setForm({...form, role: e.target.value as UserRole})} 
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                        >
                            {Object.values(UserRole).map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex space-x-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200">Отмена</button>
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Добавить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TASK_META: Record<AITaskType, { title: string; description: string; icon: React.ComponentType<{ size?: number }>; }> = {
  chat: { title: 'Чат-ассистент', description: 'Диалоги и быстрые ответы', icon: MessageSquare },
  estimate_analysis: { title: 'Анализ смет', description: 'Проверка позиций и цен', icon: Brain },
  risk_assessment: { title: 'Оценка рисков', description: 'События и финансовые риски', icon: AlertTriangle },
  generation: { title: 'Генерация контента', description: 'Письма, КП и описания', icon: Sparkles }
};

// --- 3. AI Settings (New) ---
const AISettings = ({ config, onSave }: { config: AIConfiguration, onSave: (c: AIConfiguration) => void }) => {
   const [localConfig, setLocalConfig] = useState(config);
   const [activeSection, setActiveSection] = useState<'providers' | 'models' | 'prompts'>('providers');
   const [modelDrafts, setModelDrafts] = useState<Record<string, string>>({});
   const [isAddProviderModalOpen, setIsAddProviderModalOpen] = useState(false);
   const initialPromptsRef = useRef(config.prompts);

   const enabledProviders = localConfig.providers.filter(p => p.enabled);

   const handleProviderChange = (id: string, field: keyof AIProviderConfig, value: any) => {
      const newProviders = localConfig.providers.map(p => p.id === id ? { ...p, [field]: value } : p);
      setLocalConfig({ ...localConfig, providers: newProviders });
   };

   const handleAddProvider = (provider: AIProviderConfig) => {
      setLocalConfig(prev => ({
         ...prev,
         providers: [...prev.providers, provider]
      }));
   };

   const handleRemoveProvider = (id: string) => {
      const provider = localConfig.providers.find(p => p.id === id);
      if (!provider?.isCustom) return;
      setLocalConfig(prev => ({
         ...prev,
         providers: prev.providers.filter(p => p.id !== id)
      }));
   };

   const handleTaskModelChange = (task: AITaskType, providerId: string, modelId: string) => {
      setLocalConfig(prev => ({
         ...prev,
         taskDefaults: {
            ...prev.taskDefaults,
            [task]: { providerId, modelId }
         }
      }));
   };

   const handleCloneTaskModel = (target: AITaskType, source: AITaskType) => {
      if (target === source) return;
      const sourceCfg = localConfig.taskDefaults[source];
      if (!sourceCfg) return;
      handleTaskModelChange(target, sourceCfg.providerId, sourceCfg.modelId);
   };

   const handlePromptChange = (key: keyof AIConfiguration['prompts'], value: string) => {
      setLocalConfig(prev => ({
         ...prev,
         prompts: { ...prev.prompts, [key]: value }
      }));
   };

   const resetPrompt = (key: keyof AIConfiguration['prompts']) => {
      const defaultValue = initialPromptsRef.current[key] || '';
      handlePromptChange(key, defaultValue);
   };

   const handleAddModel = (providerId: string) => {
      const draft = (modelDrafts[providerId] || '').trim();
      if (!draft) return;
      const provider = localConfig.providers.find(p => p.id === providerId);
      if (!provider) return;
      if (provider.models.includes(draft)) {
         setModelDrafts(prev => ({ ...prev, [providerId]: '' }));
         return;
      }
      handleProviderChange(providerId, 'models', [...provider.models, draft]);
      setModelDrafts(prev => ({ ...prev, [providerId]: '' }));
   };

   const handleRemoveModel = (providerId: string, model: string) => {
      const provider = localConfig.providers.find(p => p.id === providerId);
      if (!provider) return;
      handleProviderChange(providerId, 'models', provider.models.filter(m => m !== model));
   };

   const sections = [
      {
         id: 'providers',
         label: 'Провайдеры и ключи',
         description: 'API ключи, endpoints и список моделей',
         badge: `${enabledProviders.length}/${localConfig.providers.length}`
      },
      {
         id: 'models',
         label: 'Задачи и модели',
         description: 'Какая модель обрабатывает каждую задачу',
         badge: String(Object.keys(localConfig.taskDefaults).length)
      },
      {
         id: 'prompts',
         label: 'Системные промпты',
         description: 'Инструкции и тон общения для ассистентов',
         badge: String(Object.keys(localConfig.prompts).length)
      }
   ] as const;

   const save = () => onSave(localConfig);

   const promptBlocks: { key: keyof AIConfiguration['prompts']; title: string; description: string }[] = [
      { key: 'chat_system', title: 'Системный промпт: Чат', description: 'Определяет тон общения и ограничения ассистента.' },
      { key: 'estimate_analysis_system', title: 'Системный промпт: Сметчик', description: 'На что обращать внимание при анализе смет.' },
      { key: 'risk_assessment_system', title: 'Системный промпт: Риск-менеджер', description: 'Методика выявления рисков проекта.' }
   ];

   return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
         <div className="flex flex-col lg:flex-row gap-6 p-4 lg:p-6">
            <aside className="lg:w-72 space-y-3">
               {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${activeSection === section.id ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm' : 'border-slate-200 hover:border-blue-200'}`}
                  >
                    <div>
                      <p className="font-semibold">{section.label}</p>
                      <p className="text-xs text-slate-500">{section.description}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-white text-slate-500 border border-slate-200">
                      {section.badge}
                    </span>
                  </button>
               ))}

               <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-500 uppercase flex items-center"><ListChecks size={14} className="mr-2" /> Сводка задач</div>
                  <div className="space-y-2">
                     {(Object.keys(localConfig.taskDefaults) as AITaskType[]).map(task => {
                        const summary = localConfig.taskDefaults[task];
                        const providerName = localConfig.providers.find(p => p.id === summary.providerId)?.name || summary.providerId;
                        return (
                           <div key={task} className="flex items-center justify-between text-xs bg-white rounded-lg border border-slate-200 px-3 py-2">
                              <span className="font-medium text-slate-600">{TASK_META[task].title}</span>
                              <span className="text-slate-500">{providerName} · {summary.modelId}</span>
                           </div>
                        );
                     })}
                  </div>
               </div>
            </aside>

            <div className="flex-1 space-y-6">
               {activeSection === 'providers' && (
                  <div className="space-y-6">
                     <div className="flex justify-between items-center">
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex-1">
                           Подключите только необходимые провайдеры: отключенные не будут использоваться в счётчиках. Для OpenRouter, Ollama и Custom укажите собственный Base URL.
                        </div>
                        <button 
                           onClick={() => setIsAddProviderModalOpen(true)}
                           className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center shadow-sm whitespace-nowrap"
                        >
                           <Plus size={18} className="mr-2" /> Добавить провайдера
                        </button>
                     </div>
                     {localConfig.providers.map(provider => (
                        <div key={provider.id} className={`p-5 rounded-2xl border transition-all ${provider.enabled ? 'border-blue-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50 opacity-80'}`}>
                           <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3 flex-1">
                                 <div className={`p-2 rounded-lg ${provider.enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {provider.providerType === 'openai' || provider.providerType === 'anthropic' ? <Sparkles size={20} /> : <Server size={20} />}
                                 </div>
                                 <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                       <h4 className="font-bold text-slate-800">{provider.name}</h4>
                                       {provider.isCustom && (
                                          <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700 font-medium">Пользовательский</span>
                                       )}
                                    </div>
                                    <p className="text-xs text-slate-500">
                                       Тип: {provider.providerType} · {provider.models.length ? provider.models.join(', ') : 'Модели не заданы'}
                                    </p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 {provider.isCustom && (
                                    <button 
                                       onClick={() => handleRemoveProvider(provider.id)}
                                       className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                       title="Удалить провайдера"
                                    >
                                       <Trash2 size={18} />
                                    </button>
                                 )}
                                 <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={provider.enabled} onChange={e => handleProviderChange(provider.id, 'enabled', e.target.checked)} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                 </label>
                              </div>
                           </div>

                           {provider.enabled && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 fade-in">
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center"><Key size={12} className="mr-1"/> API Key</label>
                                    <input 
                                       type="password" 
                                       className="w-full p-2 border rounded-lg text-sm" 
                                       placeholder={`sk-...`} 
                                       value={provider.apiKey || ''} 
                                       onChange={e => handleProviderChange(provider.id, 'apiKey', e.target.value)} 
                                    />
                                 </div>
                                 {(provider.providerType === 'ollama' || provider.providerType === 'openrouter' || provider.providerType === 'custom') && (
                                    <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base URL</label>
                                       <input 
                                          type="text" 
                                          className="w-full p-2 border rounded-lg text-sm" 
                                          placeholder="https://api.example.com/v1" 
                                          value={provider.baseUrl || ''} 
                                          onChange={e => handleProviderChange(provider.id, 'baseUrl', e.target.value)} 
                                       />
                                    </div>
                                 )}
                                 <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Модели</label>
                                    <div className="flex flex-wrap gap-2">
                                       {provider.models.map(model => (
                                          <span key={model} className="px-3 py-1 rounded-full border border-blue-200 text-blue-600 text-xs flex items-center">
                                             {model}
                                             <button type="button" className="ml-2 text-blue-500 hover:text-blue-700" onClick={() => handleRemoveModel(provider.id, model)}>
                                                <X size={12} />
                                             </button>
                                          </span>
                                       ))}
                                       <div className="flex items-center space-x-2">
                                          <input
                                            type="text"
                                            className="px-3 py-1 border border-slate-200 rounded-lg text-sm"
                                            placeholder="gpt-4o-mini"
                                            value={modelDrafts[provider.id] || ''}
                                            onChange={e => setModelDrafts(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                          />
                                          <button type="button" className="px-2 py-1 rounded-lg bg-blue-600 text-white text-xs" onClick={() => handleAddModel(provider.id)}>
                                             <Plus size={14} />
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               )}

               {activeSection === 'models' && (
                  <div className="space-y-6">
                     <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start space-x-3">
                        <Brain className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                        <div className="text-sm text-blue-800">
                           <p className="font-bold mb-1">Маршрутизация задач</p>
                           <p>Свяжите каждую задачу с нужным провайдером и моделью. Можете копировать настройки между задачами.</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(Object.keys(localConfig.taskDefaults) as AITaskType[]).map(task => {
                           const summary = localConfig.taskDefaults[task];
                           const Icon = TASK_META[task].icon;
                           const providerName = localConfig.providers.find(p => p.id === summary.providerId)?.name || summary.providerId;
                           return (
                              <div key={task} className="border border-slate-200 rounded-xl p-3 text-sm flex items-center justify-between bg-slate-50">
                                 <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600">
                                       <Icon size={16} />
                                    </div>
                                    <div>
                                       <p className="font-semibold text-slate-700">{TASK_META[task].title}</p>
                                       <p className="text-xs text-slate-500">{TASK_META[task].description}</p>
                                    </div>
                                 </div>
                                 <span className="text-xs text-slate-500">{providerName} · {summary.modelId}</span>
                              </div>
                           );
                        })}
                     </div>

                      { (Object.keys(localConfig.taskDefaults) as AITaskType[]).map(task => {
                         const taskMeta = TASK_META[task];
                         return (
                            <React.Fragment key={task}>
                               <TaskModelSelector
                                  meta={taskMeta}
                                  task={task}
                                  config={localConfig}
                                  onChange={handleTaskModelChange}
                                  onClone={handleCloneTaskModel}
                               />
                            </React.Fragment>
                         );
                      })}
                     </div>
                     )}

               {activeSection === 'prompts' && (
                  <div className="space-y-4">
                     {promptBlocks.map(block => (
                        <details key={block.key} className="border border-slate-200 rounded-2xl bg-slate-50" open>
                           <summary className="cursor-pointer select-none px-4 py-3 flex items-center justify-between">
                              <div>
                                 <p className="font-semibold text-slate-800">{block.title}</p>
                                 <p className="text-xs text-slate-500">{block.description}</p>
                              </div>
                              <span className="text-xs text-slate-400">{localConfig.prompts[block.key].length} символов</span>
                           </summary>
                           <div className="px-4 pb-4 space-y-3">
                              <textarea
                                className="w-full p-3 border border-slate-200 rounded-xl text-sm bg-white focus:border-blue-400 outline-none min-h-[150px]"
                                value={localConfig.prompts[block.key]}
                                onChange={e => handlePromptChange(block.key, e.target.value)}
                              />
                              <div className="flex justify-between text-xs text-slate-500">
                                 <span>Сохраняется локально до нажатия «Сохранить»</span>
                                 <button type="button" className="text-blue-600 font-semibold flex items-center space-x-1" onClick={() => resetPrompt(block.key)}>
                                    <Copy size={12} />
                                    <span>Вернуть исходный текст</span>
                                 </button>
                              </div>
                           </div>
                        </details>
                     ))}
                  </div>
               )}
            </div>
         </div>

         <div className="border-t border-slate-200 bg-slate-50 px-4 lg:px-6 py-4 flex justify-end rounded-b-2xl">
            <button onClick={save} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 flex items-center shadow-lg shadow-green-200 transition-all hover:scale-105">
               <CheckCircle2 size={20} className="mr-2" /> Сохранить настройки AI
            </button>
         </div>
         
         {isAddProviderModalOpen && (
            <AddProviderModal 
               onClose={() => setIsAddProviderModalOpen(false)} 
               onSave={(provider) => { 
                  handleAddProvider(provider); 
                  setIsAddProviderModalOpen(false); 
               }} 
            />
         )}
      </div>
   );
};

const TaskModelSelector = ({
  meta,
  task,
  config,
  onChange,
  onClone
}: {
  meta: { title: string; description: string; icon: React.ComponentType<{ size?: number }> };
  task: AITaskType;
  config: AIConfiguration;
  onChange: (task: AITaskType, providerId: string, modelId: string) => void;
  onClone: (target: AITaskType, source: AITaskType) => void;
}) => {
   const activeProviderId = config.taskDefaults[task].providerId;
   const activeModelId = config.taskDefaults[task].modelId;
   const activeProvider = config.providers.find((p: any) => p.id === activeProviderId);
   const Icon = meta.icon;
   const providers = config.providers.filter((p:any) => p.enabled);
   const cloneOptions = (Object.keys(TASK_META) as AITaskType[]).filter(t => t !== task);

   const handleClone = (sourceTask: string) => {
      if (!sourceTask) return;
      onClone(task, sourceTask as AITaskType);
   };

   return (
      <div className="p-5 border border-slate-200 rounded-2xl hover:border-blue-300 transition-colors space-y-4">
         <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
               <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><Icon size={20}/></div>
               <div>
                  <h4 className="font-bold text-slate-800">{meta.title}</h4>
                  <p className="text-xs text-slate-500">{meta.description}</p>
               </div>
            </div>
            <div className="text-xs text-slate-500">
               <label className="mr-2">Скопировать из:</label>
               <select 
                 className="border border-slate-200 rounded-lg px-2 py-1 bg-white"
                 defaultValue=""
                 onChange={e => {
                    handleClone(e.target.value);
                    e.target.value = '';
                 }}
               >
                 <option value="">—</option>
                 {cloneOptions.map(option => (
                   <option key={option} value={option}>{TASK_META[option].title}</option>
                 ))}
               </select>
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Провайдер</label>
               <select 
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50"
                  value={activeProviderId}
                  onChange={e => {
                     const newProvId = e.target.value;
                     const newProv = config.providers.find((p:any) => p.id === newProvId);
                     if (newProv && newProv.models.length > 0) {
                        onChange(task, newProvId, newProv.models[0]);
                     }
                  }}
               >
                  {providers.map((p:any) => (
                     <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
               </select>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Модель</label>
               {activeProvider?.models.length ? (
                  <select 
                     className="w-full p-2 border rounded-lg text-sm bg-slate-50"
                     value={activeModelId}
                     onChange={e => onChange(task, activeProviderId, e.target.value)}
                  >
                     {activeProvider?.models.map((m:string) => (
                        <option key={m} value={m}>{m}</option>
                     ))}
                  </select>
               ) : (
                  <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg p-2">
                     У выбранного провайдера нет моделей. Добавьте их в разделе «Провайдеры».
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

const AddProviderModal = ({ onClose, onSave }: { onClose: () => void, onSave: (p: AIProviderConfig) => void }) => {
    const [form, setForm] = useState({
        name: '',
        providerType: 'custom' as LLMProvider,
        apiKey: '',
        baseUrl: '',
        models: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const modelsList = form.models.split(',').map(m => m.trim()).filter(m => m);
        
        const newProvider: AIProviderConfig = {
            id: `custom-${Date.now()}`,
            providerType: form.providerType,
            name: form.name,
            enabled: true,
            apiKey: form.apiKey || undefined,
            baseUrl: form.baseUrl || undefined,
            models: modelsList,
            isCustom: true
        };
        onSave(newProvider);
    };

    const needsBaseUrl = form.providerType === 'custom' || form.providerType === 'ollama' || form.providerType === 'openrouter';

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">Добавить AI провайдера</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Название провайдера</label>
                        <input 
                            required 
                            value={form.name} 
                            onChange={e => setForm({...form, name: e.target.value})} 
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                            placeholder="Мой Custom API"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Тип провайдера</label>
                        <select 
                            value={form.providerType} 
                            onChange={e => setForm({...form, providerType: e.target.value as LLMProvider})} 
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
                        >
                            <option value="custom">Custom (OpenAI-совместимый)</option>
                            <option value="openai">OpenAI</option>
                            <option value="anthropic">Anthropic</option>
                            <option value="google">Google Gemini</option>
                            <option value="groq">Groq</option>
                            <option value="ollama">Ollama (Локальный)</option>
                            <option value="openrouter">OpenRouter</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            Выберите тип API для совместимости. Для большинства сторонних API используйте "Custom".
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                            <input 
                                type="password"
                                value={form.apiKey} 
                                onChange={e => setForm({...form, apiKey: e.target.value})} 
                                className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                                placeholder="sk-..."
                            />
                        </div>
                        {needsBaseUrl && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
                                <input 
                                    value={form.baseUrl} 
                                    onChange={e => setForm({...form, baseUrl: e.target.value})} 
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                                    placeholder="https://api.example.com/v1"
                                />
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Модели (через запятую)</label>
                        <input 
                            required
                            value={form.models} 
                            onChange={e => setForm({...form, models: e.target.value})} 
                            className="w-full p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500"
                            placeholder="gpt-4o-mini, gpt-4o, gpt-3.5-turbo"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Укажите ID моделей через запятую. Вы сможете добавить больше моделей позже.
                        </p>
                    </div>
                    <div className="flex space-x-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200">Отмена</button>
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Добавить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const TabButton = ({ label, icon: Icon, active, onClick }: any) => (
   <button 
      onClick={onClick}
      className={clsx(
         "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all",
         active ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      )}
   >
      <Icon size={16} className="mr-2" />
      {label}
   </button>
);
