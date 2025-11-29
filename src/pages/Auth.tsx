
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/apiClient';
import { LayoutDashboard, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Password validation regex patterns
const passwordRules = {
  hasUpper: /[A-Z]/,
  hasLower: /[a-z]/,
  hasDigit: /[0-9]/,
  hasSpecial: /[!@#$%^&*]/
};

// Base schema for shared fields
const baseAuthSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

// Password schemas
const simplePasswordSchema = z.string().min(1, 'Введите пароль');

const strictPasswordSchema = z.string()
  .min(8, 'Пароль должен содержать минимум 8 символов')
  .refine((val) => {
    const typesCount = [
      passwordRules.hasUpper.test(val),
      passwordRules.hasLower.test(val),
      passwordRules.hasDigit.test(val),
      passwordRules.hasSpecial.test(val)
    ].filter(Boolean).length;
    return typesCount >= 3;
  }, 'Пароль должен содержать минимум 3 из 4 типов: заглавные, строчные, цифры, спецсимволы (!@#$%^&*)');

// Final Schemas
const loginSchema = baseAuthSchema.extend({
  password: simplePasswordSchema
});

const registerSchema = baseAuthSchema.extend({
  password: strictPasswordSchema,
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export const Auth = () => {
  const { login, register: registerApi } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRegister = location.pathname === '/register';

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
  });

  // Reset form errors when switching modes
  React.useEffect(() => {
    reset();
    setError(null);
  }, [isRegister, reset]);

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!data.name) return; // Should be caught by validator
        const success = await registerApi({
          email: data.email,
          password: data.password,
          name: data.name,
          role: 'director', // Default role for new signups
        });

        if (success) {
          navigate('/');
        } else {
          setError('Ошибка регистрации. Проверьте данные и попробуйте снова.');
        }
      } else {
        const success = await login(data.email, data.password);
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
           {isRegister && (
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Ваше имя</label>
               <input 
                 {...register('name')}
                 type="text" 
                 className={`w-full px-4 py-2 border rounded-lg outline-none transition-all ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500 focus:ring-2'}`}
                 placeholder="Иван Иванов"
               />
               {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
             </div>
           )}

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
             <input 
               {...register('email')}
               type="email" 
               className={`w-full px-4 py-2 border rounded-lg outline-none transition-all ${errors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500 focus:ring-2'}`}
               placeholder="name@company.com"
             />
             {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
             <input 
               {...register('password')}
               type="password" 
               className={`w-full px-4 py-2 border rounded-lg outline-none transition-all ${errors.password ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-500 focus:ring-2'}`}
               placeholder="••••••••"
             />
             {errors.password && (
               <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
             )}
             {!isRegister && (
                 <div className="text-right mt-1">
                     <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs text-blue-600 hover:underline">
                         Забыли пароль?
                     </button>
                 </div>
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
