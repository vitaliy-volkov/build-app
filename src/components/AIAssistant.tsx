
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Minimize2, Maximize2, MessageSquare } from 'lucide-react';
import { useApp } from '../App';
import { AIService } from '../services/aiService';
import { AIMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const AIAssistant = () => {
  const { currentUser, projects, transactions, tasks, aiConfig } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([
    { id: 'welcome', role: 'assistant', text: `Привет, ${currentUser.name}! Я твой ИИ-помощник. Спроси меня о проектах, финансах или задачах.`, timestamp: new Date().toISOString() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: AIMessage = { id: uuidv4(), role: 'user', text: input, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare context
    const contextData = JSON.stringify({
       active_projects_count: projects.length,
       recent_transactions: transactions.slice(-5),
       pending_tasks: tasks.filter(t => t.status !== 'Done').length,
       user_role: currentUser.role
    });

    const history = messages.map(m => ({ role: m.role, text: m.text }));
    history.push({ role: 'user', text: userMsg.text });

    const responseText = await AIService.chat(history, contextData, aiConfig);

    const aiMsg: AIMessage = { id: uuidv4(), role: 'assistant', text: responseText, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all z-50 flex items-center animate-bounce-subtle"
      >
        <Sparkles size={24} className="mr-2" />
        <span className="font-bold hidden md:inline">AI Ассистент</span>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col transition-all duration-300 overflow-hidden ${isMinimized ? 'w-72 h-14' : 'w-80 md:w-96 h-[500px]'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 flex justify-between items-center cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
         <div className="flex items-center text-white">
            <Sparkles size={18} className="mr-2" />
            <span className="font-bold text-sm">Строй-Контроль AI</span>
         </div>
         <div className="flex space-x-2 text-white/80">
            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
               {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
               <X size={16} />
            </button>
         </div>
      </div>

      {/* Chat Body */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
             {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-br-none' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                   }`}>
                      {msg.text}
                   </div>
                </div>
             ))}
             {isLoading && (
                <div className="flex justify-start">
                   <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-none shadow-sm flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                   </div>
                </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white">
             <div className="flex space-x-2">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Спросите что-нибудь..."
                  className="flex-1 bg-slate-100 border-0 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={handleSend} 
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                >
                   <Send size={18} />
                </button>
             </div>
          </div>
        </>
      )}
    </div>
  );
};
