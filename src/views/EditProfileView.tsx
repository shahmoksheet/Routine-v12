import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { ArrowLeft, Save, Camera, Lock, User, Mail } from 'lucide-react';

export default function EditProfileView() {
  const { user } = useAuth();
  const { setCurrentView } = useNavigation();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would call an API to update the user profile
    setIsSuccessModalOpen(true);
  };

  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false);
    setCurrentView('settings');
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors">
      <header className="sticky top-0 z-40 flex items-center bg-white/80 backdrop-blur-xl px-5 py-4 border-b border-slate-100 shadow-sm transition-colors">
        <button 
          onClick={() => setCurrentView('settings')}
          className="p-2.5 -ml-2 text-slate-500 hover:text-primary-600 transition-all rounded-2xl hover:bg-primary-50 active:scale-95"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-black text-slate-800 ml-2 tracking-tight">Edit Profile</h2>
      </header>
      
      <main className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
        <div className="flex flex-col items-center mb-10">
          <div className="relative group cursor-pointer">
            <div className="bg-primary-100 rounded-3xl h-32 w-32 flex items-center justify-center border-4 border-white shadow-soft overflow-hidden group-hover:scale-105 transition-transform duration-300">
              <img src={`https://ui-avatars.com/api/?name=${name || 'User'}&background=007BA7&color=fff&size=256`} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <button className="absolute -bottom-2 -right-2 p-3 bg-primary-600 text-white rounded-2xl shadow-glow hover:bg-primary-500 hover:scale-110 active:scale-95 transition-all">
              <Camera className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-8 max-w-md mx-auto">
          <div className="space-y-5 bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Personal Information</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
                  placeholder="Your email address"
                />
              </div>
            </div>
          </div>

          <div className="space-y-5 bg-white p-6 rounded-3xl shadow-soft border border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Change Password</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 ml-1">Current Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
                  placeholder="Enter current password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 ml-1">New Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all outline-none"
                  placeholder="Enter new password"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 active:scale-[0.98] text-white py-4 rounded-2xl font-black text-lg transition-all shadow-glow"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>
          </div>
        </form>
      </main>

      {isSuccessModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Save className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Profile Updated!</h3>
            <p className="text-sm text-slate-500 font-medium mb-6">
              Your profile changes have been saved successfully.
            </p>
            <button 
              onClick={handleCloseSuccessModal}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm shadow-primary-600/30"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
