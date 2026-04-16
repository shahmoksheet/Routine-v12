import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { useUsers } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { ArrowRightLeft, Search, User, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OwnershipTransferView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { users } = useUsers();
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const filteredUsers = users.filter(u => 
    u.id !== currentUser?.id && 
    (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  const handleTransfer = () => {
    if (!selectedUserId) return;
    
    // In a real app, this would call an API
    toast.success(`Ownership transfer initiated to ${selectedUser?.name}. They will receive an email to confirm.`);
    setIsConfirming(false);
    setSelectedUserId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <TopBar title="Ownership Transfer" onMenuClick={onMenuClick} />
      
      <div className="p-5 flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex gap-4">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h3 className="font-bold text-amber-900">Critical Action</h3>
              <p className="text-sm text-amber-700 font-medium leading-relaxed">
                Transferring ownership will grant another user full control over this workspace, including billing and member management. You will be demoted to an Admin role.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-800 mb-4">Select New Owner</h2>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-medium">
                  No eligible users found.
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div 
                    key={user.id} 
                    onClick={() => setSelectedUserId(user.id)}
                    className={`p-4 flex items-center gap-4 cursor-pointer transition-colors ${selectedUserId === user.id ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">{user.name}</div>
                      <div className="text-xs text-slate-500 font-medium">{user.email}</div>
                    </div>
                    {selectedUserId === user.id && (
                      <CheckCircle2 className="w-6 h-6 text-primary-600" />
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedUserId && (
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <div className="flex items-center gap-4 mb-6 p-4 bg-white rounded-2xl border border-slate-200">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-black text-lg">
                    {selectedUser?.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">New Owner Designate</div>
                    <div className="font-black text-slate-800">{selectedUser?.name}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setIsConfirming(true)}
                  className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                >
                  Transfer Ownership
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-rose-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Are you absolutely sure?</h2>
              <p className="text-slate-500 font-medium leading-relaxed">
                This will transfer ownership of the workspace to <span className="text-slate-800 font-bold">{selectedUser?.name}</span>. This action cannot be undone by you.
              </p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setIsConfirming(false)}
                className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-100 rounded-2xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleTransfer}
                className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black shadow-lg shadow-rose-500/20 transition-all"
              >
                Confirm Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
