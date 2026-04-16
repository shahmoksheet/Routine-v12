import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  subscription_plan: string;
  subscription_status: string;
  org_type?: 'solo' | 'small' | 'hierarchical';
  is_deactivated?: number;
  created_at?: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  setActiveWorkspace: (workspace: Workspace | string) => void;
  addWorkspace: (workspace: { name: string, subscriptionPlan?: string, org_type?: string }) => Promise<string>;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  deactivateWorkspace: (id: string) => Promise<void>;
  activateWorkspace: (id: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(user?.workspaceId || null);

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch('/api/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      return res.json();
    },
    enabled: !!user,
  });

  const activeWorkspace = workspaces.find(ws => ws.id === activeWorkspaceId) || workspaces.find(ws => ws.id === user?.workspaceId) || workspaces[0] || null;

  useEffect(() => {
    if (user?.workspaceId && user.workspaceId !== activeWorkspaceId) {
      setActiveWorkspaceId(user.workspaceId);
    } else if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId, user?.workspaceId]);

  const addWorkspaceMutation = useMutation({
    mutationFn: async (workspace: { name: string, subscriptionPlan?: string, org_type?: string }) => {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(workspace)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add workspace');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create workspace');
    }
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Workspace> }) => {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch(`/api/workspaces/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update workspace');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update workspace');
    }
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch(`/api/workspaces/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to delete workspace');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete workspace');
    }
  });

  const deactivateWorkspaceMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch(`/api/workspaces/${id}/deactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to deactivate workspace');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace deactivated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate workspace');
    }
  });

  const activateWorkspaceMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch(`/api/workspaces/${id}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to activate workspace');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace activated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to activate workspace');
    }
  });

  const setActiveWorkspace = (workspace: Workspace | string) => {
    if (typeof workspace === 'string') {
      setActiveWorkspaceId(workspace);
    } else {
      setActiveWorkspaceId(workspace.id);
    }
  };

  return (
    <WorkspaceContext.Provider value={{ 
      workspaces, 
      activeWorkspace, 
      isLoading,
      setActiveWorkspace, 
      addWorkspace: async (ws) => { 
        const res = await addWorkspaceMutation.mutateAsync(ws); 
        return res.id;
      },
      updateWorkspace: async (id, updates) => { await updateWorkspaceMutation.mutateAsync({ id, updates }); },
      deleteWorkspace: async (id) => { await deleteWorkspaceMutation.mutateAsync(id); },
      deactivateWorkspace: async (id) => { await deactivateWorkspaceMutation.mutateAsync(id); },
      activateWorkspace: async (id) => { await activateWorkspaceMutation.mutateAsync(id); }
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaces() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspaces must be used within a WorkspaceProvider');
  }
  return context;
}
