import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { Building2, Plus, Shield, MoreVertical, X, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { motion, AnimatePresence } from 'motion/react';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { useDepartments, Department } from '../context/DepartmentContext';
import { useUsers } from '../context/UserContext';
import { useProjects } from '../context/ProjectContext';
import { toast } from 'sonner';

export default function DepartmentsView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { user } = useAuth();
  const { hasPermission } = useRoles();
  const { departments, isLoading, addDepartment, updateDepartment, deleteDepartment } = useDepartments();
  const { users } = useUsers();
  const { projects } = useProjects();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptManager, setNewDeptManager] = useState('');

  const canCreateDepartment = user ? hasPermission(user.role, 'manage_departments', user.roleId) : false;
  const canManageDepartments = user ? hasPermission(user.role, 'manage_departments', user.roleId) : false;

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDepartment({ name: newDeptName, manager_id: newDeptManager || undefined });
      setIsCreateModalOpen(false);
      setNewDeptName('');
      setNewDeptManager('');
    } catch (err) {
      console.error('Failed to create department', err);
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    try {
      await updateDepartment(editingDept.id, { name: newDeptName, manager_id: newDeptManager || undefined });
      setIsEditModalOpen(false);
      setEditingDept(null);
      setNewDeptName('');
      setNewDeptManager('');
    } catch (err) {
      console.error('Failed to update department', err);
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    const deptUsers = users.filter(u => u.department_id === id);
    const deptProjects = projects.filter(p => p.departmentId === id || p.departmentIds?.includes(id));
    
    if (deptUsers.length > 0 || deptProjects.length > 0) {
      toast.error(`Cannot delete department. It has ${deptUsers.length} members and ${deptProjects.length} projects. Please reassign them first.`);
      return;
    }

    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await deleteDepartment(id);
      toast.success('Department deleted successfully');
    } catch (err) {
      console.error('Failed to delete department', err);
      toast.error('Failed to delete department');
    }
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setNewDeptName(dept.name);
    setNewDeptManager(dept.manager_id || '');
    setIsEditModalOpen(true);
  };

  const getManagerName = (managerId?: string) => {
    if (!managerId) return 'No Manager Assigned';
    const manager = users.find(u => u.id === managerId);
    return manager ? manager.name : 'No Manager Assigned';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-[#f8fafc]">
        <TopBar title="Departments" onMenuClick={onMenuClick} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  const filteredDepts = user?.role === 'Manager' && user.departmentId 
    ? departments.filter(d => d.id === user.departmentId)
    : departments;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors relative">
      <TopBar title="Departments" onMenuClick={onMenuClick} />
      
      <div className="p-5 space-y-6 pb-24 overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">All Departments</h2>
          {canCreateDepartment && (
            <button 
              onClick={() => {
                setNewDeptName('');
                setNewDeptManager('');
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-sm font-bold transition-colors border border-primary-100"
            >
              <Plus className="w-4 h-4" />
              New Department
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDepts.map((dept) => (
            <div key={dept.id} className="bg-white p-5 rounded-3xl shadow-soft border border-slate-100 hover:shadow-md transition-all relative">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                  <Building2 className="w-6 h-6 text-indigo-500" />
                </div>
                {canManageDepartments && (
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === dept.id ? null : dept.id);
                      }}
                      className="text-slate-300 hover:text-primary-600 transition-colors p-1 rounded-lg hover:bg-primary-50"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {openMenuId === dept.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}></div>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-20"
                          >
                            <button 
                              onClick={(e) => { e.stopPropagation(); openEditModal(dept); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" /> Edit
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteDepartment(dept.id); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
              <h3 className="font-black text-lg text-slate-800 mb-1">{dept.name}</h3>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <Shield className="w-4 h-4 text-slate-400" />
                Manager: <span className="text-slate-700 font-bold">{getManagerName(dept.manager_id)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {(isCreateModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setEditingDept(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-800">
                  {isEditModalOpen ? 'Edit Department' : 'Create Department'}
                </h2>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingDept(null);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={isEditModalOpen ? handleUpdateDepartment : handleCreateDepartment} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Department Name</label>
                  <input
                    type="text"
                    required
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all font-medium text-slate-700"
                    placeholder="e.g. Engineering"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Assign Manager</label>
                  <select
                    value={newDeptManager}
                    onChange={(e) => setNewDeptManager(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all font-medium text-slate-700"
                  >
                    <option value="">No Manager</option>
                    {users.filter(u => ['Owner', 'Admin', 'Manager'].includes(u.role)).map(user => (
                      <option key={user.id} value={user.id}>{user.name} ({user.role})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-sm shadow-primary-500/20 transition-all active:scale-[0.98]"
                  >
                    {isEditModalOpen ? 'Update Department' : 'Create Department'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
