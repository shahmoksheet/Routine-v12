import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  role_id?: string;
  phone?: string;
  department_id?: string;
  department_ids?: string; // JSON string
  manager_id?: string;
  is_deleted?: number;
  is_deactivated?: number;
  workspace_id: string;
  created_at?: string;
}

export interface Invitation {
  id: string;
  email?: string;
  phone?: string;
  role: string;
  role_id?: string;
  workspace_id: string;
  code: string;
  status: string;
  created_at?: string;
}

interface UserContextType {
  users: User[];
  invitations: Invitation[];
  isLoading: boolean;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  addUser: (user: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  restoreUser: (id: string) => Promise<void>;
  deactivateUser: (id: string) => Promise<void>;
  activateUser: (id: string) => Promise<void>;
  createInvitation: (invitation: { email?: string, phone?: string, role: string, roleId?: string, workspaceId: string }) => Promise<Invitation>;
  deleteInvitation: (id: string) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const socket = io();

    socket.on('user_created', () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    });

    socket.on('user_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    });

    socket.on('user_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    });

    socket.on('invitation_created', () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    });

    socket.on('invitation_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    });

    return () => {
      socket.close();
    };
  }, [user, queryClient]);

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (user) {
      const token = localStorage.getItem('taskops_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  };

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', 'all', user?.workspaceId],
    queryFn: async () => {
      const res = await fetch('/api/users?showDeleted=true&showDeactivated=true', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    enabled: !!user,
  });

  const { data: invitations = [], isLoading: isLoadingInvitations } = useQuery({
    queryKey: ['invitations', user?.workspaceId],
    queryFn: async () => {
      const res = await fetch('/api/invitations', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch invitations');
      return res.json();
    },
    enabled: !!user && ['Owner', 'Admin'].includes(user.role),
  });

  const addUserMutation = useMutation({
    mutationFn: async (user: Partial<User>) => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(user)
      });
      if (!res.ok) throw new Error('Failed to add user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add user');
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<User> }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Member moved to trash');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user');
    }
  });

  const restoreUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}/restore`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to restore user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Member restored successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to restore user');
    }
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}/deactivate`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to deactivate user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Member deactivated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate user');
    }
  });

  const activateUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/users/${id}/activate`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to activate user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Member activated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to activate user');
    }
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (invitation: { email?: string, phone?: string, role: string, roleId?: string, workspaceId: string }) => {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(invitation)
      });
      if (!res.ok) throw new Error('Failed to create invitation');
      const data = await res.json();
      return data.invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation sent successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation');
    }
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete invitation');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Invitation deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete invitation');
    }
  });

  return (
    <UserContext.Provider value={{ 
      users, 
      invitations,
      isLoading: isLoadingUsers || isLoadingInvitations,
      updateUser: async (id, updates) => { await updateUserMutation.mutateAsync({ id, updates }); },
      addUser: async (user) => { await addUserMutation.mutateAsync(user); },
      deleteUser: async (id) => { await deleteUserMutation.mutateAsync(id); },
      restoreUser: async (id) => { await restoreUserMutation.mutateAsync(id); },
      deactivateUser: async (id) => { await deactivateUserMutation.mutateAsync(id); },
      activateUser: async (id) => { await activateUserMutation.mutateAsync(id); },
      createInvitation: async (inv) => { return await createInvitationMutation.mutateAsync(inv); },
      deleteInvitation: async (id) => { await deleteInvitationMutation.mutateAsync(id); }
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
}
