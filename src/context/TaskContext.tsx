import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateId } from '../utils/idGenerator';

export type Priority = 'High' | 'Medium' | 'Low' | 'None';
export type Status = string;
export type ProofType = 'None' | 'Image' | 'Video' | 'Document' | 'Any';

export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdBy?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'file';
}

export interface Task {
  id: string;
  workspace_id?: string;
  project: string;
  project_id?: string;
  title: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  dueTime?: string;
  type?: string;
  createdBy?: string;
  assignedToType?: string;
  assignees: string[];
  tags: string[];
  description?: string;
  proofType?: ProofType;
  photoUrl?: string | null;
  attachments?: Attachment[];
  subtasks?: Subtask[];
  dependencies?: string[];
  relatedTasks?: string[];
  recurring?: string | null;
  timeSpent?: number;
  comments?: Comment[];
  requiresApproval?: boolean;
  isDeactivated?: boolean;
  geofence?: {
    lat: number;
    lng: number;
    radius: number;
    enforcement: 'start' | 'complete' | 'both';
  } | null;
}

interface TaskContextType {
  tasks: Task[];
  isLoading: boolean;
  addTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deactivateTask: (id: string) => Promise<void>;
  activateTask: (id: string) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (user) {
      headers['x-user-id'] = user.id;
      headers['x-user-role'] = user.role;
      const token = localStorage.getItem('taskops_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  };

  // Fetch tasks using react-query
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', user?.id, user?.workspaceId],
    queryFn: async () => {
      const res = await fetch('/api/tasks', { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
    enabled: !!user,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (newTask: Omit<Task, 'id'>) => {
      const id = generateId('TSK');
      const taskWithId = { ...newTask, id, createdBy: user?.id };
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(taskWithId)
      });
      if (!res.ok) throw new Error('Failed to add task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create task');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Task> }) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update task');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to delete task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete task');
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/deactivate`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to deactivate task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deactivated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to deactivate task');
    }
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tasks/${id}/activate`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to activate task');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task activated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to activate task');
    }
  });

  // Socket.io for real-time updates
  useEffect(() => {
    if (!user) return;

    const socket = io();

    socket.on('task_created', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    socket.on('task_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    socket.on('task_deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    return () => {
      socket.close();
    };
  }, [user, queryClient]);

  const addTask = async (task: Omit<Task, 'id'>) => {
    await addMutation.mutateAsync(task);
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    await updateMutation.mutateAsync({ id, updates });
  };

  const deleteTask = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };
  
  const deactivateTask = async (id: string) => {
    await deactivateMutation.mutateAsync(id);
  };

  const activateTask = async (id: string) => {
    await activateMutation.mutateAsync(id);
  };

  return (
    <TaskContext.Provider value={{ tasks, isLoading, addTask, updateTask, deleteTask, deactivateTask, activateTask }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) throw new Error('useTasks must be used within a TaskProvider');
  return context;
}
