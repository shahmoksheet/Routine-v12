import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Send, ChevronDown } from 'lucide-react';
import { useTasks, Priority } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';

import { useDepartments } from '../context/DepartmentContext';

export default function ReportIssueModal({ onClose, initialTitle = '', initialDescription = '' }: { onClose: () => void, initialTitle?: string, initialDescription?: string }) {
  const { addTask } = useTasks();
  const { user } = useAuth();
  const { departments: allDepartments } = useDepartments();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [priority, setPriority] = useState<Priority>('High');
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (allDepartments) {
      setDepartments(allDepartments);
      if (allDepartments.length > 0 && !department) {
        setDepartment(allDepartments[0].id);
      }
    }
  }, [allDepartments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    
    let initialStatus = 'Todo';
    if (user?.kanbanColumns) {
      try {
        const cols = JSON.parse(user.kanbanColumns);
        if (cols.length > 0) initialStatus = cols[0].id;
      } catch (e) {}
    }

    addTask({
      title,
      project: 'Issues', // Default project for issues
      priority,
      status: initialStatus,
      dueDate: new Date().toISOString().split('T')[0],
      assignees: [`dept_${department}`],
      assignedToType: 'department',
      type: 'issue',
      tags: ['issue'],
      description,
      proofType: 'None',
      attachments: [],
      subtasks: []
    });

    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  if (isSubmitted) {
    return (
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-black text-slate-800 mb-2">Issue Raised!</h3>
          <p className="text-sm text-slate-500 font-medium mb-6">
            Thank you. Our team will look into it shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end transition-colors">
      <div className="bg-[#f8fafc] rounded-t-[2.5rem] w-full max-h-[92%] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 transition-colors">
        <div className="flex justify-center pt-4 pb-2 bg-white">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>
        
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Raise Issue (Ticket)</h2>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-95">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Issue Title</label>
              <input 
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 px-5 py-4 text-base font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all shadow-sm" 
                placeholder="Brief summary of the issue" 
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Target Department</label>
                <div className="relative">
                  <select 
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl py-3.5 pl-5 pr-10 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm"
                  >
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Priority</label>
                <div className="relative">
                  <select 
                    value={priority}
                    onChange={e => setPriority(e.target.value as Priority)}
                    className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl py-3.5 pl-5 pr-10 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Description</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-sm bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 px-5 py-4 resize-none text-slate-700 placeholder:text-slate-300 outline-none transition-all shadow-sm font-medium h-32" 
                placeholder="Please provide details to help us understand the request..." 
                required
              ></textarea>
            </div>

            <div className="pt-4 pb-8">
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white py-4 rounded-2xl font-black text-lg transition-all shadow-glow shadow-rose-500/30"
              >
                <Send className="w-5 h-5" />
                Raise Issue
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
