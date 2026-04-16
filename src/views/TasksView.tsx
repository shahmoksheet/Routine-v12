import React, { useState, useMemo, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useTasks, Task, Priority, Status } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';
import { List, LayoutGrid, Calendar, CheckCircle2, Circle, Inbox, Trash2, Tag, Folder, Filter, ArrowUpDown, MoreVertical, Play, Square, Clock } from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { useNotifications } from '../context/NotificationContext';

import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { toast } from 'sonner';

export default function TasksView() {
  const { onTaskClick, onMenuClick } = useOutletContext<LayoutContextType>();
  const { user } = useAuth();
  const { hasPermission } = useRoles();
  const { tasks, deleteTask, updateTask, deactivateTask, activateTask } = useTasks();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterProject, setFilterProject] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority'>('dueDate');
  const [showDeactivated, setShowDeactivated] = useState(false);

  const canDeleteTasks = user ? hasPermission(user.role, 'delete_tasks', user.roleId) : false;
  const canManageAllTasks = user ? hasPermission(user.role, 'manage_tasks', user.roleId) : false;

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'High': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Low': return 'bg-primary-100 text-primary-700 border-primary-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getPriorityWeight = (p: string) => {
    switch(p) {
      case 'High': return 1;
      case 'Medium': return 2;
      case 'Low': return 3;
      default: return 4;
    }
  };

  const formatTaskDate = (dateString?: string | null, recurring?: string | null) => {
    if (recurring && recurring !== 'None') {
      return recurring;
    }
    if (!dateString) return 'No date';
    try {
      if (dateString === 'Today' || dateString === 'Tomorrow' || dateString === 'Yesterday') return dateString;
      const date = parseISO(dateString);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'MMM d');
    } catch (e) {
      return dateString;
    }
  };

  const isOverdue = (dateString?: string | null) => {
    if (!dateString) return false;
    try {
      if (dateString === 'Yesterday') return true;
      if (dateString === 'Today' || dateString === 'Tomorrow') return false;
      const date = parseISO(dateString);
      return date < new Date() && !isToday(date);
    } catch (e) {
      return false;
    }
  };

  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [users, setUsers] = useState<{id: string, name: string, department_id?: string}[]>([]);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('taskops_token');
    const headers: Record<string, string> = {
      'x-user-id': user.id,
      'x-user-role': user.role
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/users', { headers })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error('Expected array but got:', data);
          setUsers([]);
        }
      })
      .catch(err => console.error('Failed to fetch users', err));
  }, [user]);

  const handleClearAll = async () => {
    setIsClearAllModalOpen(true);
  };

  const confirmClearAll = async () => {
    for (const task of tasks) {
      await deleteTask(task.id);
    }
    setIsClearAllModalOpen(false);
  };

  const getAssigneeInitials = (id: string) => {
    const user = users.find(u => u.id === id);
    if (user) {
      return user.name.substring(0, 2).toUpperCase();
    }
    return id.substring(0, 2).toUpperCase();
  };

  const { projects: allProjects } = useProjects();
  const activeProjects = allProjects.filter(p => !(p as any).isArchived);
  const projects = ['All', ...activeProjects.map(p => p.id)];

  const getProjectTitle = (id: string) => {
    const p = allProjects.find(proj => proj.id === id);
    return p ? p.title : id;
  };

  const selectedProjectObj = useMemo(() => {
    if (filterProject === 'All') return null;
    return allProjects.find(p => p.id === filterProject);
  }, [filterProject, allProjects]);

  const kanbanColumns = useMemo(() => {
    if (selectedProjectObj?.kanban_columns) {
      try {
        return JSON.parse(selectedProjectObj.kanban_columns);
      } catch (e) {
        console.error('Failed to parse project kanban columns', e);
      }
    }
    if (user?.kanbanColumns) {
      try {
        return JSON.parse(user.kanbanColumns);
      } catch (e) {
        console.error('Failed to parse user kanban columns', e);
      }
    }
    return [
      { id: 'Todo', title: 'To Do' },
      { id: 'In Progress', title: 'In Progress' },
      { id: 'Pending Approval', title: 'Review' },
      { id: 'Completed', title: 'Done' }
    ];
  }, [selectedProjectObj, user]);

  const statuses = ['All', ...kanbanColumns.map((c: any) => c.id)];
  const lastColId = kanbanColumns.length > 0 ? kanbanColumns[kanbanColumns.length - 1].id : 'Completed';

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks.filter(t => {
      if (filterProject !== 'All' && t.project !== filterProject) return false;
      
      // Filter by deactivation
      if (!showDeactivated && t.isDeactivated) return false;
      if (showDeactivated && !t.isDeactivated) return false;

      // Filter by active/history tab
      if (activeTab === 'active') {
        if (t.status === lastColId) return false;
        if (filterStatus !== 'All' && t.status !== filterStatus) return false;
      } else {
        if (t.status !== lastColId) return false;
      }
      
      // Role-based visibility
      if (user?.role === 'Owner' || user?.role === 'Admin') {
        return true; // See everything
      }

      if (user?.role === 'Manager') {
        // Manager sees tasks assigned to them, their department, users in their department, or created by them
        const isDirectlyAssigned = t.assignees?.includes(user?.id || '');
        const isDepartmentAssigned = user?.departmentId && (t.assignedToType === 'department' && t.assignees?.includes(user.departmentId));
        const isAssignedToDeptUser = t.assignees?.some(assigneeId => users.some(u => u.id === assigneeId && u.department_id === user.departmentId));
        const isCreator = t.createdBy === user?.id;
        
        return isDirectlyAssigned || isDepartmentAssigned || isAssignedToDeptUser || isCreator;
      }

      // Standard users (Sales, Logistics, etc.) only see tasks assigned to them, their department, or created by them
      const isDirectlyAssigned = t.assignees?.includes(user?.id || '');
      const isDepartmentAssigned = user?.departmentId && (t.assignedToType === 'department' && t.assignees?.includes(user.departmentId));
      const isCreator = t.createdBy === user?.id;
      
      return isDirectlyAssigned || isDepartmentAssigned || isCreator;
    });

    result.sort((a, b) => {
      if (sortBy === 'priority') {
        return getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
      } else {
        // Sort by due date
        let dateA = new Date(8640000000000000).getTime(); // Max date
        let dateB = new Date(8640000000000000).getTime();
        try {
          if (a.dueDate !== 'Today' && a.dueDate !== 'Tomorrow' && a.dueDate !== 'Yesterday') {
            dateA = parseISO(a.dueDate).getTime();
          } else {
            const d = new Date();
            if (a.dueDate === 'Tomorrow') d.setDate(d.getDate() + 1);
            if (a.dueDate === 'Yesterday') d.setDate(d.getDate() - 1);
            dateA = d.getTime();
          }
        } catch(e) {}
        try {
          if (b.dueDate !== 'Today' && b.dueDate !== 'Tomorrow' && b.dueDate !== 'Yesterday') {
            dateB = parseISO(b.dueDate).getTime();
          } else {
            const d = new Date();
            if (b.dueDate === 'Tomorrow') d.setDate(d.getDate() + 1);
            if (b.dueDate === 'Yesterday') d.setDate(d.getDate() - 1);
            dateB = d.getTime();
          }
        } catch(e) {}
        return dateA - dateB;
      }
    });

    return result;
  }, [tasks, filterProject, filterStatus, sortBy, user, users, canManageAllTasks, activeTab, lastColId]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const lastCol = kanbanColumns[kanbanColumns.length - 1].id;
      
      // Check dependencies if moving to the last column
      if (status === lastCol && task.dependencies && task.dependencies.length > 0) {
        const incompleteDependencies = task.dependencies.filter(depId => {
          const depTask = tasks.find(t => t.id === depId);
          return depTask && depTask.status !== lastCol;
        });

        if (incompleteDependencies.length > 0) {
          toast.error('You must complete all dependencies before completing this task.');
          return;
        }
      }

      updateTask(taskId, { status: status as Status });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const getHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': user?.id || ''
    };
    const token = localStorage.getItem('taskops_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const startTimerMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch('/api/time-logs/start', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ taskId })
      });
      if (!res.ok) throw new Error('Failed to start timer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
    }
  });

  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/time-logs/stop', {
        method: 'POST',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Failed to stop timer');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] });
      // We should probably refetch tasks to get updated time_spent, but context might handle it if we emit socket event
    }
  });

  const { data: activeTimer } = useQuery({
    queryKey: ['active-timer'],
    queryFn: async () => {
      const res = await fetch('/api/time-logs/active', {
        headers: getHeaders()
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user
  });

  const renderTaskCard = (task: Task) => {
    const showCardMenu = openMenuId === task.id;
    const isTimerActive = activeTimer?.task_id === task.id;
    
    // Format time spent
    const formatTimeSpent = (minutes: number) => {
      if (!minutes) return '0m';
      const h = Math.floor(minutes / 60);
      const m = Math.floor(minutes % 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
      <div 
        key={task.id} 
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onClick={() => onTaskClick(task.id)}
        className={`group relative bg-white p-4 rounded-3xl shadow-soft border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all ${task.status === lastColId ? 'opacity-80 bg-slate-50' : ''}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 mb-1">{task.id}</span>
            <h3 className={`font-black text-base text-slate-800 leading-tight pr-6 ${task.status === lastColId ? 'line-through text-slate-400' : ''}`}>{task.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider border ${getPriorityColor(task.priority)}`}>{task.priority}</span>
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(showCardMenu ? null : task.id);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showCardMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task.id);
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <List className="w-3 h-3" />
                      Details
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (task.isDeactivated) {
                          activateTask(task.id);
                        } else {
                          deactivateTask(task.id);
                        }
                        setOpenMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      <Square className="w-3 h-3" />
                      {task.isDeactivated ? 'Activate' : 'Deactivate'}
                    </button>
                    {canDeleteTasks && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskToDelete(task.id);
                          setIsDeleteModalOpen(true);
                          setOpenMenuId(null);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
            <Folder className="w-3 h-3" />
            {getProjectTitle(task.project)}
          </span>
          {task.timeSpent !== undefined && (
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md">
              <Clock className="w-3 h-3" />
              {formatTimeSpent(task.timeSpent)}
            </span>
          )}
          {task.dependencies && task.dependencies.length > 0 && (
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md">
              <List className="w-3 h-3" />
              {task.dependencies.length} Dep{task.dependencies.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
            <div className={`flex items-center gap-1.5 ${isOverdue(task.dueDate) && task.status !== lastColId ? 'text-rose-500 bg-rose-50 px-2 py-1 rounded-md' : ''}`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatTaskDate(task.dueDate, task.recurring)}</span>
            </div>
            
            {/* Timer Button */}
            {task.status !== lastColId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isTimerActive) {
                    stopTimerMutation.mutate();
                  } else {
                    startTimerMutation.mutate(task.id);
                  }
                }}
                className={`flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                  isTimerActive 
                    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 animate-pulse' 
                    : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                }`}
                title={isTimerActive ? "Stop Timer" : "Start Timer"}
              >
                {isTimerActive ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
              </button>
            )}
          </div>
          
          <div className="flex -space-x-2">
            {task.assignees.map((a, i) => (
              a.startsWith('http') ? 
                <img key={i} className="w-6 h-6 rounded-full border-2 border-white object-cover shadow-sm" src={a} alt="Assignee" /> :
                <span key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-black text-slate-600 shadow-sm">{getAssigneeInitials(a)}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors">
      <TopBar title="Tasks" icon="assignment" onMenuClick={onMenuClick} />
      
      <div className="px-5 py-4 shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex bg-slate-200/50 p-1.5 rounded-2xl flex-1 shadow-inner">
            <button 
              onClick={() => setActiveTab('active')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Clock className="w-4 h-4" />
              History
            </button>
          </div>
          {activeTab === 'active' && (
            <div className="flex bg-slate-200/50 p-1.5 rounded-2xl shadow-inner">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}
          {tasks.length > 0 && canDeleteTasks && activeTab === 'active' && (
            <button 
              onClick={handleClearAll}
              className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors shadow-sm border border-slate-100 bg-white"
              title="Clear All Tasks"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={filterProject} 
              onChange={e => setFilterProject(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-transparent outline-none"
            >
              {projects.map((p, i) => <option key={p || `proj-${i}`} value={p}>{p === 'All' ? 'All Projects' : getProjectTitle(p)}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={showDeactivated ? 'deactivated' : 'active'} 
              onChange={e => setShowDeactivated(e.target.value === 'deactivated')}
              className="text-xs font-bold text-slate-600 bg-transparent outline-none"
            >
              <option value="active">Active Tasks</option>
              <option value="deactivated">Deactivated Tasks</option>
            </select>
          </div>
          
          {activeTab === 'active' && (
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
              <Filter className="w-4 h-4 text-slate-400" />
              <select 
                value={filterStatus} 
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs font-bold text-slate-600 bg-transparent outline-none"
              >
                <option value="All">All Statuses</option>
                {kanbanColumns.map((c, i) => <option key={c.id || `col-${i}`} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm ml-auto">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs font-bold text-slate-600 bg-transparent outline-none"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pb-24 no-scrollbar">
        {filteredAndSortedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-soft border border-slate-100">
              <Inbox className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">No tasks found</h3>
            <p className="text-sm text-slate-500 text-center max-w-[250px] font-medium">
              {activeTab === 'active' ? "You don't have any active tasks." : "No completed tasks in history."}
            </p>
          </div>
        ) : viewMode === 'list' || activeTab === 'history' ? (
          <div className="space-y-4">
            {filteredAndSortedTasks.map((task, i) => (
              <React.Fragment key={task.id || `task-${i}`}>
                {renderTaskCard(task)}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="flex gap-4 h-full overflow-x-auto pb-4 snap-x">
            {kanbanColumns.map((col, i) => {
              const colTasks = filteredAndSortedTasks.filter(t => t.status === col.id);
              return (
                <div 
                  key={col.id || `col-div-${i}`} 
                  className="flex-shrink-0 w-72 flex flex-col bg-slate-100/50 rounded-3xl p-3 snap-center"
                  onDrop={(e) => handleDrop(e, col.id)}
                  onDragOver={handleDragOver}
                >
                  <div className="flex items-center justify-between mb-3 px-2">
                    <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest">{col.title}</h4>
                    <span className="bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded-lg shadow-sm">{colTasks.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar min-h-[150px]">
                    {colTasks.map((task, i) => (
                      <React.Fragment key={task.id || `col-task-${i}`}>
                        {renderTaskCard(task)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {isDeleteModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Delete Task?</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (taskToDelete) {
                    deleteTask(taskToDelete);
                    setIsDeleteModalOpen(false);
                    setTaskToDelete(null);
                  }
                }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isClearAllModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Clear All Tasks?</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Are you sure you want to delete all tasks? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsClearAllModalOpen(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmClearAll}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/30"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
