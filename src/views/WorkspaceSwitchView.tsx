import React, { useState } from 'react';
import { useNavigation } from '../context/NavigationContext';
import { ArrowLeft, Building, Check, Plus, Search, Building2, Store, X, Save, MoreVertical, Edit2, Trash2, AlertTriangle, Settings } from 'lucide-react';
import { useWorkspaces, Workspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { motion, AnimatePresence } from 'motion/react';

export default function WorkspaceSwitchView() {
  const { setCurrentView } = useNavigation();
  const { workspaces, activeWorkspace, setActiveWorkspace, addWorkspace, updateWorkspace, deleteWorkspace, deactivateWorkspace, activateWorkspace } = useWorkspaces();
  const { user, updateUser } = useAuth();
  const { hasPermission } = useRoles();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const canUpdateWorkspace = user ? hasPermission(user.role, 'update_workspace', user.roleId) : false;
  const canDeleteWorkspace = user ? hasPermission(user.role, 'delete_workspace', user.roleId) : false;
  const canCreateWorkspace = user ? hasPermission(user.role, 'manage_workspace', user.roleId) : false;

  const handleSwitch = async (id: string) => {
    if (openMenuId) return; // Don't switch if menu is open
    setActiveWorkspace(id);
    await updateUser({ workspaceId: id });
    setTimeout(() => {
      setCurrentView('dashboard');
    }, 400);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    
    const newId = await addWorkspace({ name: newWorkspaceName });
    setNewWorkspaceName('');
    setIsCreateModalOpen(false);
    
    if (newId) {
      await handleSwitch(newId);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace || !newWorkspaceName.trim()) return;
    
    await updateWorkspace(editingWorkspace.id, { name: newWorkspaceName });
    setNewWorkspaceName('');
    setEditingWorkspace(null);
    setIsEditModalOpen(false);
  };

  const handleDeleteWorkspace = async () => {
    if (!deletingWorkspace) return;
    
    const isDeletingActive = deletingWorkspace.id === activeWorkspace?.id;
    await deleteWorkspace(deletingWorkspace.id);
    
    if (isDeletingActive) {
      const remainingWorkspaces = workspaces.filter(w => w.id !== deletingWorkspace.id);
      if (remainingWorkspaces.length > 0) {
        await handleSwitch(remainingWorkspaces[0].id);
      } else {
        await updateUser({ workspaceId: null });
        setActiveWorkspace('');
      }
    }
    
    setDeletingWorkspace(null);
    setIsDeleteModalOpen(false);
  };

  const filteredWorkspaces = workspaces.filter(ws => {
    const matchesSearch = ws.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!showDeactivated && ws.is_deactivated) return false;
    if (showDeactivated && !ws.is_deactivated) return false;
    return matchesSearch;
  });

  const getWorkspaceIcon = (name: string) => {
    if (name.toLowerCase().includes('warehouse')) return Building2;
    if (name.toLowerCase().includes('store') || name.toLowerCase().includes('retail')) return Store;
    return Building;
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
        <h2 className="text-xl font-black text-slate-800 ml-2 tracking-tight">Switch Workspace</h2>
      </header>
      
      <div className="px-5 py-5 space-y-4">
        <div className="flex w-full items-center rounded-2xl bg-white h-12 px-4 gap-3 border border-slate-200 focus-within:border-primary-500 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all shadow-sm">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none" 
            placeholder="Search workspaces..." 
          />
        </div>

        <div className="flex bg-slate-200/50 p-1 rounded-xl shadow-inner w-fit">
          <button 
            onClick={() => setShowDeactivated(false)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${!showDeactivated ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Active
          </button>
          <button 
            onClick={() => setShowDeactivated(true)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${showDeactivated ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Deactivated
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-5 pb-32 no-scrollbar space-y-4">
        {filteredWorkspaces.map((ws) => {
          const isActive = activeWorkspace?.id === ws.id;
          const Icon = getWorkspaceIcon(ws.name);
          
          return (
            <div 
              key={ws.id}
              onClick={() => handleSwitch(ws.id)}
              className={`group relative flex items-center p-5 rounded-3xl border cursor-pointer transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-br from-white to-primary-50/50 border-primary-200 shadow-md scale-[1.02]' 
                  : 'bg-white border-slate-100 shadow-soft hover:shadow-md hover:border-primary-200 hover:-translate-y-1'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-500 rounded-l-3xl"></div>
              )}
              
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 mr-4 transition-all duration-300 ${
                isActive 
                  ? 'bg-primary-500 text-white shadow-glow scale-110' 
                  : 'bg-primary-50 text-primary-500 group-hover:scale-110 group-hover:bg-primary-100'
              }`}>
                <Icon className="w-7 h-7" />
              </div>
              
              <div className="flex-1 min-w-0 py-1">
                <h3 className={`font-black text-lg truncate transition-colors ${
                  isActive ? 'text-primary-900' : 'text-slate-800 group-hover:text-primary-700'
                }`}>
                  {ws.name}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200`}>
                    {user?.role || 'Member'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(canUpdateWorkspace || canDeleteWorkspace) && (
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === ws.id ? null : ws.id);
                      }}
                      className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {openMenuId === ws.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-20"
                          >
                            {canUpdateWorkspace && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setActiveWorkspace(ws.id);
                                  setCurrentView('workspace-settings');
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                <Settings className="w-4 h-4" /> Settings
                              </button>
                            )}
                            {canDeleteWorkspace && (
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setDeletingWorkspace(ws);
                                  setIsDeleteModalOpen(true);
                                  setOpenMenuId(null);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  isActive ? 'bg-primary-500 scale-100 opacity-100 shadow-glow' : 'bg-slate-100 scale-50 opacity-0'
                }`}>
                  <Check className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          );
        })}

        {canCreateWorkspace && (
          <div className="pt-6">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-5 border-2 border-dashed border-slate-200 rounded-3xl text-slate-500 font-black text-lg hover:bg-primary-50 hover:text-primary-600 hover:border-primary-300 active:scale-[0.98] transition-all"
            >
              <Plus className="w-6 h-6" />
              Create New Workspace
            </button>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-[2.5rem] w-full p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">New Workspace</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleCreateWorkspace} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Workspace Name</label>
                  <input 
                    autoFocus
                    value={newWorkspaceName}
                    onChange={e => setNewWorkspaceName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-4 text-base font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all" 
                    placeholder="e.g. New Branch" 
                    required
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-glow shadow-primary-500/30"
                >
                  <Save className="w-5 h-5" />
                  Create Workspace
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isEditModalOpen && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-[2.5rem] w-full p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Edit Workspace</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateWorkspace} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Workspace Name</label>
                  <input 
                    autoFocus
                    value={newWorkspaceName}
                    onChange={e => setNewWorkspaceName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-4 text-base font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all" 
                    placeholder="e.g. Main Branch" 
                    required
                  />
                </div>
                
                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-glow shadow-primary-500/30"
                >
                  <Save className="w-5 h-5" />
                  Update Workspace
                </button>
              </form>
            </motion.div>
          </div>
        )}

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
                  Are you sure you want to delete <span className="text-slate-800 font-bold">"{deletingWorkspace?.name}"</span>? This action cannot be undone and all data within this workspace will be lost.
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
