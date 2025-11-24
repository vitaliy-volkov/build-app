
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { Estimate, EstimateStatus, VatMode, EstimateItem, EstimateItemType, UserRole, NotificationType } from '../types';
import { 
  FileText, Plus, Search, Filter, ArrowUpDown, 
  Clock, CheckCircle2, Briefcase, Calculator, MoreVertical, X,
  Send, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';

export const EstimatesList = () => {
  const navigate = useNavigate();
  const { estimates, projects, estimateItems, addEstimate, updateEstimate, sendNotification, currentUser } = useApp();
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | 'All'>('All');
  const [projectFilter, setProjectFilter] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'name'>('date_desc');

  // Modal State
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  // Permission
  const canCreate = [UserRole.Director, UserRole.Admin, UserRole.ProjectManager, UserRole.Estimator].includes(currentUser.role);
  const canApprove = [UserRole.Director, UserRole.Admin, UserRole.Client].includes(currentUser.role);

  // --- Helper to Calculate Estimate Totals (Memoized) ---
  const estimatesWithTotals = useMemo(() => {
    return estimates.map(est => {
        // Find items for this estimate
        const items = estimateItems.filter(i => i.estimate_id === est.id && i.item_type !== EstimateItemType.Stage && i.item_type !== EstimateItemType.Group);
        const totalCost = items.reduce((sum, i) => sum + (i.cost_price * i.quantity), 0);
        const totalRevenue = items.reduce((sum, i) => sum + (i.cost_price * i.quantity * (1 + i.markup/100)), 0);
        
        return {
            ...est,
            totalCost,
            totalRevenue,
            itemsCount: items.length
        };
    });
  }, [estimates, estimateItems]);

  // --- Filtering & Sorting ---
  const filteredEstimates = estimatesWithTotals.filter(est => {
      const matchesSearch = est.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || est.status === statusFilter;
      const matchesProject = projectFilter === 'All' || est.project_id === projectFilter;
      return matchesSearch && matchesStatus && matchesProject;
  }).sort((a, b) => {
      if (sortOrder === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortOrder === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortOrder === 'amount_desc') return b.totalRevenue - a.totalRevenue;
      if (sortOrder === 'name') return a.name.localeCompare(b.name);
      return 0;
  });

  // --- KPI Data ---
  const totalValue = estimatesWithTotals.reduce((sum, e) => sum + e.totalRevenue, 0);
  const totalActiveValue = estimatesWithTotals.filter(e => e.status === EstimateStatus.InWork).reduce((sum, e) => sum + e.totalRevenue, 0);
  const countDraft = estimates.filter(e => e.status === EstimateStatus.Draft).length;
  const countReview = estimates.filter(e => e.status === EstimateStatus.Review).length;

  const handleStatusChange = (est: Estimate, newStatus: EstimateStatus) => {
      if (confirm(`Изменить статус сметы на "${newStatus}"?`)) {
          updateEstimate({ ...est, status: newStatus });
          
          if (newStatus === EstimateStatus.Review) {
              sendNotification({
                  title: "Смета на согласовании",
                  message: `Смета "${est.name}" отправлена на согласование.`,
                  type: NotificationType.ActionRequired,
                  target_role: UserRole.Director,
                  action_payload: { type: 'approve_estimate', entity_id: est.id }
              });
          } else if (newStatus === EstimateStatus.InWork) {
              sendNotification({
                  title: "Смета утверждена",
                  message: `Смета "${est.name}" переведена в работу.`,
                  type: NotificationType.Success,
                  target_user_id: est.manager_id
              });
          } else if (newStatus === EstimateStatus.Draft && est.status === EstimateStatus.Review) {
               sendNotification({
                  title: "Смета отклонена",
                  message: `Смета "${est.name}" возвращена на доработку.`,
                  type: NotificationType.Warning,
                  target_user_id: est.manager_id
              });
          }
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 h-[calc(100vh-6rem)] flex flex-col">
       <div className="flex justify-between items-end flex-none">
          <div>
             <h1 className="text-2xl font-bold text-slate-800">Реестр Смет</h1>
             <p className="text-slate-500">Все сметы по всем проектам</p>
          </div>
          {canCreate && (
             <button 
               onClick={() => setCreateModalOpen(true)}
               className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center shadow-sm"
             >
                <Plus size={18} className="mr-2" />
                Создать смету
             </button>
          )}
       </div>

       {/* KPI Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-none">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
             <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase">Всего смет</span>
                <FileText size={18} className="text-slate-400"/>
             </div>
             <span className="text-2xl font-bold text-slate-800">{estimates.length}</span>
             <span className="text-xs text-slate-400 mt-auto">На сумму: {(totalValue/1000000).toFixed(1)} млн ₽</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
             <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase">В работе</span>
                <Briefcase size={18} className="text-blue-500"/>
             </div>
             <span className="text-2xl font-bold text-blue-600">{estimates.filter(e => e.status === EstimateStatus.InWork).length}</span>
             <span className="text-xs text-slate-400 mt-auto">На сумму: {(totalActiveValue/1000000).toFixed(1)} млн ₽</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
             <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase">На согласовании</span>
                <Clock size={18} className="text-purple-500"/>
             </div>
             <span className="text-2xl font-bold text-purple-600">{countReview}</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col">
             <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase">Черновики</span>
                <Calculator size={18} className="text-slate-400"/>
             </div>
             <span className="text-2xl font-bold text-slate-600">{countDraft}</span>
          </div>
       </div>

       {/* Filters Toolbar */}
       <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center flex-none">
          <div className="relative flex-1 w-full">
             <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
             <input 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               placeholder="Поиск по названию..." 
               className="w-full pl-9 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
             />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
             <select 
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white max-w-[200px]"
             >
                <option value="All">Все проекты</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>

             <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
             >
                <option value="All">Все статусы</option>
                {Object.values(EstimateStatus).map(s => <option key={s} value={s}>{s}</option>)}
             </select>

             <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
             >
                <option value="date_desc">Сначала новые</option>
                <option value="date_asc">Сначала старые</option>
                <option value="amount_desc">По сумме (max)</option>
                <option value="name">По имени</option>
             </select>
          </div>
       </div>

       {/* Data Table */}
       <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
             <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0 z-10">
                   <tr>
                      <th className="p-4">Название сметы</th>
                      <th className="p-4">Проект</th>
                      <th className="p-4">Статус</th>
                      <th className="p-4 text-right">Сумма (Клиент)</th>
                      <th className="p-4 text-right hidden md:table-cell">Себестоимость</th>
                      <th className="p-4 text-right hidden sm:table-cell">Дата создания</th>
                      <th className="p-4 text-right">Действия</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredEstimates.map(est => {
                      const project = projects.find(p => p.id === est.project_id);
                      return (
                         <tr 
                            key={est.id} 
                            className="hover:bg-slate-50 group cursor-pointer transition-colors"
                            onClick={() => navigate(`/project/${est.project_id}/estimate/${est.id}`)}
                         >
                            <td className="p-4">
                               <div className="font-bold text-slate-800">{est.name}</div>
                               <div className="text-xs text-slate-400">{est.itemsCount} позиций</div>
                            </td>
                            <td className="p-4">
                               <div className="text-slate-600 max-w-[200px] truncate" title={project?.name}>{project?.name || 'Неизвестно'}</div>
                            </td>
                            <td className="p-4">
                               <EstimateStatusBadge status={est.status} />
                            </td>
                            <td className="p-4 text-right font-bold text-slate-800">
                               {est.totalRevenue.toLocaleString('ru-RU')} ₽
                            </td>
                            <td className="p-4 text-right text-slate-500 hidden md:table-cell">
                               {est.totalCost.toLocaleString('ru-RU')} ₽
                            </td>
                            <td className="p-4 text-right text-slate-500 hidden sm:table-cell">
                               {est.created_at}
                            </td>
                            <td className="p-4 text-right">
                               <div className="flex justify-end items-center space-x-2" onClick={e => e.stopPropagation()}>
                                   {est.status === EstimateStatus.Draft && (
                                       <button 
                                            onClick={() => handleStatusChange(est, EstimateStatus.Review)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Отправить на согласование"
                                       >
                                           <Send size={18} />
                                       </button>
                                   )}
                                   
                                   {est.status === EstimateStatus.Review && canApprove && (
                                       <>
                                           <button 
                                                onClick={() => handleStatusChange(est, EstimateStatus.InWork)}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Согласовать"
                                           >
                                               <ThumbsUp size={18} />
                                           </button>
                                           <button 
                                                onClick={() => handleStatusChange(est, EstimateStatus.Draft)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Отклонить"
                                           >
                                               <ThumbsDown size={18} />
                                           </button>
                                       </>
                                   )}

                                   <button 
                                     onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/project/${est.project_id}/estimate/${est.id}`);
                                     }}
                                     className="px-3 py-1.5 text-xs bg-slate-100 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors ml-2"
                                   >
                                      Открыть
                                   </button>
                               </div>
                            </td>
                         </tr>
                      );
                   })}
                   {filteredEstimates.length === 0 && (
                      <tr><td colSpan={7} className="p-12 text-center text-slate-400">Сметы не найдены</td></tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {/* Create Modal */}
       {isCreateModalOpen && (
          <CreateEstimateModal 
             isOpen={isCreateModalOpen}
             projects={projects}
             onClose={() => setCreateModalOpen(false)}
             onSave={(data) => {
                const newEstId = uuidv4();
                const newEstimate: Estimate = {
                   id: newEstId,
                   project_id: data.project_id,
                   name: data.name,
                   status: EstimateStatus.Draft,
                   vat_mode: VatMode.Included,
                   created_at: new Date().toISOString().split('T')[0],
                   manager_id: currentUser.id
                };
                addEstimate(newEstimate);
                setCreateModalOpen(false);
                navigate(`/project/${data.project_id}/estimate/${newEstId}`);
             }}
          />
       )}
    </div>
  );
};

const EstimateStatusBadge = ({ status }: { status: EstimateStatus }) => {
    const colors = {
      [EstimateStatus.Draft]: 'bg-slate-100 text-slate-600',
      [EstimateStatus.InWork]: 'bg-blue-100 text-blue-700',
      [EstimateStatus.Completed]: 'bg-green-100 text-green-700',
      [EstimateStatus.Review]: 'bg-purple-100 text-purple-700'
    };
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>{status}</span>;
};

const CreateEstimateModal = ({ isOpen, projects, onClose, onSave }: any) => {
    const [projectId, setProjectId] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ project_id: projectId, name });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Новая смета</h3>
                    <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Проект</label>
                        <select 
                           required
                           className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                           value={projectId}
                           onChange={e => setProjectId(e.target.value)}
                        >
                           <option value="">Выберите проект...</option>
                           {projects.map((p:any) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                           ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Название сметы</label>
                        <input 
                           required
                           className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                           placeholder="Например: Черновые работы"
                           value={name}
                           onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div className="flex space-x-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200">Отмена</button>
                        <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Создать</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
