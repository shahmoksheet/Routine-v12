import React from 'react';
import TopBar from '../components/TopBar';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Activity, Clock, User, FileText, CheckCircle, AlertCircle, Edit2 } from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}

export default function AuditLogsView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('taskops_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const { data: logs = [], isLoading } = useQuery<ActivityLog[]>({
    queryKey: ['activity-logs'],
    queryFn: async () => {
      const res = await fetch('/api/activity-logs', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    }
  });

  const getActionIcon = (action: string) => {
    if (action.includes('create')) return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (action.includes('update')) return <Edit2 className="w-4 h-4 text-amber-500" />;
    if (action.includes('delete')) return <AlertCircle className="w-4 h-4 text-rose-500" />;
    return <Activity className="w-4 h-4 text-primary-500" />;
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <TopBar title="Audit Logs" onMenuClick={onMenuClick} />
      
      <div className="p-5 flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800">Activity History</h2>
                <p className="text-sm text-slate-500 font-medium">Track all changes and actions across your workspace</p>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-medium">
                No activity logs found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <div key={log.id} className="p-5 hover:bg-slate-50 transition-colors flex gap-4">
                    <div className="mt-1">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{formatAction(log.action)}</span>
                        <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{log.user_name || 'Unknown User'}</span>
                      </div>
                      <div className="bg-slate-100 rounded-xl p-3 text-xs font-mono text-slate-600 overflow-x-auto">
                        {log.details}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
