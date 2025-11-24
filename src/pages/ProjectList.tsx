

import React, { useState } from 'react';
import { useApp } from '../App';
import { ProjectStatus, Project, ProjectTemplate } from '../types';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Calendar, Filter, Plus, FilePlus, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const ProjectList = () => {
  const { projects, counterparties, templates, addProject, createProjectFromTemplate } = useApp();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
  
  // Modal States
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(''); // '' = Empty project

  const getClientName = (id: string) => counterparties.find(c => c.id === id)?.full_name || 'Неизвестно';

  const filteredProjects = projects.filter(project => 
    statusFilter === 'All' || project.status === statusFilter
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Список Проектов</h1>
        <button 
          onClick={() => setIsNewProjectModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap text-sm font-medium shadow-sm flex items-center"
        >
            <Plus size={18} className="mr-2" />
            Новый проект
        </button>
      </div>
      
      {/* Projects Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2">
           <Filter size={18} className="text-slate-400" />
           <span className="font-medium text-slate-700 text-sm">Фильтр:</span>
        </div>
        <div className="relative flex-1 sm:flex-none w-full sm:w-64">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'All')}
            className="w-full appearance-none bg-slate-50 border border-slate-300 text-slate-700 py-2 pl-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-sm"
          >
            <option value="All">Все статусы</option>
            {Object.values(ProjectStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
            <Filter size={14} />
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjects.map(project => (
          <div 
            key={project.id} 
            onClick={() => navigate(`/project/${project.id}`)}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all cursor-pointer group hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-600 transition-colors">
                    {project.name}
                  </h3>
                  <div className="flex items-center text-slate-500 text-sm mt-1">
                    <MapPin size={14} className="mr-1" />
                    {project.address}
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                project.status === 'В работе' ? 'bg-green-100 text-green-700' : 
                project.status === 'Планирование' ? 'bg-blue-100 text-blue-700' :
                project.status === 'Приостановлен' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {project.status}
              </span>
            </div>

            <p className="text-slate-600 text-sm mb-4 line-clamp-2 h-10">
              {project.description}
            </p>

            <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-sm">
              <div className="flex flex-col">
                <span className="text-slate-400 text-xs">Заказчик</span>
                <span className="font-medium text-slate-700">{getClientName(project.customer_id)}</span>
              </div>
               <div className="flex flex-col items-end">
                <span className="text-slate-400 text-xs">Договор от</span>
                <span className="font-medium text-slate-700 flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {project.contract_date}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {filteredProjects.length === 0 && (
           <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              Проектов с выбранным статусом не найдено.
           </div>
        )}
      </div>

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <NewProjectModal 
          isOpen={isNewProjectModalOpen} 
          onClose={() => setIsNewProjectModalOpen(false)}
          templates={templates}
          counterparties={counterparties}
          onSave={(data, templateId) => {
            if (templateId) {
               createProjectFromTemplate(templateId, data);
            } else {
               // Manual Create
               addProject({
                  id: uuidv4(),
                  name: data.name!,
                  address: data.address!,
                  contract_num: 'Б/Н',
                  contract_date: new Date().toISOString().split('T')[0],
                  description: '',
                  customer_id: data.customer_id!,
                  general_contractor_id: '',
                  contact_person_id: '',
                  status: ProjectStatus.Planning,
                  team: []
               });
            }
            setIsNewProjectModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

const NewProjectModal = ({ isOpen, onClose, templates, counterparties, onSave }: { 
  isOpen: boolean;
  onClose: () => void;
  templates: ProjectTemplate[];
  counterparties: any[];
  onSave: (data: Partial<Project>, templateId?: string) => void;
}) => {
  const [form, setForm] = useState<{ name: string, address: string, customer_id: string, templateId: string }>({
     name: '', address: '', customer_id: '', templateId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     onSave(form, form.templateId || undefined);
  };

  return (
     <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
         <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
             <div className="flex justify-between items-center mb-6">
                 <h3 className="text-xl font-bold">Создание проекта</h3>
                 <button onClick={onClose}><X size={24} className="text-slate-400"/></button>
             </div>
             
             <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Использовать шаблон</label>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                       <div 
                         className={`border rounded-lg p-3 cursor-pointer text-center text-sm font-medium ${form.templateId === '' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                         onClick={() => setForm({...form, templateId: ''})}
                       >
                          Пустой проект
                       </div>
                       {templates.map(tmpl => (
                          <div 
                             key={tmpl.id}
                             className={`border rounded-lg p-3 cursor-pointer text-center text-sm font-medium flex flex-col items-center justify-center ${form.templateId === tmpl.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                             onClick={() => setForm({...form, templateId: tmpl.id})}
                          >
                             <FilePlus size={16} className="mb-1"/>
                             {tmpl.name}
                          </div>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Название проекта</label>
                    <input required className="w-full p-2 border rounded-lg" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Напр. Ремонт квартиры ул. Ленина" />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Адрес объекта</label>
                    <input required className="w-full p-2 border rounded-lg" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Заказчик</label>
                    <select className="w-full p-2 border rounded-lg" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})} required>
                        <option value="">Выберите заказчика</option>
                        {counterparties.filter(c => c.type === 'Клиент').map(c => (
                           <option key={c.id} value={c.id}>{c.full_name}</option>
                        ))}
                    </select>
                 </div>

                 <div className="flex space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium">Отмена</button>
                    <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Создать</button>
                 </div>
             </form>
         </div>
     </div>
  );
};