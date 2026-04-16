import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { useWorkspaces } from '../context/WorkspaceContext';
import { Link, useLocation } from 'react-router-dom';
import { X, LayoutDashboard, CheckSquare, CalendarDays, FolderKanban, Settings, LogOut, Activity, Users, ClipboardCheck, Building2, FileText, BarChart2, Zap } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { hasPermission } = useRoles();
  const { activeWorkspace } = useWorkspaces();
  const location = useLocation();

  const navItems = [
    { id: '/', icon: LayoutDashboard, label: 'Dashboard', permission: null },
    { id: '/activity', icon: Activity, label: 'Activity', permission: 'view_audit_logs' },
    { id: '/tasks', icon: CheckSquare, label: 'Tasks', permission: null },
    { id: '/approvals', icon: ClipboardCheck, label: 'Approvals', permission: 'approve_tasks' },
    { id: '/calendar', icon: CalendarDays, label: 'Calendar', permission: null },
    { id: '/projects', icon: FolderKanban, label: 'Projects', permission: 'view_projects' },
    { id: '/drafts', icon: FileText, label: 'Drafts', permission: null },
    { id: '/team', icon: Users, label: 'Team', permission: 'manage_members', hideOnSolo: true },
    { id: '/departments', icon: Building2, label: 'Departments', permission: 'manage_departments', hideOnSolo: true },
    { id: '/audit-logs', icon: FileText, label: 'Audit Logs', permission: 'view_audit_logs' },
    { id: '/reports', icon: BarChart2, label: 'Reports', permission: 'view_reports' },
    { id: '/settings', icon: Settings, label: 'Settings', permission: null },
  ].filter(item => {
    if (!user) return false;
    if (item.hideOnSolo && activeWorkspace?.org_type === 'solo') return false;
    if (!item.permission) return true;
    return hasPermission(user.role, item.permission, user.roleId);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 left-0 bottom-0 w-[85%] max-w-sm bg-[#f8fafc] z-50 shadow-2xl flex flex-col overflow-hidden rounded-r-[2.5rem]"
          >
            <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-primary-500 to-rose-500 flex items-center justify-center text-white shadow-glow relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 backdrop-blur-sm"></div>
                  <svg className="w-7 h-7 relative z-10 drop-shadow-md" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-black text-slate-800 text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-primary-600">Routine</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Task Manager</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-600 rounded-2xl hover:bg-slate-50 transition-all active:scale-95">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2 no-scrollbar relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-50 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>
              
              {navItems.map((item) => {
                const isActive = location.pathname === item.id;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.id}
                    onClick={onClose}
                    className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group relative overflow-hidden ${
                      isActive 
                        ? 'bg-white shadow-soft text-primary-600' 
                        : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary-500 rounded-r-full"
                      />
                    )}
                    <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-primary-50 text-primary-600' : 'bg-transparent text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'}`}>
                      <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    </div>
                    <span className={`font-bold ${isActive ? 'text-primary-700' : ''}`}>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] relative z-10">
              <div className="flex items-center gap-4 mb-5 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="size-12 rounded-xl border-2 border-white shadow-sm overflow-hidden bg-white">
                  <img alt="Profile" className="w-full h-full object-cover" src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=007BA7&color=fff&bold=true`} referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800 truncate">{user?.name || 'User'}</p>
                  <p className="text-xs font-medium text-slate-400 truncate">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-2xl transition-all active:scale-95 border border-rose-100"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
