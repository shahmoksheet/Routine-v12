import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import DashboardView from './views/DashboardView';
import TasksView from './views/TasksView';
import CalendarView from './views/CalendarView';
import ProjectsView from './views/ProjectsView';
import SettingsView from './views/SettingsView';
import ActivityView from './views/ActivityView';
import TeamView from './views/TeamView';
import DepartmentsView from './views/DepartmentsView';
import ApprovalsView from './views/ApprovalsView';
import EditProfileView from './views/EditProfileView';
import NotificationsView from './views/NotificationsView';
import WorkspaceSwitchView from './views/WorkspaceSwitchView';
import WorkspaceSettingsView from './views/WorkspaceSettingsView';
import TermsAndPrivacyView from './views/TermsAndPrivacyView';
import SupportView from './views/SupportView';
import ChatView from './views/ChatView';
import AuditLogsView from './views/AuditLogsView';
import ReportsView from './views/ReportsView';
import RolesView from './views/RolesView';
import OwnershipTransferView from './views/OwnershipTransferView';
import ExportDataView from './views/ExportDataView';
import KanbanCustomizationView from './views/KanbanCustomizationView';
import DraftsView from './views/DraftsView';

import BottomNav from './components/BottomNav';
import CreateTaskModal from './components/CreateTaskModal';
import TaskDetailsModal from './components/TaskDetailsModal';
import { TaskProvider } from './context/TaskContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NavigationProvider } from './context/NavigationContext';
import { ProjectProvider } from './context/ProjectContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { DepartmentProvider } from './context/DepartmentContext';
import { UserProvider } from './context/UserContext';
import { NotificationProvider } from './context/NotificationContext';
import { LanguageProvider } from './context/LanguageContext';
import { RolesProvider } from './context/RolesContext';
import { SplashView } from './views/SplashView';
import { AuthView } from './views/AuthView';
import { Plus, AlertTriangle, X, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/Sidebar';
import ReportIssueModal from './components/ReportIssueModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export type LayoutContextType = {
  onMenuClick: () => void;
  onTaskClick: (id: string) => void;
};

function AuthenticatedLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [initialTaskData, setInitialTaskData] = useState<{ title?: string, description?: string }>({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/tasks/new') {
      const searchParams = new URLSearchParams(location.search);
      const title = searchParams.get('title') || searchParams.get('text') || '';
      const text = searchParams.get('text') || '';
      const url = searchParams.get('url') || '';
      
      let description = '';
      if (text && title !== text) description += text + '\n';
      if (url) description += url;
      
      setInitialTaskData({ title, description });
      setIsCreateModalOpen(true);
      
      // Clean up URL without triggering a full reload
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  const handleMenuClick = () => setIsSidebarOpen(true);

  return (
    <div className="flex flex-col h-screen w-full max-w-md md:max-w-2xl lg:max-w-4xl mx-auto bg-[#f8fafc] shadow-2xl relative overflow-hidden transition-colors border-x border-slate-100">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <div className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        <Outlet context={{ onMenuClick: handleMenuClick, onTaskClick: setSelectedTaskId }} />
      </div>
      
      <AnimatePresence>
        {isFabMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsFabMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-20"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFabMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="absolute bottom-40 right-6 flex flex-col gap-4 z-30 items-end"
          >
            <button 
              onClick={() => {
                setIsFabMenuOpen(false);
                setIsReportIssueModalOpen(true);
              }}
              className="flex items-center gap-4 bg-white pl-5 pr-2 py-2 rounded-full shadow-xl text-sm font-black text-slate-700 hover:text-rose-600 transition-all hover:scale-105 active:scale-95 group"
            >
              <span className="tracking-widest uppercase text-[10px]">Raise Issue (Ticket)</span>
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </button>
            <button 
              onClick={() => {
                setIsFabMenuOpen(false);
                navigate('/chat?tab=ai');
              }}
              className="flex items-center gap-4 bg-white pl-5 pr-2 py-2 rounded-full shadow-xl text-sm font-black text-slate-700 hover:text-indigo-600 transition-all hover:scale-105 active:scale-95 group"
            >
              <span className="tracking-widest uppercase text-[10px]">Routine AI</span>
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Bot className="w-5 h-5" />
              </div>
            </button>
            <button 
              onClick={() => {
                setIsFabMenuOpen(false);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-4 bg-white pl-5 pr-2 py-2 rounded-full shadow-xl text-sm font-black text-slate-700 hover:text-primary-600 transition-all hover:scale-105 active:scale-95 group"
            >
              <span className="tracking-widest uppercase text-[10px]">Create Task</span>
              <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                <Plus className="w-5 h-5" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
        className={`absolute bottom-24 right-6 w-16 h-16 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 z-30 ${isFabMenuOpen ? 'bg-slate-800 text-white rotate-90 scale-110 shadow-slate-800/30' : 'bg-primary-600 text-white hover:scale-110 active:scale-95 shadow-primary-600/40 hover:shadow-primary-600/60'}`}
      >
        {isFabMenuOpen ? <X className="w-7 h-7" /> : <Plus className="w-7 h-7" />}
      </button>

      <BottomNav />

      {isCreateModalOpen && (
        <CreateTaskModal 
          onClose={() => {
            setIsCreateModalOpen(false);
            setInitialTaskData({});
          }} 
          initialData={initialTaskData}
        />
      )}

      {isReportIssueModalOpen && (
        <ReportIssueModal onClose={() => setIsReportIssueModalOpen(false)} />
      )}

      {selectedTaskId && (
        <TaskDetailsModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} onOpenTask={setSelectedTaskId} />
      )}
    </div>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <SplashView />;
  
  if (!user) return <AuthView />;

  return (
    <Routes>
      <Route element={<AuthenticatedLayout />}>
        <Route path="/" element={<DashboardView />} />
        <Route path="/tasks" element={<TasksView />} />
        <Route path="/tasks/new" element={<TasksView />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/projects" element={<ProjectsView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/activity" element={<ActivityView />} />
        <Route path="/team" element={<TeamView />} />
        <Route path="/departments" element={<DepartmentsView />} />
        <Route path="/approvals" element={<ApprovalsView />} />
        <Route path="/edit-profile" element={<EditProfileView />} />
        <Route path="/notifications" element={<NotificationsView />} />
        <Route path="/workspace-switch" element={<WorkspaceSwitchView />} />
        <Route path="/workspace-settings" element={<WorkspaceSettingsView />} />
        <Route path="/terms-privacy" element={<TermsAndPrivacyView />} />
        <Route path="/support" element={<SupportView />} />
        <Route path="/chat" element={<ChatView />} />
        <Route path="/audit-logs" element={<AuditLogsView />} />
        <Route path="/reports" element={<ReportsView />} />
        <Route path="/roles" element={<RolesView />} />
        <Route path="/ownership-transfer" element={<OwnershipTransferView />} />
        <Route path="/export-data" element={<ExportDataView />} />
        <Route path="/kanban-customization" element={<KanbanCustomizationView />} />
        <Route path="/drafts" element={<DraftsView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <ThemeProvider>
              <NavigationProvider>
                <WorkspaceProvider>
                  <DepartmentProvider>
                    <RolesProvider>
                      <UserProvider>
                        <ProjectProvider>
                          <NotificationProvider>
                            <TaskProvider>
                              <AppContent />
                              <Toaster position="top-center" richColors />
                            </TaskProvider>
                          </NotificationProvider>
                        </ProjectProvider>
                      </UserProvider>
                    </RolesProvider>
                  </DepartmentProvider>
                </WorkspaceProvider>
              </NavigationProvider>
            </ThemeProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
