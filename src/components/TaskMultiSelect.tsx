import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { Task } from '../context/TaskContext';

interface TaskMultiSelectProps {
  tasks: Task[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  excludeTaskId?: string;
}

export default function TaskMultiSelect({ tasks, selectedIds, onChange, placeholder = "Select tasks...", excludeTaskId }: TaskMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableTasks = tasks.filter(t => t.id !== excludeTaskId);
  const filteredTasks = availableTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));
  
  const selectedTasks = availableTasks.filter(t => selectedIds.includes(t.id));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTask = (taskId: string) => {
    if (selectedIds.includes(taskId)) {
      onChange(selectedIds.filter(id => id !== taskId));
    } else {
      onChange([...selectedIds, taskId]);
    }
  };

  const removeTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    onChange(selectedIds.filter(id => id !== taskId));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="min-h-[52px] w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus-within:ring-4 focus-within:ring-primary-500/10 focus-within:border-primary-500 transition-all shadow-sm cursor-pointer flex items-center justify-between gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-wrap gap-2 flex-1">
          {selectedTasks.length === 0 ? (
            <span className="text-slate-400 font-medium py-1">{placeholder}</span>
          ) : (
            selectedTasks.map(task => (
              <span key={task.id} className="bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5">
                <span className="truncate max-w-[150px]">{task.title}</span>
                <button onClick={(e) => removeTask(e, task.id)} className="hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-full p-0.5 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-64 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl py-2 pl-9 pr-4 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-primary-500/20"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto p-2 flex flex-col gap-1">
            {filteredTasks.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500 font-medium">No tasks found</div>
            ) : (
              filteredTasks.map(task => {
                const isSelected = selectedIds.includes(task.id);
                return (
                  <div 
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <span className={`text-sm font-medium truncate flex-1 ${isSelected ? 'text-primary-700 dark:text-primary-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {task.title}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
