import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { io } from 'socket.io-client';

export interface Department {
  id: string;
  name: string;
  workspace_id: string;
  manager_id?: string;
  created_at?: string;
}

interface DepartmentContextType {
  departments: Department[];
  isLoading: boolean;
  addDepartment: (department: Partial<Department>) => Promise<void>;
  updateDepartment: (id: string, updates: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const socket = io();

    socket.on('department_created', () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    });

    socket.on('department_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    });

    socket.on('department_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
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

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments', user?.workspaceId],
    queryFn: async () => {
      const res = await fetch('/api/departments', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch departments');
      return res.json();
    },
    enabled: !!user,
  });

  const addDepartmentMutation = useMutation({
    mutationFn: async (department: Partial<Department>) => {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(department)
      });
      if (!res.ok) throw new Error('Failed to add department');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create department');
    }
  });

  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Department> }) => {
      const res = await fetch(`/api/departments/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update department');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update department');
    }
  });

  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete department');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete department');
    }
  });

  return (
    <DepartmentContext.Provider value={{ 
      departments, 
      isLoading,
      addDepartment: async (d) => { await addDepartmentMutation.mutateAsync(d); },
      updateDepartment: async (id, updates) => { await updateDepartmentMutation.mutateAsync({ id, updates }); },
      deleteDepartment: async (id) => { await deleteDepartmentMutation.mutateAsync(id); }
    }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartments() {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error('useDepartments must be used within a DepartmentProvider');
  }
  return context;
}
