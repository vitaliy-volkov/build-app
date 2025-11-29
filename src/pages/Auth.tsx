
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient, useAuth } from '../services/apiClient';
import { LayoutDashboard, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { UserRole } from '../types';

// Валидация пароля на клиенте
const validatePassword = (password: string): string | null => {
  if (password.length < 8) {
    return 'Пароль должен содержать минимум 8 символов';
  }

  let hasUpper = false;
  let hasLower = false;
  let hasDigit = false;
  let hasSpecial = false;

  for (const char of password) {
    if (char >= 'A' && char <= 'Z') hasUpper = true;
    else if (char >= 'a' && char <= 'z') hasLower = true;
    else if (char >= '0' && char <= '9') hasDigit = true;
    else if ('!@#$%^&*'.includes(char)) hasSpecial = true;
  }

  const typesCount = [hasUpper, hasLower, hasDigit, hasSpecial].filter(Boolean).length;
  if (typesCount < 3) {
    return 'Пароль должен содержать минимум 3 из 4 типов: заглавные, строчные, цифры, спецсимволы (!@#$%^&*)';
  }

  return null;
};

export const Auth = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname === '/register';

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPasswordError(null);
    setIsLoading(true);

    try {
      // Валидация email
      if (!email || !email.includes('@')) {
        setError('Введите корректный email');
        setIsLoading(false);
        return;
      }

      // Валидация пароля
      const passwordValidation = validatePassword(password);
      if (passwordValidation) {
        setPasswordError(passwordValidation);
        setIsLoading(false);
        return;
      }

      if (isRegister) {
        // Валидация имени
        if (!name || name.length < 2) {
          setError('Имя должно содержать минимум 2 символа');
          setIsLoading(false);
          return;
        }

        // Регистрация
        const success = await register({
          email,
          password,
          name,
          role: UserRole.Director, // По умолчанию директор
        });

        if (success) {
          navigate('/');
        } else {
          setError('Ошибка регистрации. Проверьте данные и попробуйте снова.');
        }
      } else {
        // Логин
        const success = await login(email, password);
        if (success) {
          navigate('/');
        } else {
          setError('Неверный email или пароль');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Произошла ошибка. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
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
               className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                 passwordError ? 'border-red-300' : 'border-slate-300'
               }`}
               placeholder="••••••••"
               value={password}
               onChange={e => {
                 setPassword(e.target.value);
                 if (passwordError) {
                   const validation = validatePassword(e.target.value);
                   setPasswordError(validation);
                 }
               }}
             />
             {passwordError && (
               <p className="mt-1 text-xs text-red-600">{passwordError}</p>
             )}
           </div>

           {error && (
             <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
               <AlertCircle size={16} />
               <span>{error}</span>
             </div>
           )}

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
