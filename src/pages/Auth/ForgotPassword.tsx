import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { LayoutDashboard, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('success');
      setMessage('Если аккаунт существует, мы отправили код подтверждения (см. консоль сервера для демо).');
    } catch (error: any) {
      setStatus('error');
      setMessage('Ошибка отправки. Попробуйте позже.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <button onClick={() => navigate('/login')} className="text-slate-400 hover:text-slate-600 flex items-center mb-6 text-sm">
            <ArrowLeft size={16} className="mr-1"/> Назад
        </button>
        
        <div className="text-center mb-8">
           <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-4 text-blue-600">
              <Lock size={32} />
           </div>
           <h1 className="text-2xl font-bold text-slate-900">Забыли пароль?</h1>
           <p className="text-slate-500 text-sm mt-2">
             Введите email, указанный при регистрации. Мы отправим код для сброса.
           </p>
        </div>

        {status === 'success' ? (
            <div className="text-center space-y-6">
                <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm">
                    {message}
                </div>
                <button 
                    onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                    Ввести код
                </button>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <div className="relative">
                        <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input 
                            type="email" 
                            required 
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="name@company.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                {status === 'error' && (
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{message}</div>
                )}

                <button 
                    type="submit" 
                    disabled={status === 'loading'}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-70"
                >
                    {status === 'loading' ? <Loader2 className="animate-spin"/> : 'Отправить код'}
                </button>
            </form>
        )}
      </div>
    </div>
  );
};
