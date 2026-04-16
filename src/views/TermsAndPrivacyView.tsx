import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { Shield, FileText, Eye, Lock } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';

export default function TermsAndPrivacyView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>('privacy');

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors">
      <TopBar title="Terms & Privacy Policy" icon="settings" onMenuClick={onMenuClick} />
      
      <div className="flex-1 overflow-y-auto pb-24 px-6 pt-8 space-y-8">
        <div className="flex flex-col items-center text-center space-y-4 mb-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-600">
            {activeTab === 'privacy' ? <Shield className="w-8 h-8 text-emerald-600" /> : <FileText className="w-8 h-8 text-primary-600" />}
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {activeTab === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
          </h2>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Last Updated: March 2026</p>
        </div>

        <div className="flex bg-slate-200/50 p-1 rounded-2xl mb-8">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'privacy'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
              activeTab === 'terms'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Terms of Service
          </button>
        </div>

        {activeTab === 'privacy' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Information We Collect</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                We collect information you provide directly to us, such as when you create an account, update your profile, or use our task management features.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-emerald-500" />
                <h3 className="text-lg font-black text-slate-800 tracking-tight">How We Use Your Information</h3>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                We use the information we collect to provide, maintain, and improve our services, and to communicate with you about your account.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Data Security</h3>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
              </p>
            </section>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">1. Acceptance of Terms</h3>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                By accessing and using TaskOps Pro, you agree to be bound by these Terms of Service and all applicable laws and regulations.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">2. Use License</h3>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                Permission is granted to temporarily download one copy of the materials on TaskOps Pro's website for personal, non-commercial transitory viewing only.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">3. Disclaimer</h3>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                The materials on TaskOps Pro's website are provided on an 'as is' basis. TaskOps Pro makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">4. Limitations</h3>
              <p className="text-slate-600 text-sm leading-relaxed font-medium">
                In no event shall TaskOps Pro or its suppliers be liable for any damages arising out of the use or inability to use the materials on TaskOps Pro's website.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
