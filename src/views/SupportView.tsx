import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { MessageSquare, Mail, Phone, Send, AlertCircle, Image as ImageIcon, X } from 'lucide-react';

import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';

export default function SupportView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setSubject('');
    setMessage('');
    setAttachment(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors">
      <TopBar title="Support & Contact" icon="settings" onMenuClick={onMenuClick} />
      
      <div className="flex-1 overflow-y-auto pb-24 px-5 pt-6 space-y-8">
        <section className="space-y-4">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">How can we help?</h3>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Our team is here to help you with any issues or questions you might have about TaskOps Pro.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-soft flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Email Support</p>
              <p className="text-xs font-medium text-slate-400">support@taskopspro.com</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-soft flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">Live Chat</p>
              <p className="text-xs font-medium text-slate-400">Connect with an agent</p>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-soft space-y-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Report an Issue</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Subject</label>
              <input 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                placeholder="What's going on?"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Message</label>
              <textarea 
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all resize-none"
                placeholder="Describe the issue in detail..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Attachment (Optional)</label>
              {attachment ? (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <ImageIcon className="w-5 h-5 text-primary-500 shrink-0" />
                    <span className="text-sm font-bold text-slate-700 truncate">{attachment.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 w-full bg-slate-50 border border-dashed border-slate-300 rounded-2xl px-5 py-4 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:border-primary-300 hover:text-primary-600 transition-all cursor-pointer">
                  <ImageIcon className="w-5 h-5" />
                  <span>Attach an image</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>

            <button 
              type="submit"
              className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-base shadow-glow hover:bg-primary-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {submitted ? 'Message Sent!' : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Report
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
