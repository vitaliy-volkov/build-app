
import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag, ArrowRight } from 'lucide-react';

const BLOG_POSTS = [
    {
        id: '1',
        title: 'Как составить идеальную строительную смету и не уйти в минус',
        excerpt: 'Разбираем основные ошибки при составлении смет. Почему важно учитывать скрытые работы и как автоматизация помогает избежать кассового разрыва.',
        image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=2626',
        date: '12 Окт 2024',
        author: 'Алексей Смирнов',
        category: 'Сметное дело',
        content: `
            <h2>Введение</h2>
            <p>Смета — это фундамент финансового успеха любого строительного проекта. Ошибка в расчетах на старте может стоить вам всей прибыли в конце.</p>
            <h2>Типичные ошибки</h2>
            <ol>
                <li><b>Забытые работы.</b> Часто забывают про подъем материалов, вынос мусора, укрывку поверхностей.</li>
                <li><b>Устаревшие цены.</b> Рынок стройматериалов волатилен. Прайс месячной давности может быть неактуален.</li>
                <li><b>Отсутствие запаса.</b> Всегда закладывайте 5-10% на непредвиденные расходы.</li>
            </ol>
            <h2>Как помогает AI?</h2>
            <p>Современные сервисы, такие как Строй-Контроль, используют нейросети для проверки смет. ИИ сравнивает ваши цены с рыночными и подсказывает, если вы что-то упустили.</p>
        `
    },
    {
        id: '2',
        title: 'Кассовый разрыв в стройке: как предвидеть и предотвратить',
        excerpt: 'Финансовое планирование для малого бизнеса. Что такое P&L, Cash Flow и зачем нужен платежный календарь каждому прорабу.',
        image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=2671',
        date: '05 Ноя 2024',
        author: 'Ирина Петрова',
        category: 'Финансы',
        content: `
            <h2>Что такое кассовый разрыв?</h2>
            <p>Это ситуация, когда по документам у вас прибыль, а денег в кассе нет, чтобы заплатить рабочим или поставщикам прямо сейчас.</p>
            <h2>Инструменты контроля</h2>
            <ul>
                <li><b>Платежный календарь.</b> Планируйте поступления и расходы по датам.</li>
                <li><b>Разделение счетов.</b> Никогда не смешивайте деньги разных проектов в "общий котел".</li>
            </ul>
            <p>Использование специализированного ПО позволяет автоматически строить графики денежных потоков и видеть угрозу разрыва за несколько недель.</p>
        `
    },
    {
        id: '3',
        title: 'AI в дизайне интерьера: угроза или помощник?',
        excerpt: 'Как нейросети меняют работу дизайнера. Генерация мудбордов, подбор материалов и автоматизация рутины.',
        image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=2000',
        date: '20 Ноя 2024',
        author: 'ИИ Редакция',
        category: 'Технологии',
        content: `
            <p>Искусственный интеллект стремительно входит в креативные индустрии. В дизайне интерьеров AI уже умеет:</p>
            <ul>
                <li>Генерировать фотореалистичные визуализации по текстовому описанию.</li>
                <li>Подбирать цветовые палитры.</li>
                <li>Распознавать материалы по фото.</li>
            </ul>
            <p>Это не заменяет дизайнера, но ускоряет его работу в 10 раз. Вместо долгих поисков референсов, можно сгенерировать их за секунды.</p>
        `
    }
];

export const Blog = () => {
    return (
        <div className="min-h-screen bg-slate-50 pt-24 font-sans text-slate-900">
            <div className="max-w-6xl mx-auto px-4 mb-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Блог о строительстве и бизнесе</h1>
                    <p className="text-slate-500">Полезные статьи, кейсы и новости индустрии</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {BLOG_POSTS.map(post => (
                        <Link to={`/blog/${post.id}`} key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl transition-all group">
                            <div className="h-48 overflow-hidden">
                                <img src={post.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={post.title} />
                            </div>
                            <div className="p-6">
                                <div className="flex items-center text-xs text-slate-500 mb-3">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold mr-3">{post.category}</span>
                                    <span className="flex items-center"><Calendar size={12} className="mr-1"/> {post.date}</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">{post.title}</h3>
                                <p className="text-slate-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                                <span className="text-blue-600 font-bold text-sm flex items-center">Читать далее <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform"/></span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const BlogPost = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const post = BLOG_POSTS.find(p => p.id === id);

    if (!post) return <div className="p-20 text-center">Статья не найдена</div>;

    return (
        <div className="min-h-screen bg-white pt-24 font-sans text-slate-900">
            <article className="max-w-3xl mx-auto px-4 pb-24">
                <button onClick={() => navigate('/blog')} className="flex items-center text-slate-500 hover:text-blue-600 mb-8 transition-colors">
                    <ArrowLeft size={20} className="mr-2"/> Назад к блогу
                </button>
                
                <div className="mb-8">
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-bold mb-4 inline-block">{post.category}</span>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">{post.title}</h1>
                    <div className="flex items-center text-slate-500 text-sm space-x-6 border-b border-slate-100 pb-8">
                        <span className="flex items-center"><User size={16} className="mr-2"/> {post.author}</span>
                        <span className="flex items-center"><Calendar size={16} className="mr-2"/> {post.date}</span>
                    </div>
                </div>

                <img src={post.image} className="w-full h-[400px] object-cover rounded-2xl mb-12 shadow-lg" alt={post.title} />

                <div className="prose prose-lg prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: post.content }}></div>
            </article>
        </div>
    );
};
