import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../services/apiClient';
import { KeyRound, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
  email: z.string().email('Введите корректный email'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage = () => {
  const { requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError(null);
    setIsLoading(true);

    try {
      const success = await requestPasswordReset(data.email);
      // Note: Backend always returns success for security reasons (email enumeration protection)
      // But if it fails with 500, success will be false.
      if (success) {
        setIsSuccess(true);
      } else {
        setError('Произошла ошибка. Попробуйте позже.');
      }
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Ошибка соединения с сервером.');
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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Проверьте почту</h2>
          <p className="text-slate-600 mb-8">
            Мы отправили код для сброса пароля на ваш email.
          </p>
          <div className="space-y-3">
             <Link 
               to="/reset-password" 
               className="block w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all"
             >
               Ввести код
             </Link>
             <Link to="/login" className="block text-sm text-slate-500 hover:text-slate-800">
               Вернуться на страницу входа
             </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <Link to="/login" className="inline-flex items-center text-slate-400 hover:text-slate-600 mb-6 text-sm">
          <ArrowLeft size={16} className="mr-1" /> Назад
        </Link>
        
        <div className="flex flex-col items-center mb-8">
           <div className="bg-blue-100 p-3 rounded-xl text-blue-600 mb-4">
              <KeyRound size={32} />
           </div>
           <h1 className="text-2xl font-bold text-slate-900">Забыли пароль?</h1>
           <p className="text-slate-500 text-sm mt-2 text-center">
             Введите email, указанный при регистрации, и мы отправим вам код восстановления
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
             {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Отправить код'}
           </button>
        </form>
      </div>
    </div>
  );
};
