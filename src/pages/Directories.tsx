
import React, { useState } from 'react';
import { useApp } from '../App.tsx';
import { 
  User, Briefcase, Phone, Mail, Folder, File, 
  ChevronRight, ChevronDown, Plus, Edit2, Trash2, X, 
  FolderPlus, FilePlus, Search, Lock, Wallet, Landmark, TrendingUp, TrendingDown,
  Layers, BookOpen, ArrowRight, CheckSquare, Square
} from 'lucide-react';
import { CounterpartyType, PriceListCategory, PriceListItem, UserRole, Transaction, TransactionStatus, OperationType, FinancialArticle, OperationTemplate, OperationTemplateItem, ResourceType, CalculationType, CalculationTypeLabels } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';

export const Directories = () => {
  const [activeTab, setActiveTab] = useState<'counterparties' | 'pricelist' | 'finance_articles' | 'cash_accounts' | 'templates'>('counterparties');
  const { 
    counterparties, priceListCategories, priceListItems, currentUser,
    addPriceListCategory, updatePriceListCategory, deletePriceListCategory,
    addPriceListItem, updatePriceListItem, deletePriceListItem,
    cashAccounts, addCashAccount, updateCashAccount,
    financialArticles, addFinancialArticle, updateFinancialArticle, deleteFinancialArticle,
    transactions,
    operationTemplates, operationTemplateItems, addOperationTemplate, updateOperationTemplate, deleteOperationTemplate,
    addOperationTemplateItem, updateOperationTemplateItem, deleteOperationTemplateItem
  } = useApp();

  const canEdit = [UserRole.Director, UserRole.Admin, UserRole.ProjectManager, UserRole.Estimator, UserRole.SupplyManager].includes(currentUser.role);
  const canViewFinance = [UserRole.Director, UserRole.Admin, UserRole.ProjectManager].includes(currentUser.role);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [categoryModal, setCategoryModal] = useState<{ open: boolean, editing: PriceListCategory | null, parentId?: string }>({ open: false, editing: null });
  const [itemModal, setItemModal] = useState<{ open: boolean, editing: PriceListItem | null, categoryId?: string }>({ open: false, editing: null });
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [viewCounterpartyId, setViewCounterpartyId] = useState<string | null>(null);
  const [articleModal, setArticleModal] = useState<{ open: boolean, editing: FinancialArticle | null, parentId?: string }>({ open: false, editing: null });
  
  // Template Modals
  const [templateModal, setTemplateModal] = useState<{ open: boolean, editing: OperationTemplate | null }>({ open: false, editing: null });
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateItemModal, setTemplateItemModal] = useState<{ open: boolean, editing: OperationTemplateItem | null, templateId?: string }>({ open: false, editing: null });

  // Filtered Counterparties
  const filteredCounterparties = counterparties.filter(cp => 
    cp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    cp.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleSaveCategory = (category: PriceListCategory) => {
    if (categoryModal.editing) {
      updatePriceListCategory(category);
    } else {
      addPriceListCategory(category);
    }
    setCategoryModal({ open: false, editing: null });
  };

  const handleSaveItem = (item: PriceListItem) => {
    if (itemModal.editing) {
      updatePriceListItem(item);
    } else {
      addPriceListItem(item);
    }
    setItemModal({ open: false, editing: null });
  };

  const handleSaveArticle = (article: FinancialArticle) => {
    if (articleModal.editing) {
        updateFinancialArticle(article);
    } else {
        addFinancialArticle(article);
    }
    setArticleModal({ open: false, editing: null });
  };

  const selectedTemplate = operationTemplates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex-none">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Справочники</h1>
        
        {/* Tabs */}
        <div className="border-b border-slate-200 flex space-x-6 overflow-x-auto">
          <button 
            onClick={() => { setActiveTab('counterparties'); setSearchTerm(''); }}
            className={`pb-3 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'counterparties' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Контрагенты и Сотрудники
          </button>
          <button 
            onClick={() => { setActiveTab('pricelist'); setSearchTerm(''); }}
            className={`pb-3 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'pricelist' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Прайс-лист (Работы и Материалы)
          </button>
          <button 
            onClick={() => { setActiveTab('templates'); setSearchTerm(''); }}
            className={`pb-3 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'templates' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Шаблоны
          </button>
          {canViewFinance && (
             <>
                <button 
                   onClick={() => { setActiveTab('finance_articles'); setSearchTerm(''); }}
                   className={`pb-3 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'finance_articles' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   Статьи ДДС
                </button>
                <button 
                   onClick={() => { setActiveTab('cash_accounts'); setSearchTerm(''); }}
                   className={`pb-3 px-1 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'cash_accounts' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                   Счета и Кассы
                </button>
             </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-10">
        {activeTab === 'counterparties' ? (
          <div className="space-y-4">
             {/* Search Bar */}
             <div className="relative max-w-md">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Поиск по имени или типу..." 
                  className="w-full pl-9 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" 
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCounterparties.map(cp => {
                   // Calculate Balance for specific counterparty
                   const cpBalance = transactions
                      .filter(t => t.counterparty_id === cp.id && t.status === TransactionStatus.Paid)
                      .reduce((acc, t) => {
                          if (t.operation_type === OperationType.Income) return acc - t.amount; // We received money, so they owe us less (or we owe them service)
                          if (t.operation_type === OperationType.Expense) return acc + t.amount; // We paid them
                          return acc;
                      }, 0);
                   
                   return (
                     <div key={cp.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewCounterpartyId(cp.id)}>
                        <div className="flex justify-between items-start mb-4">
                           <div className={`p-3 rounded-full ${cp.type === CounterpartyType.Employee ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                              {cp.type === CounterpartyType.Employee ? <User size={20} /> : <Briefcase size={20} />}
                           </div>
                           <span className="text-xs font-medium px-2 py-1 bg-slate-100 rounded-md text-slate-600">{cp.type}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 mb-1">{cp.full_name}</h3>
                        {cp.role && <p className="text-sm text-slate-500 mb-4">{cp.role}</p>}
                        
                        <div className="space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-3 mt-2">
                           {cp.phone && <div className="flex items-center"><Phone size={14} className="mr-2 text-slate-400"/> {cp.phone}</div>}
                           {cp.email && <div className="flex items-center"><Mail size={14} className="mr-2 text-slate-400"/> {cp.email}</div>}
                           {canViewFinance && (
                              <div className="mt-3 pt-2 border-t border-dashed border-slate-200 flex justify-between items-center">
                                 <span className="text-xs text-slate-500">Оборот:</span>
                                 <span className="font-bold text-blue-600">{Math.abs(cpBalance).toLocaleString()} ₽</span>
                              </div>
                           )}
                        </div>
                     </div>
                   );
                })}
                
                {filteredCounterparties.length === 0 && (
                   <div className="col-span-full py-10 text-center text-slate-400">
                     Ничего не найдено.
                   </div>
                )}

                {/* Add New Button Placeholder */}
                {canEdit && (
                  <div className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer h-full min-h-[200px]">
                      <Plus size={32} className="mb-2" />
                      <span className="font-medium">Добавить контрагента</span>
                  </div>
                )}
             </div>
          </div>
        ) : activeTab === 'pricelist' ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
             {/* Toolbar */}
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                <div className="relative w-64">
                   <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                   <input 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     placeholder="Поиск позиций..." 
                     className="w-full pl-9 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" 
                   />
                </div>
                {canEdit && (
                  <button 
                    onClick={() => setCategoryModal({ open: true, editing: null })}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                     <FolderPlus size={16} />
                     <span>Корневая категория</span>
                  </button>
                )}
             </div>
             
             {/* Tree View */}
             <div className="p-4 overflow-y-auto flex-1">
                <PriceListTreeEditor 
                   categories={priceListCategories}
                   items={priceListItems}
                   canEdit={canEdit}
                   searchTerm={searchTerm}
                   onEditCategory={(cat) => setCategoryModal({ open: true, editing: cat })}
                   onDeleteCategory={deletePriceListCategory}
                   onAddSubCategory={(parentId) => setCategoryModal({ open: true, editing: null, parentId })}
                   onAddItem={(categoryId) => setItemModal({ open: true, editing: null, categoryId })}
                   onEditItem={(item) => setItemModal({ open: true, editing: item })}
                   onDeleteItem={deletePriceListItem}
                />
             </div>
          </div>
        ) : activeTab === 'templates' ? (
            <div className="flex flex-col md:flex-row gap-6 h-full">
               {/* Templates List (Master) */}
               <div className="w-full md:w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-shrink-0">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                     <h3 className="font-bold text-slate-800">Шаблоны</h3>
                     <button onClick={() => setTemplateModal({ open: true, editing: null })} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200">
                        <Plus size={16} />
                     </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                     {operationTemplates.map(tmpl => (
                        <div 
                           key={tmpl.id}
                           onClick={() => setSelectedTemplateId(tmpl.id)}
                           className={clsx(
                              "p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-colors",
                              selectedTemplateId === tmpl.id ? "bg-blue-50 border border-blue-200 shadow-sm" : "hover:bg-slate-50 border border-transparent"
                           )}
                        >
                           <div>
                              <div className="font-medium text-sm text-slate-800">{tmpl.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded inline-block">
                                 За {tmpl.base_quantity || 1} {tmpl.unit}
                              </div>
                           </div>
                           <div className="opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); setTemplateModal({ open: true, editing: tmpl }); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={14}/></button>
                              <button onClick={(e) => { e.stopPropagation(); deleteOperationTemplate(tmpl.id); if(selectedTemplateId===tmpl.id) setSelectedTemplateId(null); }} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                           </div>
                        </div>
                     ))}
                     {operationTemplates.length === 0 && (
                        <div className="p-4 text-center text-slate-400 text-sm">
                           Нет шаблонов. Создайте первый.
                        </div>
                     )}
                  </div>
               </div>

               {/* Template Details (Detail) */}
               <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                  {selectedTemplate ? (
                     <>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                           <div>
                              <h3 className="font-bold text-slate-800 text-lg">{selectedTemplate.name}</h3>
                              <p className="text-xs text-slate-500 mt-1 flex items-center">
                                 <span className="bg-white border px-2 py-0.5 rounded mr-2 font-medium">
                                    Норматив на: {selectedTemplate.base_quantity || 1} {selectedTemplate.unit}
                                 </span>
                                 {selectedTemplate.description}
                              </p>
                           </div>
                           <button onClick={() => setTemplateItemModal({ open: true, editing: null, templateId: selectedTemplateId })} className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
                              <Plus size={16} className="mr-2"/> Добавить позицию
                           </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
                           <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 sticky top-0">
                                 <tr>
                                    <th className="p-3 pl-6">Наименование</th>
                                    <th className="p-3 text-center">Тип</th>
                                    <th className="p-3 text-right">Расход</th>
                                    <th className="p-3 text-right">Цена за ед.</th>
                                    <th className="p-3 text-right">Стоимость</th>
                                    <th className="p-3 text-right w-20"></th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 {operationTemplateItems.filter(i => i.template_id === selectedTemplateId).map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 group">
                                      <td className="p-3 pl-6 font-medium text-slate-800">
                                           {item.name}
                                           {item.calc_types && item.calc_types.length > 0 && (
                                               <div className="flex space-x-1 mt-1">
                                                   {item.calc_types.map((t: CalculationType) => (
                                                       <span key={t} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-normal">
                                                           {CalculationTypeLabels[t]}
                                                       </span>
                                                   ))}
                                               </div>
                                           )}
                                      </td>
                                      <td className="p-3 text-center">
                                          <span className={clsx("px-2 py-0.5 rounded text-[10px] uppercase font-bold", item.resource_type === ResourceType.Work ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>
                                             {item.resource_type === ResourceType.Work ? "Работа" : "Материал"}
                                          </span>
                                       </td>
                                       <td className="p-3 text-right font-medium bg-yellow-50/50">
                                          {item.quantity_factor} {item.unit}
                                       </td>
                                       <td className="p-3 text-right text-slate-500">{item.cost_price.toLocaleString()} ₽</td>
                                       <td className="p-3 text-right font-bold text-slate-800">{(item.cost_price * (1 + item.markup/100) * item.quantity_factor).toLocaleString(undefined, {maximumFractionDigits: 0})} ₽</td>
                                       <td className="p-3 text-right">
                                          <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button onClick={() => setTemplateItemModal({ open: true, editing: item })} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Edit2 size={14}/></button>
                                             <button onClick={() => deleteOperationTemplateItem(item.id)} className="p-1 hover:bg-red-100 rounded text-red-500"><Trash2 size={14}/></button>
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                                 {operationTemplateItems.filter(i => i.template_id === selectedTemplateId).length === 0 && (
                                    <tr>
                                       <td colSpan={6} className="p-10 text-center text-slate-400">
                                          В этом шаблоне пока нет работ или материалов.
                                       </td>
                                    </tr>
                                 )}
                              </tbody>
                           </table>
                        </div>
                     </>
                  ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <Layers size={48} className="mb-4 opacity-20"/>
                        <p>Выберите шаблон слева или создайте новый</p>
                     </div>
                  )}
               </div>
            </div>
        ) : activeTab === 'finance_articles' ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                   <div>
                     <h3 className="font-bold text-lg text-slate-800">Статьи Движения Денежных Средств</h3>
                     <p className="text-sm text-slate-500">Иерархия статей для управленческого учета</p>
                   </div>
                   {canEdit && (
                     <button 
                       onClick={() => setArticleModal({ open: true, editing: null })}
                       className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                     >
                        <Plus size={16} />
                        <span>Добавить статью</span>
                     </button>
                   )}
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <FinancialArticleTree 
                        articles={financialArticles} 
                        onEdit={(article) => setArticleModal({ open: true, editing: article })}
                        onDelete={deleteFinancialArticle}
                        onAdd={(parentId) => setArticleModal({ open: true, editing: null, parentId })}
                        canEdit={canEdit}
                    />
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cashAccounts.map(acc => (
                    <div key={acc.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between h-40">
                        <div className="flex justify-between items-start">
                            <div className={`p-3 rounded-full ${acc.type === 'Bank' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                                {acc.type === 'Bank' ? <Landmark size={24}/> : <Wallet size={24}/>}
                            </div>
                            {acc.is_active ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Активен</span> : <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Архив</span>}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">{acc.name}</h3>
                            <p className="text-2xl font-bold text-slate-700 mt-1">{acc.balance.toLocaleString()} {acc.currency}</p>
                        </div>
                    </div>
                ))}
                <div className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center h-40 text-slate-400 hover:border-blue-400 hover:text-blue-600 cursor-pointer bg-slate-50" onClick={() => setAccountModalOpen(true)}>
                    <Plus size={32} className="mb-2" />
                    <span className="font-medium">Добавить счет</span>
                </div>
            </div>
        )}
      </div>

      {/* Modals */}
      {categoryModal.open && (
        <CategoryModal 
           isOpen={categoryModal.open}
           editingCategory={categoryModal.editing}
           parentId={categoryModal.parentId}
           onClose={() => setCategoryModal({ open: false, editing: null })}
           onSave={handleSaveCategory}
        />
      )}
      
      {itemModal.open && (
        <ItemModal 
           isOpen={itemModal.open}
           editingItem={itemModal.editing}
           categoryId={itemModal.categoryId}
           onClose={() => setItemModal({ open: false, editing: null })}
           onSave={handleSaveItem}
        />
      )}

      {articleModal.open && (
          <FinancialArticleModal
              isOpen={articleModal.open}
              editingArticle={articleModal.editing}
              parentId={articleModal.parentId}
              onClose={() => setArticleModal({ open: false, editing: null })}
              onSave={handleSaveArticle}
          />
      )}

      {templateModal.open && (
         <OperationTemplateModal 
            isOpen={templateModal.open}
            editing={templateModal.editing}
            onClose={() => setTemplateModal({ open: false, editing: null })}
            onSave={(tmpl) => {
               if (templateModal.editing) updateOperationTemplate(tmpl);
               else addOperationTemplate(tmpl);
               setTemplateModal({ open: false, editing: null });
            }}
         />
      )}

      {templateItemModal.open && (
         <OperationTemplateItemModal 
            isOpen={templateItemModal.open}
            editing={templateItemModal.editing}
            templateId={templateItemModal.templateId}
            template={operationTemplates.find(t => t.id === templateItemModal.templateId || t.id === templateItemModal.editing?.template_id)}
            categories={priceListCategories}
            items={priceListItems}
            onClose={() => setTemplateItemModal({ open: false, editing: null })}
            onSave={(item) => {
               if (templateItemModal.editing) updateOperationTemplateItem(item);
               else addOperationTemplateItem(item);
               setTemplateItemModal({ open: false, editing: null });
            }}
         />
      )}

      {/* Counterparty Detail Modal (Simple View) */}
      {viewCounterpartyId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewCounterpartyId(null)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
                 {(() => {
                     const cp = counterparties.find(c => c.id === viewCounterpartyId);
                     if(!cp) return null;
                     const cpTransactions = transactions.filter(t => t.counterparty_id === cp.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                     return (
                         <>
                             <div className="flex justify-between items-center mb-6">
                                 <h2 className="text-xl font-bold">{cp.full_name}</h2>
                                 <button onClick={() => setViewCounterpartyId(null)}><X/></button>
                             </div>
                             <div className="space-y-4">
                                 <div className="grid grid-cols-2 gap-4 text-sm">
                                     <div><span className="text-slate-500">Тип:</span> {cp.type}</div>
                                     <div><span className="text-slate-500">ИНН:</span> {cp.tax_id || '-'}</div>
                                     <div><span className="text-slate-500">Email:</span> {cp.email || '-'}</div>
                                     <div><span className="text-slate-500">Телефон:</span> {cp.phone || '-'}</div>
                                 </div>

                                 {canViewFinance && (
                                     <>
                                        <h3 className="font-bold text-lg mt-6 mb-2">История операций</h3>
                                        <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 sticky top-0">
                                                    <tr>
                                                        <th className="p-2">Дата</th>
                                                        <th className="p-2">Тип</th>
                                                        <th className="p-2 text-right">Сумма</th>
                                                        <th className="p-2">Статус</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {cpTransactions.map(t => (
                                                        <tr key={t.id} className="border-t border-slate-100">
                                                            <td className="p-2">{t.date}</td>
                                                            <td className="p-2">{t.operation_type}</td>
                                                            <td className={`p-2 text-right font-bold ${t.operation_type === OperationType.Income ? 'text-green-600' : 'text-red-600'}`}>
                                                                {t.operation_type === OperationType.Income ? '+' : '-'}{t.amount.toLocaleString()}
                                                            </td>
                                                            <td className="p-2 text-xs">{t.status}</td>
                                                        </tr>
                                                    ))}
                                                    {cpTransactions.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400">Нет операций</td></tr>}
                                                </tbody>
                                            </table>
                                        </div>
                                     </>
                                 )}
                             </div>
                         </>
                     )
                 })()}
              </div>
          </div>
      )}
    </div>
  );
};

// --- Tree Components ---

const FinancialArticleTree = ({ articles, parentId, onEdit, onDelete, onAdd, canEdit }: { 
    articles: FinancialArticle[], parentId?: string, onEdit: (a: FinancialArticle) => void, onDelete: (id: string) => void, onAdd: (parentId?: string) => void, canEdit: boolean 
}) => {
    const currentArticles = articles.filter(a => a.parent_id === parentId);

    return (
        <div className={`space-y-2 ${parentId ? 'pl-6 border-l border-slate-100 ml-2 mt-2' : ''}`}>
            {currentArticles.map(article => (
                <div key={article.id}>
                    <div className="flex items-center justify-between group py-2 px-3 border border-slate-100 bg-white rounded-lg hover:border-blue-200 hover:shadow-sm transition-all">
                        <div className="flex items-center flex-1">
                            <div className={`p-1.5 rounded mr-3 ${article.type === 'Income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {article.type === 'Income' ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                            </div>
                            <div>
                                <div className="font-medium text-sm text-slate-700">{article.name}</div>
                                {article.code && <div className="text-xs text-slate-400">Код: {article.code}</div>}
                            </div>
                        </div>
                        {canEdit && (
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => onAdd(article.id)} title="Добавить подстатью" className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><FolderPlus size={14} /></button>
                                <button onClick={() => onEdit(article)} title="Редактировать" className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"><Edit2 size={14} /></button>
                                <button onClick={() => onDelete(article.id)} title="Удалить" className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                            </div>
                        )}
                    </div>
                    {/* Recursive call */}
                    <FinancialArticleTree articles={articles} parentId={article.id} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} canEdit={canEdit} />
                </div>
            ))}
        </div>
    );
};

const FinancialArticleModal = ({ isOpen, editingArticle, parentId, onClose, onSave }: any) => {
    const [form, setForm] = useState({ 
        name: editingArticle?.name || '', 
        code: editingArticle?.code || '', 
        type: editingArticle?.type || 'Expense' 
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ 
            id: editingArticle?.id || uuidv4(), 
            parent_id: parentId || editingArticle?.parent_id,
            ...form 
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">{editingArticle ? 'Редактировать статью' : 'Новая статья ДДС'}</h3>
                    <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Тип</label>
                        <div className="flex space-x-2">
                            <button type="button" onClick={() => setForm({...form, type: 'Income'})} className={`flex-1 py-1.5 text-sm rounded border ${form.type === 'Income' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white text-slate-600'}`}>Доходы</button>
                            <button type="button" onClick={() => setForm({...form, type: 'Expense'})} className={`flex-1 py-1.5 text-sm rounded border ${form.type === 'Expense' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white text-slate-600'}`}>Расходы</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Название</label>
                        <input autoFocus value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Код (необязательно)</label>
                        <input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="flex space-x-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Отмена</button>
                        <button type="submit" className="flex-1 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PriceListTreeEditor = ({ 
  categories, items, parentId, canEdit, searchTerm,
  onEditCategory, onDeleteCategory, onAddSubCategory, 
  onAddItem, onEditItem, onDeleteItem,
  onSelect, // Optional: for Selection Mode
}: any) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };
  const currentCats = categories.filter((c: any) => c.parent_id === parentId);
  const currentItems = items.filter((i: any) => i.category_id === parentId);
  const filteredItems = searchTerm 
    ? currentItems.filter((i: any) => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : currentItems;

  return (
    <div className="space-y-2 pl-2">
      {currentCats.map((cat: any) => (
        <div key={cat.id} className="border-l-2 border-slate-100 pl-2">
           <div className="flex items-center justify-between group py-1 pr-2 hover:bg-slate-50 rounded">
              <div className="flex items-center flex-1 cursor-pointer select-none" onClick={() => toggle(cat.id)}>
                 <span className="text-slate-400 mr-1">
                   {expanded.has(cat.id) || searchTerm ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                 </span>
                 <Folder size={16} className="text-blue-500 mr-2 fill-blue-100" />
                 <span className="font-medium text-slate-800 text-sm">{cat.name}</span>
              </div>
              {canEdit && !onSelect && (
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => onAddSubCategory(cat.id)} title="Добавить подкатегорию" className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><FolderPlus size={14} /></button>
                   <button onClick={() => onAddItem(cat.id)} title="Добавить позицию" className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"><FilePlus size={14} /></button>
                   <button onClick={() => onEditCategory(cat)} title="Редактировать" className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"><Edit2 size={14} /></button>
                   <button onClick={() => onDeleteCategory(cat.id)} title="Удалить" className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                </div>
              )}
           </div>
           {(expanded.has(cat.id) || searchTerm) && (
             <div className="ml-4 mt-1">
                <PriceListTreeEditor categories={categories} items={items} parentId={cat.id} canEdit={canEdit} searchTerm={searchTerm} onEditCategory={onEditCategory} onDeleteCategory={onDeleteCategory} onAddSubCategory={onAddSubCategory} onAddItem={onAddItem} onEditItem={onEditItem} onDeleteItem={onDeleteItem} onSelect={onSelect} />
             </div>
           )}
        </div>
      ))}
      {filteredItems.length > 0 && (
         <div className="space-y-1 ml-6 mt-1">
           {filteredItems.map((item: any) => (
             <div 
               key={item.id} 
               className={clsx(
                 "flex items-center justify-between group py-2 px-3 border border-slate-100 bg-white rounded hover:border-blue-200 hover:shadow-sm transition-all",
                 onSelect ? "cursor-pointer hover:bg-blue-50" : ""
               )}
               onClick={() => onSelect && onSelect(item)}
             >
                <div className="flex items-center space-x-3 overflow-hidden">
                   <File size={14} className="text-slate-400 flex-shrink-0" />
                   <div className="truncate">
                     <div className="text-sm font-medium text-slate-700 truncate">{item.name}</div>
                     <div className="text-xs text-slate-400 flex flex-wrap gap-2 items-center mt-1">
                        <span>Себест: <span className="font-semibold text-slate-600">{item.cost_price} ₽</span></span>
                        <span>Ед: {item.unit}</span>
                        {item.calc_types && item.calc_types.length > 0 && (
                          <div className="flex space-x-1">
                            {item.calc_types.map((t: CalculationType) => (
                                <span key={t} className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">
                                    {CalculationTypeLabels[t]}
                                </span>
                            ))}
                          </div>
                        )}
                     </div>
                   </div>
                </div>
                {canEdit && !onSelect && (
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                     <button onClick={(e) => { e.stopPropagation(); onEditItem(item); }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={14} /></button>
                     <button onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                  </div>
                )}
             </div>
           ))}
         </div>
      )}
    </div>
  );
};

const CategoryModal = ({ isOpen, editingCategory, parentId, onClose, onSave }: any) => {
  const [name, setName] = useState(editingCategory?.name || '');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: editingCategory?.id || uuidv4(), name, parent_id: parentId || editingCategory?.parent_id });
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
         <div className="flex justify-between items-center mb-4">
           <h3 className="text-lg font-bold">{editingCategory ? 'Редактировать категорию' : 'Новая категория'}</h3>
           <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
         </div>
         <form onSubmit={handleSubmit}>
            <div className="mb-4">
               <label className="block text-sm font-medium text-slate-700 mb-1">Название</label>
               <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
            <div className="flex space-x-2">
               <button type="button" onClick={onClose} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Отмена</button>
               <button type="submit" className="flex-1 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Сохранить</button>
            </div>
         </form>
      </div>
    </div>
  );
};

const ItemModal = ({ isOpen, editingItem, categoryId, onClose, onSave }: any) => {
  const [form, setForm] = useState({ 
      name: editingItem?.name || '', 
      unit: editingItem?.unit || 'шт', 
      cost_price: editingItem?.cost_price || 0, 
      markup: editingItem?.markup || 20,
      calc_types: editingItem?.calc_types || []
  });

  const toggleCalcType = (type: CalculationType) => {
      const current = form.calc_types || [];
      if (current.includes(type)) {
          setForm({ ...form, calc_types: current.filter((t: CalculationType) => t !== type) });
      } else {
          setForm({ ...form, calc_types: [...current, type] });
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ id: editingItem?.id || uuidv4(), category_id: categoryId || editingItem?.category_id, ...form });
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
         <div className="flex justify-between items-center mb-4">
           <h3 className="text-lg font-bold">{editingItem ? 'Редактировать позицию' : 'Новая позиция'}</h3>
           <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
         </div>
         <form onSubmit={handleSubmit} className="space-y-3">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Наименование</label><input autoFocus value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
            <div className="grid grid-cols-2 gap-3">
               <div><label className="block text-sm font-medium text-slate-700 mb-1">Ед. изм.</label><input value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
               <div><label className="block text-sm font-medium text-slate-700 mb-1">Себестоимость (₽)</label><input type="number" value={form.cost_price} onChange={(e) => setForm({...form, cost_price: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Наценка (%)</label><input type="number" value={form.markup} onChange={(e) => setForm({...form, markup: Number(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Авто-расчет из замеров</label>
              <div className="grid grid-cols-2 gap-2">
                 {Object.entries(CalculationTypeLabels).map(([type, label]) => (
                     <div 
                        key={type} 
                        onClick={() => toggleCalcType(type as CalculationType)}
                        className={clsx(
                            "flex items-center p-2 rounded border cursor-pointer text-xs transition-colors",
                            (form.calc_types || []).includes(type as CalculationType) 
                                ? "bg-blue-50 border-blue-200 text-blue-700" 
                                : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                        )}
                     >
                        {(form.calc_types || []).includes(type as CalculationType) 
                            ? <CheckSquare size={14} className="mr-2 text-blue-600"/> 
                            : <Square size={14} className="mr-2 text-slate-400"/>
                        }
                        {label}
                     </div>
                 ))}
              </div>
           </div>

            <div className="flex space-x-2 pt-4">
               <button type="button" onClick={onClose} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Отмена</button>
               <button type="submit" className="flex-1 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">Сохранить</button>
            </div>
         </form>
      </div>
    </div>
  );
};

const OperationTemplateModal = ({ isOpen, editing, onClose, onSave }: any) => {
   const [form, setForm] = useState({ 
      name: editing?.name || '', 
      unit: editing?.unit || 'м2', 
      description: editing?.description || '',
      base_quantity: editing?.base_quantity || 1 // New: Base quantity for calculation
   });
   return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
         <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold">{editing ? 'Редактировать шаблон' : 'Новый шаблон'}</h3>
               <button onClick={onClose}><X size={20}/></button>
            </div>
            <div className="space-y-3">
               <input className="w-full p-2 border rounded" placeholder="Название (напр. Штукатурка)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
               <div className="grid grid-cols-2 gap-3">
                  <div>
                     <label className="block text-xs text-slate-500 mb-1">Ед. Изм. шаблона</label>
                     <input className="w-full p-2 border rounded" placeholder="напр. м2" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
                  </div>
                  <div>
                     <label className="block text-xs text-slate-500 mb-1">Базовое кол-во (норма)</label>
                     <input className="w-full p-2 border rounded" type="number" placeholder="1" value={form.base_quantity} onChange={e => setForm({...form, base_quantity: Number(e.target.value)})} />
                  </div>
               </div>
               <p className="text-xs text-slate-500 bg-blue-50 p-2 rounded">
                  Состав шаблона будет рассчитываться исходя из нормы на <b>{form.base_quantity} {form.unit}</b>.
               </p>
               <textarea className="w-full p-2 border rounded" placeholder="Описание" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
               <div className="flex space-x-2 pt-2">
                  <button onClick={onClose} className="flex-1 py-2 bg-slate-100 rounded">Отмена</button>
                  <button onClick={() => onSave({ id: editing?.id || uuidv4(), ...form })} className="flex-1 py-2 bg-blue-600 text-white rounded">Сохранить</button>
               </div>
            </div>
         </div>
      </div>
   );
};

const OperationTemplateItemModal = ({ isOpen, editing, templateId, template, categories, items, onClose, onSave }: any) => {
   const [form, setForm] = useState({ 
      name: editing?.name || '', 
      unit: editing?.unit || 'шт', 
      resource_type: editing?.resource_type || ResourceType.Material,
      quantity_factor: editing?.quantity_factor || 1,
      cost_price: editing?.cost_price || 0,
      markup: editing?.markup || 20,
      price_list_item_id: editing?.price_list_item_id,
      calc_types: editing?.calc_types || []
   });

   const toggleCalcType = (type: CalculationType) => {
      const current = form.calc_types || [];
      if (current.includes(type)) {
          setForm({ ...form, calc_types: current.filter((t: CalculationType) => t !== type) });
      } else {
          setForm({ ...form, calc_types: [...current, type] });
      }
   };

   const [isPickerOpen, setPickerOpen] = useState(false);

   const handlePickFromPriceList = (item: PriceListItem) => {
      setForm({
         ...form,
         name: item.name,
         unit: item.unit,
         cost_price: item.cost_price,
         markup: item.markup,
         price_list_item_id: item.id,
         calc_types: item.calc_types || []
         // Auto-detect resource type based on category if possible, or default
         // Here we assume Material by default if not specified, user can change
      });
      setPickerOpen(false);
   };

   if (isPickerOpen) {
      return (
         <PriceListSelectModal 
            categories={categories}
            items={items}
            onSelect={handlePickFromPriceList}
            onClose={() => setPickerOpen(false)}
         />
      );
   }

   return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
         <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold">Позиция шаблона</h3>
               <button onClick={onClose}><X size={20}/></button>
            </div>
            
            <button 
               onClick={() => setPickerOpen(true)}
               className="w-full mb-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg text-sm font-medium flex items-center justify-center hover:bg-indigo-100 transition-colors"
            >
               <BookOpen size={16} className="mr-2"/> Выбрать из Прайс-листа
            </button>

            <div className="space-y-3">
               <select className="w-full p-2 border rounded" value={form.resource_type} onChange={e => setForm({...form, resource_type: e.target.value as ResourceType})}>
                  <option value={ResourceType.Work}>Работа</option>
                  <option value={ResourceType.Material}>Материал</option>
                  <option value={ResourceType.Mechanism}>Механизм</option>
               </select>
               <input className="w-full p-2 border rounded" placeholder="Название" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
               <div className="grid grid-cols-2 gap-2">
                  <input className="p-2 border rounded" placeholder="Ед. изм." value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
                  <div>
                     <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">
                        Расход на {template?.base_quantity || 1} {template?.unit}
                     </label>
                     <input className="w-full p-2 border rounded font-bold text-blue-600" type="number" placeholder="Кол-во" value={form.quantity_factor} onChange={e => setForm({...form, quantity_factor: Number(e.target.value)})} />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <input className="p-2 border rounded" type="number" placeholder="Базовая цена" value={form.cost_price} onChange={e => setForm({...form, cost_price: Number(e.target.value)})} />
                  <input className="p-2 border rounded" type="number" placeholder="Наценка %" value={form.markup} onChange={e => setForm({...form, markup: Number(e.target.value)})} />
               </div>

               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Авто-расчет из замеров</label>
                  <div className="grid grid-cols-2 gap-2">
                     {Object.entries(CalculationTypeLabels).map(([type, label]) => (
                         <div 
                            key={type} 
                            onClick={() => toggleCalcType(type as CalculationType)}
                            className={clsx(
                                "flex items-center p-2 rounded border cursor-pointer text-xs transition-colors",
                                (form.calc_types || []).includes(type as CalculationType) 
                                    ? "bg-blue-50 border-blue-200 text-blue-700" 
                                    : "bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100"
                            )}
                         >
                            {(form.calc_types || []).includes(type as CalculationType) 
                                ? <CheckSquare size={14} className="mr-2 text-blue-600"/> 
                                : <Square size={14} className="mr-2 text-slate-400"/>
                            }
                            {label}
                         </div>
                     ))}
                  </div>
               </div>

               <div className="flex space-x-2 pt-2">
                  <button onClick={onClose} className="flex-1 py-2 bg-slate-100 rounded">Отмена</button>
                  <button onClick={() => onSave({ id: editing?.id || uuidv4(), template_id: templateId || editing?.template_id, ...form })} className="flex-1 py-2 bg-blue-600 text-white rounded">Сохранить</button>
               </div>
            </div>
         </div>
      </div>
   );
};

const PriceListSelectModal = ({ categories, items, onSelect, onClose }: any) => {
   const [search, setSearch] = useState('');
   return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
         <div className="bg-white rounded-xl shadow-xl max-w-lg w-full h-[80vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
               <h3 className="text-lg font-bold">Выбор из справочника</h3>
               <button onClick={onClose}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="p-4 border-b border-slate-100">
               <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input 
                     value={search} 
                     onChange={e => setSearch(e.target.value)} 
                     placeholder="Поиск..." 
                     className="w-full pl-9 p-2 text-sm border rounded-lg"
                  />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
               <PriceListTreeEditor 
                  categories={categories} 
                  items={items} 
                  canEdit={false}
                  searchTerm={search}
                  onSelect={onSelect}
               />
            </div>
         </div>
      </div>
   );
};
