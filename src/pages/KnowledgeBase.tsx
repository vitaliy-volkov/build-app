
import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, FileText, ChevronRight, Download, Search, Folder, 
  Plus, ArrowLeft, Save, Edit3, Trash2, MoreVertical,
  Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight, Type
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface KBArticle {
    id: string;
    categoryId: string;
    title: string;
    type: 'pdf' | 'doc' | 'txt' | 'article'; // Added 'article' for internal docs
    date: string;
    content?: string; // HTML content
    author?: string;
}

interface KBCategory {
    id: string;
    title: string;
    description: string;
}

const CATEGORIES: KBCategory[] = [
    { id: 'regulations', title: 'Регламенты и СНиПы', description: 'Официальные строительные нормы и правила' },
    { id: 'templates', title: 'Шаблоны документов', description: 'Договоры, акты, сметы' },
    { id: 'safety', title: 'Охрана труда', description: 'Инструктажи и журналы по технике безопасности' },
    { id: 'company', title: 'О компании', description: 'Внутренние правила и структура' }
];

// Initial Mock Data with Content
const INITIAL_ARTICLES: KBArticle[] = [
    { id: 'a1', categoryId: 'regulations', title: 'СП 70.13330.2012 Несущие и ограждающие конструкции', type: 'pdf', date: '2023-01-10' },
    { id: 'a2', categoryId: 'regulations', title: 'ГОСТ Р 21.1101-2013 СПДС', type: 'pdf', date: '2023-01-15' },
    { id: 'a3', categoryId: 'templates', title: 'Шаблон договора подряда (2024)', type: 'doc', date: '2024-01-01' },
    { 
        id: 'a5', 
        categoryId: 'safety', 
        title: 'Инструктаж первичный на рабочем месте', 
        type: 'article', 
        date: '2023-11-11',
        author: 'Иванов И.И.',
        content: `
            <h2>1. Общие положения</h2>
            <p>Первичный инструктаж на рабочем месте проводится до начала самостоятельной работы:</p>
            <ul>
                <li>со всеми вновь принятыми в организацию работниками;</li>
                <li>с работниками, переведенными из другого подразделения;</li>
                <li>с работниками, которым поручается выполнение новой для них работы.</li>
            </ul>
            <h2>2. Порядок проведения</h2>
            <p>Инструктаж проводит непосредственный руководитель (производитель) работ (мастер, прораб, преподаватель и так далее), прошедший в установленном порядке обучение по охране труда и проверку знаний требований охраны труда.</p>
        `
    },
];

export const KnowledgeBase = () => {
  const [articles, setArticles] = useState<KBArticle[]>(INITIAL_ARTICLES);
  const [activeCategory, setActiveCategory] = useState<string>('regulations');
  const [search, setSearch] = useState('');
  
  // View State: 'list' | 'view' | 'edit' | 'create'
  const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit' | 'create'>('list');
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);

  const filteredArticles = articles.filter(a => 
    (a.categoryId === activeCategory || search) && 
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveArticle = (article: KBArticle) => {
      if (viewMode === 'create') {
          setArticles([article, ...articles]);
      } else {
          setArticles(articles.map(a => a.id === article.id ? article : a));
      }
      setSelectedArticle(article);
      setViewMode('view');
  };

  const handleDeleteArticle = (id: string) => {
      if(confirm('Вы уверены, что хотите удалить этот документ?')) {
          setArticles(articles.filter(a => a.id !== id));
          setViewMode('list');
          setSelectedArticle(null);
      }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] flex flex-col">
       {/* Header Section */}
       <div className="flex-none flex justify-between items-start">
          <div>
             <h1 className="text-2xl font-bold text-slate-800 mb-2">База Знаний</h1>
             <p className="text-slate-500">Единый центр документации и регламентов компании.</p>
          </div>
          {viewMode === 'list' && (
              <button 
                onClick={() => {
                    setSelectedArticle(null);
                    setViewMode('create');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center shadow-sm"
              >
                 <Plus size={18} className="mr-2" />
                 Создать документ
              </button>
          )}
       </div>

       <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Sidebar (Only visible in List mode or on large screens) */}
          <div className={`w-80 bg-white rounded-xl shadow-sm border border-slate-200 overflow-y-auto flex-shrink-0 ${viewMode !== 'list' ? 'hidden lg:block' : ''}`}>
             <div className="p-4 border-b border-slate-100">
                <div className="relative">
                   <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                   <input 
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     placeholder="Поиск документа..." 
                     className="w-full pl-9 p-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500" 
                   />
                </div>
             </div>
             <div className="p-2 space-y-1">
                {CATEGORIES.map(cat => (
                   <button 
                     key={cat.id}
                     onClick={() => { setActiveCategory(cat.id); setSearch(''); setViewMode('list'); }}
                     className={`w-full text-left p-3 rounded-lg flex items-center transition-colors ${activeCategory === cat.id && !search ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-700'}`}
                   >
                      <div className={`p-2 rounded-lg mr-3 ${activeCategory === cat.id && !search ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                         <Folder size={18} />
                      </div>
                      <div>
                         <div className="font-medium text-sm">{cat.title}</div>
                         <div className="text-xs text-slate-400 line-clamp-1">{cat.description}</div>
                      </div>
                   </button>
                ))}
             </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
             
             {/* LIST MODE */}
             {viewMode === 'list' && (
                 <div className="flex-1 overflow-y-auto p-6">
                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                        <BookOpen size={20} className="mr-2 text-blue-600" />
                        {search ? `Результаты поиска: "${search}"` : CATEGORIES.find(c => c.id === activeCategory)?.title}
                    </h2>

                    {filteredArticles.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                           <FileText size={48} className="mb-4 opacity-20" />
                           <p>Документы не найдены.</p>
                           <button onClick={() => setViewMode('create')} className="text-blue-600 hover:underline text-sm mt-2">Создать первый документ</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                        {filteredArticles.map(article => (
                            <div 
                                key={article.id} 
                                onClick={() => { setSelectedArticle(article); setViewMode('view'); }}
                                className="p-4 border border-slate-100 rounded-lg hover:bg-slate-50 hover:border-blue-200 transition-all flex justify-between items-center group cursor-pointer"
                            >
                                <div className="flex items-start space-x-3">
                                    <div className={`p-2 rounded ${article.type === 'article' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-800 group-hover:text-blue-700 transition-colors">{article.title}</div>
                                        <div className="text-xs text-slate-400 mt-1 flex items-center">
                                            <span className={`uppercase font-bold px-1.5 py-0.5 rounded mr-2 text-[10px] ${article.type === 'article' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                                                {article.type === 'article' ? 'Статья' : article.type}
                                            </span>
                                            <span>Обновлено: {article.date}</span>
                                            {article.author && <span className="ml-2">• Автор: {article.author}</span>}
                                        </div>
                                    </div>
                                </div>
                                <button className="text-slate-300 hover:text-blue-600 transition-colors">
                                    {article.type === 'article' ? <ChevronRight size={20} /> : <Download size={20} />}
                                </button>
                            </div>
                        ))}
                        </div>
                    )}
                 </div>
             )}

             {/* VIEW MODE */}
             {viewMode === 'view' && selectedArticle && (
                 <ArticleViewer 
                    article={selectedArticle} 
                    onBack={() => setViewMode('list')} 
                    onEdit={() => setViewMode('edit')}
                    onDelete={() => handleDeleteArticle(selectedArticle.id)}
                 />
             )}

             {/* EDIT/CREATE MODE */}
             {(viewMode === 'edit' || viewMode === 'create') && (
                 <RichTextEditor 
                    initialArticle={viewMode === 'edit' ? selectedArticle : null}
                    initialCategory={activeCategory}
                    onBack={() => setViewMode('list')}
                    onSave={handleSaveArticle}
                 />
             )}

          </div>
       </div>
    </div>
  );
};

// --- RICH TEXT EDITOR COMPONENT ---

const RichTextEditor = ({ initialArticle, initialCategory, onBack, onSave }: { 
    initialArticle: KBArticle | null, 
    initialCategory: string,
    onBack: () => void, 
    onSave: (article: KBArticle) => void 
}) => {
    const [title, setTitle] = useState(initialArticle?.title || '');
    const [categoryId, setCategoryId] = useState(initialArticle?.categoryId || initialCategory);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (contentRef.current && initialArticle?.content) {
            contentRef.current.innerHTML = initialArticle.content;
        }
    }, [initialArticle]);

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        contentRef.current?.focus();
    };

    const handleSave = () => {
        if (!title.trim()) return alert('Введите название документа');
        const content = contentRef.current?.innerHTML || '';
        
        const article: KBArticle = {
            id: initialArticle?.id || uuidv4(),
            categoryId,
            title,
            type: 'article',
            date: new Date().toISOString().split('T')[0],
            author: initialArticle?.author || 'Текущий Пользователь', // Mock
            content
        };
        onSave(article);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Editor Toolbar Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center">
                    <button onClick={onBack} className="mr-4 p-2 hover:bg-slate-200 rounded-full text-slate-500"><ArrowLeft size={20}/></button>
                    <h2 className="text-lg font-bold text-slate-800">{initialArticle ? 'Редактирование' : 'Новый документ'}</h2>
                </div>
                <button 
                    onClick={handleSave}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                    <Save size={16} className="mr-2"/> Сохранить
                </button>
            </div>

            {/* Metadata Inputs */}
            <div className="p-6 border-b border-slate-100 bg-white space-y-4">
                <input 
                    className="w-full text-3xl font-bold placeholder-slate-300 outline-none text-slate-800" 
                    placeholder="Заголовок документа" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />
                <div className="flex items-center space-x-2 text-sm">
                    <span className="text-slate-500">Категория:</span>
                    <select 
                        className="bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                    >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-1 flex-wrap sticky top-0 z-10">
                <ToolbarBtn icon={Bold} onClick={() => execCmd('bold')} title="Жирный" />
                <ToolbarBtn icon={Italic} onClick={() => execCmd('italic')} title="Курсив" />
                <ToolbarBtn icon={Underline} onClick={() => execCmd('underline')} title="Подчеркнутый" />
                <div className="w-px h-6 bg-slate-300 mx-2"></div>
                <ToolbarBtn icon={AlignLeft} onClick={() => execCmd('justifyLeft')} title="По левому краю" />
                <ToolbarBtn icon={AlignCenter} onClick={() => execCmd('justifyCenter')} title="По центру" />
                <ToolbarBtn icon={AlignRight} onClick={() => execCmd('justifyRight')} title="По правому краю" />
                <div className="w-px h-6 bg-slate-300 mx-2"></div>
                <ToolbarBtn icon={List} onClick={() => execCmd('insertUnorderedList')} title="Маркированный список" />
                <div className="w-px h-6 bg-slate-300 mx-2"></div>
                <select onChange={e => execCmd('formatBlock', e.target.value)} className="h-8 border border-slate-300 rounded px-2 text-sm bg-white outline-none hover:border-blue-400">
                    <option value="p">Обычный текст</option>
                    <option value="h1">Заголовок 1</option>
                    <option value="h2">Заголовок 2</option>
                    <option value="h3">Заголовок 3</option>
                    <option value="blockquote">Цитата</option>
                </select>
            </div>

            {/* Editable Area */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8 cursor-text" onClick={() => contentRef.current?.focus()}>
                <div 
                    ref={contentRef}
                    className="min-h-[500px] bg-white shadow-sm border border-slate-200 rounded-xl p-8 md:p-12 outline-none max-w-4xl mx-auto prose prose-slate lg:prose-lg focus:ring-2 focus:ring-blue-100 transition-shadow"
                    contentEditable
                    data-placeholder="Начните печатать..."
                ></div>
            </div>
        </div>
    );
};

const ToolbarBtn = ({ icon: Icon, onClick, title }: any) => (
    <button 
        onMouseDown={(e) => { e.preventDefault(); onClick(); }} 
        className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-blue-600 transition-colors"
        title={title}
    >
        <Icon size={18} />
    </button>
);

// --- ARTICLE VIEWER COMPONENT ---

const ArticleViewer = ({ article, onBack, onEdit, onDelete }: { article: KBArticle, onBack: () => void, onEdit: () => void, onDelete: () => void }) => {
    const categoryName = CATEGORIES.find(c => c.id === article.categoryId)?.title;

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center">
                    <button onClick={onBack} className="mr-4 p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft size={20}/></button>
                    <div>
                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">{categoryName}</div>
                        <h2 className="text-lg font-bold text-slate-800 line-clamp-1" title={article.title}>{article.title}</h2>
                    </div>
                </div>
                <div className="flex space-x-2">
                    {article.type === 'article' && (
                        <button 
                            onClick={onEdit}
                            className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm flex items-center"
                        >
                            <Edit3 size={16} className="mr-2"/> Редактировать
                        </button>
                    )}
                    <button 
                        onClick={onDelete}
                        className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        title="Удалить"
                    >
                        <Trash2 size={20}/>
                    </button>
                </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
                <div className="max-w-4xl mx-auto bg-white shadow-sm border border-slate-200 rounded-xl min-h-[600px] p-8 md:p-12 relative">
                    {/* Document Header inside page */}
                    <div className="mb-8 pb-6 border-b border-slate-100">
                        <h1 className="text-3xl font-bold text-slate-900 mb-4">{article.title}</h1>
                        <div className="flex items-center text-sm text-slate-500 space-x-4">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium text-xs uppercase">{article.type}</span>
                            <span>{article.date}</span>
                            {article.author && <span>Автор: {article.author}</span>}
                        </div>
                    </div>

                    {/* Content Body */}
                    {article.type === 'article' ? (
                        <div 
                            className="prose prose-slate lg:prose-lg max-w-none"
                            dangerouslySetInnerHTML={{ __html: article.content || '<p class="text-slate-400 italic">Содержимое отсутствует</p>' }}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                            <FileText size={64} className="text-slate-300 mb-4"/>
                            <p className="text-slate-500 mb-4">Предпросмотр для файлов типа <b>.{article.type}</b> недоступен.</p>
                            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center">
                                <Download size={20} className="mr-2"/> Скачать файл
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
