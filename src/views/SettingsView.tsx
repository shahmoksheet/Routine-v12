import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { useTheme, ThemeColor } from '../context/ThemeContext';
import { 
  Users, 
  Shield, 
  ArrowRightLeft, 
  Trash2, 
  Moon, 
  Bell, 
  RefreshCw, 
  Download, 
  LogOut, 
  ChevronRight,
  Edit2,
  FileText,
  Building,
  Database,
  MessageSquare,
  Globe,
  Palette,
  CreditCard,
  Zap,
  BarChart2,
  AlertTriangle,
  LayoutTemplate,
  Settings
} from 'lucide-react';
import { useWorkspaces } from '../context/WorkspaceContext';
import { useUsers } from '../context/UserContext';
import { useRoles } from '../context/RolesContext';
import { useTasks } from '../context/TaskContext';
import { useLanguage } from '../context/LanguageContext';
import { toast } from 'sonner';

import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';

export default function SettingsView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { user, logout } = useAuth();
  const { hasPermission } = useRoles();
  const { setCurrentView } = useNavigation();
  const { isDarkMode, toggleDarkMode, themeColor, setThemeColor } = useTheme();
  const { activeWorkspace, deleteWorkspace, deactivateWorkspace } = useWorkspaces();
  const { users, deleteUser, deactivateUser } = useUsers();
  const { tasks } = useTasks();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManageSubscription = user ? hasPermission(user.role, 'manage_subscription', user.roleId) : false;
  const canUpdateWorkspace = user ? hasPermission(user.role, 'update_workspace', user.roleId) : false;
  const canManageMembers = user ? hasPermission(user.role, 'manage_members', user.roleId) : false;
  const canManageRoles = user ? hasPermission(user.role, 'manage_roles', user.roleId) : false;
  const canViewAuditLogs = user ? hasPermission(user.role, 'view_audit_logs', user.roleId) : false;
  const canViewReports = user ? hasPermission(user.role, 'view_reports', user.roleId) : false;

  const handleAction = (action: string) => {
    if (action === 'logout') {
      logout();
    } else if (action === 'Notifications') {
      setCurrentView('notifications');
    } else if (action === 'Workspace') {
      setCurrentView('workspace-switch');
    } else if (action === 'WorkspaceSettings') {
      setCurrentView('workspace-settings');
    } else if (action === 'Members') {
      setCurrentView('team');
    } else if (action === 'TermsAndPrivacy') {
      setCurrentView('terms');
    } else if (action === 'Support') {
      setCurrentView('support');
    } else if (action === 'Subscription') {
      setCurrentView('subscription');
    } else if (action === 'AuditLogs') {
      setCurrentView('audit-logs');
    } else if (action === 'Reports') {
      setCurrentView('reports');
    } else if (action === 'Roles') {
      setCurrentView('roles');
    } else if (action === 'Transfer') {
      setCurrentView('ownership-transfer');
    } else if (action === 'Export') {
      setCurrentView('export-data');
    } else if (action === 'KanbanCustomization') {
      setCurrentView('kanban-customization');
    } else if (action === 'Sync') {
      toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
        loading: 'Syncing with VasyERP...',
        success: 'Sync complete! Data is up to date.',
        error: 'Sync failed. Please check your connection.'
      });
    } else if (action === 'Deactivate Workspace') {
      handleDeactivateWorkspace();
    } else if (action === 'Deactivate Account') {
      handleDeactivateAccount();
    } else {
      setActiveModal(action);
    }
  };

  const handleDeactivateWorkspace = async () => {
    if (!activeWorkspace) return;
    setIsDeleting(true);
    try {
      await deactivateWorkspace(activeWorkspace.id);
      toast.success('Workspace deactivated successfully');
      setActiveModal(null);
      setCurrentView('workspace-switch' as any);
    } catch (error) {
      toast.error('Failed to deactivate workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await deactivateUser(user.id);
      toast.success('Account deactivated successfully');
      logout();
    } catch (error) {
      toast.error('Failed to deactivate account');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    
    // Check if workspace has active members (excluding the owner)
    const workspaceUsers = users.filter(u => u.workspace_id === activeWorkspace.id && u.id !== user?.id);
    
    if (workspaceUsers.length > 0) {
      toast.error(`Cannot delete workspace. It has ${workspaceUsers.length} active members. Please remove them first.`);
      setActiveModal(null);
      return;
    }

    // Check if workspace has active tasks
    const workspaceTasks = tasks.filter(t => t.workspace_id === activeWorkspace.id && t.status !== 'Completed');
    if (workspaceTasks.length > 0) {
      toast.error(`Cannot delete workspace. It has ${workspaceTasks.length} active tasks. Please complete or delete them first.`);
      setActiveModal(null);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteWorkspace(activeWorkspace.id);
      toast.success('Workspace deleted successfully');
      setActiveModal(null);
      setCurrentView('workspace-switch' as any);
    } catch (error) {
      toast.error('Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    // Check if user has active tasks assigned
    const userTasks = tasks.filter(t => t.assignees?.includes(user.id) && t.status !== 'Completed');
    if (userTasks.length > 0) {
      toast.error(`Cannot delete account. You have ${userTasks.length} active tasks assigned. Please reassign or complete them first.`);
      setActiveModal(null);
      return;
    }

    // Check if user is the owner of the active workspace
    if (user.role === 'Owner' && activeWorkspace) {
      const otherAdmins = users.filter(u => u.workspace_id === activeWorkspace.id && u.id !== user.id && u.role === 'Admin');
      if (otherAdmins.length === 0) {
        toast.error('Cannot delete account. You are the only owner/admin of this workspace. Please transfer ownership or delete the workspace first.');
        setActiveModal(null);
        return;
      }
    }

    setIsDeleting(true);
    try {
      await deleteUser(user.id);
      toast.success('Account deleted successfully');
      logout();
    } catch (error) {
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const { language, setLanguage } = useLanguage();

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value as any;
    setLanguage(newLang);
    
    if (user) {
      try {
        const token = localStorage.getItem('taskops_token');
        await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ language: newLang })
        });
      } catch (error) {
        console.error('Failed to save language preference', error);
      }
    }
  };

  const themeColors: { name: string, value: ThemeColor, color: string }[] = [
    { name: 'Indigo', value: 'indigo', color: 'bg-indigo-500' },
    { name: 'Emerald', value: 'emerald', color: 'bg-emerald-500' },
    { name: 'Rose', value: 'rose', color: 'bg-rose-500' },
    { name: 'Amber', value: 'amber', color: 'bg-amber-500' },
    { name: 'Cerulean', value: 'cerulean', color: 'bg-sky-500' },
    { name: 'Violet', value: 'violet', color: 'bg-violet-500' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors">
      <TopBar title="Settings" icon="settings" onMenuClick={onMenuClick} />
      
      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar px-4 pt-4">
        <section className="p-5 bg-white rounded-[2rem] shadow-soft border border-slate-100 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-50 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl h-16 w-16 flex items-center justify-center border-4 border-white shadow-sm overflow-hidden">
              <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=007BA7&color=fff&bold=true`} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col flex-1">
              <p className="text-xl font-black text-slate-800 tracking-tight">{user?.name || 'User Name'}</p>
              <p className="text-slate-400 font-medium text-sm">{user?.email || 'user@example.com'}</p>
              <span className="inline-block mt-1.5 text-[10px] font-black uppercase tracking-widest bg-primary-50 text-primary-600 px-2.5 py-1 rounded-lg w-max border border-primary-100">
                {user?.role || 'Member'}
              </span>
            </div>
            <button 
              onClick={() => setCurrentView('edit-profile')}
              className="text-slate-400 hover:text-primary-600 transition-all p-3 bg-slate-50 hover:bg-primary-50 rounded-2xl active:scale-95"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
        </section>

        {(canUpdateWorkspace || canManageMembers || canManageRoles) && (
          <SettingsGroup title="Workspace & Team">
            <SettingsItem icon={Building} label="Change Workspace" onClick={() => handleAction('Workspace')} />
            {canManageMembers && <SettingsItem icon={Users} label="Members" onClick={() => handleAction('Members')} />}
            {canManageRoles && <SettingsItem icon={Shield} label="Roles & Permissions" onClick={() => handleAction('Roles')} />}
            {canUpdateWorkspace && <SettingsItem icon={Settings} label="Workspace Settings" onClick={() => handleAction('WorkspaceSettings')} />}
          </SettingsGroup>
        )}

        <SettingsGroup title="Advanced Settings">
          {canViewAuditLogs && <SettingsItem icon={FileText} label="Audit Logs" onClick={() => handleAction('AuditLogs')} />}
          {canViewReports && <SettingsItem icon={BarChart2} label="Reports" onClick={() => handleAction('Reports')} />}
        </SettingsGroup>

        <SettingsGroup title="App Settings">
          <SettingsItem icon={LayoutTemplate} label="Kanban Customization" onClick={() => handleAction('KanbanCustomization')} />
          <div className="flex items-center gap-4 px-5 py-4 bg-white border-b border-slate-50 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
              <Globe className="w-5 h-5 text-slate-400 group-hover:text-primary-500" />
            </div>
            <span className="flex-1 text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Language</span>
            <select 
              value={language}
              onChange={handleLanguageChange}
              className="bg-slate-50 border-none rounded-xl py-2 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20 transition-all cursor-pointer"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
              <option value="mr">मराठी (Marathi)</option>
            </select>
          </div>
          <div className="flex items-center gap-4 px-5 py-4 bg-white border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group" onClick={toggleDarkMode}>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
              <Moon className={`w-5 h-5 ${isDarkMode ? 'text-primary-500' : 'text-slate-400'} group-hover:text-primary-500`} />
            </div>
            <span className="flex-1 text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Dark Mode</span>
            <div className={`w-12 h-6 rounded-full transition-all relative ${isDarkMode ? 'bg-primary-600' : 'bg-slate-200'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isDarkMode ? 'left-7' : 'left-1'}`}></div>
            </div>
          </div>
          
          <div className="px-5 py-4 bg-white border-b border-slate-50 transition-colors group">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                <Palette className="w-5 h-5 text-slate-400 group-hover:text-primary-500" />
              </div>
              <span className="flex-1 text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Theme Color</span>
            </div>
            <div className="flex flex-wrap gap-3 ml-14">
              {themeColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setThemeColor(color.value)}
                  className={`w-8 h-8 rounded-full ${color.color} transition-all relative ${themeColor === color.value ? 'ring-4 ring-primary-500/20 scale-110' : 'hover:scale-110'}`}
                  title={color.name}
                >
                  {themeColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full shadow-sm"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <SettingsItem icon={Bell} label="Notifications Settings" onClick={() => handleAction('Notifications')} />
          <div className="flex items-center gap-4 px-5 py-4 bg-white border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group last:border-0" onClick={() => handleAction('Sync')}>
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
              <RefreshCw className="w-5 h-5 text-slate-400 group-hover:text-primary-500" />
            </div>
            <span className="flex-1 text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Sync Status</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">Up to date</span>
          </div>
        </SettingsGroup>

        <SettingsGroup title="General">
          <SettingsItem icon={Shield} label="Terms & Privacy Policy" onClick={() => handleAction('TermsAndPrivacy')} />
          <SettingsItem icon={MessageSquare} label="Support & Contact Us" onClick={() => handleAction('Support')} />
        </SettingsGroup>

        <SettingsGroup title="Account Settings">
          <SettingsItem icon={Download} label="Export Data" onClick={() => handleAction('Export')} />
          <SettingsItem icon={Shield} label="Deactivate Account" onClick={() => handleAction('Deactivate Account')} />
          <SettingsItem icon={Trash2} label="Delete Account" isDestructive onClick={() => handleAction('Delete Account')} />
          <div 
            onClick={() => handleAction('logout')}
            className="flex items-center gap-4 px-5 py-4 bg-white cursor-pointer hover:bg-rose-50 transition-colors group rounded-b-2xl"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
              <LogOut className="w-5 h-5 text-rose-500 group-hover:text-rose-600" />
            </div>
            <span className="flex-1 text-sm font-black text-rose-500 group-hover:text-rose-600 transition-colors">Log Out</span>
          </div>
        </SettingsGroup>
      </div>

      {/* Simple Modal for MVP interactions */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-colors">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-slate-100 transition-colors relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-50 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>
            
            {activeModal === 'Delete Workspace' ? (
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Delete Workspace?</h3>
                <p className="text-slate-500 text-sm font-medium mb-8">
                  This will permanently delete the workspace "{activeWorkspace?.name}" and all its data. This action cannot be undone.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    disabled={isDeleting}
                    onClick={handleDeleteWorkspace}
                    className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 transition-all shadow-glow active:scale-95 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Workspace'}
                  </button>
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : activeModal === 'Delete Account' ? (
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Delete Account?</h3>
                <p className="text-slate-500 text-sm font-medium mb-8">
                  This will permanently delete your account and all your personal data. This action cannot be undone.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    disabled={isDeleting}
                    onClick={handleDeleteAccount}
                    className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 transition-all shadow-glow active:scale-95 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Yes, Delete Account'}
                  </button>
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-black text-slate-800 mb-2 relative z-10">{activeModal}</h3>
                <p className="text-slate-500 text-sm font-medium mb-8 relative z-10">
                  This feature is currently being developed for the next release.
                </p>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 transition-all shadow-glow active:scale-95 relative z-10"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 mb-3">{title}</h3>
      <div className="flex flex-col bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden transition-colors">
        {children}
      </div>
    </section>
  );
}

function SettingsItem({ 
  icon: Icon, 
  label, 
  isDestructive,
  onClick
}: { 
  icon: any, 
  label: string, 
  isDestructive?: boolean,
  onClick?: () => void
}) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-4 px-5 py-4 bg-white border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors group last:border-0 ${isDestructive ? 'text-rose-600' : 'text-slate-700'}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isDestructive ? 'bg-rose-50 group-hover:bg-white group-hover:shadow-sm' : 'bg-slate-50 group-hover:bg-white group-hover:shadow-sm'}`}>
        <Icon className={`w-5 h-5 ${isDestructive ? 'text-rose-500 group-hover:text-rose-600' : 'text-slate-400 group-hover:text-primary-500'}`} />
      </div>
      <span className={`flex-1 text-sm font-bold transition-colors ${isDestructive ? 'text-rose-500 group-hover:text-rose-600' : 'text-slate-700 group-hover:text-slate-900'}`}>{label}</span>
      <ChevronRight className={`w-5 h-5 transition-colors ${isDestructive ? 'text-rose-200 group-hover:text-rose-400' : 'text-slate-300 group-hover:text-primary-400'}`} />
    </div>
  );
}
