
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';
import { LayoutDashboard, CheckCircle2, Loader2 } from 'lucide-react';

export const Auth = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname === '/register';

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API Call
    setTimeout(() => {
      setIsLoading(false);
      login(email, isRegister ? name : undefined); // In real app, validate credentials
      navigate('/');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
           <div className="bg-blue-600 p-3 rounded-xl text-white mb-4 shadow-lg shadow-blue-200">
              <LayoutDashboard size={32} />
           </div>
           <h1 className="text-2xl font-bold text-slate-900">
             {isRegister ? 'Регистрация аккаунта' : 'Вход в систему'}
           </h1>
           <p className="text-slate-500 text-sm mt-2 text-center">
             {isRegister ? 'Начните управлять строительством эффективно' : 'С возвращением! Введите данные для входа'}
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
           {isRegister && (
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Ваше имя</label>
               <input 
                 type="text" 
                 required 
                 className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                 placeholder="Иван Иванов"
                 value={name}
                 onChange={e => setName(e.target.value)}
               />
             </div>
           )}

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
             <input 
               type="email" 
               required 
               className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
               placeholder="name@company.com"
               value={email}
               onChange={e => setEmail(e.target.value)}
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
             <input 
               type="password" 
               required 
               className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
               placeholder="••••••••"
               value={password}
               onChange={e => setPassword(e.target.value)}
             />
           </div>

           <button 
             type="submit" 
             disabled={isLoading}
             className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center mt-6 disabled:opacity-70"
           >
             {isLoading ? <Loader2 size={20} className="animate-spin" /> : (isRegister ? 'Создать аккаунт' : 'Войти')}
           </button>
        </form>

        <div className="mt-6 text-center text-sm">
           {isRegister ? (
             <p className="text-slate-500">
               Уже есть аккаунт?{' '}
               <button onClick={() => navigate('/login')} className="text-blue-600 font-bold hover:underline">Войти</button>
             </p>
           ) : (
             <p className="text-slate-500">
               Нет аккаунта?{' '}
               <button onClick={() => navigate('/register')} className="text-blue-600 font-bold hover:underline">Зарегистрироваться</button>
             </p>
           )}
        </div>
        
        {/* Trust Badges */}
        {isRegister && (
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-2">
            <div className="flex items-center text-xs text-slate-500">
              <CheckCircle2 size={14} className="text-green-500 mr-2" /> 14 дней бесплатного периода
            </div>
            <div className="flex items-center text-xs text-slate-500">
              <CheckCircle2 size={14} className="text-green-500 mr-2" /> Без привязки карты
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
