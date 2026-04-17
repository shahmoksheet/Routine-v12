import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export type View = 'dashboard' | 'tasks' | 'calendar' | 'projects' | 'settings' | 'activity' | 'team' | 'departments' | 'approvals' | 'edit-profile' | 'notifications' | 'workspace-switch' | 'workspace-settings' | 'terms' | 'privacy' | 'support' | 'chat' | 'chatbot' | 'subscription' | 'audit-logs' | 'reports' | 'roles' | 'ownership-transfer' | 'export-data' | 'kanban-customization';

interface NavigationContextType {
  currentView: View;
  setCurrentView: (view: View) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const navigate = useNavigate();
  
  const handleSetCurrentView = React.useCallback((view: View) => {
    setCurrentView(view);
    
    // Map view names to routes
    const routeMap: Record<string, string> = {
      'dashboard': '/',
      'tasks': '/tasks',
      'calendar': '/calendar',
      'projects': '/projects',
      'settings': '/settings',
      'activity': '/activity',
      'team': '/team',
      'departments': '/departments',
      'approvals': '/approvals',
      'edit-profile': '/edit-profile',
      'notifications': '/notifications',
      'workspace-switch': '/workspace-switch',
      'workspace-settings': '/workspace-settings',
      'terms': '/terms-privacy',
      'privacy': '/terms-privacy',
      'support': '/support',
      'chat': '/chat',
      'chatbot': '/chat?tab=ai',
      'audit-logs': '/audit-logs',
      'reports': '/reports',
      'roles': '/roles',
      'ownership-transfer': '/ownership-transfer',
      'export-data': '/export-data',
      'kanban-customization': '/kanban-customization'
    };

    if (routeMap[view]) {
      navigate(routeMap[view]);
    }
  }, [navigate]);

  return (
    <NavigationContext.Provider value={{ currentView, setCurrentView: handleSetCurrentView }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
