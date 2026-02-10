
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Menu, X, Sparkles, Mail, Phone } from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden flex flex-col">
      {/* --- LIQUID GLASS HEADER --- */}
      <header className="fixed w-full top-0 z-50 transition-all duration-300 bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-600 cursor-pointer" onClick={() => navigate('/')}>
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-lg shadow-blue-500/30">
                <LayoutDashboard size={20} />
            </div>
            <span className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">Build App AI</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-700">
            <Link to="/estimates-promo" className={`hover:text-blue-600 transition-colors ${isActive('/estimates-promo') ? 'text-blue-600' : ''}`}>Сметы</Link>
            <Link to="/finance-promo" className={`hover:text-blue-600 transition-colors ${isActive('/finance-promo') ? 'text-blue-600' : ''}`}>Финансы</Link>
            <Link to="/ai-promo" className={`hover:text-purple-600 transition-colors flex items-center ${isActive('/ai-promo') ? 'text-purple-600' : ''}`}><Sparkles size={14} className="mr-1 text-purple-500"/> AI</Link>
            <Link to="/supply-promo" className={`hover:text-blue-600 transition-colors ${isActive('/supply-promo') ? 'text-blue-600' : ''}`}>Снабжение</Link>
            <Link to="/blog" className={`hover:text-blue-600 transition-colors ${isActive('/blog') ? 'text-blue-600' : ''}`}>Блог</Link>
            <Link to="/contacts" className={`hover:text-blue-600 transition-colors ${isActive('/contacts') ? 'text-blue-600' : ''}`}>Контакты</Link>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <button 
              onClick={() => navigate('/login')} 
              className="text-sm font-medium text-slate-600 hover:text-blue-600 px-3 py-2 transition-colors"
            >
              Войти
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-slate-400/50 transform hover:-translate-y-0.5"
            >
              Начать бесплатно
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
             {mobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
           <div className="md:hidden absolute top-16 left-0 w-full max-h-[calc(100vh-4rem)] overflow-y-auto bg-white border-b border-slate-100 p-4 flex flex-col space-y-4 shadow-xl animate-in slide-in-from-top-5">
              <Link to="/estimates-promo" className="text-slate-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Сметы</Link>
              <Link to="/finance-promo" className="text-slate-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Финансы</Link>
              <Link to="/ai-promo" className="text-purple-600 font-bold flex items-center" onClick={() => setMobileMenuOpen(false)}><Sparkles size={14} className="mr-2"/> AI Модуль</Link>
              <Link to="/supply-promo" className="text-slate-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Снабжение</Link>
              <Link to="/blog" className="text-slate-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Блог</Link>
              <Link to="/contacts" className="text-slate-700 font-medium" onClick={() => setMobileMenuOpen(false)}>Контакты</Link>
              <div className="h-px bg-slate-100 my-2"></div>
              <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="w-full text-center py-2 text-slate-600">Войти</button>
              <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Регистрация</button>
           </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
               <div className="col-span-1 md:col-span-1">
                  <div className="flex items-center space-x-2 text-blue-600 mb-4">
                     <LayoutDashboard size={24} />
                     <span className="text-xl font-bold text-slate-900">Build App AI</span>
                  </div>
                  <p className="text-slate-500 text-sm">
                     Интеллектуальная система управления строительством для тех, кто ценит время и деньги.
                  </p>
               </div>
               <div>
                  <h4 className="font-bold text-slate-900 mb-4">Продукт</h4>
                  <ul className="space-y-2 text-sm text-slate-500">
                     <li><Link to="/estimates-promo" className="hover:text-blue-600">Сметы</Link></li>
                     <li><Link to="/finance-promo" className="hover:text-blue-600">Финансы</Link></li>
                     <li><Link to="/supply-promo" className="hover:text-blue-600">Снабжение</Link></li>
                     <li><Link to="/ai-promo" className="hover:text-blue-600">AI Модуль</Link></li>
                  </ul>
               </div>
               <div>
                  <h4 className="font-bold text-slate-900 mb-4">Компания</h4>
                  <ul className="space-y-2 text-sm text-slate-500">
                     <li><Link to="/about" className="hover:text-blue-600">О нас</Link></li>
                     <li><Link to="/contacts" className="hover:text-blue-600">Контакты</Link></li>
                     <li><Link to="/blog" className="hover:text-blue-600">Блог</Link></li>
                  </ul>
               </div>
               <div>
                  <h4 className="font-bold text-slate-900 mb-4">Контакты</h4>
                  <ul className="space-y-2 text-sm text-slate-500">
                     <li className="flex items-center"><Mail size={14} className="mr-2 text-slate-400"/> help@build-app.ru</li>
                     <li className="flex items-center"><Phone size={14} className="mr-2 text-slate-400"/> +7 (929) 20-20-33</li>
                     <li>г. Екатеринбург, ул. Розы Люксембург 22</li>
                  </ul>
               </div>
            </div>
            <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-400">
               <p>© 2024 Build App AI. Все права защищены.</p>
               <div className="flex space-x-6 mt-4 md:mt-0">
                  <a href="#" className="hover:text-slate-600">Политика конфиденциальности</a>
                  <a href="#" className="hover:text-slate-600">Оферта</a>
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
};
