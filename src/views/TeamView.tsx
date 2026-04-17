import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { Users, Shield, User as UserIcon, Mail, Phone, MoreVertical, UserPlus, X, Copy, Clock, Building2, CheckCircle2, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUsers, User, Invitation } from '../context/UserContext';
import { useDepartments } from '../context/DepartmentContext';
import { useRoles } from '../context/RolesContext';
import { useTasks } from '../context/TaskContext';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { useWorkspaces } from '../context/WorkspaceContext';
import { toast } from 'sonner';

export default function TeamView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspaces();
  const { users, invitations, isLoading, updateUser, addUser, deleteUser, restoreUser, deactivateUser, activateUser, createInvitation, deleteInvitation } = useUsers();
  const { tasks } = useTasks();
  const { departments } = useDepartments();

  const { roles, hasPermission } = useRoles();
  const [activeTab, setActiveTab] = useState<'active' | 'deactivated' | 'trash'>('active');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDepartments, setEditDepartments] = useState<string[]>([]);
  const [editManager, setEditManager] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState('Employee');
  const [inviteName, setInviteName] = useState('');
  const [inviteMode, setInviteMode] = useState<'link' | 'direct'>('link');
  const [sendViaEmail, setSendViaEmail] = useState(true);
  const [sendViaSms, setSendViaSms] = useState(false);
  const [sendViaWhatsapp, setSendViaWhatsapp] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  const canInvite = user ? hasPermission(user.role, 'manage_members', user.roleId) : false;
  const canDeleteMember = user ? hasPermission(user.role, 'manage_members', user.roleId) : false;
  const canUpdateMember = user ? hasPermission(user.role, 'manage_members', user.roleId) : false;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    if (!inviteEmail && !invitePhone) {
      toast.error('Please provide either an email address or a phone number.');
      return;
    }
    
    if (sendViaEmail && !inviteEmail) {
      toast.error('Please provide an email address to send via Email.');
      return;
    }
    
    if ((sendViaSms || sendViaWhatsapp) && !invitePhone) {
      toast.error('Please provide a phone number to send via SMS or WhatsApp.');
      return;
    }

    const selectedRole = roles.find(r => r.name === inviteRole);
    try {
      if (inviteMode === 'link') {
        const inv = await createInvitation({ 
          email: inviteEmail, 
          phone: invitePhone,
          role: inviteRole, 
          roleId: selectedRole?.id,
          workspaceId: activeWorkspace.id 
        });
        setGeneratedInvite(inv);
        
        const sentVia = [];
        if (sendViaEmail && inviteEmail) sentVia.push('Email');
        if (sendViaSms && invitePhone) sentVia.push('SMS');
        if (sendViaWhatsapp && invitePhone) sentVia.push('WhatsApp');
        
        if (sentVia.length > 0) {
          toast.success(`Invitation sent via ${sentVia.join(', ')}`);
        }
      } else {
        await addUser({
          email: inviteEmail,
          phone: invitePhone,
          name: inviteName,
          role: inviteRole,
          role_id: selectedRole?.id,
          workspace_id: activeWorkspace.id
        });
        
        const sentVia = [];
        if (sendViaEmail && inviteEmail) sentVia.push('Email');
        if (sendViaSms && invitePhone) sentVia.push('SMS');
        if (sendViaWhatsapp && invitePhone) sentVia.push('WhatsApp');
        
        if (sentVia.length > 0) {
          toast.success(`Welcome message sent via ${sentVia.join(', ')}`);
        }
        
        closeInviteModal();
      }
    } catch (err: any) {
      console.error('Failed to invite user', err);
      toast.error(err.message || 'Failed to invite user');
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    const selectedRole = roles.find(r => r.name === editRole);
    try {
      await updateUser(selectedMember.id, { 
        name: editName,
        phone: editPhone,
        role: editRole, 
        role_id: selectedRole?.id,
        department_id: editDepartment || undefined,
        department_ids: JSON.stringify(editDepartments),
        manager_id: editManager || undefined 
      });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update user', err);
    }
  };

  const handleDeleteMember = async (id: string) => {
    const memberTasks = tasks.filter(t => t.assignees && t.assignees.includes(id) && t.status !== 'Completed');
    if (memberTasks.length > 0) {
      toast.error(`Cannot remove member. They have ${memberTasks.length} active tasks. Please reassign them first.`);
      return;
    }

    setMemberToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return;
    try {
      await deleteUser(memberToDelete);
      setIsDeleteModalOpen(false);
      setMemberToDelete(null);
    } catch (err) {
      console.error('Failed to delete user', err);
    }
  };

  const handleRestoreMember = async (id: string) => {
    try {
      await restoreUser(id);
    } catch (err) {
      console.error('Failed to restore user', err);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      await deleteInvitation(id);
    } catch (err) {
      console.error('Failed to delete invitation', err);
    }
  };

  const openEditModal = (member: User) => {
    setSelectedMember(member);
    setEditName(member.name);
    setEditPhone(member.phone || '');
    setEditRole(member.role);
    setEditDepartment(member.department_id || '');
    try {
      setEditDepartments(member.department_ids ? JSON.parse(member.department_ids) : []);
    } catch (e) {
      setEditDepartments([]);
    }
    setEditManager(member.manager_id || '');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedMember(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
    setGeneratedInvite(null);
    setInviteEmail('');
    setInvitePhone('');
    setInviteName('');
    setInviteRole('Employee');
    setInviteMode('link');
    setSendViaEmail(true);
    setSendViaSms(false);
    setSendViaWhatsapp(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-[#f8fafc]">
        <TopBar title="Team Management" onMenuClick={onMenuClick} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  const allFilteredUsers = user?.role === 'Manager' && user.departmentId 
    ? users.filter(u => {
        const uDeptIds = u.department_ids ? JSON.parse(u.department_ids) : [];
        return u.department_id === user.departmentId || uDeptIds.includes(user.departmentId) || u.id === user.id;
      })
    : users;

  const activeMembers = allFilteredUsers.filter(u => !u.is_deleted && !u.is_deactivated);
  const deactivatedMembers = allFilteredUsers.filter(u => !u.is_deleted && u.is_deactivated);
  const deletedMembers = allFilteredUsers.filter(u => u.is_deleted);

  const currentMembers = activeTab === 'active' ? activeMembers : activeTab === 'deactivated' ? deactivatedMembers : deletedMembers;

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors relative">
      <TopBar title="Team Management" onMenuClick={onMenuClick} />
      
      <div className="p-5 space-y-6 pb-24 overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center">
          <div className="flex bg-slate-200/50 p-1 rounded-xl shadow-inner">
            <button 
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'active' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setActiveTab('deactivated')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'deactivated' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Deactivated
            </button>
            <button 
              onClick={() => setActiveTab('trash')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'trash' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Trash ({deletedMembers.length})
            </button>
          </div>
          {canInvite && activeTab === 'active' && (
            <button 
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-sm font-bold transition-colors border border-primary-100"
            >
              <UserPlus className="w-4 h-4" />
              Invite
            </button>
          )}
        </div>

        {/* Pending Invitations Section */}
        {canInvite && invitations.length > 0 && activeTab === 'active' && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pending Invitations</h3>
            {invitations.map((invite) => (
              <div key={invite.id} className="p-4 bg-white rounded-2xl shadow-sm border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                    <Clock className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{invite.email || invite.phone || 'Unknown'}</h4>
                    <p className="text-xs text-slate-500 font-medium">Invited as <span className="text-amber-600 font-bold">{invite.role}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-slate-400 mb-1">Invite Code</span>
                    <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <span className="font-mono font-bold text-slate-700 tracking-widest">{invite.code}</span>
                      <button onClick={() => copyToClipboard(invite.code)} className="text-slate-400 hover:text-primary-600">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteInvitation(invite.id)}
                    className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            {activeTab === 'active' ? 'Active Members' : activeTab === 'deactivated' ? 'Deactivated Members' : 'Deleted Members'}
          </h3>
          {currentMembers.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-400 font-medium">No members found in this section.</p>
            </div>
          ) : (
            currentMembers.map((member) => (
              <div key={member.id} className="group p-5 bg-white rounded-3xl shadow-soft border border-slate-100 flex items-center gap-5 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center border-4 border-white shadow-sm z-10 relative text-xl font-black text-slate-400">
                    {member.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center z-20 shadow-sm ${
                    member.role === 'Owner' || member.role === 'Admin' ? 'bg-purple-500' :
                    member.role === 'Manager' ? 'bg-primary-500' :
                    'bg-slate-400'
                  }`}>
                    {member.role === 'Owner' || member.role === 'Admin' ? <Shield className="w-3 h-3 text-white" /> : <UserIcon className="w-3 h-3 text-white" />}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 z-10">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-black text-lg text-slate-800 truncate group-hover:text-primary-600 transition-colors">{member.name}</h3>
                    {canInvite && member.id !== user?.id && (
                      <div className="flex items-center gap-1">
                        {activeTab === 'active' ? (
                          <>
                            <button 
                              onClick={() => openEditModal(member)}
                              className="text-slate-300 hover:text-primary-600 transition-colors p-1 rounded-lg hover:bg-primary-50"
                              title="Edit"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => deactivateUser(member.id)}
                              className="text-slate-300 hover:text-amber-500 transition-colors p-1 rounded-lg hover:bg-amber-50"
                              title="Deactivate"
                            >
                              <Shield className="w-5 h-5 opacity-50" />
                            </button>
                            <button 
                              onClick={() => handleDeleteMember(member.id)}
                              className="text-slate-300 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        ) : activeTab === 'deactivated' ? (
                          <button 
                            onClick={() => activateUser(member.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-amber-100 transition-colors border border-amber-100"
                          >
                            Activate
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleRestoreMember(member.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-colors border border-emerald-100"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <span className={`inline-block text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-wider mb-3 ${
                    member.role === 'Owner' || member.role === 'Admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                    member.role === 'Manager' ? 'bg-primary-50 text-primary-600 border border-primary-100' :
                    'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}>
                    {member.role}
                  </span>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                        <Mail className="w-3 h-3 text-slate-400" />
                      </div>
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                        <Phone className="w-3 h-3 text-slate-400" />
                      </div>
                      <span>{member.phone || 'No phone'}</span>
                    </div>
                    {member.department_id && (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                          <Building2 className="w-3 h-3 text-slate-400" />
                        </div>
                        <span>
                          {(() => {
                            const primaryDeptId = member.department_id;
                            const empDeptIds = member.department_ids ? JSON.parse(member.department_ids) : [];
                            const allDeptIds = Array.from(new Set([primaryDeptId, ...empDeptIds].filter(Boolean)));
                            const deptNames = allDeptIds.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ');
                            return deptNames || 'Unknown Department';
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Remove Member?</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Are you sure you want to remove this member? They will be moved to the trash and can be restored later.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteMember}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-sm shadow-rose-500/30"
              >
                Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Invite Team Member</h3>
              <button onClick={closeInviteModal} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!generatedInvite ? (
              <form onSubmit={handleInvite} className="space-y-6">
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                  <button 
                    type="button"
                    onClick={() => setInviteMode('link')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${inviteMode === 'link' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Invite Link
                  </button>
                  <button 
                    type="button"
                    onClick={() => setInviteMode('direct')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${inviteMode === 'direct' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Direct Add
                  </button>
                </div>

                <div className="space-y-4">
                  {inviteMode === 'direct' && (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                      <input 
                        value={inviteName}
                        onChange={e => setInviteName(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-3 text-sm font-bold text-slate-800 outline-none transition-all" 
                        placeholder="e.g. John Doe"
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 pl-11 pr-5 py-3 text-sm font-bold text-slate-800 outline-none transition-all" 
                        placeholder="name@company.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Phone Number (Optional)</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="tel"
                        value={invitePhone}
                        onChange={e => setInvitePhone(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 pl-11 pr-5 py-3 text-sm font-bold text-slate-800 outline-none transition-all" 
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Role</label>
                    <select 
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-3 text-sm font-bold text-slate-800 outline-none transition-all"
                    >
                      {roles.filter(r => r.name !== 'Owner').map(role => (
                        <option key={role.id} value={role.name}>{role.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Send Invitation Via</label>
                    <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input type="checkbox" checked={sendViaEmail} onChange={e => setSendViaEmail(e.target.checked)} className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-primary-500 checked:border-primary-500 transition-all cursor-pointer" />
                          <CheckCircle2 className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-primary-600 transition-colors">Email</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input type="checkbox" checked={sendViaSms} onChange={e => setSendViaSms(e.target.checked)} className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-primary-500 checked:border-primary-500 transition-all cursor-pointer" />
                          <CheckCircle2 className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-primary-600 transition-colors">SMS</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input type="checkbox" checked={sendViaWhatsapp} onChange={e => setSendViaWhatsapp(e.target.checked)} className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-primary-500 checked:border-primary-500 transition-all cursor-pointer" />
                          <CheckCircle2 className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 pointer-events-none" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-primary-600 transition-colors">WhatsApp</span>
                      </label>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-glow shadow-primary-500/30"
                >
                  {inviteMode === 'link' ? 'Generate Invite Link' : 'Add Member'}
                </button>
              </form>
            ) : (
              <div className="space-y-6 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-800 mb-2">Invitation Created!</h4>
                  <p className="text-sm text-slate-500 font-medium">Share this code with your team member to join the workspace.</p>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 relative group">
                  <span className="text-3xl font-black text-primary-600 tracking-[0.5em] font-mono">{generatedInvite.code}</span>
                  <button 
                    onClick={() => copyToClipboard(generatedInvite.code)}
                    className="absolute top-2 right-2 p-2 text-slate-400 hover:text-primary-600 transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>

                <button 
                  onClick={closeInviteModal}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black text-lg transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {isEditModalOpen && selectedMember && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Edit Member</h3>
              <button onClick={closeEditModal} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditMember} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-3 text-sm font-bold text-slate-800 outline-none transition-all" 
                    placeholder="Full Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
                  <input 
                    type="tel"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-3 text-sm font-bold text-slate-800 outline-none transition-all" 
                    placeholder="Phone Number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Role</label>
                  <select 
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-3 text-sm font-bold text-slate-800 outline-none transition-all"
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Primary Department</label>
                  <select 
                    value={editDepartment}
                    onChange={e => setEditDepartment(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-3 text-sm font-bold text-slate-800 outline-none transition-all"
                  >
                    <option value="">No Primary Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Additional Departments</label>
                  <div className="flex flex-wrap gap-2">
                    {departments.filter(d => d.id !== editDepartment).map(dept => (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => {
                          setEditDepartments(prev => 
                            prev.includes(dept.id) 
                              ? prev.filter(id => id !== dept.id)
                              : [...prev, dept.id]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-1.5 ${
                          editDepartments.includes(dept.id) 
                            ? 'bg-primary-50 border-primary-200 text-primary-700' 
                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        <Building2 className="w-3 h-3" />
                        {dept.name}
                      </button>
                    ))}
                    {departments.filter(d => d.id !== editDepartment).length === 0 && (
                      <p className="text-xs text-slate-400 italic">No additional departments available.</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Reporting Manager</label>
                  <select 
                    value={editManager}
                    onChange={e => setEditManager(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-3 text-sm font-bold text-slate-800 outline-none transition-all"
                  >
                    <option value="">No Manager</option>
                    {users.filter(u => u.id !== selectedMember.id && (u.role === 'Owner' || u.role === 'Admin' || u.role === 'Manager')).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-glow shadow-primary-500/30"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
