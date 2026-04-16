import React from 'react';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, CalendarDays, MessageSquare, Settings } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();
  
  const navItems = [
    { id: '/', icon: LayoutDashboard, label: t('home') },
    { id: '/tasks', icon: CheckSquare, label: t('tasks') },
    { id: '/calendar', icon: CalendarDays, label: t('schedule') },
    { id: '/chat', icon: MessageSquare, label: t('chat') },
    { id: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 z-30 flex justify-around items-center border-t border-slate-100 bg-white/90 backdrop-blur-2xl px-2 pb-6 pt-3 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.05)] transition-colors">
      {navItems.map((item) => {
        const isActive = location.pathname === item.id;
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            to={item.id}
            className={`group flex flex-col items-center justify-center gap-1 w-16 transition-all duration-300 ${
              isActive ? 'text-primary-600 -translate-y-1' : 'text-slate-400 hover:text-slate-600 hover:-translate-y-0.5'
            }`}
          >
            <div className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary-50 shadow-inner' : 'bg-transparent group-hover:bg-slate-50'}`}>
              <Icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'stroke-[2.5px] scale-110' : 'stroke-2 group-hover:scale-110'}`} />
              {isActive && (
                <motion.div 
                  layoutId="nav-glow"
                  className="absolute -bottom-1.5 w-1 h-1 bg-primary-500 rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]"
                />
              )}
            </div>
            <p className={`text-[10px] font-black tracking-wide transition-colors duration-300 ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
              {item.label}
            </p>
          </Link>
        );
      })}
    </nav>
  );
}
