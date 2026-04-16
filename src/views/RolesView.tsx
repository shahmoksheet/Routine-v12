import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { Shield, Check, X, ShieldAlert, ShieldCheck, UserCheck, Edit2, Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useRoles, ALL_PERMISSIONS, Role } from '../context/RolesContext';
import { useAuth } from '../context/AuthContext';
import { useWorkspaces } from '../context/WorkspaceContext';
import { useUsers } from '../context/UserContext';
import { toast } from 'sonner';

export default function RolesView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { roles, updateRole, addRole, deleteRole, isLoading } = useRoles();
  const { users } = useUsers();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspaces();
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [isAddingRole, setIsAddingRole] = useState(false);

  const categories = Array.from(new Set(ALL_PERMISSIONS.map(p => p.category)));
  const [newRole, setNewRole] = useState<Omit<Role, 'id'>>({
    name: '',
    description: '',
    permissions: [],
    color: 'bg-slate-100 text-slate-600 border-slate-200'
  });

  const isOwner = user?.role.toLowerCase() === 'owner';

  const handleTogglePermission = (role: Role, permissionId: string) => {
    if (role.id === 'owner') return; // Owner permissions are locked
    
    const newPermissions = role.permissions.includes(permissionId)
      ? role.permissions.filter(id => id !== permissionId)
      : [...role.permissions, permissionId];
    
    updateRole(role.id, { permissions: newPermissions });
  };

  const handleSaveRole = async () => {
    if (editingRole) {
      try {
        await updateRole(editingRole.id, editingRole);
        setEditingRole(null);
        toast.success('Role updated successfully');
      } catch (err) {
        toast.error('Failed to update role');
      }
    }
  };

  const handleAddRole = async () => {
    if (!newRole.name) {
      toast.error('Role name is required');
      return;
    }
    try {
      await addRole(newRole);
      setIsAddingRole(false);
      setNewRole({
        name: '',
        description: '',
        permissions: [],
        color: 'bg-slate-100 text-slate-600 border-slate-200'
      });
      toast.success('New role created');
    } catch (err) {
      toast.error('Failed to create role');
    }
  };

  const handleDeleteRole = async (id: string) => {
    const roleUsers = users.filter(u => u.role_id === id);
    if (roleUsers.length > 0) {
      toast.error(`Cannot delete role. It is assigned to ${roleUsers.length} members. Please reassign them first.`);
      return;
    }

    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await deleteRole(id);
        toast.success('Role deleted');
      } catch (err) {
        toast.error('Failed to delete role');
      }
    }
  };

  if (activeWorkspace?.org_type === 'solo') {
    return (
      <div className="flex flex-col h-full bg-[#f8fafc]">
        <TopBar title="Roles & Permissions" onMenuClick={onMenuClick} />
        <div className="p-5 flex-1 flex flex-col items-center justify-center text-center">
          <Shield className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-black text-slate-800 mb-2">Role Management Disabled</h2>
          <p className="text-slate-500 max-w-md">You are using the Solo template. Role management is not needed for single-user workspaces.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <TopBar title="Roles & Permissions" onMenuClick={onMenuClick} />
      
      <div className="p-5 flex-1 overflow-y-auto no-scrollbar pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800">Workspace Roles</h2>
                  <p className="text-sm text-slate-500 font-medium">Define what members can see and do in this workspace</p>
                </div>
              </div>
              {isOwner && (
                <button 
                  onClick={() => setIsAddingRole(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-primary-500/20"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Role
                </button>
              )}
            </div>

            <div className="grid gap-4">
              {roles.map((role) => (
                <div key={role.id} className="bg-white p-5 rounded-2xl shadow-soft border border-slate-100 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${role.color}`}>
                          {role.name}
                        </div>
                        {role.isSystem && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            System
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        {editingRole?.id === role.id ? (
                          <div className="space-y-2">
                            <input 
                              type="text" 
                              value={editingRole.name}
                              onChange={e => setEditingRole({...editingRole, name: e.target.value})}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                            <textarea 
                              value={editingRole.description}
                              onChange={e => setEditingRole({...editingRole, description: e.target.value})}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                              rows={2}
                            />
                          </div>
                        ) : (
                          <>
                            <h3 className="font-bold text-slate-800">{role.name}</h3>
                            <p className="text-sm text-slate-500 font-medium">{role.description}</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-wrap gap-2 justify-end max-w-xs">
                        {role.id === 'owner' ? (
                          <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-md">Full Access</span>
                        ) : (
                          role.permissions.slice(0, 3).map(p => (
                            <span key={p} className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                              {p.replace('_', ' ')}
                            </span>
                          ))
                        )}
                        {role.id !== 'owner' && role.permissions.length > 3 && (
                          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">+{role.permissions.length - 3} more</span>
                        )}
                      </div>
                      
                      {isOwner && (
                        <div className="flex items-center gap-1 border-l border-slate-100 pl-3">
                          {editingRole?.id === role.id ? (
                            <button onClick={handleSaveRole} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                              <Save className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => setEditingRole(role)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {!role.isSystem && (
                            <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                      <button 
                        onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors ml-2"
                      >
                        {expandedRole === role.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  {expandedRole === role.id && (
                    <div className="mt-4 pt-4 border-t border-slate-100 w-full animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map(category => {
                          const categoryPermissions = ALL_PERMISSIONS.filter(p => p.category === category);
                          return (
                            <div key={category} className="space-y-3">
                              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">{category}</h4>
                              <div className="space-y-2">
                                {categoryPermissions.map(permission => (
                                  <div key={permission.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                    <button
                                      disabled={!isOwner || role.id === 'owner'}
                                      onClick={() => handleTogglePermission(role, permission.id)}
                                      className={`mt-0.5 shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-md transition-all ${
                                        role.permissions.includes(permission.id) || role.id === 'owner'
                                          ? 'bg-primary-500 text-white'
                                          : 'bg-slate-200 text-transparent'
                                      } ${isOwner && role.id !== 'owner' ? 'cursor-pointer hover:ring-2 hover:ring-primary-500/30' : 'cursor-default opacity-70'}`}
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <div>
                                      <p className="text-sm font-bold text-slate-700 leading-none mb-1">{permission.name}</p>
                                      <p className="text-xs font-medium text-slate-500 leading-tight">{permission.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
        </div>
        )}
      </div>

      {isAddingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800">Create Custom Role</h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Role Name</label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g. Project Coordinator"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                <textarea
                  value={newRole.description}
                  onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="What can this role do?"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsAddingRole(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRole}
                  className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm shadow-primary-500/20 transition-all"
                >
                  Create Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

