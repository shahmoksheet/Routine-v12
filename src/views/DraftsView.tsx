import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import TopBar from '../components/TopBar';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { FileText, Check, X, Clock, Calendar, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface DraftTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  due_date: string | null;
  created_at: string;
}

export default function DraftsView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<DraftTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch('/api/drafts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDrafts(data);
      }
    } catch (error) {
      console.error('Failed to fetch drafts', error);
      toast.error('Failed to load drafts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch(`/api/drafts/${id}/confirm`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Draft confirmed and task created');
        setDrafts(drafts.filter(d => d.id !== id));
      } else {
        toast.error('Failed to confirm draft');
      }
    } catch (error) {
      toast.error('Failed to confirm draft');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const token = localStorage.getItem('taskops_token');
      const res = await fetch(`/api/drafts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Draft cancelled');
        setDrafts(drafts.filter(d => d.id !== id));
      } else {
        toast.error('Failed to cancel draft');
      }
    } catch (error) {
      toast.error('Failed to cancel draft');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <TopBar title="My Drafts" onMenuClick={onMenuClick} />
      
      <main className="flex-1 overflow-y-auto p-5 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Omni-Channel Drafts</h1>
          <p className="text-sm text-slate-500 font-medium">Review and confirm tasks created via WhatsApp or other integrations.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : drafts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-soft mt-8">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">No drafts found</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              You don't have any pending drafts. Tasks created via integrations will appear here for your review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map(draft => (
              <div key={draft.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-slate-800 text-lg">{draft.title}</h3>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                    draft.priority === 'High' ? 'bg-rose-100 text-rose-700' :
                    draft.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {draft.priority}
                  </span>
                </div>
                
                {draft.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{draft.description}</p>
                )}
                
                <div className="flex flex-wrap gap-3 mb-5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                    <Clock className="w-3.5 h-3.5" />
                    {format(parseISO(draft.created_at), 'MMM d, h:mm a')}
                  </div>
                  {draft.due_date && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-primary-600 bg-primary-50 px-2.5 py-1.5 rounded-lg">
                      <Calendar className="w-3.5 h-3.5" />
                      Due: {format(parseISO(draft.due_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleCancel(draft.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Discard
                  </button>
                  <button
                    onClick={() => handleConfirm(draft.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm shadow-primary-200"
                  >
                    <Check className="w-4 h-4" />
                    Confirm Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
