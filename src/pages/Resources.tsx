
import React from 'react';
import { useApp } from '../App';
import { CounterpartyType, ProjectStatus } from '../types';
import { Calendar, User, Briefcase, AlertCircle } from 'lucide-react';

export const Resources = () => {
  const { projects, counterparties } = useApp();

  const employees = counterparties.filter(c => c.type === CounterpartyType.Employee);
  const activeProjects = projects.filter(p => p.status === ProjectStatus.Active || p.status === ProjectStatus.Planning);

  // Helper to find projects assigned to a user
  const getUserProjects = (userId: string) => {
    return activeProjects.filter(p => p.team.some(member => member.user_id === userId)).map(p => {
        const role = p.team.find(m => m.user_id === userId)?.role_in_project;
        return { ...p, role };
    });
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex-none">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Загрузка Команды</h1>
        <p className="text-slate-500">Планирование ресурсов и распределение сотрудников по объектам.</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-6">
           {employees.map(emp => {
              const userProjects = getUserProjects(emp.id);
              const isOverloaded = userProjects.length > 3;
              const isFree = userProjects.length === 0;

              return (
                 <div key={emp.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-start gap-6">
                    {/* User Profile */}
                    <div className="flex items-center md:w-64 flex-shrink-0">
                       <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold mr-4 ${
                          isOverloaded ? 'bg-red-100 text-red-600' : isFree ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                       }`}>
                          {emp.full_name.split(' ').map(n => n[0]).join('').substring(0,2)}
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-800">{emp.full_name}</h3>
                          <p className="text-sm text-slate-500">{emp.role || 'Сотрудник'}</p>
                          <div className="mt-2 inline-flex items-center px-2 py-1 rounded bg-slate-50 text-xs font-medium text-slate-600">
                             Проектов: {userProjects.length}
                          </div>
                       </div>
                    </div>

                    {/* Projects Timeline / List */}
                    <div className="flex-1 w-full">
                       {userProjects.length === 0 ? (
                          <div className="h-24 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-sm">
                             Нет активных проектов. Сотрудник свободен.
                          </div>
                       ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                             {userProjects.map(p => (
                                <div key={p.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 hover:border-blue-300 transition-colors">
                                   <div className="flex justify-between items-start">
                                      <h4 className="font-bold text-sm text-slate-700 truncate max-w-[150px]">{p.name}</h4>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.status === 'В работе' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                         {p.status}
                                      </span>
                                   </div>
                                   <div className="mt-2 flex items-center text-xs text-slate-500">
                                      <Briefcase size={12} className="mr-1.5"/>
                                      <span>Роль: {p.role}</span>
                                   </div>
                                   <div className="mt-1 flex items-center text-xs text-slate-500">
                                      <Calendar size={12} className="mr-1.5"/>
                                      <span>Старт: {p.contract_date}</span>
                                   </div>
                                </div>
                             ))}
                          </div>
                       )}
                    </div>

                    {/* Status Indicator */}
                    <div className="flex-shrink-0 md:w-32 flex flex-col items-end">
                        {isOverloaded && (
                           <div className="flex items-center text-red-600 text-xs font-bold bg-red-50 px-3 py-1 rounded-full">
                              <AlertCircle size={14} className="mr-1"/> Перегруз
                           </div>
                        )}
                        {isFree && (
                           <div className="flex items-center text-green-600 text-xs font-bold bg-green-50 px-3 py-1 rounded-full">
                              <User size={14} className="mr-1"/> Свободен
                           </div>
                        )}
                    </div>
                 </div>
              );
           })}
        </div>
      </div>
    </div>
  );
};
