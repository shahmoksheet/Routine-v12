import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { useTasks, Task } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { CheckCircle2, XCircle, Clock, Image as ImageIcon, ShieldCheck, FileText, Video } from 'lucide-react';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { useMemo } from 'react';

import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';

export default function ApprovalsView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { tasks } = useTasks();
  const { user } = useAuth();
  const { hasPermission } = useRoles();

  const canApproveAnyTask = useMemo(() => user ? hasPermission(user.role, 'approve_tasks', user.roleId) : false, [user, hasPermission]);
  const isManager = user?.role.toLowerCase() === 'manager';

  const pendingTasks = tasks.filter(t => {
    if (t.status !== 'Pending Approval') return false;
    if (canApproveAnyTask) return true;
    
    // Contextual approval for managers
    if (isManager && user?.departmentId) {
      // Can approve if task is in their department
      return t.assignees?.includes(`dept_${user.departmentId}`) || t.createdBy === user.id;
    }

    return t.createdBy === user?.id;
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors">
      <TopBar title="Pending Approvals" onMenuClick={onMenuClick} />
      
      <div className="p-5 space-y-4 pb-24 overflow-y-auto no-scrollbar">
        {pendingTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed shadow-soft">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            </div>
            <p className="text-xl font-black text-slate-800 tracking-tight mb-2">All caught up!</p>
            <p className="text-sm font-medium text-slate-500">No tasks pending approval.</p>
          </div>
        ) : (
          pendingTasks.map((task) => (
            <div 
              key={task.id} 
              onClick={() => setSelectedTaskId(task.id)}
              className="group p-5 bg-white rounded-3xl shadow-soft border border-slate-100 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-black text-lg text-slate-800 leading-tight group-hover:text-amber-600 transition-colors pr-4">{task.title}</h3>
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    Review
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 mb-4">
                  <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{task.project}</span>
                  <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">{task.recurring && task.recurring !== 'None' ? task.recurring : task.dueDate || 'No date'}</span>
                </div>

                {task.proofType && task.proofType !== 'None' ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-primary-600 bg-primary-50 px-3 py-2 rounded-xl border border-primary-100 w-fit mt-3">
                    {task.proofType === 'Image' ? <ImageIcon className="w-4 h-4" /> : task.proofType === 'Video' ? <Video className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    {task.proofType} Proof Attached
                  </div>
                ) : task.requiresApproval ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 w-fit mt-3">
                    <ShieldCheck className="w-4 h-4" />
                    Approval Required
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTaskId && (
        <TaskDetailsModal taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} onOpenTask={setSelectedTaskId} />
      )}
    </div>
  );
}
