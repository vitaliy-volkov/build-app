
import React, { useState } from 'react';
import { useApp } from '../App';
import { Lead, LeadStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { 
  Plus, Search, Phone, Mail, Calendar, User, Briefcase, MoreHorizontal, 
  X, CheckCircle2, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLUMNS = Object.values(LeadStatus);

export const CRM = () => {
  const { leads, addLead, updateLead, convertLeadToProject, users } = useApp();
  const navigate = useNavigate();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [convertModal, setConvertModal] = useState<{ open: boolean, lead: Lead | null }>({ open: false, lead: null });

  // Search logic
  const [search, setSearch] = useState('');

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    if (draggedLeadId) {
      const lead = leads.find(l => l.id === draggedLeadId);
      if (lead && lead.status !== status) {
        // If moving to Success, show confirm modal
        if (status === LeadStatus.Success) {
           setConvertModal({ open: true, lead });
        } else {
           updateLead({ ...lead, status });
        }
      }
      setDraggedLeadId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleConvertConfirm = () => {
     if (convertModal.lead) {
         convertLeadToProject(convertModal.lead);
         setConvertModal({ open: false, lead: null });
         // Optional: navigate to projects list
         navigate('/projects');
     }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex-none flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <div>
             <h1 className="text-2xl font-bold text-slate-800">Воронка продаж</h1>
             <p className="text-slate-500">Управление заявками и лидами</p>
         </div>
         <div className="flex space-x-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-64">
                 <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                 <input 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 p-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                    placeholder="Поиск лида..."
                 />
             </div>
             <button 
               onClick={() => { setEditingLead(null); setModalOpen(true); }}
               className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center whitespace-nowrap"
             >
                <Plus size={16} className="mr-2"/> Новый лид
             </button>
         </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
         <div className="flex h-full space-x-4 min-w-max px-1">
            {COLUMNS.map(status => {
                const columnLeads = leads.filter(l => 
                    l.status === status && 
                    (l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search))
                );

                return (
                   <div 
                      key={status} 
                      className="w-72 sm:w-80 flex-shrink-0 bg-slate-100 rounded-xl border border-slate-200 flex flex-col max-h-full"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, status)}
                   >
                      <div className="p-3 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                          <span>{status}</span>
                          <span className="text-xs bg-white px-2 py-0.5 rounded-full text-slate-500 border border-slate-200">
                             {columnLeads.length}
                          </span>
                      </div>
                      
                      <div className="p-2 space-y-2 overflow-y-auto flex-1">
                          {columnLeads.map(lead => {
                              const assignee = users.find(u => u.id === lead.assignee_id);
                              return (
                                  <div 
                                    key={lead.id} 
                                    draggable 
                                    onDragStart={(e) => handleDragStart(e, lead.id)}
                                    className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative"
                                  >
                                     <div className="flex justify-between items-start mb-2">
                                         <h4 className="font-bold text-slate-800">{lead.name}</h4>
                                         <button 
                                            onClick={() => { setEditingLead(lead); setModalOpen(true); }}
                                            className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                         >
                                            <MoreHorizontal size={16} />
                                         </button>
                                     </div>
                                     
                                     {lead.description && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{lead.description}</p>}
                                     
                                     <div className="space-y-1 text-xs text-slate-600">
                                         {lead.phone && (
                                             <div className="flex items-center">
                                                <Phone size={12} className="mr-1.5 text-slate-400"/> {lead.phone}
                                             </div>
                                         )}
                                         <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                                             <div className="flex items-center text-slate-500" title="Ответственный">
                                                 <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold mr-1.5">
                                                     {assignee?.avatar_initials || '?'}
                                                 </div>
                                                 <span>{assignee?.name.split(' ')[0] || 'Нет'}</span>
                                             </div>
                                             {lead.estimated_budget && (
                                                 <span className="font-bold text-green-600">
                                                     {(lead.estimated_budget / 1000).toFixed(0)}k
                                                 </span>
                                             )}
                                         </div>
                                     </div>
                                  </div>
                              )
                          })}
                      </div>
                   </div>
                );
            })}
         </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
         <LeadModal 
             isOpen={isModalOpen}
             lead={editingLead}
             onClose={() => setModalOpen(false)}
             onSave={(lead) => {
                 if (editingLead) updateLead(lead);
                 else addLead(lead);
                 setModalOpen(false);
             }}
             users={users}
         />
      )}

      {/* Convert Confirmation Modal */}
      {convertModal.open && convertModal.lead && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
                  <div className="flex justify-center mb-4 text-green-600">
                      <CheckCircle2 size={48} />
                  </div>
                  <h2 className="text-xl font-bold text-center mb-2">Успешная сделка!</h2>
                  <p className="text-center text-slate-500 mb-6">
                      Вы хотите конвертировать лид <b>{convertModal.lead.name}</b> в новый Проект?
                      <br/>Будет создан Клиент и карточка Проекта.
                  </p>
                  <div className="flex space-x-3">
                      <button 
                        onClick={() => setConvertModal({ open: false, lead: null })} 
                        className="flex-1 py-2.5 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50"
                      >
                          Отмена
                      </button>
                      <button 
                        onClick={handleConvertConfirm} 
                        className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-lg shadow-green-200"
                      >
                          Создать Проект
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const LeadModal = ({ isOpen, lead, onClose, onSave, users }: any) => {
    const [form, setForm] = useState<Partial<Lead>>(lead || {
        name: '', phone: '', email: '', source: 'Сайт', status: LeadStatus.New, description: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: lead?.id || uuidv4(),
            created_at: lead?.created_at || new Date().toISOString().split('T')[0],
            ...form
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{lead ? 'Редактировать лид' : 'Новая заявка'}</h3>
                    <button onClick={onClose}><X size={24} className="text-slate-400"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Имя / Название</label>
                        <input className="w-full p-2 border rounded-lg" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Иван Иванов" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Телефон</label>
                            <input className="w-full p-2 border rounded-lg" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+7..." />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input className="w-full p-2 border rounded-lg" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} placeholder="mail@example.com" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Источник</label>
                            <select className="w-full p-2 border rounded-lg" value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
                                <option>Сайт</option>
                                <option>Instagram</option>
                                <option>Рекомендация</option>
                                <option>Звонок</option>
                                <option>Другое</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Бюджет (оценка)</label>
                            <input type="number" className="w-full p-2 border rounded-lg" value={form.estimated_budget || ''} onChange={e => setForm({...form, estimated_budget: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Менеджер</label>
                         <select className="w-full p-2 border rounded-lg" value={form.assignee_id || ''} onChange={e => setForm({...form, assignee_id: e.target.value})}>
                             <option value="">Не назначен</option>
                             {users.map((u:any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                         </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Описание / Адрес</label>
                        <textarea className="w-full p-2 border rounded-lg" rows={3} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})}></textarea>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium">Отмена</button>
                        <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Сохранить</button>
                    </div>
                </form>
             </div>
        </div>
    );
};
