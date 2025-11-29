
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../App';
import { 
  Project, Estimate, EstimateItem, EstimateStatus, UserRole, EstimateItemType,
  NotificationType, ProjectStatus, ResourceType, SupplyRequestStatus, DesignFile, DesignMarker,
  ChatMessage, ChatType, ProjectEvent, ProjectDocument, WorkCompletionAct, PhotoStreamPost, SpecificationItem, SpecClientStatus, DesignStyleConfig
} from '../types';
import { AIService } from '../services/aiService';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, FileText, 
  Clock, CheckCircle2, Plus, Calendar,
  Truck, File as FileIcon, Download, MoreVertical, Hammer, Lock,
  ShoppingCart, PackageCheck, Edit2, Save, ScrollText, ListChecks, X, Search,
  TrendingUp, BarChart3, Image, PenTool, Sofa, CheckSquare, MessageSquare, Send, Paperclip, 
  Folder, UploadCloud, Eye, Maximize2, Palette, Layers, Grid, User as UserIcon,
  Copy, FileCheck, Sparkles, RefreshCw, AlertCircle, Wand2, ExternalLink, ShoppingBag, Loader2, Lightbulb,
  MapPin, Move, MousePointer2, Pen, ChevronLeft, ChevronRight, Target, Link, Trash2, Banknote,
  ArrowRightLeft, Stamp, AlertTriangle, ChevronDown, History, GripHorizontal,
  ThumbsUp, ThumbsDown, ArrowLeft, Settings, Paintbrush, Calculator, Camera, Share2, MessagesSquare
} from 'lucide-react';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';

// --- SHARED COMPONENTS ---

const KpiCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
    <div>
      <p className="text-sm text-slate-500 font-medium">{title}</p>
      <p className={`text-xl font-bold ${color ? color.replace('text-', 'text-') : 'text-slate-800'}`}>
        {typeof value === 'number' ? value.toLocaleString() + ' ₽' : value}
      </p>
    </div>
    <div className={`p-3 rounded-full ${color ? color.replace('text-', 'bg-').replace('600', '100') : 'bg-slate-100 text-slate-600'}`}>
       <Icon size={20} className={color} />
    </div>
  </div>
);

// --- MODULES ---

// 1. PROJECT OVERVIEW (With AI Health & Events)
const ProjectOverviewModule = ({ project, estimates, payments, events, tasks, chatMessages, aiConfig, companySettings }: any) => {
    const [health, setHealth] = useState<any>(null);
    const [loadingHealth, setLoadingHealth] = useState(false);

    useEffect(() => {
        const fetchHealth = async () => {
            setLoadingHealth(true);
            try {
                const res = await AIService.analyzeProjectHealth(project, chatMessages, events, aiConfig);
                setHealth(res);
            } catch (e) { console.error(e); }
            finally { setLoadingHealth(false); }
        };
        if (project) fetchHealth();
    }, [project]);

    // Stats
    const totalBudget = estimates.reduce((sum:number, e:any) => sum + (e.status === 'InWork' ? 1000000 : 0), 0); // Mock calc
    const totalPaid = payments.filter((p:any) => p.direction === 'Out').reduce((sum:number, p:any) => sum + p.amount, 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Health Card */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center">
                            <Sparkles size={20} className="mr-2 text-purple-600"/> AI Анализ Здоровья
                        </h3>
                        {loadingHealth ? <Loader2 size={20} className="animate-spin text-slate-400"/> : (
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                health?.sentiment === 'Позитивное' ? 'bg-green-100 text-green-700' : 
                                health?.sentiment === 'Негативное' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                                {health?.sentiment || 'Анализ...'}
                            </span>
                        )}
                    </div>
                    
                    {health ? (
                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center space-x-4">
                                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${health.riskScore > 70 ? 'bg-red-500' : health.riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                                        style={{ width: `${health.riskScore}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm font-bold text-slate-600">Риск: {health.riskScore}%</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                                    <h4 className="text-xs font-bold text-red-700 uppercase mb-2">Факторы риска</h4>
                                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                        {health.riskFactors?.map((f:string, i:number) => <li key={i}>{f}</li>)}
                                    </ul>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                    <h4 className="text-xs font-bold text-blue-700 uppercase mb-2">Рекомендации</h4>
                                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                                        {health.recommendations?.map((r:string, i:number) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-400 text-sm">ИИ анализирует чаты, сметы и события проекта...</div>
                    )}
                    {/* Background Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-0"></div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold mb-4">Детали проекта</h3>
                    <p className="text-slate-600 mb-6">{project.description}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <span className="block text-xs text-slate-500 font-bold uppercase">Договор</span>
                            <span className="font-medium text-slate-800">{project.contract_number}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <span className="block text-xs text-slate-500 font-bold uppercase">Дата старта</span>
                            <span className="font-medium text-slate-800">{project.contract_date}</span>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg">
                            <span className="block text-xs text-slate-500 font-bold uppercase">Заказчик</span>
                            <span className="font-medium text-slate-800">ID: {project.customer_id}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Event Log */}
            <div className="bg-white p-0 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800 flex items-center"><History size={18} className="mr-2"/> Журнал событий</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {events.sort((a:any,b:any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((evt: ProjectEvent) => (
                        <div key={evt.id} className="flex space-x-3 relative pl-4 border-l border-slate-200 pb-2 last:pb-0">
                            <div className={`absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                                evt.type === 'success' ? 'bg-green-500' : evt.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                            }`}></div>
                            <div>
                                <div className="text-xs text-slate-400 mb-0.5">{evt.timestamp}</div>
                                <div className="text-sm text-slate-800">{evt.event_description}</div>
                                <div className="text-xs text-slate-500 mt-1">Пользователь: {evt.user_id}</div>
                            </div>
                        </div>
                    ))}
                    {events.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Событий пока нет</p>}
                </div>
            </div>
        </div>
    );
};

// 2. ESTIMATES (Restored)
const ProjectEstimatesModule = ({ project, estimates, estimateItems, navigate, onUpdateEstimate, sendNotification, currentUser }: any) => {
    
    const canApprove = [UserRole.Director, UserRole.Admin, UserRole.Client].includes(currentUser.role);

    const getTotal = (estId: string) => {
        const items = estimateItems.filter((i:any) => i.estimate_id === estId && i.item_type === EstimateItemType.Position);
        return items.reduce((sum:number, i:any) => sum + (i.cost_price * i.quantity * (1 + i.markup/100)), 0);
    };

    const handleStatusChange = (est: Estimate, newStatus: EstimateStatus) => {
        if (confirm(`Изменить статус сметы на "${newStatus}"?`)) {
            onUpdateEstimate({ ...est, status: newStatus });
            // Notifications logic...
        }
    };

    const totalBudget = estimates.reduce((sum:number, e:any) => sum + getTotal(e.id), 0);
    const approvedBudget = estimates.filter((e:any) => e.status === EstimateStatus.InWork).reduce((sum:number, e:any) => sum + getTotal(e.id), 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KpiCard title="Общий бюджет" value={totalBudget} icon={Wallet} color="text-blue-600" />
                <KpiCard title="В работе (Согласовано)" value={approvedBudget} icon={CheckCircle2} color="text-green-600" />
                <KpiCard title="На согласовании" value={totalBudget - approvedBudget} icon={Clock} color="text-purple-600" />
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Сметы проекта</h3>
                    <button 
                        onClick={() => navigate('/estimates')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                        <Plus size={16} className="inline mr-2"/> Создать
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="p-3">Название</th>
                                <th className="p-3 text-right">Сумма</th>
                                <th className="p-3 text-center">Версия</th>
                                <th className="p-3">Статус</th>
                                <th className="p-3 text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {estimates.map((est: Estimate) => (
                                <tr 
                                    key={est.id} 
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/project/${project.id}/estimate/${est.id}`)}
                                >
                                    <td className="p-3 font-medium text-slate-800">{est.name}</td>
                                    <td className="p-3 text-right font-bold">{getTotal(est.id).toLocaleString()} ₽</td>
                                    <td className="p-3 text-center"><span className="bg-slate-100 px-2 py-1 rounded text-xs">v{est.version || 1}</span></td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            est.status === EstimateStatus.InWork ? 'bg-green-100 text-green-700' :
                                            est.status === EstimateStatus.Draft ? 'bg-slate-100 text-slate-600' :
                                            'bg-purple-100 text-purple-700'
                                        }`}>
                                            {est.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <div className="flex justify-end items-center space-x-2" onClick={e => e.stopPropagation()}>
                                            {est.status === EstimateStatus.Draft && (
                                                <button 
                                                        onClick={() => handleStatusChange(est, EstimateStatus.Review)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Отправить на согласование"
                                                >
                                                    <Send size={16} />
                                                </button>
                                            )}
                                            
                                            {est.status === EstimateStatus.Review && canApprove && (
                                                <>
                                                    <button 
                                                        onClick={() => handleStatusChange(est, EstimateStatus.InWork)}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Согласовать"
                                                    >
                                                        <ThumbsUp size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleStatusChange(est, EstimateStatus.Draft)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Отклонить"
                                           >
                                                        <ThumbsDown size={16} />
                                                    </button>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => navigate(`/project/${project.id}/estimate/${est.id}`)}
                                                className="p-1 text-slate-400 hover:text-blue-600"
                                                title="Открыть"
                                            >
                                                <ExternalLink size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// 3. DESIGN MODULE (Enhanced)
const ProjectDesignModule = ({ project, designFiles, tasks, estimateItems, aiConfig, companySettings, onAddFile, onUpdateFile }: any) => {
    const [mode, setMode] = useState<'gallery' | 'generator' | 'annotator'>('gallery');
    const [selectedFile, setSelectedFile] = useState<DesignFile | null>(null);
    
    // Generator State
    const [prompt, setPrompt] = useState('');
    const [styleId, setStyleId] = useState(companySettings.designStyles?.[0]?.id || '');
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Image Inputs
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [styleImage, setStyleImage] = useState<string | null>(null);
    const sourceInputRef = useRef<HTMLInputElement>(null);
    const styleInputRef = useRef<HTMLInputElement>(null);

    // Annotator State
    const [markerMode, setMarkerMode] = useState(false);
    const imageRef = useRef<HTMLImageElement>(null);

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        try {
            const styleConfig = companySettings.designStyles.find((s: DesignStyleConfig) => s.id === styleId);
            const fullPrompt = styleConfig ? `${styleConfig.prompt}. ${prompt}` : prompt;
            
            const resultBase64 = await AIService.generateDesignImage(fullPrompt, sourceImage, styleImage, aiConfig);
            
            if (resultBase64) {
                const newFile: DesignFile = {
                    id: uuidv4(),
                    project_id: project.id,
                    category: 'Visualization',
                    name: `AI: ${prompt.substring(0, 20)}...`,
                    url: resultBase64,
                    type: 'image',
                    status: 'New',
                    uploaded_by: 'AI',
                    uploaded_at: new Date().toISOString(),
                    ai_generated: true
                };
                onAddFile(newFile);
                setMode('gallery');
                setSourceImage(null);
                setStyleImage(null);
                setPrompt('');
            }
        } catch (e) {
            alert('Ошибка генерации');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'source' | 'style') => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    if (type === 'source') setSourceImage(ev.target.result as string);
                    else setStyleImage(ev.target.result as string);
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleImageClick = (e: React.MouseEvent) => {
        if (!markerMode || !imageRef.current || !selectedFile) return;
        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        const newMarker: DesignMarker = {
            id: uuidv4(),
            x, y,
            pageIndex: 0,
            comment: 'Новая метка'
        };

        const updatedFile = {
            ...selectedFile,
            markers: [...(selectedFile.markers || []), newMarker]
        };
        onUpdateFile(updatedFile);
        setSelectedFile(updatedFile); // Update local view
    };

    const handleLinkTask = (markerId: string, entityId: string, type: 'Task' | 'EstimateItem') => {
        if (!selectedFile) return;
        const updatedMarkers = selectedFile.markers?.map(m => 
            m.id === markerId ? { ...m, linkedEntityId: entityId, linkedEntityType: type } : m
        );
        const updatedFile = { ...selectedFile, markers: updatedMarkers };
        onUpdateFile(updatedFile);
        setSelectedFile(updatedFile);
    };

    return (
        <div className="h-[650px] flex flex-col">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-2">
                    <button onClick={() => setMode('gallery')} className={`px-4 py-2 rounded-lg text-sm font-bold ${mode === 'gallery' ? 'bg-blue-100 text-blue-700' : 'bg-white border border-slate-200'}`}>Галерея</button>
                    <button onClick={() => setMode('generator')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center ${mode === 'generator' ? 'bg-purple-100 text-purple-700' : 'bg-white border border-slate-200'}`}><Sparkles size={16} className="mr-2"/> AI Генератор</button>
                </div>
                <button className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center"><UploadCloud size={16} className="mr-2"/> Загрузить</button>
            </div>

            {mode === 'gallery' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto p-1">
                    {designFiles.map((file: DesignFile) => (
                        <div key={file.id} onClick={() => { setSelectedFile(file); setMode('annotator'); }} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden cursor-pointer border border-slate-200 hover:shadow-md transition-all">
                            <img src={file.url} alt={file.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-end p-4">
                                <div className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-full">
                                    <p className="font-bold text-sm truncate">{file.name}</p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{file.category}</span>
                                        {file.markers && file.markers.length > 0 && <span className="text-xs flex items-center"><MapPin size={12} className="mr-1"/> {file.markers.length}</span>}
                                    </div>
                                </div>
                            </div>
                            {file.ai_generated && <div className="absolute top-2 right-2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center"><Sparkles size={10} className="mr-1"/> AI</div>}
                        </div>
                    ))}
                </div>
            )}

            {mode === 'generator' && (
                <div className="flex-1 bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row gap-8">
                    <div className="w-full md:w-1/3 space-y-4 overflow-y-auto pr-2">
                        <h3 className="font-bold text-lg flex items-center"><Wand2 size={20} className="mr-2 text-purple-600"/> Настройки генерации</h3>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Промпт (Описание)</label>
                            <textarea 
                                className="w-full p-3 border border-slate-300 rounded-lg h-32 text-sm focus:border-purple-500 outline-none" 
                                placeholder="Современная кухня в светлых тонах, мраморная столешница, скрытая подсветка..."
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Стиль</label>
                            <select className="w-full p-2 border border-slate-300 rounded-lg" value={styleId} onChange={e => setStyleId(e.target.value)}>
                                {companySettings.designStyles?.map((s: DesignStyleConfig) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 truncate">Исходное фото</label>
                                <input type="file" accept="image/*" ref={sourceInputRef} className="hidden" onChange={(e) => handleImageSelect(e, 'source')} />
                                <div 
                                    onClick={() => sourceInputRef.current?.click()} 
                                    className="w-full h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 overflow-hidden relative"
                                >
                                    {sourceImage ? (
                                        <>
                                            <img src={sourceImage} className="w-full h-full object-cover opacity-60" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-[10px] font-bold">Изменить</div>
                                        </>
                                    ) : (
                                        <div className="text-slate-400 text-center text-[10px]">
                                            <Image size={16} className="mx-auto mb-1"/>
                                            Загрузить
                                        </div>
                                    )}
                                </div>
                                {sourceImage && <button onClick={() => { setSourceImage(null); if (sourceInputRef.current) sourceInputRef.current.value = ''; }} className="text-[10px] text-red-500 mt-1 hover:underline block w-full text-center">Удалить</button>}
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 truncate">Референс стиля</label>
                                <input type="file" accept="image/*" ref={styleInputRef} className="hidden" onChange={(e) => handleImageSelect(e, 'style')} />
                                <div 
                                    onClick={() => styleInputRef.current?.click()} 
                                    className="w-full h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 overflow-hidden relative"
                                >
                                    {styleImage ? (
                                        <>
                                            <img src={styleImage} className="w-full h-full object-cover opacity-60" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-[10px] font-bold">Изменить</div>
                                        </>
                                    ) : (
                                        <div className="text-slate-400 text-center text-[10px]">
                                            <Palette size={16} className="mx-auto mb-1"/>
                                            Загрузить
                                        </div>
                                    )}
                                </div>
                                {styleImage && <button onClick={() => { setStyleImage(null); if (styleInputRef.current) styleInputRef.current.value = ''; }} className="text-[10px] text-red-500 mt-1 hover:underline block w-full text-center">Удалить</button>}
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate} 
                            disabled={isGenerating || !prompt}
                            className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center shadow-lg shadow-purple-200"
                        >
                            {isGenerating ? <Loader2 size={20} className="animate-spin"/> : 'Сгенерировать'}
                        </button>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
                        {isGenerating ? (
                            <div className="text-center text-purple-600">
                                <Sparkles size={48} className="mx-auto mb-4 animate-pulse"/>
                                <p>AI создает визуализацию...</p>
                            </div>
                        ) : (
                            <div className="text-slate-400 text-center">
                                <Image size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>Результат появится здесь</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {mode === 'annotator' && selectedFile && (
                <div className="flex-1 flex flex-col bg-slate-900 rounded-xl overflow-hidden relative">
                    <div className="absolute top-4 left-4 z-20 flex space-x-2">
                        <button onClick={() => setMode('gallery')} className="p-2 bg-white/90 hover:bg-white rounded-lg"><ArrowLeft size={20}/></button>
                        <button onClick={() => setMarkerMode(!markerMode)} className={`p-2 rounded-lg ${markerMode ? 'bg-blue-600 text-white' : 'bg-white/90 hover:bg-white'}`}>
                            <MapPin size={20} /> {markerMode ? 'Режим меток ВКЛ' : 'Добавить метку'}
                        </button>
                    </div>
                    <div className="flex-1 relative overflow-auto flex items-center justify-center bg-black/50">
                        <div className="relative inline-block">
                            <img 
                                ref={imageRef}
                                src={selectedFile.url} 
                                alt="Annotation Target" 
                                className={`max-h-[80vh] object-contain ${markerMode ? 'cursor-crosshair' : 'cursor-default'}`}
                                onClick={handleImageClick}
                            />
                            {selectedFile.markers?.map(marker => (
                                <div 
                                    key={marker.id}
                                    className="absolute w-6 h-6 -ml-3 -mt-3 bg-blue-600 border-2 border-white rounded-full shadow-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-125 transition-transform group"
                                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                                >
                                    {marker.linkedEntityId ? <CheckCircle2 size={14}/> : <Plus size={14}/>}
                                    
                                    {/* Tooltip / Popover */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-slate-800 p-3 rounded-lg shadow-xl w-64 hidden group-hover:block z-30">
                                        <p className="font-bold mb-2 text-sm">{marker.comment}</p>
                                        <select 
                                            className="w-full text-xs border rounded p-1 mb-1"
                                            onChange={(e) => handleLinkTask(marker.id, e.target.value, 'Task')}
                                            value={marker.linkedEntityId || ''}
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <option value="">Привязать задачу...</option>
                                            {tasks.map((t:any) => <option key={t.id} value={t.id}>{t.title}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// 4. CHAT MODULE
const ProjectChatModule = ({ project, messages, currentUser, onSendMessage, estimates, docs }: any) => {
    const [activeChat, setActiveChat] = useState<ChatType>('Internal');
    const [inputText, setInputText] = useState('');
    const chatRef = useRef<HTMLDivElement>(null);

    const filteredMessages = messages.filter((m: ChatMessage) => m.project_id === project.id && m.type === activeChat);

    const handleSend = () => {
        if (!inputText.trim()) return;
        onSendMessage({
            id: uuidv4(),
            project_id: project.id,
            type: activeChat,
            user_id: currentUser.id,
            text: inputText,
            timestamp: new Date().toISOString()
        });
        setInputText('');
    };

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [filteredMessages]);

    return (
        <div className="flex h-[600px] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col">
                <div className="p-4 font-bold text-slate-700 border-b border-slate-200">Чаты проекта</div>
                <button 
                    onClick={() => setActiveChat('Internal')}
                    className={`p-4 text-left hover:bg-white transition-colors border-b border-slate-100 ${activeChat === 'Internal' ? 'bg-white border-l-4 border-l-blue-600' : ''}`}
                >
                    <div className="font-bold text-slate-800">Внутренний чат</div>
                    <div className="text-xs text-slate-500">Команда проекта</div>
                </button>
                <button 
                    onClick={() => setActiveChat('Client')}
                    className={`p-4 text-left hover:bg-white transition-colors border-b border-slate-100 ${activeChat === 'Client' ? 'bg-white border-l-4 border-l-green-600' : ''}`}
                >
                    <div className="font-bold text-slate-800">Чат с Заказчиком</div>
                    <div className="text-xs text-slate-500">Официальная переписка</div>
                </button>
            </div>
            <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-slate-200 font-bold flex justify-between items-center">
                    <span>{activeChat === 'Internal' ? 'Командное обсуждение' : 'Чат с Клиентом'}</span>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded">{project.name}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={chatRef}>
                    {filteredMessages.map((msg: ChatMessage) => {
                        const isMe = msg.user_id === currentUser.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-2xl p-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 rounded-bl-none'}`}>
                                    {!isMe && <div className="text-xs font-bold opacity-50 mb-1">{msg.user_id}</div>}
                                    <div>{msg.text}</div>
                                    {msg.attachment && (
                                        <div className="mt-2 p-2 bg-black/10 rounded-lg flex items-center cursor-pointer hover:bg-black/20">
                                            <FileText size={16} className="mr-2"/>
                                            <div>
                                                <div className="text-xs font-bold">{msg.attachment.title}</div>
                                                <div className="text-[10px] opacity-80">{msg.attachment.subtext}</div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-[10px] opacity-50 text-right mt-1">{new Date(msg.timestamp).toLocaleTimeString().slice(0,5)}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-4 bg-white border-t border-slate-200">
                    <div className="flex items-center space-x-2">
                        <button className="p-2 text-slate-400 hover:text-blue-600 rounded-full hover:bg-slate-100"><Paperclip size={20}/></button>
                        <input 
                            className="flex-1 bg-slate-100 border-0 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Напишите сообщение..."
                            value={inputText}
                            onChange={e => setInputText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                        />
                        <button onClick={handleSend} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"><Send size={20}/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 5. ACTS MODULE (Simple View)
const ProjectActsModule = ({ acts, currentUser, onAddAct }: any) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Акты выполненных работ (КС-2, КС-3)</h3>
            <button onClick={onAddAct} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center">
                <Plus size={16} className="mr-2"/> Создать акт
            </button>
        </div>
        {acts.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">Нет актов</div>
        ) : (
            <div className="grid gap-4">
                {acts.map((act: WorkCompletionAct) => (
                    <div key={act.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div>
                            <div className="font-bold text-lg">{act.number} <span className="text-slate-400 text-sm font-normal">от {act.date}</span></div>
                            <div className="text-sm text-slate-500">Позиций: {act.items.length}</div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-blue-600 text-lg">{act.items.reduce((s, i) => s + i.total_amount, 0).toLocaleString()} ₽</div>
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${act.status === 'Signed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{act.status}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

// 6. PHOTOS MODULE
const ProjectPhotosModule = ({ photos, onUpload }: any) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Фотоотчеты</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center"><Camera size={16} className="mr-2"/> Загрузить фото</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((post: PhotoStreamPost) => (
                <div key={post.id} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden shadow-sm cursor-pointer">
                    <img src={post.photo_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-white text-sm font-medium line-clamp-2">{post.caption}</p>
                        <p className="text-white/70 text-xs mt-1">{new Date(post.timestamp).toLocaleDateString()}</p>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// 7. COMPLETATION/SPECIFICATION MODULE (NEW)
const ProjectSpecificationsModule = ({ specifications, onAdd, onUpdate }: any) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg">Комплектация и Спецификации</h3>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center"><Plus size={16} className="mr-2"/> Добавить позицию</button>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                        <tr>
                            <th className="p-3 w-16">Фото</th>
                            <th className="p-3">Наименование</th>
                            <th className="p-3">Категория</th>
                            <th className="p-3 text-right">Кол-во</th>
                            <th className="p-3 text-right">Бюджет</th>
                            <th className="p-3">Статус Закупки</th>
                            <th className="p-3">Согласование</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {specifications.map((item: SpecificationItem) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="p-3">
                                    {item.photo_url ? (
                                        <img src={item.photo_url} alt={item.name} className="w-10 h-10 rounded object-cover bg-slate-200" />
                                    ) : (
                                        <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-400"><Image size={20}/></div>
                                    )}
                                </td>
                                <td className="p-3 font-medium text-slate-800">{item.name}</td>
                                <td className="p-3 text-slate-500">{item.category}</td>
                                <td className="p-3 text-right font-medium">{item.quantity} {item.unit}</td>
                                <td className="p-3 text-right">{item.price_plan.toLocaleString()} ₽</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        item.procurement_status === 'Ordered' ? 'bg-blue-100 text-blue-700' :
                                        item.procurement_status === 'OnSite' ? 'bg-green-100 text-green-700' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {item.procurement_status === 'Ordered' ? 'Заказано' : item.procurement_status === 'OnSite' ? 'На объекте' : 'Не заказано'}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        item.client_status === 'Approved' ? 'bg-green-100 text-green-700' :
                                        item.client_status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                        item.client_status === 'Review' ? 'bg-purple-100 text-purple-700' :
                                        'bg-slate-100 text-slate-400'
                                    }`}>
                                        {item.client_status || 'Не отправлено'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {specifications.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-slate-400">Список пуст</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- GANTT CHART COMPONENTS ---

// SVG Utilities
const getBarX = (date: string, startDate: Date, dayWidth: number) => {
    const diff = Math.ceil((new Date(date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff * dayWidth);
};

const getBarWidth = (start: string, end: string, dayWidth: number) => {
    const diff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(dayWidth, diff * dayWidth);
};

const InteractiveGantt = ({ items, onUpdateItems, supplyRequests, aiConfig, projectStart }: any) => {
    const [zoom, setZoom] = useState(40); // px per day
    const [showCriticalPath, setShowCriticalPath] = useState(false);
    const [viewMode, setViewMode] = useState<'Days' | 'Weeks'>('Days');
    const [tasks, setTasks] = useState<any[]>([]);
    const [isAutoScheduling, setIsAutoScheduling] = useState(false);
    const [isDragDrawing, setIsDragDrawing] = useState(false);
    const [dragStartTask, setDragStartTask] = useState<string | null>(null);
    const [drawingLine, setDrawingLine] = useState<{x1: number, y1: number, x2: number, y2: number} | null>(null);
    const [editTask, setEditTask] = useState<EstimateItem | null>(null);

    // Flatten and Prepare Data
    useEffect(() => {
        const flatTasks = items.filter((i:any) => i.start_date && i.end_date).map((i:any) => ({
            ...i,
            // Calculate CPM properties later
        }));
        setTasks(flatTasks);
    }, [items]);

    // Calculate Critical Path (Simple Implementation)
    const criticalPathIds = useMemo(() => {
        if (!showCriticalPath) return new Set();
        // Simplified CPM: Find longest path
        // 1. Build graph
        const graph: Record<string, string[]> = {};
        tasks.forEach(t => {
            if (t.dependencies) {
                t.dependencies.forEach((dep: string) => {
                    if (!graph[dep]) graph[dep] = [];
                    graph[dep].push(t.id);
                });
            }
        });
        
        // This is a placeholder for full CPM (ES, EF, LS, LF).
        // For visual demo, we highlight tasks with 0 slack or tasks on the latest finish chain.
        // Here we just highlight dependent chains for demo.
        return new Set(tasks.filter(t => t.dependencies?.length > 0 || tasks.some(child => child.dependencies?.includes(t.id))).map(t => t.id));
    }, [tasks, showCriticalPath]);

    // Viewport Calculations
    const minDate = useMemo(() => {
        if (tasks.length === 0) return new Date();
        const dates = tasks.map(t => new Date(t.start_date).getTime());
        return new Date(Math.min(...dates) - 7 * 24 * 60 * 60 * 1000); // buffer
    }, [tasks]);

    const maxDate = useMemo(() => {
        if (tasks.length === 0) return new Date();
        const dates = tasks.map(t => new Date(t.end_date).getTime());
        return new Date(Math.max(...dates) + 14 * 24 * 60 * 60 * 1000); // buffer
    }, [tasks]);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 3600 * 24));
    const chartWidth = totalDays * zoom;

    // Drag Logic
    const handleDragStart = (e: React.DragEvent, task: any, type: 'move' | 'resize') => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: task.id, type, originalStart: task.start_date, originalEnd: task.end_date, startX: e.clientX }));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const dataStr = e.dataTransfer.getData('text/plain');
        if (!dataStr) return;
        const data = JSON.parse(dataStr);
        
        const diffPx = e.clientX - data.startX;
        const diffDays = Math.round(diffPx / zoom);

        if (diffDays === 0) return;

        const task = tasks.find(t => t.id === data.id);
        if (!task) return;

        let newStart = new Date(task.start_date);
        let newEnd = new Date(task.end_date);

        if (data.type === 'move') {
            newStart.setDate(newStart.getDate() + diffDays);
            newEnd.setDate(newEnd.getDate() + diffDays);
        } else {
            newEnd.setDate(newEnd.getDate() + diffDays);
            if (newEnd < newStart) newEnd = newStart;
        }

        onUpdateItems({
            ...task,
            start_date: newStart.toISOString().split('T')[0],
            end_date: newEnd.toISOString().split('T')[0]
        });
    };

    const handleAutoSchedule = async () => {
        setIsAutoScheduling(true);
        try {
            const scheduled = await AIService.optimizeSchedule(items, projectStart, aiConfig);
            // Bulk update
            const updates = items.map((i:any) => {
                const s = scheduled.find(sch => sch.id === i.id);
                return s ? { ...i, start_date: s.start_date, end_date: s.end_date, dependencies: s.dependencies } : i;
            });
            // In real app: onUpdateItems(updates); 
            // Since we need individual updates for this mock context:
            updates.forEach((u:any) => onUpdateItems(u));
        } catch (e) {
            alert("Ошибка авто-планирования");
        } finally {
            setIsAutoScheduling(false);
        }
    };

    // Drawing Dependencies
    const handleMouseDownDependency = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        setIsDragDrawing(true);
        setDragStartTask(taskId);
        const rect = (e.target as Element).getBoundingClientRect();
        // Adjust coordinates relative to SVG container later, for now screen
    };

    // Render Time Axis
    const renderTimeAxis = () => {
        const days = [];
        for (let i = 0; i < totalDays; i++) {
            const d = new Date(minDate);
            d.setDate(d.getDate() + i);
            const isToday = new Date().toDateString() === d.toDateString();
            days.push(
                <div key={i} className={`flex-shrink-0 border-r border-slate-100 text-[10px] text-slate-400 flex flex-col items-center justify-end pb-1 h-10 ${isToday ? 'bg-blue-50 font-bold text-blue-600' : ''}`} style={{ width: zoom }}>
                    <span>{d.getDate()}</span>
                    {isToday && <div className="h-full absolute w-px bg-blue-500 top-0 z-10 opacity-50"></div>}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="flex flex-col h-[600px] bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <h3 className="font-bold text-slate-800">График производства работ</h3>
                    <div className="flex bg-white rounded-lg border border-slate-300 overflow-hidden p-0.5">
                        <button onClick={() => setZoom(Math.max(20, zoom - 10))} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft size={16}/></button>
                        <span className="px-2 text-xs font-medium flex items-center">Zoom</span>
                        <button onClick={() => setZoom(Math.min(100, zoom + 10))} className="p-1 hover:bg-slate-100 rounded"><ChevronRight size={16}/></button>
                    </div>
                    <button 
                        onClick={() => setShowCriticalPath(!showCriticalPath)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center ${showCriticalPath ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-300 text-slate-600'}`}
                    >
                        <AlertTriangle size={14} className="mr-2"/> Критический путь (CPM)
                    </button>
                </div>
                <div className="flex items-center space-x-3">
                    <button className="flex items-center px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
                        <Download size={16} className="mr-2"/> Экспорт
                    </button>
                    <button 
                        onClick={handleAutoSchedule}
                        disabled={isAutoScheduling}
                        className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 shadow-lg shadow-purple-200"
                    >
                        {isAutoScheduling ? <Loader2 size={16} className="animate-spin mr-2"/> : <Sparkles size={16} className="mr-2"/>}
                        AI Авто-планирование
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar (Task List) */}
                <div className="w-80 border-r border-slate-200 flex flex-col bg-white shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
                    <div className="h-10 border-b border-slate-100 flex items-center px-4 text-xs font-bold text-slate-500 uppercase bg-slate-50">
                        Задача
                    </div>
                    <div className="flex-1 overflow-y-hidden hover:overflow-y-auto">
                        {items.map((item: any) => (
                            <div key={item.id} className={`h-10 flex items-center px-4 border-b border-slate-50 text-sm ${item.item_type !== 'Position' ? 'font-bold bg-slate-50/50' : ''}`}>
                                <span className="truncate" title={item.name}>{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Canvas */}
                <div className="flex-1 overflow-auto relative bg-slate-50/30" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                    <div className="sticky top-0 z-20 bg-white border-b border-slate-200 flex" style={{ width: chartWidth }}>
                        {/* Month Header could go here */}
                        <div className="flex">
                            {renderTimeAxis()}
                        </div>
                    </div>
                    
                    <div className="relative" style={{ width: chartWidth, height: items.length * 40 }}>
                        {/* Today Line */}
                        <div className="absolute top-0 bottom-0 border-l-2 border-red-500 z-0 pointer-events-none opacity-30" style={{ left: getBarX(new Date().toISOString(), minDate, zoom) }}></div>

                        {items.map((item: any, index: number) => {
                            if (!item.start_date || !item.end_date) return <div key={item.id} className="h-10 border-b border-slate-50/50" />;
                            
                            const x = getBarX(item.start_date, minDate, zoom);
                            const width = getBarWidth(item.start_date, item.end_date, zoom);
                            const isCritical = criticalPathIds.has(item.id);
                            
                            // Check Supply
                            const supplyReq = supplyRequests.find((s:any) => s.estimate_item_id === item.id);
                            const hasSupplyIssue = supplyReq && supplyReq.status !== SupplyRequestStatus.Delivered && new Date() > new Date(item.start_date);

                            return (
                                <div key={item.id} className="h-10 border-b border-slate-100 relative group">
                                    {/* The Bar */}
                                    <div 
                                        className={`absolute top-2 h-6 rounded-md shadow-sm flex items-center px-2 text-xs text-white cursor-pointer transition-all 
                                            ${item.item_type !== 'Position' ? 'bg-slate-800 opacity-80' : 
                                              isCritical ? 'bg-red-500' : 'bg-blue-500 hover:bg-blue-600'}
                                            ${hasSupplyIssue ? 'bg-[url("https://www.transparenttextures.com/patterns/diagmonds-light.png")]' : ''}
                                        `}
                                        style={{ left: x, width }}
                                        draggable={item.item_type === 'Position'}
                                        onDragStart={(e) => handleDragStart(e, item, 'move')}
                                        onClick={() => setEditTask(item)}
                                    >
                                        <span className="truncate w-full font-medium">{width > 40 ? item.name : ''}</span>
                                        
                                        {/* Resize Handle */}
                                        {item.item_type === 'Position' && (
                                            <div 
                                                className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-black/20 rounded-r-md"
                                                draggable
                                                onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, item, 'resize'); }}
                                            ></div>
                                        )}

                                        {/* Supply Warning Icon */}
                                        {hasSupplyIssue && (
                                            <div className="absolute -top-2 -right-2 bg-amber-500 text-white rounded-full p-0.5 shadow-sm z-20" title="Задержка материалов!">
                                                <Truck size={10} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Dependencies Lines (SVG Overlay would go here in full implementation, simplifying to simple connectors for now) */}
                                    {/* Dependency creation dot */}
                                    <div 
                                        className="absolute top-3 right-0 w-3 h-3 bg-white border-2 border-slate-400 rounded-full opacity-0 group-hover:opacity-100 cursor-crosshair z-30"
                                        style={{ left: x + width + 2 }}
                                        onMouseDown={(e) => handleMouseDownDependency(e, item.id)}
                                    ></div>
                                </div>
                            );
                        })}
                        
                        {/* SVG Layer for Dependencies */}
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                            {items.map((item:any, idx: number) => (
                                item.dependencies?.map((depId: string) => {
                                    const parent = items.find((i:any) => i.id === depId);
                                    if (!parent || !parent.end_date || !item.start_date) return null;
                                    
                                    const pIdx = items.findIndex((i:any) => i.id === depId);
                                    
                                    const x1 = getBarX(parent.end_date, minDate, zoom) + getBarWidth(parent.start_date, parent.end_date, zoom);
                                    const y1 = pIdx * 40 + 20;
                                    const x2 = getBarX(item.start_date, minDate, zoom);
                                    const y2 = idx * 40 + 20;

                                    // Bezier Curve
                                    const c1 = x1 + 20;
                                    const c2 = x2 - 20;

                                    return (
                                        <path 
                                            key={`${item.id}-${depId}`}
                                            d={`M ${x1} ${y1} C ${c1} ${y1}, ${c2} ${y2}, ${x2} ${y2}`}
                                            fill="none"
                                            stroke={criticalPathIds.has(item.id) && criticalPathIds.has(depId) ? "#ef4444" : "#cbd5e1"}
                                            strokeWidth="2"
                                            markerEnd="url(#arrowhead)"
                                        />
                                    );
                                })
                            ))}
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                                </marker>
                            </defs>
                        </svg>
                    </div>
                </div>
            </div>

            {/* Edit Task Modal */}
            {editTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-96">
                        <h3 className="font-bold text-lg mb-4">Редактировать задачу</h3>
                        <input className="w-full border rounded p-2 mb-2" value={editTask.name} onChange={(e) => setEditTask({...editTask, name: e.target.value})} />
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div>
                                <label className="text-xs text-slate-500">Начало</label>
                                <input type="date" className="w-full border rounded p-2" value={editTask.start_date} onChange={(e) => setEditTask({...editTask, start_date: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Конец</label>
                                <input type="date" className="w-full border rounded p-2" value={editTask.end_date} onChange={(e) => setEditTask({...editTask, end_date: e.target.value})} />
                            </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => setEditTask(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Отмена</button>
                            <button onClick={() => { onUpdateItems(editTask); setEditTask(null); }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Сохранить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ProjectScheduleModule = ({ project, estimateItems, bulkUpdateEstimateItems, supplyRequests, aiConfig, currentUser }: any) => {
    // Separate pure logic items for Gantt
    const ganttItems = estimateItems.filter((i: any) => i.item_type !== 'Material'); // Assuming we focus on Work/Stages for schedule

    return (
        <div className="space-y-6">
            <InteractiveGantt 
                items={estimateItems}
                onUpdateItems={(item: any) => bulkUpdateEstimateItems([item])} // Update single
                supplyRequests={supplyRequests}
                aiConfig={aiConfig}
                projectStart={project.contract_date}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center"><Target size={16} className="mr-2"/> Критический путь</h4>
                    <p className="text-xs text-blue-600">Задачи на красной линии влияют на срок сдачи. Любая задержка сдвинет финал.</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <h4 className="font-bold text-amber-800 text-sm mb-2 flex items-center"><Truck size={16} className="mr-2"/> Поставки</h4>
                    <p className="text-xs text-amber-600">Полосатые задачи имеют проблемы с поставкой материалов. Проверьте модуль снабжения.</p>
                </div>
            </div>
        </div>
    );
};

// --- Tab Navigation Component ---
const ProjectTab = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button 
    onClick={() => onClick(id)}
    className={clsx(
      "flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap text-sm font-medium",
      active 
        ? "bg-blue-600 text-white shadow-md" 
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    )}
  >
    <Icon size={16} />
    <span>{label}</span>
  </button>
);

// --- MAIN PAGE COMPONENT ---

export const ProjectDashboard = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const { 
      projects, estimates, estimateItems, payments, events, tasks, 
      chatMessages, designFiles, photoStream, documents, acts, specifications,
      updateEstimate, bulkUpdateEstimateItems, sendNotification, supplyRequests, 
      aiConfig, currentUser, companySettings,
      addDesignFile, updateDesignFile, addChatMessage, addPhotoStreamPost, addAct
  } = useApp();
  
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => setSearchParams({ tab });

  const project = projects.find(p => p.id === id);
  const projectEstimates = estimates.filter(e => e.project_id === id);
  const projectItems = estimateItems.filter(i => projectEstimates.some(e => e.id === i.estimate_id));
  const projectPayments = payments.filter(p => p.project_id === id);
  const projectEvents = events.filter(e => e.project_id === id);
  const projectChats = chatMessages.filter(c => c.project_id === id);
  const projectDesign = designFiles.filter(f => f.project_id === id);
  const projectPhotos = photoStream.filter(p => p.project_id === id);
  const projectDocs = documents.filter(d => d.project_id === id);
  const projectActs = acts.filter(a => a.project_id === id);
  const projectSpecs = specifications.filter((s:any) => s.project_id === id);

  if (!project) {
    return <div className="p-8 text-center text-slate-500">Проект не найден</div>;
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] animate-in fade-in duration-300">
      <div className="flex-1 p-4 md:p-6 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/projects')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
                <div className="flex items-center text-slate-500 text-sm mt-1 space-x-4">
                  <span className="flex items-center"><MapPin size={14} className="mr-1"/> {project.address}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    project.status === ProjectStatus.Active ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{project.status}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Настройки"><Settings size={20} /></button>
            </div>
          </div>

          {/* Top Navigation Tabs */}
          <div className="flex overflow-x-auto space-x-1 pb-4 mb-4 border-b border-slate-200">
              <ProjectTab id="overview" label="Обзор" icon={FileText} active={activeTab === 'overview'} onClick={setActiveTab} />
              <ProjectTab id="estimates" label="Сметы" icon={Calculator} active={activeTab === 'estimates'} onClick={setActiveTab} />
              <ProjectTab id="schedule" label="Графики" icon={Calendar} active={activeTab === 'schedule'} onClick={setActiveTab} />
              <ProjectTab id="design" label="Дизайн" icon={Paintbrush} active={activeTab === 'design'} onClick={setActiveTab} />
              <ProjectTab id="supply" label="Снабжение" icon={Truck} active={activeTab === 'supply'} onClick={setActiveTab} />
              <ProjectTab id="complectation" label="Комплектация" icon={PackageCheck} active={activeTab === 'complectation'} onClick={setActiveTab} />
              <ProjectTab id="docs" label="Документы" icon={Folder} active={activeTab === 'docs'} onClick={setActiveTab} />
              <ProjectTab id="acts" label="Акты" icon={ScrollText} active={activeTab === 'acts'} onClick={setActiveTab} />
              <ProjectTab id="finance" label="Финансы" icon={Banknote} active={activeTab === 'finance'} onClick={setActiveTab} />
              <ProjectTab id="team" label="Чаты" icon={MessagesSquare} active={activeTab === 'team'} onClick={setActiveTab} />
              <ProjectTab id="photos" label="Фотоотчеты" icon={Camera} active={activeTab === 'photos'} onClick={setActiveTab} />
          </div>

          {/* Module Content */}
          <div className="min-h-[500px]">
            {activeTab === 'overview' && (
                <ProjectOverviewModule 
                    project={project} 
                    estimates={projectEstimates} 
                    payments={projectPayments} 
                    events={projectEvents}
                    chatMessages={projectChats}
                    aiConfig={aiConfig}
                />
            )}

            {activeTab === 'estimates' && (
              <ProjectEstimatesModule 
                project={project}
                estimates={projectEstimates}
                estimateItems={projectItems}
                navigate={navigate}
                onUpdateEstimate={updateEstimate}
                sendNotification={sendNotification}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'schedule' && (
                <ProjectScheduleModule 
                    project={project} 
                    estimateItems={projectItems}
                    bulkUpdateEstimateItems={bulkUpdateEstimateItems}
                    supplyRequests={supplyRequests}
                    aiConfig={aiConfig}
                    currentUser={currentUser}
                />
            )}

            {activeTab === 'design' && (
               <ProjectDesignModule 
                    project={project}
                    designFiles={projectDesign}
                    tasks={tasks}
                    estimateItems={projectItems}
                    aiConfig={aiConfig}
                    companySettings={companySettings}
                    onAddFile={addDesignFile}
                    onUpdateFile={updateDesignFile}
               />
            )}

            {activeTab === 'complectation' && (
                <ProjectSpecificationsModule 
                    specifications={projectSpecs}
                />
            )}

            {activeTab === 'team' && (
                <ProjectChatModule 
                    project={project}
                    messages={projectChats}
                    currentUser={currentUser}
                    onSendMessage={addChatMessage}
                />
            )}

            {activeTab === 'acts' && (
                <ProjectActsModule 
                    acts={projectActs} 
                    currentUser={currentUser}
                    onAddAct={() => addAct({
                        id: uuidv4(), project_id: project.id, number: 'Новый Акт', date: new Date().toISOString().split('T')[0], status: 'Draft', author_id: currentUser.id, items: []
                    })}
                />
            )}

            {activeTab === 'photos' && (
                <ProjectPhotosModule photos={projectPhotos} />
            )}

            {activeTab === 'finance' && (
                <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <Banknote size={48} className="mx-auto mb-4 opacity-20"/>
                    Модуль финансов проекта (P&L)
                </div>
            )}
            {activeTab === 'docs' && (
                <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <Folder size={48} className="mx-auto mb-4 opacity-20"/>
                    Реестр документов проекта
                </div>
            )}
            {activeTab === 'supply' && (
                <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <Truck size={48} className="mx-auto mb-4 opacity-20"/>
                    Управление закупками
                </div>
            )}
          </div>
      </div>
    </div>
  );
};
