import React from 'react';
import { motion } from 'motion/react';
import { Layers } from 'lucide-react';

export function SplashView() {
  return (
    <div className="h-screen w-full bg-[#f8fafc] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-400/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center z-10"
      >
        <div className="w-28 h-28 bg-gradient-to-br from-primary-400 to-primary-600 rounded-[2rem] flex items-center justify-center shadow-glow mb-8">
          <span className="text-white font-black text-6xl">V</span>
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Vasy ERP</h1>
        <p className="text-slate-400 font-black tracking-widest text-xs uppercase">Task Manager</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-12 flex flex-col items-center"
      >
        <div className="w-8 h-8 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Loading workspace...</p>
      </motion.div>
    </div>
  );
}
