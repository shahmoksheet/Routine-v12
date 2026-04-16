import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface TopBarProps {
  title?: string;
  icon?: string;
  onMenuClick?: () => void;
}

export default function TopBar({ title = 'Dashboard', icon, onMenuClick }: TopBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  return (
    <header className="sticky top-0 z-40 flex items-center bg-white/80 backdrop-blur-xl px-5 py-4 justify-between border-b border-slate-100 shadow-sm transition-colors">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="p-2.5 -ml-2 text-slate-500 hover:text-primary-600 transition-all rounded-2xl hover:bg-primary-50 active:scale-95"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-0.5">HQ Workspace</p>
          <h2 className="text-xl font-black text-slate-800 leading-tight tracking-tight">{title}</h2>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link 
          to="/notifications"
          className="relative p-2.5 text-slate-400 hover:text-primary-600 transition-all bg-slate-50 hover:bg-primary-50 rounded-2xl active:scale-95"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm"></span>
          )}
        </Link>
        <Link 
          to="/edit-profile"
          className="size-11 rounded-2xl border-2 border-white shadow-soft bg-primary-100 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
        >
          <img alt="Profile" className="w-full h-full object-cover" src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=4F46E5&color=fff`} referrerPolicy="no-referrer" />
        </Link>
      </div>
    </header>
  );
}
