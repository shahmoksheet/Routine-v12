import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Layers, Mail, Lock, Phone, ArrowRight, CheckCircle2, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AuthView() {
  const [isLogin, setIsLogin] = useState(true);
  const [isInviteFlow, setIsInviteFlow] = useState(false);
  const [usePhone, setUsePhone] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const { login } = useAuth();
  
  console.log('AuthView: Rendering', { isLogin, isInviteFlow, usePhone, showOtp });

  const [formData, setFormData] = useState({
    name: '',
    email: 'bob@freshmart.demo',
    phone: '',
    password: 'password123',
    otp: '',
    inviteCode: ''
  });

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    console.log('AuthView: Submitting form', { isLogin, isInviteFlow, usePhone, showOtp });

    try {
      if (usePhone && isLogin && !showOtp) {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formData.phone })
        });
        const data = await res.json();
        if (data.success) {
          setShowOtp(true);
        } else {
          setError(data.message || 'Failed to send OTP');
        }
        setIsSubmitting(false);
        return;
      }

      if (showOtp) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formData.phone, otp: formData.otp, isOtp: true })
        });
        const data = await res.json();
        if (data.success) {
          login(data.user, data.token);
        } else {
          setError(data.message || 'Invalid OTP');
        }
        setIsSubmitting(false);
        return;
      }

      const endpoint = isInviteFlow ? '/api/auth/invite' : (isLogin ? '/api/auth/login' : '/api/auth/signup');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (data.success) {
        login(data.user, data.token);
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      console.error('AuthView: Submission error', err);
      setError('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[120%] h-96 bg-primary-500 rounded-b-[100%] blur-3xl opacity-10"></div>
      
      <div className="w-full max-w-md mx-auto z-10">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-[1.5rem] flex items-center justify-center shadow-glow">
            <span className="text-white font-black text-4xl">V</span>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-50 to-transparent rounded-bl-full opacity-50 pointer-events-none"></div>
          
          <h2 className="text-3xl font-black text-slate-800 mb-2 text-center tracking-tight relative z-10">
            {showOtp ? 'Verify OTP' : isInviteFlow ? 'Join Workspace' : isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-slate-400 font-bold text-xs text-center mb-8 uppercase tracking-widest relative z-10">
            {showOtp ? 'Enter the 6-digit code sent to you' : isInviteFlow ? 'Enter your details and invite code' : isLogin ? 'Sign in to manage your operations' : 'Join your workspace team'}
          </p>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm mb-6 flex items-center gap-3 font-medium border border-rose-100 relative z-10">
              <div className="w-1.5 h-1.5 bg-rose-600 rounded-full"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {showOtp ? (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">One-Time Password</label>
                <input
                  type="text"
                  name="otp"
                  value={formData.otp}
                  onChange={handleChange}
                  placeholder="123456"
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all text-center tracking-[0.5em] text-2xl font-black text-slate-800 bg-slate-50 focus:bg-white"
                  maxLength={6}
                  required
                />
              </div>
            ) : (
              <>
                {(!isLogin || isInviteFlow) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-medium text-slate-800 bg-slate-50 focus:bg-white"
                      required
                    />
                  </div>
                )}

                {isInviteFlow && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Invite Code</label>
                    <div className="relative">
                      <UserPlus className="w-5 h-5 text-slate-400 absolute left-5 top-4" />
                      <input
                        type="text"
                        name="inviteCode"
                        value={formData.inviteCode}
                        onChange={handleChange}
                        placeholder="e.g. 8492"
                        className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-medium text-slate-800 bg-slate-50 focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {usePhone && !isInviteFlow ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="w-5 h-5 text-slate-400 absolute left-5 top-4" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-medium text-slate-800 bg-slate-50 focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-slate-400 absolute left-5 top-4" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@company.com"
                        className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-medium text-slate-800 bg-slate-50 focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {(!usePhone || !isLogin || isInviteFlow) && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Password</label>
                    <div className="relative">
                      <Lock className="w-5 h-5 text-slate-400 absolute left-5 top-4" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className="w-full pl-14 pr-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-medium text-slate-800 bg-slate-50 focus:bg-white"
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-glow active:scale-[0.98] mt-2 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {showOtp ? 'Verify & Login' : isInviteFlow ? 'Join Workspace' : isLogin ? (usePhone ? 'Send OTP' : 'Sign In') : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {!showOtp && (
            <div className="mt-8 pt-6 border-t border-slate-100 relative z-10">
              <div className="flex flex-col gap-3 text-sm">
                {!isInviteFlow && (
                  <button
                    onClick={() => {
                      setIsInviteFlow(true);
                      setIsLogin(false);
                      setUsePhone(false);
                      setError('');
                      setFormData({...formData, email: '', password: ''});
                    }}
                    className="w-full py-3 bg-amber-50 text-amber-600 font-bold rounded-xl hover:bg-amber-100 transition-colors border border-amber-100 flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    I have an invite code
                  </button>
                )}
                
                <div className="flex items-center justify-between mt-2">
                  {!isInviteFlow && (
                    <button
                      onClick={() => {
                        setUsePhone(!usePhone);
                        setError('');
                      }}
                      className="text-primary-600 font-bold hover:text-primary-700 transition-colors"
                    >
                      Use {usePhone ? 'Email' : 'Phone'} instead
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setIsInviteFlow(false);
                      setIsLogin(!isLogin);
                      setUsePhone(false);
                      setError('');
                    }}
                    className="text-slate-500 font-bold hover:text-slate-700 transition-colors ml-auto"
                  >
                    {isInviteFlow ? 'Back to login' : isLogin ? 'Create account' : 'Back to login'}
                  </button>
                </div>
              </div>
              
              {isLogin && !usePhone && !isInviteFlow && (
                <div className="mt-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Quick Login (Demo)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFormData({...formData, email: 'moksheet77@gmail.com', password: 'password123'})} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl transition-colors">Owner</button>
                    <button type="button" onClick={() => setFormData({...formData, email: 'sarah@globaltech.demo', password: 'password123'})} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl transition-colors">Admin (Sarah)</button>
                    <button type="button" onClick={() => setFormData({...formData, email: 'david@globaltech.demo', password: 'password123'})} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl transition-colors">Manager (David)</button>
                    <button type="button" onClick={() => setFormData({...formData, email: 'elena@globaltech.demo', password: 'password123'})} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl transition-colors">Manager (Elena)</button>
                    <button type="button" onClick={() => setFormData({...formData, email: 'james@globaltech.demo', password: 'password123'})} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl transition-colors">Manager (James)</button>
                    <button type="button" onClick={() => setFormData({...formData, email: 'michael@globaltech.demo', password: 'password123'})} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl transition-colors">Manager (Michael)</button>
                    <button type="button" onClick={() => setFormData({...formData, email: 'linda@globaltech.demo', password: 'password123'})} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl transition-colors">Employee (Linda)</button>
                    <button type="button" onClick={() => setFormData({...formData, email: 'tom@globaltech.demo', password: 'password123'})} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl transition-colors">Employee (Tom)</button>
                    <button type="button" onClick={() => setFormData({...formData, email: 'robert@globaltech.demo', password: 'password123'})} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl transition-colors col-span-2">Employee (Robert)</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Features highlight for operational context */}
        <div className="mt-10 grid grid-cols-2 gap-4 text-center px-4">
          <div className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-emerald-100 transition-colors border border-emerald-100">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verified Execution</p>
          </div>
          <div className="flex flex-col items-center group">
            <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-primary-100 transition-colors border border-primary-100">
              <Layers className="w-6 h-6 text-primary-500" />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Automated SOPs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
