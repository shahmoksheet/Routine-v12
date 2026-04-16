import React, { useState, useEffect } from 'react';
import { X, Folder, Globe, Save, ChevronDown, Building2 } from 'lucide-react';
import { useProjects, Project } from '../context/ProjectContext';
import { useDepartments } from '../context/DepartmentContext';

interface ProjectModalProps {
  onClose: () => void;
  projectToEdit?: Project;
}

export default function ProjectModal({ onClose, projectToEdit }: ProjectModalProps) {
  const { addProject, updateProject } = useProjects();
  const { departments } = useDepartments();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [title, setTitle] = useState(projectToEdit?.title || '');
  const [description, setDescription] = useState(projectToEdit?.description || '');
  const [bgClass, setBgClass] = useState(projectToEdit?.bgClass || 'bg-gradient-to-br from-primary-500 to-primary-700');
  const [iconName, setIconName] = useState(projectToEdit?.iconName || 'Folder');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(projectToEdit?.departmentIds || (projectToEdit?.departmentId ? [projectToEdit.departmentId] : []));

  const bgOptions = [
    { label: 'Primary', value: 'bg-gradient-to-br from-primary-500 to-primary-700' },
    { label: 'Purple', value: 'bg-gradient-to-br from-purple-500 to-purple-700' },
    { label: 'Emerald', value: 'bg-gradient-to-br from-emerald-500 to-emerald-700' },
    { label: 'Amber', value: 'bg-gradient-to-br from-amber-500 to-orange-600' },
    { label: 'Rose', value: 'bg-gradient-to-br from-rose-500 to-rose-700' },
    { label: 'Slate', value: 'bg-gradient-to-br from-slate-600 to-slate-800' },
  ];

  const iconOptions = ['Folder', 'Globe', 'Lock', 'Briefcase', 'Code', 'Palette', 'Megaphone', 'Zap'];

  const toggleDepartment = (deptId: string) => {
    setSelectedDepartments(prev => 
      prev.includes(deptId) 
        ? prev.filter(id => id !== deptId)
        : [...prev, deptId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (projectToEdit) {
        await updateProject(projectToEdit.id, { 
          title, 
          description, 
          bgClass, 
          iconName,
          departmentIds: selectedDepartments
        });
      } else {
        await addProject({
          title,
          description,
          bgClass,
          iconName,
          departmentIds: selectedDepartments,
          members: 1,
          tasks: 0
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save project', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end transition-colors">
      <div className="bg-[#f8fafc] rounded-t-[2.5rem] w-full max-h-[92%] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 transition-colors">
        <div className="flex justify-center pt-4 pb-2 bg-white">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>
        
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 transition-colors">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {projectToEdit ? 'Edit Project' : 'New Project'}
          </h2>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-95">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Project Name</label>
              <input 
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-4 text-base font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all shadow-sm" 
                placeholder="e.g. Website Redesign" 
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Description (Optional)</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-4 text-base font-medium text-slate-800 placeholder:text-slate-300 outline-none transition-all shadow-sm resize-none h-24" 
                placeholder="Briefly describe the project..." 
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Link to Departments</label>
              <div className="flex flex-wrap gap-2">
                {departments.map(dept => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => toggleDepartment(dept.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-2 ${
                      selectedDepartments.includes(dept.id) 
                        ? 'bg-primary-50 border-primary-200 text-primary-700' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    {dept.name}
                  </button>
                ))}
                {departments.length === 0 && (
                  <p className="text-sm text-slate-400 italic">No departments available.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Theme Color</label>
                <div className="relative">
                  <select 
                    value={bgClass}
                    onChange={e => setBgClass(e.target.value)}
                    className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl py-3.5 pl-5 pr-10 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm"
                  >
                    {bgOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Icon</label>
                <div className="relative">
                  <select 
                    value={iconName}
                    onChange={e => setIconName(e.target.value)}
                    className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl py-3.5 pl-5 pr-10 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm"
                  >
                    {iconOptions.map(icon => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="pt-4 pb-8">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 text-white py-4 rounded-2xl font-black text-lg transition-all shadow-glow shadow-primary-500/30"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {projectToEdit ? 'Save Changes' : 'Create Project'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
