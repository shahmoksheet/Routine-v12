import React, { useMemo } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { useNotifications, Notification } from '../context/NotificationContext';
import { ArrowLeft, Bell, CheckCircle2, AlertCircle, Clock, Info, CheckCheck, Trash2 } from 'lucide-react';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';

export default function NotificationsView() {
  const { setCurrentView } = useNavigation();
  const { notifications, markAsRead, markAllAsRead, clearAll, isLoading } = useNotifications();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'info': return <Info className="w-5 h-5 text-primary-500" />;
      case 'mention': return <Bell className="w-5 h-5 text-indigo-500" />;
      default: return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-100';
      case 'warning': return 'bg-rose-50 border-rose-100';
      case 'info': return 'bg-primary-50 border-primary-100';
      case 'mention': return 'bg-indigo-50 border-indigo-100';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {
      'Today': [],
      'Yesterday': [],
      'Older': []
    };

    notifications.forEach(notif => {
      const date = new Date(notif.created_at);
      if (isToday(date)) {
        groups['Today'].push(notif);
      } else if (isYesterday(date)) {
        groups['Yesterday'].push(notif);
      } else {
        groups['Older'].push(notif);
      }
    });

    return groups;
  }, [notifications]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors">
      <header className="sticky top-0 z-40 flex items-center bg-white/80 backdrop-blur-xl px-5 py-4 border-b border-slate-100 shadow-sm transition-colors">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="p-2.5 -ml-2 text-slate-500 hover:text-primary-600 transition-all rounded-2xl hover:bg-primary-50 active:scale-95"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-black text-slate-800 ml-2 tracking-tight">Notifications</h2>
        <div className="ml-auto flex items-center gap-2">
          {notifications.length > 0 && (
            <>
              <button onClick={markAllAsRead} className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-3 py-1.5 rounded-xl transition-colors">
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
              <button onClick={clearAll} className="flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Clear all
              </button>
            </>
          )}
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar pb-32">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Bell className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No notifications yet.</p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([groupName, groupNotifs]) => {
            if (groupNotifs.length === 0) return null;
            return (
              <div key={groupName} className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2">{groupName}</h3>
                {groupNotifs.map((notif) => (
                  <div 
                    key={notif.id} 
                    onClick={() => notif.is_read === 0 && markAsRead(notif.id)}
                    className={`group relative flex items-start gap-4 p-5 rounded-3xl border transition-all duration-300 ${notif.is_read === 0 ? 'cursor-pointer' : ''} ${
                    notif.is_read === 1
                      ? 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5' 
                      : 'bg-gradient-to-br from-white to-primary-50/30 border-primary-100 shadow-soft hover:shadow-glow hover:-translate-y-1'
                  }`}
                >
                  {notif.is_read === 0 && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary-500 rounded-l-3xl"></div>
                  )}
                  
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm group-hover:scale-110 transition-transform ${getBg(notif.type)}`}>
                    {getIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className={`text-sm font-black truncate pr-4 ${notif.is_read === 1 ? 'text-slate-600' : 'text-slate-900 group-hover:text-primary-700 transition-colors'}`}>
                        {notif.title}
                      </h3>
                      <span className={`text-[10px] font-bold flex items-center gap-1 whitespace-nowrap shrink-0 ${notif.is_read === 1 ? 'text-slate-400' : 'text-primary-600'}`}>
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${notif.is_read === 1 ? 'text-slate-500' : 'text-slate-600 font-medium'}`}>
                      {notif.message}
                    </p>
                  </div>
                </div>
                ))}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}

