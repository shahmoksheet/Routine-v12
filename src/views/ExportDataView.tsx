import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { Download, FileJson, FileSpreadsheet, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportDataView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = (format: string) => {
    setIsExporting(true);
    setExportComplete(false);
    
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
      toast.success(`Data exported successfully in ${format} format.`);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <TopBar title="Export Data" onMenuClick={onMenuClick} />
      
      <div className="p-5 flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
            <div className="p-8 text-center border-b border-slate-100 bg-slate-50/50">
              <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Download className="w-10 h-10 text-primary-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">Download Your Data</h2>
              <p className="text-slate-500 font-medium max-w-sm mx-auto">
                Export all your workspace data including tasks, projects, and member information.
              </p>
            </div>

            <div className="p-8 space-y-4">
              <div 
                onClick={() => !isExporting && handleExport('JSON')}
                className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-primary-500 hover:bg-primary-50/30 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <FileJson className="w-6 h-6 text-slate-500 group-hover:text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">JSON Format</h3>
                  <p className="text-sm text-slate-500 font-medium">Best for importing into other applications</p>
                </div>
                {isExporting ? <Loader2 className="w-5 h-5 text-primary-500 animate-spin" /> : <Download className="w-5 h-5 text-slate-300 group-hover:text-primary-500" />}
              </div>

              <div 
                onClick={() => !isExporting && handleExport('CSV')}
                className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/30 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                  <FileSpreadsheet className="w-6 h-6 text-slate-500 group-hover:text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">CSV Spreadsheet</h3>
                  <p className="text-sm text-slate-500 font-medium">Best for data analysis in Excel or Sheets</p>
                </div>
                {isExporting ? <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /> : <Download className="w-5 h-5 text-slate-300 group-hover:text-emerald-500" />}
              </div>

              <div 
                onClick={() => !isExporting && handleExport('PDF')}
                className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-rose-500 hover:bg-rose-50/30 cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                  <FileText className="w-6 h-6 text-slate-500 group-hover:text-rose-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800">PDF Summary</h3>
                  <p className="text-sm text-slate-500 font-medium">Best for a readable overview of your workspace</p>
                </div>
                {isExporting ? <Loader2 className="w-5 h-5 text-rose-500 animate-spin" /> : <Download className="w-5 h-5 text-slate-300 group-hover:text-rose-500" />}
              </div>
            </div>

            {exportComplete && (
              <div className="mx-8 mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-800">Your download will start automatically.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
