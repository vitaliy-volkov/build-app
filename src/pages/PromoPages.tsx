
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, CheckCircle2, ArrowRight, Calculator, Brain, TrendingUp, 
  Shield, Users, Clock, Sparkles, Wallet, PieChart, Truck, PackageCheck,
  BarChart3, Mic, FileScan, Image as ImageIcon, Bot, Zap, Scale, Box
} from 'lucide-react';

const PromoLayout = ({ children, title, subtitle }: any) => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-white pt-24 font-sans text-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wide mb-6">
                  <Sparkles size={14} className="mr-2" /> AI Core v2.0
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-slate-900 leading-tight">{title}</h1>
                <p className="text-xl text-slate-500 mb-8 leading-relaxed max-w-2xl mx-auto">{subtitle}</p>
                <button 
                    onClick={() => navigate('/register')}
                    className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-800 shadow-xl transition-all hover:-translate-y-1"
                >
                    Попробовать AI бесплатно
                </button>
            </div>
            {children}
            <div className="bg-slate-50 py-12 border-t border-slate-200 mt-24 text-center">
                <h3 className="text-2xl font-bold mb-4">Готовы ускорить стройку?</h3>
                <Link to="/register" className="text-blue-600 font-bold hover:underline text-lg">Подключить AI-модуль &rarr;</Link>
            </div>
        </div>
    );
};

const FeatureBlock = ({ icon: Icon, title, text }: any) => (
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-4 text-blue-600">
            <Icon size={24} />
        </div>
        <h3 className="text-xl font-bold mb-2 text-slate-800">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{text}</p>
    </div>
);

// --- WIDGETS ---

const EstimateScannerWidget = () => {
    const [step, setStep] = useState(0);
    
    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev + 1) % 3);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="w-full h-64 bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden relative flex">
            {/* Left: Raw Doc */}
            <div className="w-1/2 bg-slate-50 border-r border-slate-100 p-4 relative overflow-hidden">
                <div className="absolute top-2 left-2 text-[10px] font-bold text-slate-400 uppercase">Исходный файл (PDF/Excel)</div>
                <div className="mt-6 space-y-3 opacity-60 blur-[1px]">
                    <div className="h-2 w-3/4 bg-slate-300 rounded"></div>
                    <div className="h-2 w-1/2 bg-slate-300 rounded"></div>
                    <div className="h-2 w-full bg-slate-300 rounded"></div>
                    <div className="h-2 w-5/6 bg-slate-300 rounded"></div>
                    <div className="h-20 w-full bg-slate-200 rounded border border-slate-300 flex items-center justify-center text-xs text-slate-400">Таблица...</div>
                </div>
                
                {/* Scanner Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] z-10 animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>

            {/* Right: Parsed Result */}
            <div className="w-1/2 p-4 flex flex-col">
                <div className="text-[10px] font-bold text-purple-600 uppercase mb-3 flex items-center">
                    <Bot size={12} className="mr-1"/> AI Распознавание
                </div>
                <div className="flex-1 space-y-2">
                    <div className={`p-2 rounded border border-slate-100 bg-white shadow-sm transition-all duration-500 ${step >= 0 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}>
                        <div className="text-xs font-bold text-slate-800">Бетон М300</div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>15 м3</span>
                            <span className="font-mono">67 500 ₽</span>
                        </div>
                    </div>
                    <div className={`p-2 rounded border border-slate-100 bg-white shadow-sm transition-all duration-500 delay-100 ${step >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}>
                        <div className="text-xs font-bold text-slate-800">Арматура А500С</div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>2.5 т</span>
                            <span className="font-mono">145 000 ₽</span>
                        </div>
                    </div>
                    <div className={`p-2 rounded border border-slate-100 bg-white shadow-sm transition-all duration-500 delay-200 ${step >= 2 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}>
                        <div className="text-xs font-bold text-slate-800">Работа (Заливка)</div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>15 м3</span>
                            <span className="font-mono">45 000 ₽</span>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes scan {
                    0%, 100% { top: 0%; }
                    50% { top: 100%; }
                }
            `}</style>
        </div>
    );
};

const DesignGenWidget = () => {
    const [state, setState] = useState<'typing' | 'loading' | 'done'>('typing');
    const [text, setText] = useState('');
    const prompt = "Современная кухня, лофт, мрамор...";

    useEffect(() => {
        let currentIndex = 0;
        let interval: any;

        if (state === 'typing') {
            interval = setInterval(() => {
                if (currentIndex <= prompt.length) {
                    setText(prompt.slice(0, currentIndex));
                    currentIndex++;
                } else {
                    clearInterval(interval);
                    setState('loading');
                }
            }, 100);
        }

        if (state === 'loading') {
            setTimeout(() => setState('done'), 1500);
        }

        if (state === 'done') {
            setTimeout(() => {
                setText('');
                setState('typing');
            }, 3000);
        }

        return () => clearInterval(interval);
    }, [state]);

    return (
        <div className="w-full h-64 bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden flex flex-col">
            {/* Top Bar */}
            <div className="h-8 bg-slate-800 flex items-center px-3 space-x-2">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
            </div>
            
            {/* Preview Area */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {state === 'done' ? (
                    <img 
                        src="https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&q=80&w=2000" 
                        className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-700"
                        alt="Generated Interior"
                    />
                ) : (
                    <div className="flex flex-col items-center text-slate-500">
                        {state === 'loading' ? (
                            <Sparkles size={32} className="animate-pulse text-purple-500"/>
                        ) : (
                            <ImageIcon size={32} className="opacity-20"/>
                        )}
                    </div>
                )}
                
                {/* Floating Prompt Input */}
                <div className="absolute bottom-4 left-4 right-4 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-3 flex items-center">
                    <Sparkles size={16} className="text-purple-400 mr-3 flex-shrink-0"/>
                    <div className="text-sm text-slate-200 font-mono border-r-2 border-purple-500 pr-1 animate-pulse">
                        {text}
                    </div>
                </div>
            </div>
        </div>
    );
};

const VoiceCommandWidget = () => {
    const [isRecording, setIsRecording] = useState(true);
    
    return (
        <div className="w-full h-64 bg-white rounded-2xl border border-slate-200 shadow-lg flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Voice Waves */}
            <div className="flex items-center space-x-1 mb-6 h-12">
                {[...Array(12)].map((_, i) => (
                    <div 
                        key={i} 
                        className="w-1.5 bg-blue-500 rounded-full animate-[wave_1s_ease-in-out_infinite]" 
                        style={{ 
                            height: isRecording ? `${Math.random() * 100}%` : '20%',
                            animationDelay: `${i * 0.1}s`
                        }}
                    ></div>
                ))}
            </div>

            {/* Transcribed Text */}
            <div className="bg-slate-100 rounded-xl p-4 w-full text-center relative z-10">
                <p className="text-sm text-slate-700 font-medium">
                    "Закажи 50 мешков цемента на объект Ленина 12 к завтрашнему утру"
                </p>
            </div>

            {/* Result Card Animation */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-5/6 bg-white rounded-xl shadow-xl border border-green-100 p-3 flex items-center animate-[slideUp_3s_ease-in-out_infinite]">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 mr-3 flex-shrink-0">
                    <CheckCircle2 size={16}/>
                </div>
                <div>
                    <div className="text-xs font-bold text-slate-800">Заявка создана #1024</div>
                    <div className="text-[10px] text-slate-500">Цемент М500 • 50 шт • Доставка: Завтра</div>
                </div>
            </div>

            <style>{`
                @keyframes wave {
                    0%, 100% { height: 20%; }
                    50% { height: 100%; }
                }
                @keyframes slideUp {
                    0% { top: 120%; opacity: 0; }
                    30% { top: 70%; opacity: 1; }
                    70% { top: 70%; opacity: 1; }
                    100% { top: 70%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

const FutureCard = ({ icon: Icon, title, date, text }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
        <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
            {date}
        </div>
        <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Icon size={20} />
        </div>
        <h4 className="font-bold text-slate-800 mb-2">{title}</h4>
        <p className="text-sm text-slate-500 leading-snug">{text}</p>
    </div>
);

// --- ESTIMATES PROMO ---
export const EstimatesPromo = () => {
    return (
        <PromoLayout 
            title="Умные строительные сметы" 
            subtitle="Создавайте точные сметы за минуты, а не часы. Используйте шаблоны, рыночные цены и AI-проверку ошибок."
        >
            <div className="max-w-6xl mx-auto px-4">
                <img 
                    src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=2670" 
                    className="w-full rounded-3xl shadow-2xl mb-16 border border-slate-200"
                    alt="Estimates Interface"
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                    <FeatureBlock 
                        icon={Calculator} 
                        title="Авто-расчет маржи" 
                        text="Вы видите реальную прибыль по каждому этапу. Система учитывает себестоимость, накладные расходы и налоги."
                    />
                    <FeatureBlock 
                        icon={Brain} 
                        title="AI Проверка" 
                        text="Нейросеть проанализирует смету и подскажет, если вы забыли включить 'подъем материалов' или 'вывоз мусора'."
                    />
                    <FeatureBlock 
                        icon={Users} 
                        title="Доступ для клиента" 
                        text="Отправьте заказчику красивую ссылку. Он увидит только то, что нужно, и сможет согласовать этапы онлайн."
                    />
                </div>

                <div className="prose prose-lg mx-auto text-slate-600">
                    <h2>Почему Excel больше не работает?</h2>
                    <p>
                        Таблицы хороши для старта, но они не умеют обновлять цены поставщиков в реальном времени, 
                        не напоминают о задолженностях и легко ломаются от одной неверной формулы.
                        В <b>Строй-Контроль</b> смета — это живой документ, связанный с финансами, складом и графиком работ.
                    </p>
                    <h3>Как составить идеальную смету?</h3>
                    <ul>
                        <li>Разбейте работы на этапы (Черновые, Инженерия, Чистовые).</li>
                        <li>Используйте наши готовые шаблоны ("Ремонт ванной", "Фундамент").</li>
                        <li>Добавьте коэффициенты на сложность и непредвиденные расходы.</li>
                    </ul>
                </div>
            </div>
        </PromoLayout>
    );
};

// --- FINANCE PROMO ---
export const FinancePromo = () => {
    return (
        <PromoLayout 
            title="Финансовый автопилот" 
            subtitle="P&L, Cash Flow и платежный календарь. Управляйте деньгами компании профессионально."
        >
            <div className="max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
                    <div>
                        <h2 className="text-3xl font-bold mb-6">Где мои деньги?</h2>
                        <p className="text-lg text-slate-600 mb-6">
                            Самый частый вопрос владельца стройбизнеса. Обороты миллионные, а в кармане пусто.
                            Мы помогаем найти "черные дыры" и кассовые разрывы.
                        </p>
                        <ul className="space-y-4">
                            <li className="flex items-center"><CheckCircle2 className="text-green-500 mr-2"/> Разделение личных и проектных денег</li>
                            <li className="flex items-center"><CheckCircle2 className="text-green-500 mr-2"/> Планирование платежей поставщикам</li>
                            <li className="flex items-center"><CheckCircle2 className="text-green-500 mr-2"/> Отчет о прибылях и убытках (P&L)</li>
                        </ul>
                    </div>
                    <img 
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=2669" 
                        className="rounded-2xl shadow-xl border border-slate-200"
                        alt="Finance Dashboard"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureBlock icon={Wallet} title="Все кошельки" text="Наличные, расчетные счета, карты — все балансы в одном окне." />
                    <FeatureBlock icon={TrendingUp} title="Рентабельность" text="Смотрите, какие проекты приносят прибыль, а какие тянут вас вниз." />
                    <FeatureBlock icon={Shield} title="Безопасность" text="Сотрудники видят только то, что им положено. Директор видит всё." />
                </div>
            </div>
        </PromoLayout>
    );
};

// --- AI PROMO (UPDATED) ---
export const AIPromo = () => {
    return (
        <PromoLayout 
            title="AI Модуль: Будущее стройки" 
            subtitle="Используйте мощь нейросетей для автоматизации рутины. Это как нанять гениального ассистента за копейки, который работает 24/7."
        >
            <div className="max-w-6xl mx-auto px-4">
                
                {/* FEATURE 1: ESTIMATE SCANNER */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
                    <div>
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-6">
                            <FileScan size={24} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Мгновенная оцифровка смет</h2>
                        <p className="text-lg text-slate-500 mb-6">
                            Больше не нужно вручную перебивать сметы из Excel или PDF. 
                            Просто перетащите файл в систему, и наш AI распознает позиции, объемы и цены, 
                            превратив их в умный документ с привязкой к вашему справочнику.
                        </p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={18}/> Распознавание таблиц любой сложности</li>
                            <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={18}/> Поиск рыночных цен на материалы</li>
                            <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={18}/> Выявление ошибок в формулах</li>
                        </ul>
                    </div>
                    <div className="transform hover:scale-105 transition-transform duration-500">
                        <EstimateScannerWidget />
                    </div>
                </div>

                {/* FEATURE 2: DESIGN GEN */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
                    <div className="order-2 lg:order-1 transform hover:scale-105 transition-transform duration-500">
                        <DesignGenWidget />
                    </div>
                    <div className="order-1 lg:order-2">
                        <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mb-6">
                            <ImageIcon size={24} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Генератор идей интерьера</h2>
                        <p className="text-lg text-slate-500 mb-6">
                            Клиент не может определиться со стилем? Покажите ему 10 вариантов за 5 минут.
                            Опишите идею словами ("Светлая кухня, сканди, зеленый фартук"), и AI создаст 
                            фотореалистичные референсы для вдохновения.
                        </p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={18}/> Визуализация без дизайнера</li>
                            <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={18}/> Быстрое согласование концепции</li>
                            <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={18}/> Подбор материалов по фото</li>
                        </ul>
                    </div>
                </div>

                {/* FEATURE 3: VOICE CONTROL */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
                    <div>
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                            <Mic size={24} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Голосовой прораб</h2>
                        <p className="text-lg text-slate-500 mb-6">
                            На объекте некогда тыкать в телефон грязными руками. Просто нажмите кнопку 
                            и скажите: "Закажи 5 мешков Ротбанда" или "Закончили шпаклевку в гостиной". 
                            AI поймет, создаст заявку на закупку или обновит статус работ.
                        </p>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={18}/> Понимает строительный сленг</li>
                            <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={18}/> Работает на ходу</li>
                            <li className="flex items-center text-slate-700"><CheckCircle2 className="text-green-500 mr-3" size={18}/> Автоматическое создание задач</li>
                        </ul>
                    </div>
                    <div className="transform hover:scale-105 transition-transform duration-500">
                        <VoiceCommandWidget />
                    </div>
                </div>

                {/* ROADMAP / UPCOMING */}
                <div className="bg-slate-50 rounded-3xl p-8 md:p-16 text-center">
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6">
                        <Zap size={14} className="mr-2" /> Скоро в обновлении
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-12">Что еще научится делать наш AI?</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        <FutureCard 
                            icon={Scale}
                            date="Q4 2024"
                            title="Юридический AI"
                            text="Автоматическая проверка договоров на риски. Генерация претензий и актов разногласий за секунды."
                        />
                        <FutureCard 
                            icon={Box}
                            date="Q1 2025"
                            title="BIM Lite Анализ"
                            text="Загрузите 2D план, и AI найдет коллизии: где розетка попадает в трубу, а дверь бьется об унитаз."
                        />
                        <FutureCard 
                            icon={Bot}
                            date="Q2 2025"
                            title="Авто-закупщик"
                            text="AI сам найдет, где ваш список материалов стоит дешевле всего с учетом доставки, и сформирует корзину."
                        />
                    </div>
                </div>

            </div>
        </PromoLayout>
    );
};

// --- SUPPLY PROMO ---
export const SupplyPromo = () => {
    return (
        <PromoLayout 
            title="Снабжение без головной боли" 
            subtitle="Заявки с объекта, контроль цен, работа с поставщиками. Ни один саморез не потеряется."
        >
            <div className="max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <FeatureBlock icon={Truck} title="Заявки с полей" text="Прораб создает заявку в приложении. Снабженец видит её мгновенно." />
                    <FeatureBlock icon={PackageCheck} title="Контроль приемки" text="Отмечайте, что приехало на объект, а что нет. Фотофиксация накладных." />
                    <FeatureBlock icon={BarChart3} title="Анализ цен" text="История закупок. Вы знаете, по какой цене покупали этот кабель полгода назад." />
                </div>
                
                <div className="bg-slate-100 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold mb-4">Как это работает?</h2>
                        <ol className="space-y-4 list-decimal list-inside text-lg text-slate-700">
                            <li><b>Прораб</b> видит, что заканчивается клей, и диктует голосом заявку в приложении.</li>
                            <li><b>Снабженец</b> получает уведомление, сравнивает цены поставщиков и делает заказ.</li>
                            <li><b>Система</b> списывает деньги с проекта и ставит поставку в календарь.</li>
                            <li>При разгрузке <b>Прораб</b> фоткает чек, и он падает в финансовый отчет.</li>
                        </ol>
                    </div>
                    <div className="flex-1">
                         <img src="https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&q=80&w=2670" className="rounded-xl shadow-lg" alt="Supply Chain"/>
                    </div>
                </div>
            </div>
        </PromoLayout>
    );
};
