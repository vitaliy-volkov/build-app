import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../services/apiClient';
import { LayoutDashboard, Loader2, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const success = await login(data.email, data.password);
      if (success) {
        navigate('/');
      } else {
        setError('Неверный email или пароль');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при входе. Попробуйте позже.');
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
           <h1 className="text-2xl font-bold text-slate-900">Вход в систему</h1>
           <p className="text-slate-500 text-sm mt-2 text-center">
             С возвращением! Введите данные для входа
           </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
             <div className="text-right mt-1">
                 <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
                     Забыли пароль?
                 </Link>
             </div>
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
             className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center mt-2 disabled:opacity-70"
           >
             {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Войти'}
           </button>
        </form>

        <div className="mt-6 text-center text-sm">
           <p className="text-slate-500">
             Нет аккаунта?{' '}
             <Link to="/register" className="text-blue-600 font-bold hover:underline">Зарегистрироваться</Link>
           </p>
        </div>
      </div>
    </div>
  );
};
