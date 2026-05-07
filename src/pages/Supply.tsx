import React, { useMemo, useState } from 'react';
import { Truck, Plus, Search, Filter, Package, Clock, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react';
import { useApp } from '../App';

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  requested: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  ordered: 'bg-amber-100 text-amber-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  draft: 'Черновик',
  requested: 'Запрошено',
  approved: 'Согласовано',
  ordered: 'Заказано',
  delivered: 'Доставлено',
  cancelled: 'Отменено',
};

export const Supply: React.FC = () => {
  const { supplyRequests, projects, counterparties } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const suppliers = useMemo(() => {
    return counterparties.filter(counterparty => {
      const type = String(counterparty.type).toLowerCase();
      return type.includes('постав') || type.includes('supplier') || type.includes('подряд');
    });
  }, [counterparties]);

  const filteredRequests = useMemo(() => {
    const lowerQuery = query.toLowerCase();
    return supplyRequests.filter(request => {
      const project = projects.find(item => item.id === request.project_id);
      const matchesQuery = !query ||
        request.title?.toLowerCase().includes(lowerQuery) ||
        request.description?.toLowerCase().includes(lowerQuery) ||
        project?.name.toLowerCase().includes(lowerQuery);
      const matchesStatus = status === 'all' || request.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [query, status, supplyRequests, projects]);

  const stats = useMemo(() => {
    const active = supplyRequests.filter(request => !['delivered', 'cancelled'].includes(String(request.status))).length;
    const delayed = supplyRequests.filter(request => String(request.status) === 'ordered').length;
    const delivered = supplyRequests.filter(request => String(request.status) === 'delivered').length;
    const suppliersCount = suppliers.length;
    return { active, delayed, delivered, suppliersCount };
  }, [supplyRequests, suppliers]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Truck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Снабжение</h1>
              <p className="text-sm text-slate-500">Управление заявками, поставщиками и доставками по проектам</p>
            </div>
          </div>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
          <Plus size={18} />
          Новая заявка
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500">Активные заявки</div>
            <Package className="text-blue-600" size={20} />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{stats.active}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500">В заказе</div>
            <Clock className="text-amber-600" size={20} />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{stats.delayed}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500">Доставлено</div>
            <CheckCircle2 className="text-emerald-600" size={20} />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{stats.delivered}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500">Поставщики</div>
            <Building2 className="text-violet-600" size={20} />
          </div>
          <div className="mt-3 text-3xl font-bold text-slate-900">{stats.suppliersCount}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-xl">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по заявкам, материалам или проектам..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              <option value="all">Все статусы</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredRequests.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredRequests.map(request => {
              const project = projects.find(item => item.id === request.project_id);
              const style = statusStyles[String(request.status)] || 'bg-slate-100 text-slate-700';
              const label = statusLabels[String(request.status)] || String(request.status);
              return (
                <div key={request.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{request.title || 'Заявка на снабжение'}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{label}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 line-clamp-2">{request.description || 'Описание не заполнено'}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-lg bg-slate-100 px-2 py-1">Проект: {project?.name || 'Не указан'}</span>
                        <span className="rounded-lg bg-slate-100 px-2 py-1">Создано: {request.created_at ? new Date(request.created_at).toLocaleDateString('ru-RU') : '—'}</span>
                      </div>
                    </div>
                    <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white hover:border-blue-300 hover:text-blue-700 transition-colors">
                      Открыть
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <AlertTriangle size={22} />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">Заявки не найдены</h3>
            <p className="mt-1 text-sm text-slate-500">Измените фильтры или создайте новую заявку на снабжение.</p>
          </div>
        )}
      </div>
    </div>
  );
};
