import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { useCompanyOnboarding } from '../../hooks/useCompanyOnboarding';
import { useNavigate } from 'react-router-dom';

const companySchema = z.object({
  name: z.string().min(2, 'Название компании должно содержать минимум 2 символа'),
  address: z.string().min(5, 'Укажите корректный адрес'),
  inn: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export const CreateCompany = () => {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useCompanyOnboarding();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
  });

  const onSubmit = (data: CompanyFormValues) => {
    mutate(data, {
      onSuccess: () => {
        // Navigate to dashboard after successful creation
        navigate('/'); 
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Header */}
        <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center text-green-600 font-medium">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2 border border-green-200">
                    <CheckCircle2 size={18} />
                </div>
                Регистрация
            </div>
            <div className="h-[2px] flex-1 bg-slate-200 mx-4 relative">
                <div className="absolute left-0 top-0 h-full bg-blue-600 w-1/2"></div>
            </div>
            <div className="flex items-center text-blue-600 font-bold">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-2 border-2 border-blue-600">
                    <span className="text-sm">2</span>
                </div>
                Создание компании
            </div>
            <div className="h-[2px] flex-1 bg-slate-200 mx-4"></div>
            <div className="flex items-center text-slate-400">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center mr-2 border border-slate-200">
                    <span className="text-sm">3</span>
                </div>
                Начало работы
            </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center space-x-4 mb-2">
                    <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
                        <Building2 size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Добро пожаловать в Build App AI</h1>
                        <p className="text-slate-500">Давайте настроим ваше рабочее пространство. Это займет пару минут.</p>
                    </div>
                </div>
            </div>
            
            <div className="p-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-start">
                        <span className="font-medium mr-2">Ошибка:</span>
                        {error.message}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Название компании <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register('name')}
                                type="text"
                                className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'} focus:border-blue-500 focus:ring-4 transition-all outline-none text-slate-800 placeholder:text-slate-400`}
                                placeholder="ООО Строй-Групп"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Юридический адрес <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                {...register('address')}
                                rows={3}
                                className={`w-full px-4 py-3 rounded-xl border ${errors.address ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-200'} focus:border-blue-500 focus:ring-4 transition-all outline-none text-slate-800 placeholder:text-slate-400 resize-none`}
                                placeholder="г. Москва, ул. Строителей, д. 1"
                            />
                            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    ИНН (Необязательно)
                                </label>
                                <input
                                    {...register('inn')}
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                    placeholder="7700000000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Телефон (Необязательно)
                                </label>
                                <input
                                    {...register('phone')}
                                    type="tel"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                    placeholder="+7 (999) 000-00-00"
                                />
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Сайт (Необязательно)
                            </label>
                            <input
                                {...register('website')}
                                type="url"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all outline-none text-slate-800 placeholder:text-slate-400"
                                placeholder="https://stroy-group.ru"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" />
                                    Создаем...
                                </>
                            ) : (
                                <>
                                    Создать и продолжить
                                    <ChevronRight className="ml-2" />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        <p className="text-center text-slate-400 text-sm mt-6">
            Вы сможете изменить эти данные позже в настройках компании.
        </p>
      </div>
    </div>
  );
};
