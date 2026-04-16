import React from 'react';
import TopBar from '../components/TopBar';
import { Activity, Clock, CheckCircle2, AlertCircle, FileText, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { useMemo } from 'react';

import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';

export default function ActivityView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { user } = useAuth();
  const { hasPermission } = useRoles();

  const canViewAllLogs = useMemo(() => user ? hasPermission(user.role, 'view_audit_logs', user.roleId) : false, [user, hasPermission]);

  const activities = [
    { id: 1, user: 'John Doe', action: 'completed task', target: 'Inventory Audit', time: '10 mins ago', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', departmentId: '1' },
    { id: 2, user: 'Sarah Smith', action: 'uploaded proof for', target: 'Store Opening', time: '1 hour ago', icon: Camera, color: 'text-primary-500', bg: 'bg-primary-50', border: 'border-primary-100', departmentId: '2' },
    { id: 3, user: 'Mike Johnson', action: 'missed deadline for', target: 'Safety Check', time: '2 hours ago', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100', departmentId: '1' },
    { id: 4, user: 'Demo Manager', action: 'created recurring task', target: 'Weekly Sync', time: '1 day ago', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100', departmentId: '2' },
    { id: 5, user: 'Sarah Smith', action: 'commented on', target: 'Q4 Marketing', time: '2 days ago', icon: FileText, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100', departmentId: '2' },
  ];

  const relevantActivities = activities.filter(activity => {
    if (canViewAllLogs) return true;
    if (user?.departmentId) return activity.departmentId === user.departmentId;
    return false;
  });

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors">
      <TopBar title="Workspace Activity" onMenuClick={onMenuClick} />
      
      <div className="p-5 space-y-4 pb-24 overflow-y-auto no-scrollbar relative">
        {/* Vertical timeline line */}
        {relevantActivities.length > 0 && (
          <div className="absolute left-10 top-10 bottom-24 w-0.5 bg-slate-100 z-0"></div>
        )}

        {relevantActivities.length > 0 ? (
          relevantActivities.map((activity) => (
            <div key={activity.id} className="relative z-10 flex items-start gap-4 group">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${activity.bg} border ${activity.border} shadow-sm group-hover:scale-110 transition-transform`}>
                <activity.icon className={`w-5 h-5 ${activity.color}`} />
              </div>
              
              <div className="flex-1 bg-white p-4 rounded-3xl shadow-soft border border-slate-100 group-hover:shadow-md transition-shadow">
                <p className="text-sm text-slate-700 leading-relaxed">
                  <span className="font-black text-slate-900">{activity.user}</span>{' '}
                  <span className="font-medium">{activity.action}</span>{' '}
                  <span className="font-bold text-primary-600">{activity.target}</span>
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{activity.time}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Activity className="w-12 h-12 mb-4 text-slate-300" />
            <p className="font-bold text-lg text-slate-700">No activity found</p>
            <p className="text-sm">There are no recent activities in your department.</p>
          </div>
        )}
      </div>
    </div>
  );
}
