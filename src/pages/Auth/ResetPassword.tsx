import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { Lock, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/auth/reset-password', { email, code, new_password: password });
      setStatus('success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.error || 'Ошибка сброса пароля');
    }
  };

  if (status === 'success') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32}/>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Пароль изменен!</h2>
                <p className="text-slate-500">Вы будете перенаправлены на страницу входа...</p>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
           <h1 className="text-2xl font-bold text-slate-900">Сброс пароля</h1>
           <p className="text-slate-500 text-sm mt-2">
             Введите код подтверждения и новый пароль для {email}
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Код из письма</label>
                <input 
                    type="text" 
                    required 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-widest text-center text-lg"
                    placeholder="CODE"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Новый пароль</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"}
                        required 
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button 
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">Минимум 8 символов</p>
            </div>

            {status === 'error' && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}

            <button 
                type="submit" 
                disabled={status === 'loading'}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-70"
            >
                {status === 'loading' ? <Loader2 className="animate-spin"/> : 'Сменить пароль'}
            </button>
        </form>
      </div>
    </div>
  );
};
