import React, { useMemo, useState } from 'react';
import TopBar from '../components/TopBar';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { useTasks } from '../context/TaskContext';
import { useUsers } from '../context/UserContext';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, subDays, isSameDay } from 'date-fns';
import { BarChart2, PieChart as PieChartIcon, TrendingUp, Users, Filter } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { tasks } = useTasks();
  const { users } = useUsers();
  const { projects } = useProjects();
  const { user } = useAuth();
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

  const filteredTasks = useMemo(() => {
    if (selectedMemberId === 'all') return tasks;
    return tasks.filter(t => t.assignees && t.assignees.includes(selectedMemberId));
  }, [tasks, selectedMemberId]);

  const getTaskStatusInfo = (task: any) => {
    let cols = [
      { id: 'Todo', title: 'To Do' },
      { id: 'In Progress', title: 'In Progress' },
      { id: 'Pending Approval', title: 'Review' },
      { id: 'Completed', title: 'Done' }
    ];

    const project = projects.find(p => p.title === task.project);
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
    const statusObj = cols.find(c => c.id === task.status);
    
    return {
      title: statusObj ? statusObj.title : task.status,
      isCompleted: task.status === lastColId
    };
  };

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach(task => {
      const statusTitle = getTaskStatusInfo(task).title;
      counts[statusTitle] = (counts[statusTitle] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTasks, projects, user]);

  const assigneeData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredTasks.forEach(task => {
      if (task.assignees && task.assignees.length > 0) {
        const userId = task.assignees[0];
        const u = users.find(u => u.id === userId);
        const name = u ? u.name : 'Unassigned';
        counts[name] = (counts[name] || 0) + 1;
      } else {
        counts['Unassigned'] = (counts['Unassigned'] || 0) + 1;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredTasks, users]);

  const completionTrendData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const completedTasks = filteredTasks.filter(t => getTaskStatusInfo(t).isCompleted && t.dueDate && isSameDay(new Date(t.dueDate), date)).length;
      const createdTasks = filteredTasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), date)).length;
      data.push({
        date: format(date, 'MMM dd'),
        completed: completedTasks,
        created: createdTasks
      });
    }
    return data;
  }, [filteredTasks, projects, user]);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <TopBar title="Advanced Reports" onMenuClick={onMenuClick} />
      
      <div className="p-5 flex-1 overflow-y-auto no-scrollbar pb-24 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Workspace Overview</h2>
            <p className="text-slate-500 font-medium text-sm mt-1">Key metrics and performance indicators</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
              <Filter className="w-4 h-4 text-primary-600" />
            </div>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 outline-none cursor-pointer pr-8"
            >
              <option value="all">All Members</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status Distribution */}
          <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <PieChartIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Task Status Distribution</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tasks by Assignee */}
          <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Tasks by Assignee</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assigneeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Completion Trend */}
          <div className="bg-white p-6 rounded-3xl shadow-soft border border-slate-100 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-black text-slate-800">Completion Trend (Last 7 Days)</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={completionTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
