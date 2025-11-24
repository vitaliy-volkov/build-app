
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { 
  EstimateItem, EstimateItemType, ResourceType, CalculatedEstimateItem, UserRole, EstimateStatus, NotificationType, PriceListCategory, PriceListItem, Counterparty, CounterpartyType, WorkCompletionAct, WorkCompletionActItem, Estimate, AIAnalysisResult, EstimatePaymentScheduleItem, DesignFile, DesignMarker
} from '../types';
import { AIService } from '../services/aiService';
import { 
  ChevronDown, ChevronRight, Plus, Trash2, Copy, 
  Settings, Check, Lock, Send,
  BookOpen, X, Search, ListChecks, ChevronsDown, ChevronsUp,
  GripVertical, MoreHorizontal, FolderInput, FilePlus, Download, RefreshCw, User as UserIcon,
  ArrowRight, Sparkles, Image, Loader2, Brain, Edit, DollarSign, Tag, Package, TrendingUp,
  Eye, Briefcase, BarChart3, ScrollText, PieChart as PieIcon, CheckSquare, FileText,
  Hammer, Truck, MapPin, Box, Layers, GitBranch, FileSpreadsheet, Calendar, Info, Save, CreditCard, Wallet, Clock, Folder, Mic,
  Wrench
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';

// ... Helpers ...
const calculateItem = (item: EstimateItem): CalculatedEstimateItem => {
    const total_cost = item.cost_price * item.quantity;
    const unit_price_customer = item.cost_price * (1 + item.markup / 100);
    const total_price_customer = unit_price_customer * item.quantity;
    const profit = total_price_customer - total_cost;
    return { ...item, total_cost, unit_price_customer, total_price_customer, profit };
};

const buildTree = (items: EstimateItem[], parentId?: string): CalculatedEstimateItem[] => {
    return items
        .filter(item => item.parent_id === parentId)
        .sort((a, b) => a.order - b.order)
        .map(item => {
            const calculated = calculateItem(item);
            const children = buildTree(items, item.id);
            if (children.length > 0) {
                calculated.total_cost = children.reduce((sum, c) => sum + c.total_cost, 0) + calculated.total_cost;
                calculated.total_price_customer = children.reduce((sum, c) => sum + c.total_price_customer, 0) + calculated.total_price_customer;
                calculated.profit = children.reduce((sum, c) => sum + c.profit, 0) + calculated.profit;
            }
            return { ...calculated, children };
        });
};

const filterTree = (nodes: CalculatedEstimateItem[], query: string): CalculatedEstimateItem[] => {
    if (!query) return nodes;
    const lowerQuery = query.toLowerCase();
    return nodes.reduce((acc: CalculatedEstimateItem[], node) => {
        const matches = node.name.toLowerCase().includes(lowerQuery);
        const children = node.children ? filterTree(node.children, query) : [];
        if (matches || children.length > 0) {
            acc.push({ ...node, children });
        }
        return acc;
    }, []);
};

// ... Components ...
const TabButton = ({ label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={clsx(
      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
      active ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:bg-slate-200 hover:text-slate-700"
    )}
  >
    <Icon size={16} />
    <span>{label}</span>
  </button>
);

const getResourceIcon = (type?: ResourceType) => {
    switch (type) {
        case ResourceType.Work: return <Hammer size={14} className="text-blue-500"/>;
        case ResourceType.Material: return <Package size={14} className="text-green-500"/>;
        case ResourceType.Mechanism: return <Wrench size={14} className="text-orange-500"/>;
        case ResourceType.Delivery: return <Truck size={14} className="text-purple-500"/>;
        default: return <Hammer size={14} className="text-slate-400"/>;
    }
};

// Placeholders for missing components
const KPIGrid = ({ totalPrice, totalCost, profit, matCost, workCost, mechCost, delCost, actsTotal, actsSigned, showFinancials }: any) => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 uppercase font-bold">Итого (Клиент)</div>
            <div className="text-lg font-bold text-slate-800">{totalPrice?.toLocaleString()} ₽</div>
        </div>
        {showFinancials && (
            <>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold">Себестоимость</div>
                    <div className="text-lg font-bold text-slate-600">{totalCost?.toLocaleString()} ₽</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                    <div className="text-xs text-slate-500 uppercase font-bold">Прибыль</div>
                    <div className="text-lg font-bold text-green-600">{profit?.toLocaleString()} ₽</div>
                </div>
            </>
        )}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 uppercase font-bold">Выполнено (Акты)</div>
            <div className="text-lg font-bold text-blue-600">{actsTotal?.toLocaleString()} ₽</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
            <div className="text-xs text-slate-500 uppercase font-bold">Подписано (КС-2)</div>
            <div className="text-lg font-bold text-green-700">{actsSigned?.toLocaleString()} ₽</div>
        </div>
    </div>
);

const EditorView = ({ tree, canEdit, showFinancials, expandedIds, toggleExpand, selectedItemIds, setSelectedItemIds, onUpdate, onAdd, onDelete, setContextMenu, handleDragStart, handleDragOver, handleDrop, dragOverInfo, counterparties, onAddFromTemplate, linkedItemIds, region }: any) => {
    // Recursive rendering of estimate items
    const renderNode = (node: CalculatedEstimateItem, level: number = 0) => {
        const isExpanded = expandedIds.includes(node.id);
        const isSelected = selectedItemIds.has(node.id);
        const isGroup = node.item_type !== EstimateItemType.Position;
        
        return (
            <div key={node.id}>
                <div 
                    className={clsx(
                        "flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm",
                        isSelected ? "bg-blue-50" : "",
                        dragOverInfo?.id === node.id ? (dragOverInfo.position === 'top' ? 'border-t-2 border-t-blue-500' : dragOverInfo.position === 'bottom' ? 'border-b-2 border-b-blue-500' : 'bg-blue-100') : ""
                    )}
                    style={{ paddingLeft: `${level * 20 + 8}px` }}
                    draggable={canEdit}
                    onDragStart={(e) => handleDragStart(e, node.id)}
                    onDragOver={(e) => handleDragOver(e, node.id, node.item_type)}
                    onDrop={handleDrop}
                    onClick={() => {
                        if (isGroup) toggleExpand(node.id);
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, itemId: node.id });
                    }}
                >
                    <div className="flex items-center py-2 pr-2 w-full">
                        {/* Expand Icon */}
                        <div className="w-6 flex-shrink-0 flex justify-center cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}>
                            {isGroup && (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                        </div>
                        
                        {/* Selection Checkbox */}
                        {canEdit && (
                            <input 
                                type="checkbox" 
                                className="mr-2" 
                                checked={isSelected}
                                onChange={(e) => {
                                    const next = new Set(selectedItemIds);
                                    if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
                                    setSelectedItemIds(next);
                                }}
                                onClick={e => e.stopPropagation()}
                            />
                        )}

                        {/* Drag Handle */}
                        {canEdit && <GripVertical size={14} className="text-slate-300 cursor-grab active:cursor-grabbing mr-2" />}

                        {/* Resource Type Selector */}
                        {!isGroup && (
                            <div className="relative mr-2 group/res">
                                <button 
                                    className={clsx("p-1 rounded hover:bg-slate-100", canEdit ? "cursor-pointer" : "cursor-default")}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {getResourceIcon(node.resource_type)}
                                </button>
                                {canEdit && (
                                    <div className="absolute left-0 top-full bg-white shadow-xl border border-slate-200 rounded-lg z-50 hidden group-hover/res:block w-40 py-1">
                                        {Object.values(ResourceType).map(t => (
                                            <button 
                                                key={t}
                                                className={clsx(
                                                    "flex items-center w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors",
                                                    node.resource_type === t ? 'bg-blue-50 text-blue-600' : 'text-slate-700'
                                                )}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onUpdate({ ...node, resource_type: t });
                                                }}
                                            >
                                                <span className="mr-2">{getResourceIcon(t)}</span>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Name Input */}
                        <div className="flex-1 mr-4 min-w-[200px]">
                            {canEdit ? (
                                <input 
                                    className="w-full bg-transparent outline-none" 
                                    value={node.name} 
                                    onChange={(e) => onUpdate({ ...node, name: e.target.value })} 
                                    onClick={e => e.stopPropagation()}
                                />
                            ) : (
                                <span className={isGroup ? "font-bold" : ""}>{node.name}</span>
                            )}
                            {linkedItemIds.has(node.id) && <span className="ml-2 text-[10px] bg-purple-100 text-purple-600 px-1.5 rounded">Design</span>}
                        </div>

                        {/* Columns */}
                        {!isGroup && (
                            <>
                                <div className="w-12 text-right mr-4">
                                    {canEdit ? (
                                        <input 
                                            className="w-full text-right bg-transparent outline-none border-b border-transparent focus:border-blue-300" 
                                            value={node.unit} 
                                            onChange={(e) => onUpdate({ ...node, unit: e.target.value })}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : node.unit}
                                </div>
                                <div className="w-16 text-right mr-4 font-medium">
                                    {canEdit ? (
                                        <input 
                                            type="number"
                                            className="w-full text-right bg-transparent outline-none border-b border-transparent focus:border-blue-300" 
                                            value={node.quantity} 
                                            onChange={(e) => onUpdate({ ...node, quantity: Number(e.target.value) })}
                                            onClick={e => e.stopPropagation()}
                                        />
                                    ) : node.quantity}
                                </div>
                                {showFinancials && (
                                    <>
                                        <div className="w-20 text-right mr-4 text-slate-500">
                                            {canEdit ? (
                                                <input 
                                                    type="number"
                                                    className="w-full text-right bg-transparent outline-none border-b border-transparent focus:border-blue-300" 
                                                    value={node.cost_price} 
                                                    onChange={(e) => onUpdate({ ...node, cost_price: Number(e.target.value) })}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            ) : node.cost_price.toLocaleString()}
                                        </div>
                                        <div className="w-12 text-right mr-4 text-slate-500">
                                            {canEdit ? (
                                                <input 
                                                    type="number"
                                                    className="w-full text-right bg-transparent outline-none border-b border-transparent focus:border-blue-300" 
                                                    value={node.markup} 
                                                    onChange={(e) => onUpdate({ ...node, markup: Number(e.target.value) })}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            ) : node.markup}
                                        </div>
                                    </>
                                )}
                                <div className="w-24 text-right mr-4 font-medium text-slate-700">
                                    {Math.round(node.unit_price_customer).toLocaleString()}
                                </div>
                                <div className="w-24 text-right font-bold">
                                    {Math.round(node.total_price_customer).toLocaleString()}
                                </div>
                            </>
                        )}
                        {isGroup && (
                            <div className="w-auto ml-auto text-right font-bold bg-slate-100 px-2 rounded">
                                {node.total_price_customer.toLocaleString()}
                            </div>
                        )}
                        
                        {/* Row Actions */}
                        {canEdit && (
                            <div className="flex items-center">
                                {!isGroup && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const suffix = node.resource_type === ResourceType.Work ? 'цена работы' : 'купить цена';
                                            const query = `${node.name} ${suffix} ${region || ''}`;
                                            window.open(`https://yandex.ru/search/?text=${encodeURIComponent(query)}`, '_blank');
                                        }}
                                        className="ml-2 p-1 text-slate-300 hover:text-orange-500"
                                        title="Найти цену в Яндексе"
                                    >
                                        <Search size={14}/>
                                    </button>
                                )}
                                <button onClick={() => onDelete(node.id)} className="ml-2 p-1 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        )}
                    </div>
                </div>
                {isExpanded && node.children?.map((child: any) => renderNode(child, level + 1))}
                {isExpanded && isGroup && canEdit && (
                    <div className="pl-8 py-2 border-b border-slate-50 flex items-center text-xs text-slate-400 hover:bg-slate-50 cursor-pointer" style={{ paddingLeft: `${(level + 1) * 20 + 8}px` }} onClick={() => onAdd(node.id, EstimateItemType.Position)}>
                        <Plus size={14} className="mr-2"/> Добавить позицию
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="overflow-auto h-full">
            <div className="flex font-bold text-xs text-slate-500 uppercase bg-slate-50 p-2 border-b border-slate-200 sticky top-0 z-10">
                <div className="flex-1 pl-8">Наименование</div>
                <div className="w-12 text-right mr-4">Ед.</div>
                <div className="w-16 text-right mr-4">Кол-во</div>
                {showFinancials && (
                    <>
                        <div className="w-20 text-right mr-4">Себест.</div>
                        <div className="w-12 text-right mr-4">Нац.%</div>
                    </>
                )}
                <div className="w-24 text-right mr-4">Цена</div>
                <div className="w-24 text-right mr-8">Сумма</div>
            </div>
            {tree.map((node: any) => renderNode(node))}
            {canEdit && (
                <div className="p-4 text-center">
                    <button onClick={() => onAdd(undefined, EstimateItemType.Stage)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 text-sm font-medium inline-flex items-center">
                        <Plus size={16} className="mr-2"/> Добавить этап
                    </button>
                </div>
            )}
        </div>
    );
};

const CustomerView = ({ tree, expandedIds, toggleExpand }: any) => (
    <div className="p-4">
        {/* Simplified view for customer: Name, Unit, Qty, Price (Customer), Sum (Customer) */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                        <th className="p-3 text-left">Наименование работ и материалов</th>
                        <th className="p-3 text-center">Ед.</th>
                        <th className="p-3 text-right">Кол-во</th>
                        <th className="p-3 text-right">Цена</th>
                        <th className="p-3 text-right">Сумма</th>
                    </tr>
                </thead>
                <tbody>
                    {tree.map((node: any) => (
                        <React.Fragment key={node.id}>
                            <tr className="bg-slate-50 font-bold border-t border-slate-200">
                                <td className="p-3" colSpan={5}>{node.name}</td>
                            </tr>
                            {node.children?.map((child: any) => (
                                <tr key={child.id} className="border-t border-slate-100 hover:bg-slate-50">
                                    <td className="p-3 pl-6">{child.name}</td>
                                    <td className="p-3 text-center">{child.unit}</td>
                                    <td className="p-3 text-right">{child.quantity}</td>
                                    <td className="p-3 text-right">{Math.round(child.unit_price_customer).toLocaleString()}</td>
                                    <td className="p-3 text-right">{Math.round(child.total_price_customer).toLocaleString()}</td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const PaymentScheduleView = ({ estimate, totalAmount, canEdit, onUpdate }: any) => {
    // Mock implementation
    return <div className="p-8 text-center text-slate-500">График платежей в разработке</div>;
};

const ContractorView = ({ tree, expandedIds, toggleExpand, counterparties, canEdit, onUpdate }: any) => (
    <div className="p-8 text-center text-slate-500">Вид для подрядчика в разработке</div>
);

const ExecutionView = ({ tree, expandedIds, toggleExpand }: any) => (
    <div className="p-8 text-center text-slate-500">Сводка выполнения в разработке</div>
);

const EstimateActsView = ({ estimateId, projectId, estimateItems, acts, counterparties, currentUser, addAct, updateAct, deleteAct, canEdit }: any) => (
    <div className="p-8 text-center text-slate-500">Управление актами КС-2/КС-3 в разработке</div>
);

const TabAIWidget = ({ activeTab, estimate, kpiData }: any) => (
    <div className="w-64 bg-white border-l border-slate-200 p-4 hidden xl:block flex-col">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Sparkles size={16} className="mr-2 text-purple-600"/> AI Инсайт</h3>
        <div className="bg-purple-50 p-3 rounded-lg text-sm text-slate-700 mb-4">
            Маржинальность проекта {kpiData.margin ? (kpiData.margin * 100).toFixed(1) : 0}% соответствует рыночной норме.
        </div>
        <div className="text-xs text-slate-500">
            Рекомендую проверить стоимость работ по этапу "Черновая отделка", возможно завышение на 5-7%.
        </div>
    </div>
);

const PriceListCategoryNode = ({ category, allCategories, items, onAddItem }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const subcats = allCategories.filter((c: any) => c.parent_id === category.id);
    const catItems = items.filter((i: any) => i.category_id === category.id);

    return (
        <div className="mb-1">
            <div 
                className="flex items-center p-2 hover:bg-slate-50 cursor-pointer rounded" 
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <ChevronDown size={14} className="text-slate-400 mr-2"/> : <ChevronRight size={14} className="text-slate-400 mr-2"/>}
                <span className="font-medium text-sm text-slate-700">{category.name}</span>
            </div>
            {isOpen && (
                <div className="pl-4 border-l border-slate-100 ml-2">
                    {subcats.map((c: any) => (
                        <PriceListCategoryNode key={c.id} category={c} allCategories={allCategories} items={items} onAddItem={onAddItem} />
                    ))}
                    {catItems.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center p-2 hover:bg-slate-50 group cursor-pointer rounded" onClick={() => onAddItem(item)}>
                            <div className="text-sm text-slate-600">{item.name}</div>
                            <div className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.cost_price} ₽
                                <Plus size={14} className="inline ml-1"/>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const EstimateSettingsModal = ({ estimate, onClose, onSave }: any) => {
    const [vatMode, setVatMode] = useState(estimate.vat_mode || 'Included');
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Настройки сметы</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Режим НДС</label>
                    <select className="w-full p-2 border rounded" value={vatMode} onChange={e => setVatMode(e.target.value)}>
                        <option value="Included">Включен в стоимость</option>
                        <option value="Excluded">Не облагается</option>
                        <option value="Added">Сверху (20%)</option>
                    </select>
                </div>
                <button onClick={() => onSave({ vat_mode: vatMode })} className="w-full py-2 bg-blue-600 text-white rounded font-bold">Сохранить</button>
            </div>
        </div>
    );
};

const AddFromTemplateForm = ({ templates, onAdd, onCancel }: any) => {
    const [selectedId, setSelectedId] = useState('');
    const [volume, setVolume] = useState(1);
    const selectedTemplate = templates.find((t: any) => t.id === selectedId);

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Выберите шаблон</label>
                <select className="w-full p-2 border rounded" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
                    <option value="">-- Выберите --</option>
                    {templates.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.unit})</option>)}
                </select>
            </div>
            {selectedTemplate && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Объем ({selectedTemplate.unit})</label>
                    <input className="w-full p-2 border rounded" type="number" value={volume} onChange={e => setVolume(Number(e.target.value))} />
                </div>
            )}
            <div className="flex space-x-2">
                <button onClick={onCancel} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded">Отмена</button>
                <button onClick={() => onAdd(selectedId, volume)} disabled={!selectedId} className="flex-1 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Добавить</button>
            </div>
        </div>
    );
};

export const EstimateEditor: React.FC = () => {
  const { projectId, estimateId } = useParams();
  const navigate = useNavigate();
  const { 
    estimates, estimateItems, updateEstimateItem, bulkUpdateEstimateItems, 
    addEstimateItem, deleteEstimateItem, currentUser, sendNotification, 
    updateEstimate, createEstimateVersion, priceListCategories, priceListItems, counterparties,
    acts, addAct, updateAct, deleteAct,
    operationTemplates, operationTemplateItems,
    addItemToPriceList, addItemToOperationTemplate,
    aiConfig, designFiles, projects
  } = useApp();
  
  const estimate = estimates.find(e => e.id === estimateId);
  const project = projects.find(p => p.id === projectId);
  
  const versions = useMemo(() => {
     if (!estimate) return [];
     const rootId = estimate.original_estimate_id || estimate.id;
     return estimates
        .filter(e => (e.original_estimate_id === rootId) || (e.id === rootId))
        .sort((a,b) => (a.version || 1) - (b.version || 1));
  }, [estimates, estimate]);

  const projectEstimateItems = estimateItems.filter(i => i.estimate_id === estimateId);
  
  const [activeTab, setActiveTab] = useState<'editor' | 'customer' | 'contractor' | 'execution' | 'acts' | 'schedule'>('editor');
  const [searchQuery, setSearchQuery] = useState('');
  
  const rawTree = useMemo(() => buildTree(projectEstimateItems, undefined), [projectEstimateItems]);
  const tree = useMemo(() => filterTree(rawTree, searchQuery), [rawTree, searchQuery]);
  
  const linkedItemIds = useMemo(() => {
      const ids = new Set<string>();
      designFiles
        .filter(f => f.project_id === projectId)
        .forEach(f => {
            f.markers?.forEach(m => {
                if (m.linkedEntityType === 'EstimateItem' && m.linkedEntityId) {
                    ids.add(m.linkedEntityId);
                }
            });
        });
      return ids;
  }, [designFiles, projectId]);

  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{id: string, position: 'top' | 'bottom' | 'inside'} | null>(null);
  
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, itemId: string} | null>(null);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);

  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [missingItemsSelection, setMissingItemsSelection] = useState<Set<number>>(new Set());
  
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [voiceGeneratedItems, setVoiceGeneratedItems] = useState<EstimateItem[]>([]);
  const [voiceImportSelection, setVoiceImportSelection] = useState<Set<number>>(new Set());

  const [addTemplateModal, setAddTemplateModal] = useState<{ open: boolean, parentId?: string }>({ open: false });
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  useEffect(() => {
      if (projectEstimateItems.length > 0 && expandedIds.length === 0) {
          setExpandedIds(projectEstimateItems.filter(i => i.item_type === EstimateItemType.Stage || i.item_type === EstimateItemType.Group).map(i => i.id));
      }
  }, [projectEstimateItems.length]);

  const role = currentUser.role;
  const canEdit = [UserRole.Director, UserRole.Admin, UserRole.ProjectManager, UserRole.Estimator].includes(role) && estimate?.status !== EstimateStatus.Completed;
  const showFinancials = [UserRole.Director, UserRole.Admin, UserRole.ProjectManager, UserRole.Estimator].includes(role);

  const handleTabChange = (tab: typeof activeTab) => setActiveTab(tab);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleExpandAll = () => {
      setExpandedIds(projectEstimateItems.filter(i => i.item_type !== EstimateItemType.Position).map(i => i.id));
  };

  const handleCollapseAll = () => setExpandedIds([]);

  const handleAddItem = (parentId: string | undefined, type: EstimateItemType, template?: Partial<EstimateItem>) => {
    if (!canEdit) return;
    const newItem: EstimateItem = {
      id: uuidv4(),
      estimate_id: estimateId!,
      parent_id: parentId,
      item_type: type,
      resource_type: type === EstimateItemType.Position ? (template?.resource_type || ResourceType.Work) : undefined,
      name: template?.name || (type === EstimateItemType.Stage ? 'Новый этап' : type === EstimateItemType.Group ? 'Новая группа' : 'Новая позиция'),
      quantity: template?.quantity || 1,
      cost_price: template?.cost_price || 0,
      markup: template?.markup || 20,
      unit: template?.unit || 'шт',
      order: projectEstimateItems.filter(i => i.parent_id === parentId).length,
      price_list_item_id: template?.price_list_item_id
    };
    addEstimateItem(newItem);
    if (parentId && !expandedIds.includes(parentId)) toggleExpand(parentId);
  };

  const handleDeleteItem = (id: string) => {
      if (confirm('Вы уверены? Удалятся также все вложенные элементы.')) {
          deleteEstimateItem(id);
      }
  };

  const handleCopyItem = (id: string) => {
      const item = projectEstimateItems.find(i => i.id === id);
      if (item) {
          handleAddItem(item.parent_id, item.item_type, { ...item, name: `${item.name} (Копия)` });
          setContextMenu(null);
      }
  };

  const handleSaveToPriceList = (id: string) => {
      const item = projectEstimateItems.find(i => i.id === id);
      if (item) {
          addItemToPriceList(item);
          setContextMenu(null);
      }
  };

  const handleSaveToTemplate = (id: string) => {
      const item = projectEstimateItems.find(i => i.id === id);
      if (item) {
          addItemToOperationTemplate(item);
          setContextMenu(null);
      }
  };

  const handleBulkUpdate = (key: keyof EstimateItem, value: any) => {
      const updates = Array.from(selectedItemIds).map(id => {
          const item = projectEstimateItems.find(i => i.id === id);
          if (!item) return null;
          if (key === 'resource_type' && item.item_type !== EstimateItemType.Position) return null;
          return { ...item, [key]: value };
      }).filter(Boolean) as EstimateItem[];
      
      if (updates.length > 0) {
          bulkUpdateEstimateItems(updates);
          setBulkActionMenuOpen(false);
      }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
      if (!canEdit || activeTab !== 'editor') return;
      e.dataTransfer.setData('text/plain', id);
      setDraggedItemId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string, targetType: EstimateItemType) => {
      if (!canEdit || activeTab !== 'editor' || !draggedItemId || draggedItemId === targetId) return;
      e.preventDefault();

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const offset = e.clientY - rect.top;
      
      const draggedItem = projectEstimateItems.find(i => i.id === draggedItemId);
      if (!draggedItem) return;

      let position: 'top' | 'bottom' | 'inside' = 'bottom';

      if (targetType === EstimateItemType.Stage && draggedItem.item_type !== EstimateItemType.Stage) {
           position = 'inside';
      } else if (offset < rect.height * 0.3) position = 'top';
      else if (offset > rect.height * 0.7) {
          if ((targetType === EstimateItemType.Stage || targetType === EstimateItemType.Group) && draggedItem.item_type !== EstimateItemType.Stage) {
              position = 'inside';
          } else {
              position = 'bottom';
          }
      } else {
          if ((targetType === EstimateItemType.Stage || targetType === EstimateItemType.Group) && draggedItem.item_type !== EstimateItemType.Stage) {
               position = 'inside';
          } else {
               position = 'bottom'; 
          }
      }
      
      setDragOverInfo({ id: targetId, position });
  };

  const handleDrop = () => {
      if (!draggedItemId || !dragOverInfo) {
          setDraggedItemId(null);
          setDragOverInfo(null);
          return;
      }

      const draggedItem = projectEstimateItems.find(i => i.id === draggedItemId);
      const targetItem = projectEstimateItems.find(i => i.id === dragOverInfo.id);

      if (draggedItem && targetItem) {
          let newParentId = draggedItem.parent_id;
          let newOrder = draggedItem.order;

          if (dragOverInfo.position === 'inside') {
              newParentId = targetItem.id;
              newOrder = 9999; 
          } else {
              newParentId = targetItem.parent_id;
              newOrder = targetItem.order + (dragOverInfo.position === 'bottom' ? 0.5 : -0.5);
          }
          
          const siblings = projectEstimateItems.filter(i => i.parent_id === newParentId && i.id !== draggedItemId);
          siblings.push({ ...draggedItem, parent_id: newParentId, order: newOrder });
          siblings.sort((a, b) => a.order - b.order);
          
          const updates = siblings.map((item, idx) => ({ ...item, order: idx }));
          bulkUpdateEstimateItems(updates);
          
          if (newParentId && !expandedIds.includes(newParentId)) toggleExpand(newParentId);
      }

      setDraggedItemId(null);
      setDragOverInfo(null);
  };

  const handleAddFromTemplate = (templateId: string, volume: number, parentId?: string) => {
     const template = operationTemplates.find(t => t.id === templateId);
     if (!template) return;
     const items = operationTemplateItems.filter(i => i.template_id === templateId);

     const groupId = uuidv4();
     const group: EstimateItem = {
        id: groupId,
        estimate_id: estimateId!,
        parent_id: parentId,
        item_type: EstimateItemType.Group,
        name: `${template.name} (${volume} ${template.unit})`,
        quantity: 1,
        cost_price: 0, markup: 0, unit: 'компл',
        order: projectEstimateItems.filter(i => i.parent_id === parentId).length
     };
     addEstimateItem(group);

     items.forEach((item, idx) => {
        const newItem: EstimateItem = {
           id: uuidv4(),
           estimate_id: estimateId!,
           parent_id: groupId,
           item_type: EstimateItemType.Position,
           resource_type: item.resource_type,
           name: item.name,
           unit: item.unit,
           quantity: item.quantity_factor * volume,
           cost_price: item.cost_price,
           markup: item.markup,
           price_list_item_id: item.price_list_item_id,
           order: idx
        };
        addEstimateItem(newItem);
     });

     if (parentId) toggleExpand(parentId);
     toggleExpand(groupId);
     setAddTemplateModal({ open: false });
  };

  const handleAIFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.type.includes('excel') || file.type.includes('spreadsheet') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
            alert("Файлы Excel (.xls, .xlsx) пока не поддерживаются напрямую для анализа. Сохраните как PDF или CSV.");
            if (aiFileInputRef.current) aiFileInputRef.current.value = '';
            return;
        }

        const isText = file.type === 'text/csv' || file.name.endsWith('.csv');
        const reader = new FileReader();
        
        reader.onload = async () => {
            const content = reader.result as string;
            setIsAIGenerating(true);
            try {
                const generatedItems = await AIService.generateEstimateFromFile({ 
                    data: content, 
                    mimeType: file.type || (isText ? 'text/csv' : 'application/pdf'),
                    isText
                }, priceListItems, aiConfig);
                
                const stageId = uuidv4();
                const stage: EstimateItem = {
                    id: stageId, estimate_id: estimateId!, item_type: EstimateItemType.Stage,
                    name: `AI: Авто-расчет (${file.name})`, quantity: 1, cost_price: 0, markup: 0, order: projectEstimateItems.length
                };
                addEstimateItem(stage);
                generatedItems.forEach((item, idx) => {
                    handleAddItem(stageId, item.item_type, { ...item, order: idx });
                });
                alert(`Успешно добавлено ${generatedItems.length} позиций.`);
            } catch (error) {
                alert("Ошибка при генерации сметы: " + error);
            } finally {
                setIsAIGenerating(false);
                if (aiFileInputRef.current) aiFileInputRef.current.value = '';
            }
        };

        if (isText) {
            reader.readAsText(file);
        } else {
            reader.readAsDataURL(file);
        }
    }
  };

  const handleVoiceResult = async (audioBase64: string, location?: { lat: number, lng: number }) => {
      setIsAIGenerating(true);
      try {
          const items = await AIService.generateEstimateFromAudio(audioBase64, 'audio/webm', priceListItems, aiConfig, location);
          setVoiceGeneratedItems(items);
          setVoiceImportSelection(new Set(items.map((_, i) => i)));
          setIsVoiceModalOpen(false);
      } catch (e) {
          alert("Ошибка обработки голоса: " + e);
      } finally {
          setIsAIGenerating(false);
      }
  };

  const handleApplyVoiceItems = () => {
      const itemsToAdd = voiceGeneratedItems.filter((_, idx) => voiceImportSelection.has(idx));
      if (itemsToAdd.length === 0) {
          setVoiceGeneratedItems([]);
          return;
      }

      const stageId = uuidv4();
      const stage: EstimateItem = {
          id: stageId, estimate_id: estimateId!, item_type: EstimateItemType.Stage,
          name: 'Импорт из голосовой заметки', quantity: 1, cost_price: 0, markup: 0, order: projectEstimateItems.length
      };
      addEstimateItem(stage);

      let currentParentId = stageId;
      
      itemsToAdd.forEach((item, idx) => {
          if (item.item_type === EstimateItemType.Stage) {
              const newStageId = uuidv4();
              const sItem: EstimateItem = {
                  id: newStageId,
                  estimate_id: estimateId!,
                  item_type: EstimateItemType.Stage,
                  name: item.name,
                  quantity: 1, cost_price: 0, markup: 0, unit: 'шт',
                  order: projectEstimateItems.length + idx
              };
              addEstimateItem(sItem);
              currentParentId = newStageId;
          } else {
              handleAddItem(currentParentId, item.item_type, { ...item, order: idx });
          }
      });

      setVoiceGeneratedItems([]);
      setVoiceImportSelection(new Set());
  };

  const handleAnalyzeEstimate = async () => {
    if (!estimate) return;
    setIsAnalyzing(true);
    try {
      const result = await AIService.analyzeEstimate(estimate, projectEstimateItems, priceListItems, aiConfig);
      setAnalysisResult(result);
      setMissingItemsSelection(new Set()); 
    } catch (e) {
      alert('Ошибка анализа');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyMissingItems = () => {
     if (!analysisResult) return;
     const itemsToAdd = analysisResult.missingItems.filter((_, idx) => missingItemsSelection.has(idx));
     
     if (itemsToAdd.length === 0) return;

     const stageId = uuidv4();
     const stage: EstimateItem = {
        id: stageId, estimate_id: estimateId!, item_type: EstimateItemType.Stage,
        name: 'Дополнения после анализа AI', quantity: 1, cost_price: 0, markup: 0, order: projectEstimateItems.length
     };
     addEstimateItem(stage);

     itemsToAdd.forEach((item, idx) => {
        handleAddItem(stageId, item.item_type, { ...item, order: idx });
     });

     setAnalysisResult(null);
     alert(`Добавлено ${itemsToAdd.length} позиций.`);
  };

  const handleCreateVersion = () => {
     if (!estimate) return;
     if (confirm('Создать новую версию сметы? Текущая смета останется неизменной.')) {
        const newId = createEstimateVersion(estimate.id);
        navigate(`/project/${projectId}/estimate/${newId}`);
     }
  };

  const handleVersionSwitch = (newId: string) => {
     navigate(`/project/${projectId}/estimate/${newId}`);
  };

  const handleExportCSV = () => {
     const headers = "Type,ResourceType,Name,Unit,Quantity,CostPrice,Markup,CustomerPrice,TotalCost,TotalPrice,Profit,Contractor\n";
     const rows = projectEstimateItems.map(i => {
         const item = calculateItem(i);
         const contractor = counterparties.find(c => c.id === i.assigned_contractor_id)?.full_name || '';
         return `${i.item_type},${i.resource_type || ''},"${i.name}",${i.unit},${i.quantity},${i.cost_price},${i.markup},${item.unit_price_customer},${item.total_cost},${item.total_price_customer},${item.profit},"${contractor}"`;
     }).join("\n");

     const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.setAttribute('download', `${estimate?.name}_export.csv`);
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  if (!estimate) return <div>Смета не найдена</div>;
  
  const flatItems = projectEstimateItems.map(calculateItem);
  const kpiTotalCost = flatItems.reduce((s, i) => s + (i.item_type === EstimateItemType.Position ? i.total_cost : 0), 0);
  const kpiTotalPrice = flatItems.reduce((s, i) => s + (i.item_type === EstimateItemType.Position ? i.total_price_customer : 0), 0);
  const kpiProfit = kpiTotalPrice - kpiTotalCost;
  const kpiMatCost = flatItems.filter(i => i.resource_type === ResourceType.Material).reduce((s, i) => s + i.total_price_customer, 0);
  const kpiWorkCost = flatItems.filter(i => i.resource_type === ResourceType.Work).reduce((s, i) => s + i.total_price_customer, 0);
  const kpiMechCost = flatItems.filter(i => i.resource_type === ResourceType.Mechanism).reduce((s, i) => s + i.total_price_customer, 0);
  const kpiDelCost = flatItems.filter(i => i.resource_type === ResourceType.Delivery).reduce((s, i) => s + i.total_price_customer, 0);

  const estimateActs = acts.filter(a => a.items.some(ai => projectEstimateItems.some(pi => pi.id === ai.estimate_item_id)));
  const actsTotal = estimateActs.reduce((sum, a) => sum + a.items.reduce((s, i) => s + i.total_amount, 0), 0);
  const actsSigned = estimateActs.filter(a => a.status === 'Signed').reduce((sum, a) => sum + a.items.reduce((s, i) => s + i.total_amount, 0), 0);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative select-none bg-slate-50">
       <div className="bg-white border-b border-slate-200 p-3 flex flex-wrap justify-between items-center sticky top-0 z-20 gap-2 shadow-sm">
           <div className="flex items-center space-x-3 flex-1 min-w-[200px]">
              <button onClick={() => navigate(`/project/${projectId}`)} className="text-slate-500 hover:text-blue-600"><ArrowRight className="rotate-180" size={20}/></button>
              <div>
                  <div className="flex items-center space-x-2">
                     <h1 className="text-lg font-bold text-slate-800 leading-tight max-w-[300px] truncate" title={estimate.name}>{estimate.name}</h1>
                     {versions.length > 0 && (
                        <div className="relative group">
                           <button className="flex items-center bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-600 hover:bg-slate-200">
                              v{estimate.version || 1} <ChevronDown size={10} className="ml-1"/>
                           </button>
                           <div className="absolute top-full left-0 mt-1 bg-white shadow-lg border border-slate-200 rounded-lg z-50 hidden group-hover:block min-w-[120px]">
                              {versions.map(v => (
                                 <button 
                                    key={v.id} 
                                    onClick={() => handleVersionSwitch(v.id)}
                                    className={`block w-full text-left px-3 py-2 text-xs hover:bg-slate-50 ${v.id === estimate.id ? 'font-bold text-blue-600 bg-blue-50' : 'text-slate-700'}`}
                                 >
                                    v{v.version || 1} ({v.status})
                                 </button>
                              ))}
                           </div>
                        </div>
                     )}
                     <button onClick={() => setSettingsModalOpen(true)} className="text-slate-400 hover:text-blue-600"><Settings size={16}/></button>
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                     <span>{estimate.status}</span>
                  </div>
              </div>
           </div>

           <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg overflow-x-auto">
              <TabButton label="Редактор" icon={Edit} active={activeTab === 'editor'} onClick={() => handleTabChange('editor')} />
              <TabButton label="Заказчик" icon={UserIcon} active={activeTab === 'customer'} onClick={() => handleTabChange('customer')} />
              <TabButton label="График платежей" icon={Calendar} active={activeTab === 'schedule'} onClick={() => handleTabChange('schedule')} />
              <TabButton label="Подрядчик" icon={Briefcase} active={activeTab === 'contractor'} onClick={() => handleTabChange('contractor')} />
              <TabButton label="Выполнение" icon={BarChart3} active={activeTab === 'execution'} onClick={() => handleTabChange('execution')} />
              <TabButton label="Акты" icon={ScrollText} active={activeTab === 'acts'} onClick={() => handleTabChange('acts')} />
           </div>

           {activeTab === 'editor' && (
             <div className="flex items-center space-x-2 ml-4 border-l border-slate-200 pl-4">
                {selectedItemIds.size > 0 && canEdit && (
                   <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1 mr-2 animate-in fade-in">
                      <span className="text-xs font-bold mr-2">{selectedItemIds.size}</span>
                      <div className="relative">
                          <button onClick={() => setBulkActionMenuOpen(!bulkActionMenuOpen)} className="p-1 hover:text-blue-600"><Settings size={16}/></button>
                          {bulkActionMenuOpen && (
                              <div className="absolute top-full right-0 mt-1 w-48 bg-white shadow-xl rounded-lg border border-slate-200 z-50 py-1 text-sm">
                                  <div className="px-3 py-2 border-b border-slate-100 font-bold text-slate-500 text-[10px] uppercase">Массовое изменение</div>
                                  <button onClick={() => { const v = prompt("Укажите наценку (%)"); if(v) handleBulkUpdate('markup', parseFloat(v)); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center">
                                      <TrendingUp size={14} className="mr-2 text-blue-500"/> Наценка (%)
                                  </button>
                                  <button onClick={() => { const v = prompt("Укажите себестоимость"); if(v) handleBulkUpdate('cost_price', parseFloat(v)); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center">
                                      <DollarSign size={14} className="mr-2 text-green-500"/> Себестоимость
                                  </button>
                                  <div className="border-t border-slate-100 my-1"></div>
                                  {Object.values(ResourceType).map(rt => (
                                      <button key={rt} onClick={() => handleBulkUpdate('resource_type', rt)} className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs pl-6">{rt}</button>
                                  ))}
                              </div>
                          )}
                      </div>
                      <div className="h-4 w-px bg-slate-300 mx-2"></div>
                      <button onClick={() => { 
                           const ids = Array.from(selectedItemIds);
                           if(confirm(`Удалить ${ids.length} элементов?`)) {
                               ids.forEach(id => deleteEstimateItem(id));
                               setSelectedItemIds(new Set());
                           }
                      }} className="p-1 hover:text-red-600"><Trash2 size={16}/></button>
                   </div>
                )}

                {canEdit && (
                   <>
                     <button onClick={handleCreateVersion} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg" title="Создать версию"><GitBranch size={18} /></button>
                     <button onClick={() => setAddTemplateModal({ open: true, parentId: undefined })} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg" title="Добавить из шаблона"><Layers size={18} /></button>
                     <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 rounded-lg transition-colors ${isSidebarOpen ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`} title="Справочник"><BookOpen size={18} /></button>
                     <button onClick={handleExportCSV} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg" title="Экспорт CSV"><Download size={18} /></button>
                     <input type="file" ref={aiFileInputRef} className="hidden" accept="image/*,.pdf,.csv" onChange={handleAIFileSelect} />
                     <button onClick={() => setIsVoiceModalOpen(true)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100" title="Голосовой ввод"><Mic size={18} /></button>
                     <button onClick={() => aiFileInputRef.current?.click()} disabled={isAIGenerating} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg border border-transparent hover:border-indigo-100" title="AI Смета (Файл)">{isAIGenerating ? <Loader2 size={18} className="animate-spin"/> : <FileSpreadsheet size={18} />}</button>
                     <button onClick={handleAnalyzeEstimate} disabled={isAnalyzing} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg" title="AI Анализ">{isAnalyzing ? <Loader2 size={18} className="animate-spin"/> : <Brain size={18} />}</button>
                   </>
                )}
             </div>
           )}
       </div>

       <div className="flex flex-1 overflow-hidden relative">
          <div className="flex-1 overflow-auto bg-slate-50 p-2 md:p-4 flex flex-col">
             <KPIGrid 
                activeTab={activeTab}
                totalPrice={kpiTotalPrice}
                totalCost={kpiTotalCost}
                profit={kpiProfit}
                matCost={kpiMatCost}
                workCost={kpiWorkCost}
                mechCost={kpiMechCost}
                delCost={kpiDelCost}
                actsTotal={actsTotal}
                actsSigned={actsSigned}
                estimate={estimate}
                showFinancials={showFinancials}
             />

             <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-w-[900px] pb-20 flex-1 mt-4">
                {activeTab === 'editor' && (
                    <EditorView 
                        tree={tree} 
                        canEdit={canEdit} 
                        showFinancials={showFinancials} 
                        expandedIds={expandedIds} 
                        toggleExpand={toggleExpand} 
                        handleExpandAll={handleExpandAll} 
                        handleCollapseAll={handleCollapseAll}
                        selectedItemIds={selectedItemIds} 
                        setSelectedItemIds={setSelectedItemIds} 
                        projectEstimateItems={projectEstimateItems} 
                        onUpdate={updateEstimateItem} 
                        onAdd={handleAddItem}
                        onDelete={handleDeleteItem}
                        handleAddItem={handleAddItem} 
                        handleDeleteItem={handleDeleteItem} 
                        setContextMenu={setContextMenu} 
                        handleDragStart={handleDragStart} 
                        handleDragOver={handleDragOver} 
                        handleDrop={handleDrop} 
                        dragOverInfo={dragOverInfo} 
                        counterparties={counterparties} 
                        onAddFromTemplate={(parentId: string) => setAddTemplateModal({ open: true, parentId })}
                        linkedItemIds={linkedItemIds}
                        region={project?.address}
                    />
                )}
                {activeTab === 'customer' && <CustomerView tree={tree} expandedIds={expandedIds} toggleExpand={toggleExpand} />}
                {activeTab === 'schedule' && <PaymentScheduleView estimate={estimate} totalAmount={kpiTotalPrice} canEdit={canEdit} onUpdate={updateEstimate} />}
                {activeTab === 'contractor' && <ContractorView tree={tree} expandedIds={expandedIds} toggleExpand={toggleExpand} counterparties={counterparties} canEdit={canEdit} onUpdate={updateEstimateItem} />}
                {activeTab === 'execution' && <ExecutionView tree={tree} expandedIds={expandedIds} toggleExpand={toggleExpand} />}
                {activeTab === 'acts' && <EstimateActsView estimateId={estimateId!} projectId={projectId!} estimateItems={projectEstimateItems} acts={acts} counterparties={counterparties} currentUser={currentUser} addAct={addAct} updateAct={updateAct} deleteAct={deleteAct} canEdit={canEdit} />}
             </div>
          </div>

          <TabAIWidget activeTab={activeTab} estimate={estimate} kpiData={{profit: kpiProfit, margin: kpiProfit/kpiTotalPrice, actsTotal, actsSigned}} />

          {activeTab === 'editor' && isSidebarOpen && (
             <div className="w-80 md:w-96 bg-white border-l border-slate-200 shadow-xl z-30 flex flex-col absolute top-0 bottom-0 right-0 animate-in slide-in-from-right duration-300">
                 <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                     <h3 className="font-bold text-slate-700 flex items-center"><BookOpen size={16} className="mr-2"/> Справочник</h3>
                     <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                 </div>
                 <div className="p-3 border-b border-slate-100">
                    <div className="relative">
                       <input placeholder="Поиск в справочнике..." className="w-full pl-8 p-2 text-sm border border-slate-300 rounded-lg" />
                       <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-3">
                     {priceListCategories.filter(c => !c.parent_id).map(cat => (
                        <PriceListCategoryNode 
                           key={cat.id} 
                           category={cat} 
                           allCategories={priceListCategories} 
                           items={priceListItems} 
                           onAddItem={(item: any) => handleAddItem(undefined, EstimateItemType.Position, item)}
                        />
                     ))}
                 </div>
             </div>
          )}
       </div>

       {contextMenu && (
          <div className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-50 min-w-[180px]" style={{ top: contextMenu.y, left: contextMenu.x }}>
              <button onClick={() => { handleAddItem(contextMenu.itemId, EstimateItemType.Group); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center"><FolderInput size={14} className="mr-2"/> Добавить группу</button>
              <button onClick={() => { handleAddItem(contextMenu.itemId, EstimateItemType.Position); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center"><FilePlus size={14} className="mr-2"/> Добавить позицию</button>
              <button onClick={() => { setAddTemplateModal({ open: true, parentId: contextMenu.itemId }); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center"><Layers size={14} className="mr-2"/> Из шаблона</button>
              <div className="border-t border-slate-100 my-1"></div>
              <button onClick={() => handleCopyItem(contextMenu.itemId)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center"><Copy size={14} className="mr-2"/> Копировать</button>
              <button onClick={() => handleSaveToPriceList(contextMenu.itemId)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center"><BookOpen size={14} className="mr-2"/> В прайс-лист</button>
              <button onClick={() => handleSaveToTemplate(contextMenu.itemId)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center"><Layers size={14} className="mr-2"/> В шаблон</button>
              <div className="border-t border-slate-100 my-1"></div>
              <button onClick={() => { handleDeleteItem(contextMenu.itemId); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center"><Trash2 size={14} className="mr-2"/> Удалить</button>
          </div>
       )}

       {settingsModalOpen && <EstimateSettingsModal estimate={estimate} onClose={() => setSettingsModalOpen(false)} onSave={(updates: any) => { updateEstimate({...estimate, ...updates}); setSettingsModalOpen(false); }} />}
       {addTemplateModal.open && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="text-lg font-bold">Добавить из шаблона</h3>
                   <button onClick={() => setAddTemplateModal({ open: false })}><X size={20}/></button>
                </div>
                <AddFromTemplateForm 
                   templates={operationTemplates} 
                   onAdd={(tmplId: string, vol: number) => handleAddFromTemplate(tmplId, vol, addTemplateModal.parentId)} 
                   onCancel={() => setAddTemplateModal({ open: false })}
                />
             </div>
          </div>
       )}

       {isVoiceModalOpen && (
           <VoiceRecorderModal
               isOpen={isVoiceModalOpen}
               onClose={() => setIsVoiceModalOpen(false)}
               onSave={handleVoiceResult}
           />
       )}

       {voiceGeneratedItems.length > 0 && (
           <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 flex flex-col max-h-[80vh]">
                   <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                       <h3 className="text-lg font-bold text-slate-800 flex items-center"><Mic size={20} className="mr-2 text-red-600"/> Распознанные позиции</h3>
                       <button onClick={() => setVoiceGeneratedItems([])}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                   </div>
                   <p className="text-sm text-slate-500 mb-4">ИИ распознал следующие позиции из вашей записи. Выберите то, что нужно добавить в смету.</p>
                   <div className="flex-1 overflow-y-auto space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                       {voiceGeneratedItems.map((item, idx) => (
                           <div key={idx} className="flex items-center p-3 bg-white border border-slate-100 rounded-lg hover:border-blue-200 cursor-pointer" onClick={() => {
                               const next = new Set(voiceImportSelection);
                               if (next.has(idx)) next.delete(idx); else next.add(idx);
                               setVoiceImportSelection(next);
                           }}>
                               <input type="checkbox" checked={voiceImportSelection.has(idx)} readOnly className="mr-3 w-4 h-4" />
                               <div className="flex-1">
                                   <div className="font-medium text-slate-800">{item.name}</div>
                                   <div className="text-xs text-slate-500 flex space-x-2">
                                       <span>{item.item_type === EstimateItemType.Stage ? 'Этап' : 'Позиция'}</span>
                                       {item.item_type !== EstimateItemType.Stage && (
                                           <>
                                               <span>|</span>
                                               <span>{item.quantity} {item.unit}</span>
                                               <span>|</span>
                                               <span>~{item.cost_price} ₽</span>
                                           </>
                                       )}
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
                   <div className="mt-4 flex justify-end space-x-2">
                       <button onClick={() => setVoiceGeneratedItems([])} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Отмена</button>
                       <button onClick={handleApplyVoiceItems} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">Добавить выбранное</button>
                   </div>
               </div>
           </div>
       )}

       {analysisResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
              <h3 className="text-lg font-bold text-slate-800 flex items-center"><Brain size={20} className="mr-2 text-purple-600"/> Анализ сметы (AI)</h3>
              <button onClick={() => setAnalysisResult(null)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6">
               <div className="flex-1 overflow-y-auto pr-2">
                  <h4 className="font-bold text-slate-700 mb-2">Отчет аналитика</h4>
                  <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
                     {analysisResult.analysisText}
                  </div>
                  {analysisResult.optimizations?.length > 0 && (
                     <>
                        <h4 className="font-bold text-slate-700 mb-2 flex items-center"><TrendingUp size={16} className="mr-2 text-green-600"/> Оптимизация расходов</h4>
                        <div className="space-y-2">
                           {analysisResult.optimizations.map((opt, idx) => (
                              <div key={idx} className="bg-green-50 border border-green-100 p-3 rounded-lg text-sm">
                                 <div className="font-medium text-slate-800">{opt.originalItemName}</div>
                                 <div className="text-slate-600 mt-1">{opt.suggestion}</div>
                                 {opt.potentialSavings && <div className="text-green-700 font-bold mt-1 text-xs">Потенциальная экономия: {opt.potentialSavings} руб.</div>}
                              </div>
                           ))}
                        </div>
                     </>
                  )}
               </div>
               <div className="flex-1 border-l border-slate-100 pl-4 overflow-y-auto flex flex-col">
                  <h4 className="font-bold text-slate-700 mb-2 flex items-center"><Package size={16} className="mr-2 text-amber-600"/> Недостающие позиции</h4>
                  <div className="flex-1 overflow-y-auto space-y-2">
                     {analysisResult.missingItems.map((item, idx) => (
                        <div key={idx} className="flex items-start p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => {
                           const next = new Set(missingItemsSelection);
                           if (next.has(idx)) next.delete(idx); else next.add(idx);
                           setMissingItemsSelection(next);
                        }}>
                           <input type="checkbox" checked={missingItemsSelection.has(idx)} readOnly className="mt-1 mr-3" />
                           <div className="flex-1">
                              <div className="font-medium text-sm text-slate-800">{item.name}</div>
                              <div className="text-xs text-slate-500 flex space-x-2 mt-1">
                                 <span>{item.quantity} {item.unit}</span>
                                 <span>•</span>
                                 <span>~{item.cost_price} ₽</span>
                              </div>
                              {item.reason && <div className="text-xs text-amber-600 mt-1 italic">{item.reason}</div>}
                           </div>
                        </div>
                     ))}
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-100">
                     <button onClick={handleApplyMissingItems} disabled={missingItemsSelection.size === 0} className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        Добавить выбранное ({missingItemsSelection.size})
                     </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VoiceRecorderModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (audioBase64: string, location?: { lat: number, lng: number }) => void }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lng: number } | undefined>(undefined);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.log("Geolocation not available or denied:", error);
                }
            );
        }
    }, []);

    const startRecording = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error("Browser does not support audio recording");
            }
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = () => {
                    if (reader.result) {
                        onSave(reader.result as string, location);
                    }
                };
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Не удалось получить доступ к микрофону. Убедитесь, что разрешили доступ.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center relative">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Голосовой ввод</h3>
                <p className="text-sm text-slate-500 text-center mb-6">
                    Надиктуйте список работ и материалов. <br/>
                    <i>"Этап Фундамент: копка траншеи..."</i>
                </p>

                {location ? (
                    <div className="mb-6 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium flex items-center animate-in fade-in">
                        <MapPin size={12} className="mr-1"/> Цены по вашему региону
                    </div>
                ) : (
                    <div className="mb-6 px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-xs font-medium flex items-center">
                        <MapPin size={12} className="mr-1"/> Определение локации...
                    </div>
                )}

                <div className="relative mb-8">
                    {isRecording && (
                        <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-75"></div>
                    )}
                    <button 
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl ${isRecording ? 'bg-red-600 text-white scale-110' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {isRecording ? (
                            <div className="w-8 h-8 bg-white rounded-sm" />
                        ) : (
                            <Mic size={32} />
                        )}
                    </button>
                </div>

                <p className={`text-sm font-bold mb-6 ${isRecording ? 'text-red-600 animate-pulse' : 'text-slate-400'}`}>
                    {isRecording ? 'Запись идет...' : 'Нажмите, чтобы начать'}
                </p>

                <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-sm font-medium">
                    Отмена
                </button>
            </div>
        </div>
    );
};
