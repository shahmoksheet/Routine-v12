import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, Zap, Lock, Settings, Users, FolderKanban, CheckSquare, MessageSquare, BarChart3, History, ArrowRightLeft } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'Workspace' | 'Team' | 'Projects' | 'Tasks' | 'Communication' | 'Analytics';
  icon: any;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // List of permission IDs
  isSystem?: boolean; // System roles like Owner cannot be deleted or fully edited
  color: string;
  workspace_id?: string;
  department_id?: string;
}

export const ALL_PERMISSIONS: Permission[] = [
  // Workspace
  { id: 'manage_workspace', name: 'Manage Workspace', description: 'Edit workspace settings and billing', category: 'Workspace', icon: Settings },
  { id: 'update_workspace', name: 'Update Workspace', description: 'Modify workspace name and profile', category: 'Workspace', icon: Settings },
  { id: 'manage_subscription', name: 'Manage Subscription', description: 'Manage billing and subscription plans', category: 'Workspace', icon: ShieldCheck },
  { id: 'switch_workspace', name: 'Switch Workspace', description: 'Switch between different workspaces', category: 'Workspace', icon: ArrowRightLeft },
  { id: 'delete_workspace', name: 'Delete Workspace', description: 'Permanently delete the workspace', category: 'Workspace', icon: ShieldAlert },
  
  // Team
  { id: 'manage_members', name: 'Manage Members', description: 'Invite, remove, and promote members', category: 'Team', icon: Users },
  { id: 'manage_roles', name: 'Manage Roles', description: 'Create and customize workspace roles', category: 'Team', icon: ShieldCheck },
  { id: 'manage_departments', name: 'Manage Departments', description: 'Create and organize departments', category: 'Team', icon: Shield },
  
  // Projects
  { id: 'manage_projects', name: 'Manage Projects', description: 'Create, edit, and delete projects', category: 'Projects', icon: FolderKanban },
  { id: 'view_projects', name: 'View Projects', description: 'Access project details and timelines', category: 'Projects', icon: FolderKanban },
  
  // Tasks
  { id: 'manage_tasks', name: 'Manage All Tasks', description: 'Full control over all tasks in the workspace', category: 'Tasks', icon: CheckSquare },
  { id: 'create_tasks', name: 'Create Tasks', description: 'Create new tasks and assign them', category: 'Tasks', icon: CheckSquare },
  { id: 'approve_tasks', name: 'Approve Tasks', description: 'Verify and approve completed tasks', category: 'Tasks', icon: UserCheck },
  
  // Communication
  { id: 'manage_chat', name: 'Manage Chat', description: 'Manage channels and moderate messages', category: 'Communication', icon: MessageSquare },
  { id: 'use_ai', name: 'Use AI Assistant', description: 'Access AI-powered insights and automation', category: 'Communication', icon: Zap },
  
  // Analytics
  { id: 'view_reports', name: 'View Reports', description: 'Access advanced analytics and dashboards', category: 'Analytics', icon: BarChart3 },
  { id: 'view_audit_logs', name: 'View Audit Logs', description: 'Monitor workspace activity and changes', category: 'Analytics', icon: History },
];

interface RolesContextType {
  roles: Role[];
  isLoading: boolean;
  updateRole: (roleId: string, updates: Partial<Role>) => Promise<void>;
  addRole: (role: Omit<Role, 'id'>) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  getRolePermissions: (roleId: string) => string[];
  hasPermission: (roleName: string, permissionId: string, roleId?: string) => boolean;
}

const RolesContext = createContext<RolesContextType | undefined>(undefined);

export function RolesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('taskops_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles', user?.workspaceId],
    queryFn: async () => {
      const res = await fetch('/api/roles', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch roles');
      return res.json();
    },
    enabled: !!user,
  });

  const addRoleMutation = useMutation({
    mutationFn: async (role: Omit<Role, 'id'>) => {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(role)
      });
      if (!res.ok) throw new Error('Failed to add role');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add role');
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Role> }) => {
      const res = await fetch(`/api/roles/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update role');
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/roles/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete role');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete role');
    }
  });

  const getRolePermissions = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.permissions : [];
  };

  const hasPermission = (roleName: string, permissionId: string, roleId?: string) => {
    // Owner always has full access
    if (roleName.toLowerCase() === 'owner') return true;
    
    // If roleId is provided, use it to find permissions
    if (roleId) {
      const role = roles.find(r => r.id === roleId);
      if (role) {
        if (role.name.toLowerCase() === 'owner') return true;
        return role.permissions.includes(permissionId);
      }
    }
    
    // Fallback to roleName
    const role = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    return role ? role.permissions.includes(permissionId) : false;
  };

  const getRolePermissionsByName = (roleName: string) => {
    const role = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    return role ? role.permissions : [];
  };

  return (
    <RolesContext.Provider value={{ 
      roles, 
      isLoading,
      updateRole: async (id, updates) => { await updateRoleMutation.mutateAsync({ id, updates }); },
      addRole: async (role) => { await addRoleMutation.mutateAsync(role); },
      deleteRole: async (id) => { await deleteRoleMutation.mutateAsync(id); },
      getRolePermissions,
      hasPermission 
    }}>
      {children}
    </RolesContext.Provider>
  );
}

export function useRoles() {
  const context = useContext(RolesContext);
  if (context === undefined) {
    throw new Error('useRoles must be used within a RolesProvider');
  }
  return context;
}
