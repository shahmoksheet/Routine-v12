import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ArrowLeft, Building, Save, Shield, Trash2, AlertTriangle, ArrowRightLeft, Settings } from 'lucide-react';
import { useWorkspaces } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function WorkspaceSettingsView() {
  const { setCurrentView } = useNavigation();
  const { activeWorkspace, updateWorkspace, deleteWorkspace, deactivateWorkspace, activateWorkspace } = useWorkspaces();
  const { user } = useAuth();
  const [workspaceName, setWorkspaceName] = useState(activeWorkspace?.name || '');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !workspaceName.trim() || isSaving) return;
    
    setIsSaving(true);
    try {
      await updateWorkspace(activeWorkspace.id, { name: workspaceName });
      toast.success('Workspace name updated');
    } catch (error) {
      toast.error('Failed to update workspace name');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    try {
      await deleteWorkspace(activeWorkspace.id);
      setCurrentView('workspace-switch');
    } catch (error) {
      toast.error('Failed to delete workspace');
    }
  };

  const handleToggleDeactivation = async () => {
    if (!activeWorkspace) return;
    try {
      if (activeWorkspace.is_deactivated) {
        await activateWorkspace(activeWorkspace.id);
        toast.success('Workspace activated');
      } else {
        await deactivateWorkspace(activeWorkspace.id);
        toast.success('Workspace deactivated');
      }
      setIsDeactivateModalOpen(false);
    } catch (error) {
      toast.error('Failed to update workspace status');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors relative">
      <header className="sticky top-0 z-40 flex items-center bg-white/80 backdrop-blur-xl px-5 py-4 border-b border-slate-100 shadow-sm transition-colors">
        <button 
          onClick={() => setCurrentView('settings')}
          className="p-2.5 -ml-2 text-slate-500 hover:text-primary-600 transition-all rounded-2xl hover:bg-primary-50 active:scale-95"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-black text-slate-800 ml-2 tracking-tight">Workspace Settings</h2>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-8 no-scrollbar">
        {/* Workspace Profile */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Building className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Workspace Profile</h3>
          </div>
          
          <form onSubmit={handleUpdateName} className="bg-white p-6 rounded-[2rem] shadow-soft border border-slate-100 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Workspace Name</label>
              <input 
                value={workspaceName}
                onChange={e => setWorkspaceName(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-4 text-base font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all" 
                placeholder="Workspace Name" 
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={isSaving || workspaceName === activeWorkspace?.name}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-200 disabled:text-slate-400 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-glow shadow-primary-500/30"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* Ownership Transfer */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Ownership</h3>
          </div>
          
          <button 
            onClick={() => setCurrentView('ownership-transfer')}
            className="w-full flex items-center justify-between p-6 bg-white rounded-[2rem] shadow-soft border border-slate-100 hover:border-indigo-200 transition-all group"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-slate-800">Transfer Ownership</h4>
                <p className="text-xs text-slate-500 font-medium">Hand over workspace to another member</p>
              </div>
            </div>
          </button>
        </section>

        {/* Danger Zone */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Danger Zone</h3>
          </div>
          
          <div className="bg-white rounded-[2rem] shadow-soft border border-rose-100 overflow-hidden">
            <button 
              onClick={() => setIsDeactivateModalOpen(true)}
              className="w-full flex items-center justify-between p-6 hover:bg-amber-50/30 transition-all border-b border-slate-50 group"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800">{activeWorkspace?.is_deactivated ? 'Reactivate Workspace' : 'Deactivate Workspace'}</h4>
                  <p className="text-xs text-slate-500 font-medium">Temporarily hide this workspace and its data</p>
                </div>
              </div>
            </button>

            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full flex items-center justify-between p-6 hover:bg-rose-50/30 transition-all group"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-rose-600">Delete Workspace</h4>
                  <p className="text-xs text-slate-500 font-medium">Permanently remove all workspace data</p>
                </div>
              </div>
            </button>
          </div>
        </section>
      </main>

      {/* Deactivate Modal */}
      <AnimatePresence>
        {isDeactivateModalOpen && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">
                  {activeWorkspace?.is_deactivated ? 'Reactivate Workspace?' : 'Deactivate Workspace?'}
                </h3>
                <p className="text-sm text-slate-500 font-medium">
                  {activeWorkspace?.is_deactivated 
                    ? 'This will make the workspace and its data visible again to all members.' 
                    : 'This will hide the workspace and its data from all members. You can reactivate it at any time.'}
                </p>
              </div>
              <div className="flex border-t border-slate-100">
                <button 
                  onClick={() => setIsDeactivateModalOpen(false)}
                  className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <div className="w-px bg-slate-100"></div>
                <button 
                  onClick={handleToggleDeactivation}
                  className={`flex-1 py-4 text-sm font-black transition-colors ${activeWorkspace?.is_deactivated ? 'text-primary-600 hover:bg-primary-50' : 'text-amber-600 hover:bg-amber-50'}`}
                >
                  {activeWorkspace?.is_deactivated ? 'Reactivate' : 'Deactivate'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Delete Modal */}
        {isDeleteModalOpen && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Delete Workspace?</h3>
                <p className="text-sm text-slate-500 font-medium">
                  Are you sure you want to delete <span className="text-slate-800 font-bold">"{activeWorkspace?.name}"</span>? This action cannot be undone and all data within this workspace will be lost.
                </p>
              </div>
              <div className="flex border-t border-slate-100">
                <button 
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <div className="w-px bg-slate-100"></div>
                <button 
                  onClick={handleDeleteWorkspace}
                  className="flex-1 py-4 text-sm font-black text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
