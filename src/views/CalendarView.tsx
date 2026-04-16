import React, { useState, useMemo, useEffect } from 'react';
import TopBar from '../components/TopBar';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  eachDayOfInterval,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Folder, MoreVertical, Calendar as CalendarIcon, Tag } from 'lucide-react';

import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';

export default function CalendarView() {
  const { onMenuClick, onTaskClick } = useOutletContext<LayoutContextType>();
  const { tasks } = useTasks();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [users, setUsers] = useState<{id: string, name: string, departmentId?: string}[]>([]);

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
        }
      })
      .catch(err => console.error('Failed to fetch users', err));
  }, [user]);

  const isEmployee = user?.role === 'Employee';
  const isManager = user?.role === 'Manager';

  // Filter tasks based on role
  const relevantTasks = useMemo(() => {
    if (isEmployee) {
      return tasks.filter(t => {
        const isDirectlyAssigned = t.assignees?.includes(user?.id || '');
        const isDepartmentAssigned = user?.departmentId && t.assignees?.includes(`dept_${user.departmentId}`);
        return isDirectlyAssigned || isDepartmentAssigned;
      });
    } else if (isManager) {
      return tasks.filter(t => {
        const isDirectlyAssigned = t.assignees?.includes(user?.id || '');
        const isDepartmentAssigned = user?.departmentId && t.assignees?.includes(`dept_${user.departmentId}`);
        const isAssignedToDeptUser = t.assignees?.some(assigneeId => users.some(u => u.id === assigneeId && u.departmentId === user.departmentId));
        return isDirectlyAssigned || isDepartmentAssigned || isAssignedToDeptUser;
      });
    }
    return tasks;
  }, [tasks, user, isEmployee, isManager, users]);

  const [viewMode, setViewMode] = useState<'Month' | 'Week'>('Month');

  const nextPeriod = () => {
    if (viewMode === 'Month') {
      setCurrentMonth(addMonths(currentMonth, 1));
    } else {
      setSelectedDate(d => {
        const next = new Date(d);
        next.setDate(d.getDate() + 7);
        return next;
      });
    }
  };
  
  const prevPeriod = () => {
    if (viewMode === 'Month') {
      setCurrentMonth(subMonths(currentMonth, 1));
    } else {
      setSelectedDate(d => {
        const prev = new Date(d);
        prev.setDate(d.getDate() - 7);
        return prev;
      });
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  
  const startDate = viewMode === 'Month' ? startOfWeek(monthStart) : startOfWeek(selectedDate);
  const endDate = viewMode === 'Month' ? endOfWeek(monthEnd) : endOfWeek(selectedDate);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const onDateClick = (day: Date) => setSelectedDate(day);

  const isTaskOnDay = (task: any, day: Date) => {
    const taskDateStr = task.dueDate;
    if (!taskDateStr && !task.recurring) return false;
    
    try {
      let taskDate: Date;
      if (!taskDateStr) {
        taskDate = new Date(); // Default to today if recurring but no date
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

  // Filter tasks for the selected date
  const selectedDateTasks = relevantTasks.filter(task => isTaskOnDay(task, selectedDate));

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors">
      <TopBar title="Calendar" icon="event" onMenuClick={onMenuClick} />
      
      <div className="px-5 py-4">
        <div className="flex items-center justify-center bg-slate-200/50 rounded-2xl p-1.5 shadow-inner">
          <button 
            onClick={() => setViewMode('Month')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${viewMode === 'Month' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Month
          </button>
          <button 
            onClick={() => setViewMode('Week')}
            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${viewMode === 'Week' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Week
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        <section className="p-5 bg-white mx-5 mt-2 rounded-3xl border border-slate-100 shadow-soft transition-colors">
          <div className="flex items-center justify-between mb-6">
            <button onClick={prevPeriod} className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {viewMode === 'Month' ? format(currentMonth, 'MMMM yyyy') : `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`}
            </h2>
            <button onClick={nextPeriod} className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={`${d}-${i}`} className="text-[10px] font-black uppercase tracking-widest text-slate-400 py-2">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((day, i) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              
              // Check if day has tasks
              const hasTasks = relevantTasks.some(t => isTaskOnDay(t, day));

              return (
                <button
                  key={day.toString()}
                  onClick={() => onDateClick(day)}
                  className={`h-12 flex flex-col items-center justify-center rounded-2xl text-sm transition-all relative ${
                    isSelected 
                      ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white font-black shadow-md shadow-primary-500/30 scale-105 z-10' 
                      : isToday
                        ? 'bg-primary-50 text-primary-600 font-black border-2 border-primary-100'
                        : isCurrentMonth 
                          ? 'text-slate-700 font-bold hover:bg-slate-50' 
                          : 'text-slate-300 font-medium'
                  }`}
                >
                  {format(day, 'd')}
                  {hasTasks && (
                    <div className="absolute bottom-1.5 flex gap-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]' : 'bg-primary-400'}`}></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8 px-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Tasks for {format(selectedDate, 'MMM d')}</h3>
            <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-primary-100">
              {selectedDateTasks.length} Tasks
            </span>
          </div>
          
          <div className="space-y-4">
            {selectedDateTasks.length > 0 ? (
              selectedDateTasks.map(task => (
                <div key={task.id} onClick={() => onTaskClick?.(task.id)} className="bg-white border-l-4 border-primary-500 rounded-3xl p-5 shadow-soft border-y border-r border-slate-100 transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          task.priority === 'High' ? 'bg-rose-100 text-rose-700' :
                          task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                          task.priority === 'Low' ? 'bg-primary-100 text-primary-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {task.priority}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md truncate">
                          {task.project}
                        </span>
                      </div>
                      <h4 className="font-black text-lg text-slate-800 leading-tight mb-3 group-hover:text-primary-600 transition-colors">{task.title}</h4>
                      
                      <div className="flex flex-wrap items-center gap-2 text-slate-500 text-xs font-bold">
                        <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{task.recurring && task.recurring !== 'None' ? task.recurring : task.dueDate || 'No date'}</span>
                        </span>
                        {(task.tags || []).slice(0, 2).map(tag => (
                          <span key={tag} className="flex items-center gap-1 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100 text-primary-600">
                            <Tag className="w-3 h-3" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="text-slate-300 hover:text-primary-600 hover:bg-primary-50 transition-colors p-2 rounded-xl flex-shrink-0">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl border border-slate-100 border-dashed shadow-soft transition-colors">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <CalendarIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-800 font-bold text-lg">Free Day!</p>
                <p className="text-slate-400 font-medium text-sm mt-1">No tasks scheduled for this day.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
