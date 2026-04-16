import React, { useMemo } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { useProjects } from '../context/ProjectContext';
import { Clock, RefreshCw, CheckCircle2, AlertCircle, Filter, GripVertical, Inbox, TrendingUp, ArrowRight, CheckSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, isAfter, parseISO, isToday, isSameDay } from 'date-fns';
import { LayoutContextType } from '../App';

export default function DashboardView() {
  const { onMenuClick, onTaskClick } = useOutletContext<LayoutContextType>();
  const { tasks } = useTasks();
  const { user } = useAuth();
  const { hasPermission } = useRoles();
  const { projects } = useProjects();
  const navigate = useNavigate();

  const getTaskStatusInfo = (task: any) => {
    let cols = [
      { id: 'Todo', title: 'To Do' },
      { id: 'In Progress', title: 'In Progress' },
      { id: 'Pending Approval', title: 'Review' },
      { id: 'Completed', title: 'Done' }
    ];

    const project = projects.find(p => p.id === task.project);
    if (project && (project as any).kanban_columns) {
      try {
        cols = JSON.parse((project as any).kanban_columns);
      } catch (e) {}
    } else if (user?.kanbanColumns) {
      try {
        cols = JSON.parse(user.kanbanColumns);
      } catch (e) {}
    }

    const lastColId = cols.length > 0 ? cols[cols.length - 1].id : 'Completed';
    const reviewColId = cols.length > 2 ? cols[cols.length - 2].id : 'Pending Approval';
    const inProgressColId = cols.length > 1 ? cols[1].id : 'In Progress';
    
    const statusObj = cols.find(c => c.id === task.status);
    
    return {
      title: statusObj ? statusObj.title : task.status,
      isCompleted: task.status === lastColId,
      isReview: task.status === reviewColId,
      isInProgress: task.status === inProgressColId
    };
  };
  
  const [users, setUsers] = React.useState<{id: string, name: string, department_id?: string}[]>([]);

  React.useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('taskops_token');
    fetch('/api/users', {
      headers: {
        'x-user-id': user.id,
        'x-user-role': user.role,
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
        }
      })
      .catch(err => console.error('Failed to fetch users', err));
  }, [user]);

  const isManager = useMemo(() => user ? hasPermission(user.role, 'manage_tasks', user.roleId) : false, [user, hasPermission]);
  const canViewReports = useMemo(() => user ? hasPermission(user.role, 'view_reports', user.roleId) : false, [user, hasPermission]);
  const isEmployee = !isManager;

  // Filter tasks based on role
  const relevantTasks = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.isDeactivated);
    
    if (user?.role === 'Owner' || user?.role === 'Admin') {
      return activeTasks; // See everything
    }

    if (user?.role === 'Manager') {
      // Manager sees tasks assigned to them, their department, users in their department, or created by them
      return activeTasks.filter(t => {
        const isDirectlyAssigned = t.assignees?.includes(user?.id || '');
        const isDepartmentAssigned = user?.departmentId && (t.assignedToType === 'department' && t.assignees?.includes(user.departmentId));
        const isAssignedToDeptUser = t.assignees?.some(assigneeId => users.some(u => u.id === assigneeId && u.department_id === user.departmentId));
        const isCreator = t.createdBy === user?.id;
        
        return isDirectlyAssigned || isDepartmentAssigned || isAssignedToDeptUser || isCreator;
      });
    }

    // Standard users (Sales, Logistics, etc.) only see tasks assigned to them, their department, or created by them
    return activeTasks.filter(t => {
      const isDirectlyAssigned = t.assignees?.includes(user?.id || '');
      const isDepartmentAssigned = user?.departmentId && (t.assignedToType === 'department' && t.assignees?.includes(user.departmentId));
      const isCreator = t.createdBy === user?.id;
      
      return isDirectlyAssigned || isDepartmentAssigned || isCreator;
    });
  }, [tasks, user, users]);

  const pending = relevantTasks.filter(t => {
    const info = getTaskStatusInfo(t);
    return !info.isCompleted && !info.isInProgress && !info.isReview;
  }).length;
  const inProgress = relevantTasks.filter(t => getTaskStatusInfo(t).isInProgress).length;
  const completed = relevantTasks.filter(t => getTaskStatusInfo(t).isCompleted).length;
  const pendingApproval = relevantTasks.filter(t => getTaskStatusInfo(t).isReview).length;
  const isTaskOnDay = (task: any, day: Date) => {
    const taskDateStr = task.dueDate;
    if (!taskDateStr && !task.recurring) return false;
    
    try {
      let taskDate: Date;
      if (!taskDateStr) {
        taskDate = new Date();
      } else if (taskDateStr === 'Today') {
        taskDate = new Date();
      } else if (taskDateStr === 'Tomorrow') {
        taskDate = new Date();
        taskDate.setDate(taskDate.getDate() + 1);
      } else if (taskDateStr === 'Yesterday') {
        taskDate = new Date();
        taskDate.setDate(taskDate.getDate() - 1);
      } else {
        taskDate = parseISO(taskDateStr);
      }

      if (task.recurring && task.recurring !== 'None') {
        const startOfDayTask = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
        const startOfDayTarget = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        
        if (startOfDayTarget < startOfDayTask) return false;

        if (task.recurring === 'Daily') return true;
        if (task.recurring === 'Weekly') {
          return taskDate.getDay() === day.getDay();
        }
        if (task.recurring === 'Monthly') {
          return taskDate.getDate() === day.getDate();
        }
      }

      return isSameDay(taskDate, day);
    } catch (e) {
      return false;
    }
  };

  const myTasksToday = relevantTasks.filter(t => {
    if (getTaskStatusInfo(t).isCompleted) return false;
    return isTaskOnDay(t, new Date());
  });

  const overdue = relevantTasks.filter(t => {
    if (getTaskStatusInfo(t).isCompleted || !t.dueDate) return false;
    if (t.recurring && t.recurring !== 'None') return false;
    try {
      if (t.dueDate === 'Yesterday') return true;
      if (t.dueDate === 'Today' || t.dueDate === 'Tomorrow') return false;
      return isAfter(new Date(), parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate));
    } catch (e) { return false; }
  }).length;

  const completionData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const completedOnDate = relevantTasks.filter(t => getTaskStatusInfo(t).isCompleted && t.dueDate === dateStr).length;
      data.push({
        name: format(date, 'EEE'),
        completed: completedOnDate
      });
    }
    return data;
  }, [relevantTasks, projects, user]);

  const taskStatusData = [
    { name: 'Todo', value: pending, color: '#f59e0b' },
    { name: 'In Progress', value: inProgress, color: 'var(--primary-500)' },
    { name: 'Pending Approval', value: pendingApproval, color: '#a855f7' },
    { name: 'Completed', value: completed, color: '#10b981' },
  ];

  const getProjectTitle = (id: string) => {
    const project = projects.find(p => p.id === id);
    return project ? project.title : id;
  };

  const timeSpentPerProject = useMemo(() => {
    const projectTime: Record<string, number> = {};
    relevantTasks.forEach(task => {
      const projectTitle = getProjectTitle(task.project) || 'Unassigned';
      projectTime[projectTitle] = (projectTime[projectTitle] || 0) + (task.timeSpent || 0);
    });
    return Object.entries(projectTime).map(([name, value]) => ({
      name,
      hours: Math.round((value / 3600) * 10) / 10
    })).sort((a, b) => b.hours - a.hours).slice(0, 5);
  }, [relevantTasks, projects]);

  const totalTasks = relevantTasks.length;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completed / totalTasks) * 100);

  return (
    <div className="flex flex-col pb-6 bg-[#f8fafc] min-h-full transition-colors">
      <TopBar title="Dashboard" icon="dashboard" onMenuClick={onMenuClick} />
      
      <main className="flex flex-col gap-8 p-5">
        
        {/* Hero Progress Card */}
        <section className="rounded-3xl p-6 bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-glow relative overflow-hidden animate-float">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-400/20 rounded-full blur-2xl -ml-10 -mb-10"></div>
          
          <div className="relative z-10">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary-100 mb-4 opacity-80">
              {isEmployee ? 'My Progress' : 'Overall Progress'}
            </h3>
            <div className="flex items-end justify-between mb-4">
              <div className="flex items-baseline gap-1">
                <p className="text-5xl font-black tracking-tighter">{progressPercentage}</p>
                <span className="text-2xl font-bold text-primary-200">%</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{pending + inProgress + pendingApproval} tasks</p>
                <p className="text-xs text-primary-200 font-medium">remaining</p>
              </div>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2.5 backdrop-blur-sm p-0.5">
              <div className="bg-white h-1.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>
        </section>

        {/* Employee Specific View: My Tasks Today */}
        {isEmployee && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">My Tasks Today</h2>
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg">{myTasksToday.length} due</span>
            </div>
            
            {myTasksToday.length > 0 ? (
              <div className="space-y-3">
                {myTasksToday.map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => onTaskClick?.(task.id)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      task.priority === 'High' ? 'bg-rose-50 text-rose-500' :
                      task.priority === 'Medium' ? 'bg-amber-50 text-amber-500' :
                      'bg-emerald-50 text-emerald-500'
                    }`}>
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">{task.id}</span>
                      <h4 className="font-bold text-slate-800 truncate">{task.title}</h4>
                      <p className="text-xs text-slate-500 font-medium truncate">{task.project}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${
                        getTaskStatusInfo(task).isInProgress ? 'bg-primary-50 text-primary-600' :
                        getTaskStatusInfo(task).isReview ? 'bg-purple-50 text-purple-600' :
                        'bg-slate-50 text-slate-500'
                      }`}>
                        {getTaskStatusInfo(task).title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center shadow-sm">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">All caught up!</h3>
                <p className="text-sm text-slate-500 font-medium">You have no tasks due today.</p>
              </div>
            )}
          </section>
        )}

        {/* Quick Stats Grid */}
        <section className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => navigate('/tasks')}
            className="flex flex-col gap-3 rounded-3xl p-5 bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <span className="text-3xl font-black text-slate-800 tracking-tight">{pending}</span>
            </div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Pending</span>
          </div>
          
          <div 
            onClick={() => navigate('/tasks')}
            className="flex flex-col gap-3 rounded-3xl p-5 bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary-500" />
              </div>
              <span className="text-3xl font-black text-slate-800 tracking-tight">{inProgress}</span>
            </div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">In Progress</span>
          </div>
          
          <div 
            onClick={() => navigate('/approvals')}
            className="flex flex-col gap-3 rounded-3xl p-5 bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
              </div>
              <span className="text-3xl font-black text-slate-800 tracking-tight">{pendingApproval}</span>
            </div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Approvals</span>
          </div>
          
          <div 
            onClick={() => navigate('/tasks')}
            className={`flex flex-col gap-3 rounded-3xl p-5 border transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer ${overdue > 0 ? 'bg-rose-50 border-rose-100 shadow-rose-100' : 'bg-white border-slate-100 shadow-soft'}`}
          >
            <div className="flex justify-between items-start">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${overdue > 0 ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-rose-50 text-rose-500'}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className={`text-3xl font-black tracking-tight ${overdue > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{overdue}</span>
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${overdue > 0 ? 'text-rose-400' : 'text-slate-500'}`}>Overdue</span>
          </div>
        </section>

        {/* Analytics Charts */}
        {canViewReports && (
        <section className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Task Completion (Last 7 Days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={completionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="completed" fill="var(--primary-500)" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Time Spent per Project (Hours)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSpentPerProject} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} width={80} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="hours" fill="var(--primary-400)" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-soft">
            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6">Task Status Distribution</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
        )}

        {/* Today's Tasks */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Today's Tasks</h3>
            <Link 
              to="/tasks"
              className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex flex-col gap-3">
            {relevantTasks.length > 0 ? relevantTasks.slice(0, 3).map(task => (
              <div 
                key={task.id} 
                onClick={() => onTaskClick?.(task.id)}
                className={`group flex items-center gap-4 p-4 rounded-3xl bg-white border border-slate-100 shadow-soft hover:shadow-md transition-all cursor-pointer ${getTaskStatusInfo(task).isCompleted ? 'opacity-60 bg-slate-50' : ''}`}
              >
                <div className="flex-none">
                  {getTaskStatusInfo(task).isCompleted ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full border-2 border-slate-200 group-hover:border-primary-400 transition-colors flex items-center justify-center"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-slate-400 block mb-0.5">{task.id}</span>
                  <p className={`font-bold text-slate-800 truncate ${getTaskStatusInfo(task).isCompleted ? 'line-through text-slate-400' : ''}`}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{getProjectTitle(task.project)}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{task.recurring && task.recurring !== 'None' ? task.recurring : task.dueDate || 'No date'}</span>
                  </div>
                </div>
                <div className="flex-none">
                  <GripVertical className="w-5 h-5 text-slate-300 group-hover:text-slate-400 transition-colors" />
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-slate-100 border-dashed shadow-soft">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Inbox className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-800 font-bold text-lg">You're all caught up!</p>
                <p className="text-slate-400 text-sm font-medium mt-1">No tasks pending for today.</p>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
