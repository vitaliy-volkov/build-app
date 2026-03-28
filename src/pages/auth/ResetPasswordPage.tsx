import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../services/apiClient';
import { ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const resetPasswordSchema = z.object({
  email: z.string().email('Введите корректный email'),
  code: z.string().min(6, 'Код должен содержать 6 символов'),
  new_password: z.string().min(8, 'Пароль должен быть не менее 8 символов'),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage = () => {
  const { confirmPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const success = await confirmPasswordReset({
        email: data.email,
        code: data.code,
        new_password: data.new_password
      });

      if (success) {
        setIsSuccess(true);
        setTimeout(() => {
            navigate('/login');
        }, 3000);
      } else {
        setError('Неверный код или срок действия истек.');
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Ошибка сброса пароля.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Пароль изменен</h2>
            <p className="text-slate-600 mb-8">
              Ваш пароль успешно обновлен. Вы будете перенаправлены на страницу входа.
            </p>
            <Link to="/login" className="text-blue-600 font-bold hover:underline">
                Войти сейчас
            </Link>
          </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="flex flex-col items-center mb-8">
           <div className="bg-blue-600 p-3 rounded-xl text-white mb-4 shadow-lg shadow-blue-200">
              <ShieldCheck size={32} />
           </div>
           <h1 className="text-2xl font-bold text-slate-900">Сброс пароля</h1>
           <p className="text-slate-500 text-sm mt-2 text-center">
             Введите код из письма и новый пароль
           </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
             <input 
               {...register('email')}
               type="email" 
               className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
               placeholder="name@company.com"
             />
             {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Код подтверждения</label>
             <input 
               {...register('code')}
               type="text" 
               className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center tracking-widest uppercase"
               placeholder="ABCDEF"
             />
             {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code.message}</p>}
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Новый пароль</label>
             <input 
               {...register('new_password')}
               type="password" 
               className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
               placeholder="••••••••"
             />
             {errors.new_password && <p className="mt-1 text-xs text-red-500">{errors.new_password.message}</p>}
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
             {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Сменить пароль'}
           </button>
        </form>
      </div>
    </div>
  );
};
