import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';

export interface Project {
  id: string;
  title: string;
  description?: string;
  members: number;
  tasks: number;
  bgClass: string;
  iconName: string;
  departmentId?: string;
  departmentIds?: string[];
  workspaceId: string;
  kanban_columns?: string; // JSON string
}

interface ProjectContextType {
  projects: Project[];
  isLoading: boolean;
  addProject: (project: Partial<Project>) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;
    const socket = io();

    socket.on('project_created', () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    socket.on('project_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    });

    socket.on('project_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', user?.workspaceId],
    queryFn: async () => {
      const res = await fetch('/api/projects', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch projects');
      return res.json();
    },
    enabled: !!user,
  });

  const addProjectMutation = useMutation({
    mutationFn: async (project: Partial<Project>) => {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(project)
      });
      if (!res.ok) throw new Error('Failed to add project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create project');
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Project> }) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update project');
    }
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete project');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete project');
    }
  });

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      isLoading,
      addProject: async (p) => { await addProjectMutation.mutateAsync(p); },
      updateProject: async (id, updates) => { await updateProjectMutation.mutateAsync({ id, updates }); },
      deleteProject: async (id) => { await deleteProjectMutation.mutateAsync(id); }
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
}
