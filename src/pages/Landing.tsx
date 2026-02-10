
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, CheckCircle2, TrendingUp, Users, Shield, 
  ArrowRight, Building2, BarChart3, Wallet, FileText, Sparkles, 
  Brain, Zap, MessageSquare, ChevronDown, Star, Mail, Phone, Menu, X,
  PieChart, Activity, AlertTriangle, ArrowUpRight, ArrowDownLeft, Search, Check, RefreshCw,
  Mic, ImageIcon, ClipboardCheck, Lightbulb, CalendarClock, Wrench
} from 'lucide-react';

export const Landing = () => {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const painPoints = [
    {
      title: 'Хаос в сметах',
      problem: 'Сметы в Excel, версии теряются, формулы слетают. Заказчик не понимает, за что платит.',
      solution: 'Единая база смет с версионностью. Прозрачный доступ для клиента. Авто-расчет маржи.',
      widget: <ChaosWidget />
    },
    {
      title: 'Кассовые разрывы',
      problem: 'Деньги с нового объекта уходят на закрытие дыр в старом. В итоге — нечем платить рабочим.',
      solution: 'Платежный календарь и P&L отчеты. Вы видите реальную прибыль по каждому объекту отдельно.',
      widget: <GapWidget />
    },
    {
      title: 'Воровство и откаты',
      problem: 'Снабженцы завышают цены, материалы пропадают со склада. Невозможно отследить каждую закупку.',
      solution: 'AI-анализ цен. Система подсвечивает подозрительные транзакции и отклонения от рынка.',
      widget: <TheftWidget />
    }
  ];

  const faqItems = [
    {
      question: 'Поможет ли система, если у меня сейчас бардак в финансах?',
      answer: 'Да, это основная задача сервиса. Вы начнете вносить все операции в единый реестр, разнесете их по проектам и статьям. Уже через месяц вы увидите реальную картину: где теряете деньги, а где зарабатываете. Мы даем готовые шаблоны статей расходов, чтобы вам было проще начать.'
    },
    {
      question: 'Сложно ли разобраться? Мои прорабы не любят компьютеры.',
      answer: 'Мы сделали интерфейс максимально простым, похожим на привычные мессенджеры. Для прорабов есть мобильная версия: они могут просто диктовать отчеты голосом или отправлять фото. Обучение занимает 15 минут.'
    },
    {
      question: 'Почему подписка, а не разовая покупка?',
      answer: 'Облачный сервис гарантирует, что ваши данные никогда не потеряются (как это бывает с файлами на жестком диске). Плюс мы постоянно обновляем функции, добавляем новые возможности AI и поддерживаем актуальность баз цен. Это невозможно при разовой продаже.'
    },
    {
      question: 'Насколько безопасны мои данные?',
      answer: 'Мы используем шифрование банковского уровня (SSL/TLS). Ваши сметы, контакты клиентов и финансовые данные хранятся в защищенном облаке. Никто, включая наших сотрудников, не имеет к ним доступа без вашего разрешения. Резервное копирование происходит ежедневно.'
    },
    {
      question: 'Можно ли перенести старые сметы из Excel?',
      answer: 'Да! Наш AI-модуль умеет читать файлы Excel и PDF. Просто загрузите файл, и система автоматически распознает позиции, цены и объемы, превратив их в умную смету внутри сервиса.'
    },
    {
      question: 'Есть ли поддержка?',
      answer: 'Конечно. В чате внутри приложения работает служба заботы. На тарифах Бизнес и выше доступен персональный менеджер, который поможет настроить систему под процессы вашей компании.'
    }
  ];

  const toggleFaq = (index: number) => {
    setFaqOpen(faqOpen === index ? null : index);
  };

  return (
    <>
      {/* --- HERO SECTION --- */}
      <section className="pt-24 pb-14 md:pt-36 md:pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-left z-10">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Sparkles size={14} className="mr-2 text-blue-500" />
              Версия 7.0: Нейросети для стройки
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-slate-900 tracking-tight mb-6 leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700">
              Управление стройкой <br />
              <span className="text-slate-800">
                без хаоса и потерь
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-700">
              Автоматизируйте сметы, финансы и снабжение в одной системе. Искусственный интеллект найдет ошибки в расчетах и сэкономит до 20% бюджета.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 mb-8">
               <QuickApplicationForm />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-slate-600 animate-in fade-in slide-in-from-bottom-12 duration-1000">
               <div className="flex items-center"><CheckCircle2 size={16} className="text-green-500 mr-2"/> 14 дней бесплатно</div>
               <div className="flex items-center"><CheckCircle2 size={16} className="text-green-500 mr-2"/> Без карты</div>
            </div>
          </div>

          {/* Right Demo Interface */}
          <div className="relative animate-in fade-in zoom-in-95 duration-1000 delay-200 lg:h-[600px] flex items-center justify-center">
             <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-full aspect-[5/4] sm:aspect-[4/3] sm:transform sm:rotate-1 sm:hover:rotate-0 transition-transform duration-500 group">
                {/* --- Mock Interface --- */}
                <div className="w-full h-full bg-slate-50 flex text-xs md:text-sm font-sans select-none cursor-default">
                    {/* Sidebar Mock */}
                    <div className="w-16 md:w-48 bg-slate-900 text-slate-400 flex flex-col py-4 hidden sm:flex flex-shrink-0">
                       <div className="px-4 mb-6 flex items-center space-x-2 text-white">
                          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center"><LayoutDashboard size={14}/></div>
                          <span className="font-bold hidden md:inline">СтройКонтроль</span>
                       </div>
                       <div className="space-y-1 px-2">
                          <div className="flex items-center space-x-3 px-3 py-2 bg-white/10 text-white rounded-md"><Activity size={16}/><span className="hidden md:inline">Дашборд</span></div>
                          <div className="flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-md"><FileText size={16}/><span className="hidden md:inline">Сметы</span></div>
                          <div className="flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-md"><Users size={16}/><span className="hidden md:inline">Команда</span></div>
                          <div className="flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-md"><Wallet size={16}/><span className="hidden md:inline">Финансы</span></div>
                       </div>
                    </div>

                    {/* Main Content Mock */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                       {/* Header Mock */}
                       <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
                          <div className="w-1/3 h-8 bg-slate-100 rounded-lg animate-pulse"></div>
                          <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 bg-slate-100 rounded-full"></div>
                             <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 text-white rounded-full flex items-center justify-center font-bold text-xs shadow-md">ИИ</div>
                          </div>
                       </div>

                       {/* Dashboard Content Mock */}
                       <div className="p-4 space-y-4 flex-1 overflow-hidden relative">
                          {/* Stats Row */}
                          <div className="grid grid-cols-3 gap-3 md:gap-4">
                             <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Выручка</div>
                                <div className="font-bold text-sm md:text-lg text-slate-800">12.5M ₽</div>
                                <div className="text-green-500 text-[10px] flex items-center mt-1"><TrendingUp size={12} className="mr-1"/> +12%</div>
                             </div>
                             <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Проекты</div>
                                <div className="font-bold text-sm md:text-lg text-slate-800">8</div>
                                <div className="text-blue-500 text-[10px] mt-1">Активны</div>
                             </div>
                             <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="text-slate-400 text-[10px] uppercase font-bold mb-1">Маржа</div>
                                <div className="font-bold text-sm md:text-lg text-purple-600">24%</div>
                                <div className="text-slate-400 text-[10px] mt-1">Цель: 25%</div>
                             </div>
                          </div>

                          {/* Chart Area Mock */}
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-40 md:h-48">
                             <div className="flex justify-between items-center mb-4">
                                <div className="h-4 w-24 bg-slate-100 rounded"></div>
                                <div className="h-4 w-12 bg-slate-100 rounded"></div>
                             </div>
                             <div className="flex-1 flex items-end justify-between space-x-2 px-2 pb-2">
                                {[40, 65, 45, 80, 55, 70, 90, 60, 75, 50, 85, 95].map((h, i) => (
                                   <div key={i} className="w-full bg-slate-50 rounded-t-sm relative group h-full flex items-end">
                                      <div 
                                        className="w-full bg-blue-500 rounded-t-sm transition-all duration-1000 ease-out hover:bg-blue-600" 
                                        style={{ height: `${h}%`, opacity: 0.8 }}
                                      ></div>
                                   </div>
                                ))}
                             </div>
                          </div>

                          {/* List Area Mock */}
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1">
                             <div className="p-3 border-b border-slate-100 font-bold text-slate-700 text-xs">Последние события</div>
                             {[1, 2, 3].map(i => (
                                <div key={i} className="p-3 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                   <div className="flex items-center space-x-3">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${i===1 ? 'bg-green-100 text-green-600' : i===2 ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                          {i===1 ? <CheckCircle2 size={16}/> : i===2 ? <Wallet size={16}/> : <MessageSquare size={16}/>}
                                      </div>
                                      <div>
                                         <div className="h-3 w-32 bg-slate-100 rounded mb-1"></div>
                                         <div className="h-2 w-20 bg-slate-50 rounded"></div>
                                      </div>
                                   </div>
                                   <div className="h-4 w-12 bg-slate-50 rounded"></div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                </div>
                
                {/* Floating UI Elements (Overlay) */}
                <div className="absolute top-6 left-24 bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-xl border border-slate-100 animate-bounce-subtle hidden sm:block">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 text-green-600 rounded-lg"><TrendingUp size={18}/></div>
                      <div>
                         <div className="text-[10px] text-slate-500 uppercase font-bold">Маржинальность</div>
                         <div className="font-bold text-slate-800 text-sm">+24% рост</div>
                      </div>
                   </div>
                </div>

                <div className="absolute bottom-8 right-8 bg-slate-900/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-white/10 max-w-[200px] text-white animate-pulse-slow hidden sm:block">
                   <div className="flex items-center mb-2">
                      <Sparkles size={14} className="text-purple-400 mr-2"/>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200">AI Инсайт</span>
                   </div>
                   <p className="text-[10px] leading-relaxed text-slate-300">
                      Обнаружено завышение цен на бетон в смете №42. <br/>
                      <span className="text-white font-bold">Экономия: 45 000 ₽</span>
                   </p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* --- PAIN POINTS SECTION --- */}
      <section className="py-24 bg-slate-50 border-y border-slate-200">
         <div className="max-w-7xl mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
               <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Знакомые проблемы?</h2>
               <p className="text-lg text-slate-500">Мы создали Строй-Контроль, потому что сами устали терять деньги на простых ошибках.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {painPoints.map((item) => (
                 <PainPointCard key={item.title} title={item.title} problem={item.problem} solution={item.solution} widget={item.widget} />
               ))}
            </div>
         </div>
      </section>

      {/* --- FUNCTIONALITY SHOWCASE --- */}
      <section className="py-24 bg-white overflow-hidden">
         <div className="max-w-7xl mx-auto px-4">
            
            {/* FINANCE SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-32">
               <div className="order-2 lg:order-1 flex justify-center relative group">
                  <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <MockFinanceWidget />
               </div>
               <div className="order-1 lg:order-2">
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-lg w-fit mb-4"><Wallet size={24}/></div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Финансовый порядок</h2>
                  <p className="text-lg text-slate-500 mb-6">Полный контроль над денежными потоками. Разделяйте личные деньги и деньги бизнеса.</p>
                  <ul className="space-y-3">
                     <FeatureItem text="Учет всех поступлений и расходов" />
                     <FeatureItem text="Привязка транзакций к проектам и статьям" />
                     <FeatureItem text="Автоматический расчет рентабельности" />
                  </ul>
                  <Link to="/finance-promo" className="inline-flex items-center mt-8 text-blue-600 font-bold hover:underline">
                     Подробнее о финансах <ArrowRight size={16} className="ml-2"/>
                  </Link>
               </div>
            </div>

            {/* AI SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
               <div>
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-lg w-fit mb-4"><Sparkles size={24}/></div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Искусственный Интеллект</h2>
                  <p className="text-lg text-slate-500 mb-6">
                    Ваш личный ассистент, который работает 24/7. Он проверяет сметы, генерирует идеи дизайна и анализирует риски.
                    Теперь можно голосом составлять сметы: диктуйте позиции, а AI превратит их в структурированный документ.
                  </p>
                  <ul className="space-y-3">
                     <FeatureItem text="Распознавание смет из PDF и Excel" />
                     <FeatureItem text="Генерация визуализаций интерьера" />
                     <FeatureItem text="Голосовой ввод задач и замеров" />
                     <FeatureItem text="Голосовое составление смет с автоматической структурой" />
                  </ul>
                  <Link to="/ai-promo" className="inline-flex items-center mt-8 text-purple-600 font-bold hover:underline">
                     Возможности AI модуля <ArrowRight size={16} className="ml-2"/>
                  </Link>
               </div>
               <div className="flex justify-center relative group">
                  <div className="absolute inset-0 bg-purple-100 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <MockAIWidget />
               </div>
            </div>
         </div>
      </section>

      {/* --- INTERIOR GENERATOR DEMO --- */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wide uppercase mb-6">
              <ImageIcon size={16} className="mr-2" /> Генератор идей интерьера
            </div>
            <h2 className="text-4xl font-bold mb-6">Покажите заказчику будущее объекта за минуту</h2>
            <p className="text-lg text-slate-300 mb-6">
              Выберите стиль, уточните материалы и мгновенно получите фотореалистичную визуализацию.
              Демонстрационное изображение всегда загружается в реальном времени, чтобы клиент видел живую магию AI.
            </p>
            <ul className="space-y-3 text-slate-200">
              <FeatureItem text="Поддержка 12 стилей: от минимализма до ар-деко" />
              <FeatureItem text="Автоматический подбор цветов и текстур" />
              <FeatureItem text="Ссылки-референсы для согласования с заказчиком" />
            </ul>
          </div>
          <InteriorGeneratorDemo />
        </div>
      </section>

      {/* --- AI INSIGHTS SECTION --- */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wide mb-4">
              <Sparkles size={14} className="mr-2" /> AI анализ смет
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">ИИ проверит смету и предложит улучшения</h2>
            <p className="text-lg text-slate-500">
              Загружайте готовые сметы и получайте детальный аудит с рекомендациями: от завышений цен до
              забытых работ и оптимизаций графика.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <EstimateAuditWidget />
            <ImprovementSuggestions />
          </div>
        </div>
      </section>

      {/* --- NEW FEATURES SECTION --- */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 space-y-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide mb-4">
              <Sparkles size={14} className="mr-2" /> Новые функции
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Экспериментальные модули уже доступны</h2>
            <p className="text-lg text-slate-500">
              Тестируйте голосовое составление смет, AI-помощника по доработкам и умные подсказки для подрядчиков прямо в демо-доступе.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <NewFeatureCard
              icon={<Mic className="text-blue-600" size={20} />}
              title="Голосовое составление смет"
              description="Диктуйте работы и материалы, AI распределит позиции по разделам и добавит коэффициенты."
              checklist={['Автораспознавание единиц измерения', 'Формулы маржи', 'Интеграция с шаблонами']}
            />
            <NewFeatureCard
              icon={<ClipboardCheck className="text-purple-600" size={20} />}
              title="AI предложения по доработке"
              description="Система ищет слабые места в смете и предлагает дополнительные работы с расчетом влияния на бюджет."
              checklist={['Подбор сопутствующих работ', 'Расчет влияния на сроки', 'Советы по коммуникации с заказчиком']}
            />
            <NewFeatureCard
              icon={<Wrench className="text-green-600" size={20} />}
              title="Автогенерация пакета документов"
              description="Смета, договор, график и спецификация создаются автоматически, а правки синхронизируются."
              checklist={['Поддержка фирменных шаблонов', 'Версионность документов', 'Согласование по ссылке']}
            />
          </div>
        </div>
      </section>

      {/* --- ROADMAP SECTION --- */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wide uppercase mb-4">
              <CalendarClock size={16} className="mr-2" /> Roadmap
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Скоро появятся новые функции</h2>
            <p className="text-lg text-slate-300">
              Делимся ближайшими релизами. Нажимайте на блоки, чтобы увидеть детали по каждому кварталу.
            </p>
          </div>
          <RoadmapTimeline />
        </div>
      </section>

      {/* --- FAQ SECTION (UPDATED) --- */}
      <section className="py-24 bg-slate-50">
         <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4 text-slate-900">Вопросы и Ответы</h2>
            <p className="text-center text-slate-500 mb-12">Всё, что нужно знать перед стартом.</p>
            
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <FaqItem
                  key={item.question}
                  question={item.question}
                  answer={item.answer}
                  isOpen={faqOpen === index}
                  onClick={() => toggleFaq(index)}
                />
              ))}
            </div>
         </div>
      </section>
    </>
  );
};

// --- INTERACTIVE WIDGETS FOR PAIN POINTS ---

const ChaosWidget = () => {
  const [fixed, setFixed] = useState(false);
  return (
    <div className="w-full h-48 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden relative flex flex-col transition-all duration-500">
        <div className="p-2 border-b border-slate-200 flex justify-between items-center bg-white">
            <div className="text-[10px] font-bold uppercase text-slate-400 truncate max-w-[100px]">
                {fixed ? 'Строй-Контроль' : 'Смета_v3_copy.xlsx'}
            </div>
            <button 
                onClick={() => setFixed(!fixed)} 
                className={`text-[10px] px-2 py-1 rounded transition-all duration-300 font-bold flex items-center ${fixed ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
            >
                {fixed ? <span className="flex items-center"><RefreshCw size={10} className="mr-1"/> Сбросить</span> : 'Навести порядок'}
            </button>
        </div>
        <div className="flex-1 p-2 relative">
            {!fixed ? (
                <div className="space-y-2 animate-in fade-in absolute inset-2">
                    <div className="flex gap-2 text-xs opacity-50 font-mono">
                        <div className="w-1/3 bg-red-100 h-4 rounded"></div>
                        <div className="w-1/4 bg-slate-200 h-4 rounded"></div>
                        <div className="w-1/4 bg-slate-200 h-4 rounded"></div>
                    </div>
                    <div className="flex gap-2 text-xs font-mono text-red-500">
                        <span className="w-1/3 truncate font-bold">Бетон М300</span>
                        <span className="w-1/4">#REF!</span>
                        <span className="w-1/4">???</span>
                    </div>
                    <div className="flex gap-2 text-xs font-mono text-slate-400 line-through decoration-red-400">
                        <span className="w-1/3">Доставка</span>
                        <span className="w-1/4">5000</span>
                    </div>
                    <div className="absolute bottom-4 right-4 text-red-500/20 text-5xl font-black rotate-12 pointer-events-none">ХАОС</div>
                </div>
            ) : (
                <div className="space-y-2 animate-in zoom-in-95 duration-300 absolute inset-2">
                    <div className="flex justify-between items-center p-2 bg-white rounded shadow-sm border border-slate-100">
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-2"><Check size={10}/></div>
                            <span className="text-xs font-bold text-slate-700">Бетон В25</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">45 000 ₽</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-white rounded shadow-sm border border-slate-100">
                        <div className="flex items-center">
                            <div className="w-4 h-4 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-2"><Check size={10}/></div>
                            <span className="text-xs font-bold text-slate-700">Доставка</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800">10 000 ₽</span>
                    </div>
                    <div className="mt-2 text-right border-t border-slate-200 pt-2">
                        <span className="text-[10px] text-slate-400 uppercase mr-2">Итого:</span>
                        <span className="text-sm font-bold text-blue-600">55 000 ₽</span>
                    </div>
                </div>
            )}
        </div>
    </div>
  )
}

const GapWidget = () => {
  const [fixed, setFixed] = useState(false);
  return (
    <div className="w-full h-48 bg-slate-50 rounded-xl border border-slate-200 relative flex flex-col p-4 transition-all duration-500">
        <div className="flex justify-between items-center mb-4">
             <div className="text-[10px] font-bold uppercase text-slate-400">Баланс</div>
             <button onClick={() => setFixed(true)} disabled={fixed} className={`text-[10px] px-2 py-1 rounded transition-colors font-bold ${fixed ? 'text-green-600 bg-green-50' : 'bg-red-100 text-red-600 animate-pulse hover:bg-red-200'}`}>
                {fixed ? 'Исправлено' : 'Устранить разрыв'}
             </button>
        </div>
        <div className="flex-1 flex items-end justify-between space-x-2 relative">
            {/* Baseline 0 */}
            <div className="absolute left-0 right-0 bottom-8 border-b border-slate-300 border-dashed z-0"></div>
            
            {/* Bars */}
            <div className="w-1/4 bg-blue-400 rounded-t h-16 z-10 relative group hover:bg-blue-500 transition-colors"></div>
            <div className="w-1/4 bg-blue-300 rounded-t h-10 z-10 relative group hover:bg-blue-400 transition-colors"></div>
            
            {/* The Problem Bar */}
            <div className="w-1/4 relative h-full flex items-end z-10">
                {!fixed ? (
                    <div className="w-full bg-red-500 rounded-b h-12 absolute top-[calc(100%-32px)] transition-all duration-500 animate-bounce-subtle">
                       <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-red-600 whitespace-nowrap bg-red-50 px-1 rounded border border-red-100">-50k</div>
                    </div>
                ) : (
                    <div className="w-full bg-green-500 rounded-t h-4 transition-all duration-500">
                       <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-green-600 whitespace-nowrap">+10k</div>
                    </div>
                )}
            </div>

            <div className="w-1/4 bg-blue-500 rounded-t h-24 z-10 relative group hover:bg-blue-600 transition-colors"></div>
        </div>
        {!fixed && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 p-2 rounded-lg shadow-lg text-xs font-bold text-red-600 border border-red-100 pointer-events-none flex items-center">
                <AlertTriangle size={12} className="mr-1"/> Кассовый разрыв!
            </div>
        )}
    </div>
  )
}

const TheftWidget = () => {
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState(false);

  const scan = () => {
      setScanning(true);
      setDetected(false);
      setTimeout(() => {
          setScanning(false);
          setDetected(true);
      }, 1500);
  }

  return (
    <div className="w-full h-48 bg-white rounded-xl border border-slate-200 relative flex flex-col overflow-hidden group transition-all duration-500">
        {/* List */}
        <div className="p-3 space-y-2">
            <div className="flex justify-between text-xs p-2 border-b border-slate-50 text-slate-600">
                <span>Цемент М500</span>
                <span className="font-mono">350 ₽</span>
            </div>
            <div className={`flex justify-between text-xs p-2 rounded transition-colors duration-500 ${detected ? 'bg-red-50 text-red-700 font-bold border border-red-100' : 'text-slate-600'}`}>
                <span>Клей плиточный</span>
                <span className="font-mono">850 ₽</span>
                {detected && <span className="text-[8px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded ml-1 flex items-center animate-in zoom-in">High Price</span>}
            </div>
            <div className="flex justify-between text-xs p-2 border-b border-slate-50 text-slate-600">
                <span>Грунтовка</span>
                <span className="font-mono">400 ₽</span>
            </div>
        </div>

        {/* Scan Line (CSS Animation) */}
        {scanning && (
            <>
                <style>{`
                    @keyframes scanMove {
                        0% { top: 0; }
                        100% { top: 100%; }
                    }
                `}</style>
                <div className="absolute left-0 right-0 h-1 bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] z-20" style={{ animation: 'scanMove 1.5s linear infinite' }}></div>
                <div className="absolute inset-0 bg-purple-500/5 z-10"></div>
            </>
        )}

        {/* Controls */}
        <div className="mt-auto p-3 border-t border-slate-100 flex justify-center bg-slate-50">
            <button onClick={scan} disabled={scanning} className={`px-3 py-1.5 rounded-full text-xs flex items-center transition-all font-bold shadow-sm ${scanning ? 'bg-slate-200 text-slate-500' : detected ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                <Search size={12} className="mr-1.5"/> {scanning ? 'Сканирование...' : detected ? 'Проверить снова' : 'AI Проверка цен'}
            </button>
        </div>
    </div>
  )
}

// --- Mini-Blocks (Mock UIs) ---

const MockFinanceWidget = () => {
   return (
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 w-full max-w-md transform rotate-2 group-hover:rotate-0 transition-all duration-500">
         <div className="flex justify-between items-center mb-6">
            <div>
               <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Баланс на счетах</div>
               <div className="text-3xl font-black text-slate-800 mt-1">4 250 000 ₽</div>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm">
               <Wallet size={24}/>
            </div>
         </div>

         {/* Chart Mock */}
         <div className="flex items-end space-x-3 h-24 mb-6 pb-2 border-b border-slate-100">
            {[40, 60, 30, 80, 50, 90, 45].map((h, i) => (
               <div key={i} className="flex-1 bg-slate-100 rounded-t-sm relative group/bar">
                  <div 
                     className="w-full bg-blue-500 rounded-t-sm absolute bottom-0 transition-all duration-500" 
                     style={{ height: `${h}%` }}
                  ></div>
               </div>
            ))}
         </div>

         {/* List Mock */}
         <div className="space-y-3">
            <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
               <div className="flex items-center">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg mr-3"><ArrowDownLeft size={16}/></div>
                  <div>
                     <div className="text-sm font-bold text-slate-800">Аванс: ЖК "Север"</div>
                     <div className="text-[10px] text-slate-400">Сегодня, 10:30</div>
                  </div>
               </div>
               <div className="font-bold text-green-600">+1 500 000 ₽</div>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
               <div className="flex items-center">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg mr-3"><ArrowUpRight size={16}/></div>
                  <div>
                     <div className="text-sm font-bold text-slate-800">Закупка: Бетон</div>
                     <div className="text-[10px] text-slate-400">Вчера, 16:15</div>
                  </div>
               </div>
               <div className="font-bold text-red-600">-125 000 ₽</div>
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors">
               <div className="flex items-center">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg mr-3"><ArrowUpRight size={16}/></div>
                  <div>
                     <div className="text-sm font-bold text-slate-800">Логистика</div>
                     <div className="text-[10px] text-slate-400">Вчера, 12:00</div>
                  </div>
               </div>
               <div className="font-bold text-red-600">-15 000 ₽</div>
            </div>
         </div>
      </div>
   );
};

const MockAIWidget = () => {
   const [stage, setStage] = useState(0);

   useEffect(() => {
      const interval = setInterval(() => {
         setStage((prev) => (prev + 1) % 3);
      }, 3000);
      return () => clearInterval(interval);
   }, []);

   return (
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6 w-full max-w-md transform -rotate-2 group-hover:rotate-0 transition-all duration-500 relative overflow-hidden text-slate-200">
         {/* Header */}
         <div className="flex items-center justify-between mb-6 border-b border-slate-700 pb-4">
            <div className="flex items-center">
               <Sparkles size={18} className="text-purple-400 mr-2 animate-pulse"/>
               <span className="font-bold text-white">AI Ассистент</span>
            </div>
            <div className="flex space-x-1">
               <div className="w-2 h-2 bg-red-500 rounded-full"></div>
               <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
               <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
         </div>

         {/* Content */}
         <div className="space-y-4 min-h-[200px]">
            {/* User Msg */}
            <div className="flex justify-end">
               <div className="bg-blue-600 text-white p-3 rounded-2xl rounded-br-sm max-w-[80%] text-sm shadow-lg">
                  Проверь смету на фундамент. Есть риски?
               </div>
            </div>

            {/* AI Processing / Response */}
            <div className="flex justify-start items-end">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center mr-2 flex-shrink-0">
                    <Brain size={14} className="text-white"/>
                </div>
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl rounded-bl-sm max-w-[90%] text-sm shadow-lg">
                   {stage === 0 && (
                      <div className="flex items-center space-x-2 text-slate-400">
                         <span className="animate-spin"><Sparkles size={14}/></span>
                         <span>Анализирую рыночные цены...</span>
                      </div>
                   )}
                   {stage !== 0 && (
                      <div className="space-y-3 animate-in fade-in">
                         <p>Я нашел 2 потенциальных риска в смете:</p>
                         <div className="bg-red-900/30 border border-red-800/50 p-3 rounded-lg flex items-start">
                            <AlertTriangle size={16} className="text-red-400 mr-2 flex-shrink-0 mt-0.5"/>
                            <div>
                               <div className="text-red-200 font-bold text-xs mb-1">Завышение цены</div>
                               <p className="text-xs text-slate-300">Арматура A500C указана по 65 000₽/т. Рыночная цена: 58 000₽/т.</p>
                            </div>
                         </div>
                         <div className="bg-blue-900/30 border border-blue-800/50 p-3 rounded-lg flex items-center text-xs">
                            <Search size={14} className="text-blue-400 mr-2"/>
                            <span className="text-blue-200 font-bold mr-1">Совет:</span>
                            <span className="text-slate-300">Запросите скидку у поставщика "Металл-Групп".</span>
                         </div>
                      </div>
                   )}
                </div>
            </div>
         </div>
      </div>
   );
};

// --- Subcomponents ---

const QuickApplicationForm = () => {
    const [phone, setPhone] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In reality, send to API
        alert('Заявка принята! Менеджер свяжется с вами.');
        navigate('/register');
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-0 w-full max-w-md bg-white p-1.5 rounded-2xl sm:rounded-full border border-slate-200 shadow-lg focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <input 
                type="tel" 
                placeholder="Введите ваш телефон" 
                className="w-full flex-1 bg-transparent px-4 py-2.5 outline-none text-slate-700 placeholder:text-slate-400"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
            />
            <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl sm:rounded-full font-bold text-sm hover:bg-blue-700 transition-colors">
                Попробовать
            </button>
        </form>
    );
}

const PainPointCard = ({ title, problem, solution, widget }: any) => (
   <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
      <div className="mb-6">
          {widget}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-4">{title}</h3>
      <div className="mb-4 flex-1">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide bg-red-50 px-2 py-1 rounded">Проблема</span>
          <p className="text-slate-600 text-sm mt-2 leading-relaxed">{problem}</p>
      </div>
      <div className="mt-auto border-t border-slate-100 pt-4">
          <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide bg-green-50 px-2 py-1 rounded">Решение</span>
          <p className="text-slate-600 text-sm mt-2 leading-relaxed">{solution}</p>
      </div>
   </div>
);

const FeatureItem = ({ text }: { text: string }) => (
   <li className="flex items-start text-slate-600">
      <CheckCircle2 size={18} className="mr-3 text-blue-500 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
   </li>
);

const FaqItem = ({ question, answer, isOpen, onClick }: any) => (
   <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <button 
         onClick={onClick}
         className="w-full px-6 py-4 text-left flex justify-between items-center font-bold text-slate-800 hover:bg-slate-50 transition-colors"
      >
         {question}
         <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`px-6 text-slate-500 text-sm leading-relaxed overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}>
         {answer}
      </div>
   </div>
);

const InteriorGeneratorDemo = () => {
  const styles = [
    {
      id: 'scandi',
      name: 'Скандинавский',
      hint: 'Светлое дерево + текстиль',
      img: 'https://images.unsplash.com/photo-1616594039964-1914e06cb665?auto=format&fit=crop&w=1600&q=80'
    },
    {
      id: 'loft',
      name: 'Лофт',
      hint: 'Бетон + металл',
      img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80'
    },
    {
      id: 'eco',
      name: 'Эко',
      hint: 'Много зелени',
      img: 'https://images.unsplash.com/photo-1488900128323-21503983a070?auto=format&fit=crop&w=1600&q=80'
    }
  ];
  const [activeStyle, setActiveStyle] = useState(styles[0]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
      <div className="flex border-b border-slate-100 overflow-x-auto">
        {styles.map((style) => (
          <button
            key={style.id}
            onClick={() => setActiveStyle(style)}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all ${activeStyle.id === style.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            role="tab"
            aria-selected={activeStyle.id === style.id}
            tabIndex={0}
          >
            {style.name}
          </button>
        ))}
      </div>
      <div className="relative h-80">
        <img
          src={activeStyle.img}
          alt={`Интерьер: ${activeStyle.name}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur rounded-2xl p-4 text-white">
          <div className="text-xs uppercase tracking-wide text-blue-200 mb-1">AI подсказка</div>
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>{activeStyle.hint}</span>
            <Sparkles size={16} className="text-blue-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

const EstimateAuditWidget = () => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'done'>('idle');

  const handleScan = () => {
    if (status === 'scanning') {
      return;
    }
    setStatus('scanning');
    setTimeout(() => setStatus('done'), 1400);
  };

  const lines = [
    { name: 'Бетон М300', planned: '12 м³', price: '56 400 ₽', issue: null },
    { name: 'Арматура А500С', planned: '1.8 т', price: '118 000 ₽', issue: 'Завышение на 8%' },
    { name: 'Доставка', planned: '1 усл.', price: '15 000 ₽', issue: null },
    { name: 'Вывоз мусора', planned: '-', price: '-', issue: 'Не учтено' }
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">AI аудит сметы</h3>
        <button
          onClick={handleScan}
          disabled={status === 'scanning'}
          className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center justify-center ${status === 'scanning' ? 'bg-slate-200 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {status === 'scanning' ? 'Сканирование...' : 'Просканировать'}
        </button>
      </div>
      <div className="rounded-2xl border border-slate-100 overflow-hidden">
        {lines.map((line, idx) => (
          <div
            key={line.name}
            className={`grid grid-cols-3 md:grid-cols-4 gap-4 px-4 py-3 text-sm items-center border-b border-slate-100 last:border-b-0 ${line.issue && status === 'done' ? 'bg-red-50 text-red-700 font-semibold' : 'text-slate-600'}`}
          >
            <span className="col-span-1 font-medium text-slate-800">{line.name}</span>
            <span>{line.planned}</span>
            <span>{line.price}</span>
            <span className="hidden md:block">{line.issue && status === 'done' ? line.issue : '—'}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        AI сверяет позиции с рыночными данными и проверяет, учтены ли обязательные работы.
      </p>
    </div>
  );
};

const ImprovementSuggestions = () => {
  const [items, setItems] = useState([
    { id: 1, title: 'Добавить раздел «Пусконаладка»', impact: 'Сокращает риски штрафов', status: 'pending' },
    { id: 2, title: 'Учесть скрытые работы по инженерии', impact: 'Прозрачность для заказчика', status: 'pending' },
    { id: 3, title: 'Предложить альтернативу плитке премиум', impact: 'Экономия 6%', status: 'pending' }
  ]);

  const handleToggle = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'done' ? 'pending' : 'done' }
          : item
      )
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 flex flex-col gap-4">
      <h3 className="text-xl font-bold text-slate-900">Рекомендации по улучшению</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleToggle(item.id)}
            className={`w-full text-left px-4 py-3 rounded-2xl border transition-all flex items-start justify-between gap-4 ${item.status === 'done' ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-100 hover:border-blue-200'}`}
            aria-pressed={item.status === 'done'}
          >
            <div>
              <div className="font-semibold">{item.title}</div>
              <div className="text-sm text-slate-500">{item.impact}</div>
            </div>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${item.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-200 text-slate-400'}`}>
              <Check size={14} />
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Принимая рекомендацию, система добавляет позицию в смету и уведомляет ответственных.
      </p>
    </div>
  );
};

const NewFeatureCard = ({ icon, title, description, checklist }: { icon: React.ReactNode, title: string, description: string, checklist: string[] }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`p-6 rounded-3xl border transition-all h-full flex flex-col ${expanded ? 'border-blue-200 shadow-xl bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:shadow-lg'}`}
    >
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 mb-4 flex-1">{description}</p>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors mb-4"
        aria-expanded={expanded}
      >
        {expanded ? 'Свернуть чек-лист' : 'Показать чек-лист'}
      </button>
      {expanded && (
        <ul className="space-y-2 text-sm text-slate-600">
          {checklist.map((item) => (
            <li key={item} className="flex items-center">
              <CheckCircle2 size={16} className="text-blue-500 mr-2" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const RoadmapTimeline = () => {
  const milestones = [
    {
      id: 'q1',
      title: 'Q1 2025 • Голосовые сценарии',
      details: ['Поддержка диалогов «прораб ↔ директор»', 'Авторазбор замеров по аудио', 'Экспорт голосовых заметок в PDF'],
      status: 'В разработке'
    },
    {
      id: 'q2',
      title: 'Q2 2025 • AI сметчик',
      details: ['Генерация сметы по чертежу', 'Связка с поставщиками через API', 'Динамическая маржа в зависимости от риска'],
      status: 'В планах'
    },
    {
      id: 'q3',
      title: 'Q3 2025 • Pro-документооборот',
      details: ['ЭЦП внутри платформы', 'Автосбор пакета КС-2/КС-3', 'Отслеживание подписания в реальном времени'],
      status: 'Research'
    }
  ];
  const [active, setActive] = useState(milestones[0]);

  return (
    <div className="bg-slate-800 rounded-3xl border border-white/10 p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row gap-4">
        {milestones.map((milestone) => (
          <button
            key={milestone.id}
            onClick={() => setActive(milestone)}
            className={`flex-1 px-4 py-3 rounded-2xl text-left border transition-all ${active.id === milestone.id ? 'bg-white text-slate-900 border-white' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
            aria-pressed={active.id === milestone.id}
            tabIndex={0}
          >
            <div className="text-xs uppercase tracking-wide text-slate-400">{milestone.status}</div>
            <div className="font-semibold">{milestone.title}</div>
          </button>
        ))}
      </div>
      <div className="bg-slate-900/60 rounded-3xl border border-white/10 p-6">
        <h4 className="text-2xl font-bold mb-4">{active.title}</h4>
        <ul className="space-y-3 text-slate-200 text-sm">
          {active.details.map((detail) => (
            <li key={detail} className="flex items-start">
              <Sparkles size={16} className="text-blue-300 mr-3 mt-0.5" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
