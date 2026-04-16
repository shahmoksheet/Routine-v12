import React, { useState, useEffect, useCallback } from 'react';
import { useTasks } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';
import { ArrowLeft, MoreVertical, Timer, Trash2, CheckCircle2, Circle, Camera, CheckSquare, Square, Check, X as XIcon, FileText, ListTodo, MessageSquare, Send, Clock, Paperclip, Loader2, Download, Trash, Plus, Calendar, Edit3, PlusCircle, AlertTriangle, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useRoles } from '../context/RolesContext';
import { motion, AnimatePresence } from 'motion/react';
import ReportIssueModal from './ReportIssueModal';
import TaskMultiSelect from './TaskMultiSelect';
import { useMemo } from 'react';
import { toast } from 'sonner';

export default function TaskDetailsModal({ taskId, onClose, onOpenTask }: { taskId: string, onClose: () => void, onOpenTask?: (taskId: string) => void }) {
  const { tasks, updateTask, deleteTask } = useTasks();
  const { projects } = useProjects();
  const { user } = useAuth();
  const { hasPermission } = useRoles();
  const task = tasks.find(t => t.id === taskId);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeSpent, setTimeSpent] = useState(task?.timeSpent || 0);
  const [showManualTime, setShowManualTime] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReportIssueModalOpen, setIsReportIssueModalOpen] = useState(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDueDate, setEditDueDate] = useState(task?.dueDate || '');
  const [editDueTime, setEditDueTime] = useState(task?.dueTime || '');
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState(task?.title || '');
  const [editDescription, setEditDescription] = useState(task?.description || '');
  const [editPriority, setEditPriority] = useState(task?.priority || 'Medium');
  const [editDependencies, setEditDependencies] = useState<string[]>(task?.dependencies || []);
  const [editRelatedTasks, setEditRelatedTasks] = useState<string[]>(task?.relatedTasks || []);
  const [isEditingAssignee, setIsEditingAssignee] = useState(false);
  const [editAssignee, setEditAssignee] = useState(task?.assignedToType === 'department' ? `dept_${task?.assignees?.[0]}` : (task?.assignees?.[0] || ''));
  
  const canManageAllTasks = useMemo(() => user ? hasPermission(user.role, 'manage_tasks', user.roleId) : false, [user, hasPermission]);
  const canApproveAnyTask = useMemo(() => user ? hasPermission(user.role, 'approve_tasks', user.roleId) : false, [user, hasPermission]);
  const isManager = user?.role.toLowerCase() === 'manager';

  const canApprove = useMemo(() => {
    if (!user || !task) return false;
    if (canApproveAnyTask) return true;
    if (task.createdBy === user.id) return true;
    if (isManager && user.departmentId && task.assignees?.includes(`dept_${user.departmentId}`)) return true;
    return false;
  }, [user, task, canApproveAnyTask, isManager]);

  const canEdit = useMemo(() => {
    if (!user || !task) return false;
    if (canManageAllTasks) return true;
    if (task.createdBy === user.id) return true;
    if (isManager && user.departmentId && task.assignees?.includes(`dept_${user.departmentId}`)) return true;
    return false;
  }, [user, task, canManageAllTasks, isManager]);

  const isCreator = useMemo(() => task?.createdBy === user?.id, [task, user]);
  const canDelete = useMemo(() => canManageAllTasks || isCreator, [canManageAllTasks, isCreator]);

  const canUpdateStatus = useMemo(() => {
    if (!user || !task) return false;
    if (canManageAllTasks) return true;
    if (task.createdBy === user.id) return true;
    
    const assigneeId = task.assignedToType === 'department' ? `dept_${task.assignees?.[0]}` : (task.assignees?.[0] || '');
    if (assigneeId.startsWith('dept_')) {
      const deptId = assigneeId.replace('dept_', '');
      return user.departmentId === deptId;
    }
    return user.id === assigneeId;
  }, [user, task, canManageAllTasks]);

  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  const kanbanCols = useMemo(() => {
    let cols = [
      { id: 'Todo', title: 'To Do' },
      { id: 'In Progress', title: 'In Progress' },
      { id: 'Pending Approval', title: 'Review' },
      { id: 'Completed', title: 'Done' }
    ];

    if (!task) return cols;

    const selectedProjectObj = projects.find(p => p.title === task.project);
    if (selectedProjectObj && (selectedProjectObj as any).kanban_columns) {
      try {
        cols = JSON.parse((selectedProjectObj as any).kanban_columns);
      } catch (e) {}
    } else if (user?.kanbanColumns) {
      try {
        cols = JSON.parse(user.kanbanColumns);
      } catch (e) {}
    }
    return cols;
  }, [task, projects, user]);

  const firstCol = kanbanCols.length > 0 ? kanbanCols[0].id : 'Todo';
  const lastCol = kanbanCols.length > 0 ? kanbanCols[kanbanCols.length - 1].id : 'Completed';
  const reviewCol = kanbanCols.length > 2 ? kanbanCols[kanbanCols.length - 2].id : 'Pending Approval';
  
  const currentStatusTitle = kanbanCols.find(c => c.id === task?.status)?.title || task?.status;
  const isCompleted = task?.status === lastCol;

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('taskops_token');
    const headers: Record<string, string> = {
      'x-user-id': user.id,
      'x-user-role': user.role
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

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

    fetch('/api/departments', { headers })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDepartments(data);
        } else {
          console.error('Expected array but got:', data);
          setDepartments([]);
        }
      })
      .catch(err => console.error('Failed to fetch departments', err));
  }, [user]);

  const getAssigneeInitials = (id: string, type?: string) => {
    if (type === 'department') {
      const d = departments.find(d => d.id === id);
      if (d) return d.name.substring(0, 2).toUpperCase();
    }
    const u = users.find(u => u.id === id);
    if (u) {
      return u.name.substring(0, 2).toUpperCase();
    }
    return id.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleTimerToggle = () => {
    if (isTimerRunning) {
      updateTask(taskId, { timeSpent });
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const handleManualTimeSubmit = () => {
    const mins = parseInt(manualMinutes);
    if (!isNaN(mins) && mins > 0) {
      const newTime = timeSpent + (mins * 60);
      setTimeSpent(newTime);
      updateTask(taskId, { timeSpent: newTime });
      setManualMinutes('');
      setShowManualTime(false);
      toast.success(`Added ${mins} minutes`);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !task) return;
    
    const comment = {
      id: Date.now().toString(),
      text: newComment,
      author: user?.name || 'User',
      timestamp: new Date().toISOString()
    };
    
    updateTask(taskId, { comments: [...(task.comments || []), comment] });

    // Check for mentions
    const mentions = newComment.match(/@\w+/g);
    if (mentions) {
      // Notification logic would go here if supported by context
    }

    setNewComment('');
  };

  const handleSaveDate = () => {
    if (!task) return;
    updateTask(taskId, { dueDate: editDueDate, dueTime: editDueTime });
    setIsEditingDate(false);
  };

  const handleSaveAssignee = () => {
    if (!task) return;
    let assignedToType = 'user';
    let assignees = [editAssignee];
    if (editAssignee.startsWith('dept_')) {
      assignedToType = 'department';
      assignees = [editAssignee.replace('dept_', '')];
    }
    updateTask(taskId, { assignees, assignedToType });
    setIsEditingAssignee(false);
  };

  const handleSaveTask = () => {
    if (!task) return;
    updateTask(taskId, { 
      title: editTitle, 
      description: editDescription, 
      priority: editPriority,
      dependencies: editDependencies,
      relatedTasks: editRelatedTasks
    });
    setIsEditingTask(false);
  };

  const handleClose = () => {
    if (isTimerRunning || timeSpent !== (task.timeSpent || 0)) {
      updateTask(taskId, { timeSpent });
    }
    onClose();
  };

  if (!task) return null;

  const toggleStatus = () => {
    if (!canUpdateStatus) {
      toast.error('You do not have permission to update this task status.');
      return;
    }

    if (!isCompleted) {
      // Check if all dependencies are completed
      if (task.dependencies && task.dependencies.length > 0) {
        const incompleteDependencies = task.dependencies.filter(depId => {
          const depTask = tasks.find(t => t.id === depId);
          return depTask && depTask.status !== lastCol;
        });

        if (incompleteDependencies.length > 0) {
          toast.error('You must complete all dependencies before completing this task.');
          return;
        }
      }
    }

    if (isCompleted) {
      updateTask(taskId, { status: firstCol });
    } else if (task.proofType && task.proofType !== 'None' && !task.photoUrl) {
      setAlertMessage(`${task.proofType} proof is required to complete this task.`);
      setIsAlertModalOpen(true);
    } else if (task.requiresApproval || (task.proofType && task.proofType !== 'None')) {
      updateTask(taskId, { status: reviewCol });
    } else {
      updateTask(taskId, { status: lastCol });
    }
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    await deleteTask(taskId);
    onClose();
  };

  const [newSubtask, setNewSubtask] = useState('');

  const toggleSubtask = (itemId: string, createdBy?: string) => {
    if (!task.subtasks) return;
    
    const canEditSubtask = (() => {
      if (!user) return false;
      if (canManageAllTasks) return true;
      if (task.createdBy === user.id) return true;
      if (isManager && user.departmentId && task.assignees?.includes(`dept_${user.departmentId}`)) return true;
      return user.id === createdBy;
    })();

    if (!canEditSubtask) {
      return; // Cannot edit someone else's subtask if you are not the task creator or manager
    }

    const updatedSubtasks = task.subtasks.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    updateTask(taskId, { subtasks: updatedSubtasks });
  };

  const handleDeleteSubtask = (itemId: string, createdBy?: string) => {
    if (!task.subtasks) return;
    
    const canDeleteSubtask = (() => {
      if (!user) return false;
      if (canManageAllTasks) return true;
      if (task.createdBy === user.id) return true;
      if (isManager && user.departmentId && task.assignees?.includes(`dept_${user.departmentId}`)) return true;
      return user.id === createdBy;
    })();

    if (!canDeleteSubtask) {
      return;
    }

    const updatedSubtasks = task.subtasks.filter(item => item.id !== itemId);
    updateTask(taskId, { subtasks: updatedSubtasks });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim() || !task) return;
    
    const subtask = {
      id: Date.now().toString(),
      title: newSubtask,
      completed: false,
      createdBy: user?.id
    };
    
    updateTask(taskId, { subtasks: [...(task.subtasks || []), subtask] });
    setNewSubtask('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'attachment' | 'proof') => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('taskops_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        if (type === 'proof') {
          updateTask(taskId, { photoUrl: data.path });
          toast.success(`Your ${task.proofType} proof has been attached to "${task.title}"`);
        } else {
          const newAttachment = {
            id: Date.now().toString(),
            name: file.name,
            url: data.path,
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'
          } as any;
          updateTask(taskId, { attachments: [...(task.attachments || []), newAttachment] });
          toast.success(`"${file.name}" has been attached to "${task.title}"`);
        }
      }
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('There was an error uploading your file.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (attId: string) => {
    if (!task) return;
    const updatedAttachments = (task.attachments || []).filter(a => a.id !== attId);
    updateTask(taskId, { attachments: updatedAttachments });
  };

  const renderProofPreview = () => {
    if (!task.photoUrl) return null;

    if (task.proofType === 'Image' || task.photoUrl.match(/\.(jpeg|jpg|gif|png)$/i) || task.photoUrl.startsWith('blob:')) {
      return <img src={task.photoUrl} alt="Proof" className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105" />;
    } else if (task.proofType === 'Video' || task.photoUrl.match(/\.(mp4|webm|ogg)$/i)) {
      return (
        <video controls className="w-full h-56 object-cover">
          <source src={task.photoUrl} />
          Your browser does not support the video tag.
        </video>
      );
    } else {
      return (
        <div className="w-full h-56 flex flex-col items-center justify-center bg-slate-50 text-slate-500">
          <FileText className="w-12 h-12 mb-2" />
          <span className="text-sm font-medium">Document Attached</span>
          <a href={task.photoUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-primary-600 hover:underline text-xs">View Document</a>
        </div>
      );
    }
  };

  const handleApprove = () => {
    if (task.dependencies && task.dependencies.length > 0) {
      const incompleteDependencies = task.dependencies.filter(depId => {
        const depTask = tasks.find(t => t.id === depId);
        return depTask && depTask.status !== lastCol;
      });

      if (incompleteDependencies.length > 0) {
        toast.error('You must complete all dependencies before approving this task.');
        return;
      }
    }
    updateTask(taskId, { status: lastCol });
    handleClose();
  };

  const handleReject = () => {
    updateTask(taskId, { status: 'In Progress', photoUrl: null });
  };

  const renderCommentText = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-primary-600 font-bold bg-primary-50 px-1 rounded">{part}</span>;
      }
      return part;
    });
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute inset-0 bg-slate-50 dark:bg-slate-950 z-50 flex flex-col overflow-y-auto no-scrollbar"
    >
      <header className="sticky top-0 z-40 flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-5 py-4 justify-between border-b border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex items-center gap-4">
          <button onClick={handleClose} className="p-2.5 -ml-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-2xl transition-all text-slate-500 dark:text-slate-400 hover:text-primary-600 active:scale-95">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-xl font-black leading-tight tracking-tight text-slate-800 dark:text-slate-100">Task Details</h2>
        </div>
        <div className="flex items-center gap-2">
          {isCreator && (
            <button onClick={() => setIsEditingTask(!isEditingTask)} className={`p-2.5 rounded-2xl transition-all active:scale-95 ${isEditingTask ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`} title="Edit Task">
              <Edit3 className="w-5 h-5" />
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="p-2.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl text-rose-500 transition-all active:scale-95" title="Delete Task">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            <button 
              onClick={() => setShowKebabMenu(!showKebabMenu)}
              className={`p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 transition-all active:scale-95 ${showKebabMenu ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {showKebabMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowKebabMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                  {canEdit && (
                    <button 
                      onClick={() => {
                        setIsEditingTask(true);
                        setShowKebabMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Task
                    </button>
                  )}
                  {canDelete && (
                    <button 
                      onClick={() => {
                        setIsDeleteModalOpen(true);
                        setShowKebabMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Task
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsReportIssueModalOpen(true);
                      setShowKebabMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Raise Issue (Ticket)
                  </button>
                  <button 
                    onClick={() => {
                      // Copy link functionality
                      navigator.clipboard.writeText(`${window.location.origin}/tasks/${task.id}`);
                      setShowKebabMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-6 p-5 pb-32">
        <section className="space-y-5">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              {isEditingTask ? (
                <div className="space-y-2">
                  <span className="text-xs font-mono text-slate-400 block">{task.id}</span>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-3xl font-black leading-tight text-slate-900 dark:text-white tracking-tight bg-transparent border-b-2 border-primary-500 focus:outline-none"
                    placeholder="Task Title"
                  />
                </div>
              ) : (
                <div>
                  <span className="text-xs font-mono text-slate-400 block mb-1">{task.id}</span>
                  <h2 className="text-3xl font-black leading-tight text-slate-900 dark:text-white tracking-tight">{task.title}</h2>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  isCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 
                  task.status === reviewCol ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' :
                  'bg-primary-50 text-primary-600 border-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-800'
                }`}>
                  {currentStatusTitle}
                </span>
                {isEditingTask ? (
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 focus:outline-none focus:border-primary-500"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Urgent">Urgent Priority</option>
                  </select>
                ) : (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                    {task.priority} Priority
                  </span>
                )}
                {task.recurring && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
                    {task.recurring}
                  </span>
                )}
                {task.requiresApproval && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                    Requires Approval
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                {isEditingDate && isCreator ? (
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={editDueDate} 
                      onChange={e => setEditDueDate(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500 transition-all"
                    />
                    <input 
                      type="time" 
                      value={editDueTime} 
                      onChange={e => setEditDueTime(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500 transition-all"
                    />
                    <button onClick={handleSaveDate} className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded-md">Save</button>
                    <button onClick={() => setIsEditingDate(false)} className="text-xs font-bold text-slate-500 hover:text-slate-600 bg-slate-100 px-2 py-1 rounded-md">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {task.recurring && task.recurring !== 'None' ? task.recurring : task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'} {task.dueTime ? `at ${task.dueTime}` : ''}
                    </span>
                    {isCreator && (
                      <button onClick={() => setIsEditingDate(true)} className="text-[10px] font-bold text-primary-500 hover:text-primary-600 uppercase tracking-widest">
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              {isEditingAssignee ? (
                <div className="flex items-center gap-2 mt-2">
                  <select
                    value={editAssignee}
                    onChange={e => setEditAssignee(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500 transition-all"
                  >
                    <optgroup label="Users">
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Departments">
                      {departments.map(d => (
                        <option key={d.id} value={`dept_${d.id}`}>{d.name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <button onClick={handleSaveAssignee} className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2 py-1 rounded-md">Save</button>
                  <button onClick={() => setIsEditingAssignee(false)} className="text-xs font-bold text-slate-500 hover:text-slate-600 bg-slate-100 px-2 py-1 rounded-md">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  {task.assignees && task.assignees.length > 0 && (
                    <div className="flex -space-x-2">
                      {task.assignees.map((assignee, i) => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 shadow-sm overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          {assignee.startsWith('http') ? (
                            <img src={assignee} alt="Assignee" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{getAssigneeInitials(assignee, task.assignedToType)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {(isCreator || isManager) && (
                    <button onClick={() => setIsEditingAssignee(true)} className="text-[10px] font-bold text-primary-500 hover:text-primary-600 uppercase tracking-widest ml-2">
                      Edit Assignee
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-soft transition-colors relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-50 to-transparent dark:from-primary-900/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-500" />
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</h3>
                </div>
                {isEditingTask && (
                  <div className="flex gap-2">
                    <button onClick={handleSaveTask} className="text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg transition-colors">Save Changes</button>
                    <button onClick={() => setIsEditingTask(false)} className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                  </div>
                )}
              </div>
              {isEditingTask ? (
                <div className="space-y-4">
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full h-32 text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium bg-transparent border-2 border-primary-500 rounded-xl p-3 focus:outline-none resize-none"
                    placeholder="Task Description"
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Dependencies</label>
                      <TaskMultiSelect 
                        tasks={tasks}
                        selectedIds={editDependencies}
                        onChange={setEditDependencies}
                        placeholder="Select dependencies..."
                        excludeTaskId={task.id}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Related Tasks</label>
                      <TaskMultiSelect 
                        tasks={tasks}
                        selectedIds={editRelatedTasks}
                        onChange={setEditRelatedTasks}
                        placeholder="Select related tasks..."
                        excludeTaskId={task.id}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap">
                  {task.description || `This is a detailed description for ${task.title}. Ensure all subtasks are completed before marking this as done.`}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Attachments</h3>
              </div>
              <label className="text-[10px] font-black text-primary-600 uppercase tracking-widest cursor-pointer hover:text-primary-500 transition-colors flex items-center gap-1">
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Add New
                <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'attachment')} disabled={isUploading} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {task.attachments && task.attachments.length > 0 ? (
                task.attachments.map(att => (
                  <div key={att.id} className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2 group relative">
                    {att.type === 'image' ? (
                      <img src={att.url} alt={att.name} className="w-full h-24 object-cover rounded-xl" />
                    ) : (
                      <div className="w-full h-24 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center">
                        <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate pr-4">{att.name}</span>
                      <div className="flex items-center gap-1">
                        <a href={att.url} download={att.name} className="p-1 text-slate-400 hover:text-primary-600 transition-colors">
                          <Download className="w-3 h-3" />
                        </a>
                        <button onClick={() => removeAttachment(att.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-4 text-center text-slate-400 text-xs font-medium bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  No attachments yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <ListTodo className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Subtasks</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden">
            {task.subtasks && task.subtasks.length > 0 ? (
              task.subtasks.map((item, index) => {
                const isCreator = user?.id === task.createdBy;
                const isOwner = user?.id === item.createdBy;
                const canEdit = isCreator || isOwner || !item.createdBy;

                return (
                  <div 
                    key={item.id} 
                    className={`group flex items-center justify-between p-5 transition-all ${index !== task.subtasks!.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/50`}
                  >
                    <div 
                      className={`flex items-center gap-4 flex-1 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                      onClick={() => canEdit && toggleSubtask(item.id, item.createdBy)}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${item.completed ? 'bg-primary-500 text-white shadow-glow scale-110' : 'bg-slate-100 dark:bg-slate-800 text-transparent group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                        <Check className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold transition-all ${item.completed ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-700 dark:text-slate-300 group-hover:text-primary-700 dark:group-hover:text-primary-400'}`}>
                        {item.title}
                      </span>
                    </div>
                    {canEdit && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteSubtask(item.id, item.createdBy); }}
                        className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-5 text-center text-slate-400 text-sm font-medium">No subtasks added yet.</div>
            )}
            
            <form onSubmit={handleAddSubtask} className="p-4 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex gap-2">
              <input 
                type="text"
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                placeholder="Add a new subtask..."
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              />
              <button 
                type="submit"
                disabled={!newSubtask.trim()}
                className="bg-primary-600 text-white px-4 py-2 rounded-xl hover:bg-primary-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-colors font-bold text-sm"
              >
                Add
              </button>
            </form>
          </div>
        </section>

        {(task.dependencies && task.dependencies.length > 0) && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <ListTodo className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dependencies</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden p-2">
              <div className="flex flex-col gap-2">
                {task.dependencies.map(depId => {
                  const depTask = tasks.find(t => t.id === depId);
                  if (!depTask) return null;
                  return (
                    <div 
                      key={depId} 
                      onClick={() => onOpenTask && onOpenTask(depId)}
                      className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 ${onOpenTask ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${depTask.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{depTask.title}</span>
                      <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-400">{depTask.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {(task.relatedTasks && task.relatedTasks.length > 0) && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <ListTodo className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Related Tasks</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-soft overflow-hidden p-2">
              <div className="flex flex-col gap-2">
                {task.relatedTasks.map(relId => {
                  const relTask = tasks.find(t => t.id === relId);
                  if (!relTask) return null;
                  return (
                    <div 
                      key={relId} 
                      onClick={() => onOpenTask && onOpenTask(relId)}
                      className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 ${onOpenTask ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${relTask.status === 'Completed' ? 'bg-emerald-500' : 'bg-primary-500'}`} />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{relTask.title}</span>
                      <span className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-400">{relTask.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {task.proofType && task.proofType !== 'None' && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <Camera className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Proof of Work ({task.proofType})</h3>
            </div>
            {task.photoUrl ? (
              <div className="relative rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-soft group">
                {renderProofPreview()}
                {task.status !== 'Completed' && task.status !== 'Pending Approval' && (
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <label className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-5 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer">
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-primary-500" /> : <Camera className="w-5 h-5 text-primary-500" />}
                      {isUploading ? 'Uploading...' : 'Retake Proof'}
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, 'proof')} 
                        disabled={isUploading}
                        accept={
                          task.proofType === 'Image' ? 'image/*' : 
                          task.proofType === 'Video' ? 'video/*' : 
                          task.proofType === 'Document' ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt' : 
                          '*/*'
                        } 
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <label className={`w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 hover:border-primary-300 dark:hover:border-primary-800 hover:text-primary-600 transition-all group cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/20 flex items-center justify-center transition-colors">
                  {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                </div>
                <span className="text-sm font-bold">{isUploading ? 'Uploading proof...' : `Tap to upload ${task.proofType.toLowerCase()} proof`}</span>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={(e) => handleFileUpload(e, 'proof')} 
                  disabled={isUploading}
                  accept={
                    task.proofType === 'Image' ? 'image/*' : 
                    task.proofType === 'Video' ? 'video/*' : 
                    task.proofType === 'Document' ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt' : 
                    '*/*'
                  } 
                />
              </label>
            )}
          </section>
        )}

        {task.status !== 'Completed' && task.status !== 'Pending Approval' && (
          <section className="py-2 space-y-3">
            <div className={`flex items-center justify-between p-6 rounded-3xl shadow-xl text-white relative overflow-hidden transition-all duration-500 ${isTimerRunning ? 'bg-emerald-500 shadow-emerald-500/30 scale-[1.02]' : 'bg-primary-600 shadow-primary-600/30'}`}>
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md transition-transform duration-500 ${isTimerRunning ? 'animate-pulse' : ''}`}>
                  <Timer className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-white/80 tracking-widest mb-1">Tracked Time</p>
                  <p className="text-3xl font-mono font-black tracking-tight">{formatTime(timeSpent)}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 relative z-10">
                <button 
                  onClick={handleTimerToggle}
                  className={`bg-white px-6 py-2.5 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 ${isTimerRunning ? 'text-emerald-600 hover:bg-emerald-50' : 'text-primary-600 hover:bg-primary-50'}`}
                >
                  {isTimerRunning ? 'STOP' : 'START'}
                </button>
                {!isTimerRunning && (
                  <button 
                    onClick={() => setShowManualTime(!showManualTime)}
                    className="text-[10px] font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider text-center"
                  >
                    Log Manually
                  </button>
                )}
              </div>
            </div>
            
            {showManualTime && !isTimerRunning && (
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                <input 
                  type="number" 
                  min="1"
                  placeholder="Minutes spent..." 
                  value={manualMinutes}
                  onChange={e => setManualMinutes(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                />
                <button 
                  onClick={handleManualTimeSubmit}
                  className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-700 transition-colors"
                >
                  Add
                </button>
              </div>
            )}
          </section>
        )}

        {/* Comments Section */}
        <section className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 px-2">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Comments</h3>
          </div>
          
          <div className="space-y-4">
            {task.comments && task.comments.length > 0 ? (
              task.comments.map(comment => (
                <div key={comment.id} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{comment.author}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {new Date(comment.timestamp).toLocaleDateString()} {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{renderCommentText(comment.text)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 italic px-2">No comments yet.</p>
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2 mt-4">
            <input 
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            />
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="bg-primary-600 text-white p-3 rounded-2xl hover:bg-primary-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </section>
      </main>

      <footer className="fixed bottom-0 inset-x-0 p-5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 z-40 max-w-md md:max-w-2xl lg:max-w-4xl mx-auto transition-colors">
        {task.status === reviewCol ? (
          canApprove ? (
            <div className="flex gap-3">
              <button 
                onClick={handleReject}
                className="flex-1 py-4 rounded-2xl font-black text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-100 dark:border-rose-800"
              >
                <XIcon className="w-5 h-5" />
                Reject
              </button>
              <button 
                onClick={handleApprove}
                className="flex-[2] py-4 rounded-2xl font-black text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:shadow-emerald-600/40"
              >
                <Check className="w-5 h-5" />
                Approve Proof
              </button>
            </div>
          ) : (
            <div className="py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
              <Clock className="w-5 h-5" />
              Waiting for Approval
            </div>
          )
        ) : (
          <button 
            onClick={toggleStatus}
            disabled={!canUpdateStatus}
            className={`w-full py-4.5 rounded-2xl font-black text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              isCompleted 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200' 
                : 'bg-primary-600 text-white shadow-glow hover:bg-primary-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isCompleted ? (
              <>
                <Circle className="w-5 h-5" />
                MARK AS INCOMPLETE
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                {task.requiresApproval || (task.proofType && task.proofType !== 'None') ? 'SUBMIT FOR APPROVAL' : 'MARK AS COMPLETE'}
              </>
            )}
          </button>
        )}
      </footer>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">Delete Task?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/30"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAlertModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2">Photo Required</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">
                {alertMessage}
              </p>
              <button 
                onClick={() => setIsAlertModalOpen(false)}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm shadow-primary-600/30"
              >
                Okay
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReportIssueModalOpen && (
          <ReportIssueModal 
            onClose={() => setIsReportIssueModalOpen(false)} 
            initialTitle={`Issue with: ${task.title}`}
            initialDescription={`Related Task ID: ${task.id}\n\nProblem details:`}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
