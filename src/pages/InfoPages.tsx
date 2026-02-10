
import React from 'react';
import { Users, MapPin, Mail, Phone, Building2, Award, Globe } from 'lucide-react';

export const About = () => (
    <div className="min-h-screen bg-white pt-24 px-4">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-slate-900 mb-8 text-center">О компании Build App AI</h1>
            <p className="text-xl text-slate-500 text-center mb-16 leading-relaxed">
                Мы — команда строителей и IT-инженеров, которые решили оцифровать самую консервативную отрасль.
                Наша миссия — сделать стройку прозрачной, предсказуемой и прибыльной.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20">
                <div>
                    <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2670" className="rounded-2xl shadow-lg" alt="Team" />
                </div>
                <div className="flex flex-col justify-center">
                    <h2 className="text-2xl font-bold mb-4">Наша история</h2>
                    <p className="text-slate-600 mb-4">
                        В 2020 году мы сами столкнулись с хаосом в управлении ремонтами. Excel-таблицы путались, 
                        чеки терялись, а кассовые разрывы стали нормой. Мы не нашли удобного решения на рынке и создали своё.
                    </p>
                    <p className="text-slate-600">
                        Сегодня Build App AI помогает тысячам компаний в СНГ экономить миллионы рублей ежемесячно, 
                        предотвращая ошибки и воровство.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="p-6">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Users size={32}/></div>
                    <h3 className="font-bold text-lg">5000+</h3>
                    <p className="text-slate-500">Активных пользователей</p>
                </div>
                <div className="p-6">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><Award size={32}/></div>
                    <h3 className="font-bold text-lg">TOP-10</h3>
                    <p className="text-slate-500">Стартапов в PropTech 2024</p>
                </div>
                <div className="p-6">
                    <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4"><Globe size={32}/></div>
                    <h3 className="font-bold text-lg">12 Стран</h3>
                    <p className="text-slate-500">География присутствия</p>
                </div>
            </div>
        </div>
    </div>
);

export const Contacts = () => (
    <div className="min-h-screen bg-slate-50 pt-24 px-4">
        <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Контакты</h1>
                <p className="text-slate-500">Мы всегда на связи и готовы помочь</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold mb-6">Офис в Екатеринбурге</h2>
                    <div className="space-y-6">
                        <div className="flex items-start">
                            <MapPin className="text-blue-600 mr-4 mt-1" size={24}/>
                            <div>
                                <h4 className="font-bold text-slate-800">Адрес</h4>
                                <p className="text-slate-600">г. Екатеринбург, ул. Розы Люксембург 22</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <Phone className="text-blue-600 mr-4 mt-1" size={24}/>
                            <div>
                                <h4 className="font-bold text-slate-800">Телефон</h4>
                                <p className="text-slate-600">+7 (929) 20-20-33</p>
                                <p className="text-slate-400 text-sm">Пн-Пт с 9:00 до 19:00</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <Mail className="text-blue-600 mr-4 mt-1" size={24}/>
                            <div>
                                <h4 className="font-bold text-slate-800">Email</h4>
                                <p className="text-slate-600">help@build-app.ru</p>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <Building2 className="text-blue-600 mr-4 mt-1" size={24}/>
                            <div>
                                <h4 className="font-bold text-slate-800">Реквизиты</h4>
                                <p className="text-slate-600 text-sm">ООО "СТРОЙ ТЕХНОЛОГИИ"</p>
                                <p className="text-slate-600 text-sm">ИНН 7700000000 / КПП 770101001</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-2xl font-bold mb-6">Напишите нам</h2>
                    <form className="space-y-4" onSubmit={e => {e.preventDefault(); alert('Сообщение отправлено!')}}>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Ваше имя</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Иван" required/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Email или Телефон</label>
                            <input className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="contact@example.com" required/>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Сообщение</label>
                            <textarea rows={4} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Чем мы можем помочь?" required></textarea>
                        </div>
                        <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors">Отправить</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
);
