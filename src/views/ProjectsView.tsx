import React, { useState } from 'react';
import TopBar from '../components/TopBar';
import { Search, SlidersHorizontal, Lock, Globe, Users, CheckSquare, Edit2, Archive, MoreVertical, Folder, Plus, Briefcase, Code, Palette, Megaphone, Zap, X, AlertTriangle, ListTodo, Trash2, Building2 } from 'lucide-react';
import { useProjects, Project } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import { useDepartments } from '../context/DepartmentContext';
import ProjectModal from '../components/ProjectModal';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { useOutletContext } from 'react-router-dom';
import { LayoutContextType } from '../App';
import { toast } from 'sonner';

export default function ProjectsView() {
  const { onMenuClick } = useOutletContext<LayoutContextType>();
  const { user } = useAuth();
  const { hasPermission } = useRoles();
  const { projects, isLoading, deleteProject } = useProjects();
  const { tasks } = useTasks();
  const { departments } = useDepartments();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | undefined>(undefined);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const canCreateProject = user ? hasPermission(user.role, 'manage_projects', user.roleId) : false;
  const canManageAllProjects = user ? hasPermission(user.role, 'manage_projects', user.roleId) : false;

  const getProjectTasks = (projectTitle: string) => {
    return tasks.filter(t => t.project === projectTitle);
  };

  const getTaskStatusInfo = (task: any, project: any) => {
    let cols = [
      { id: 'Todo', title: 'To Do' },
      { id: 'In Progress', title: 'In Progress' },
      { id: 'Pending Approval', title: 'Review' },
      { id: 'Completed', title: 'Done' }
    ];

    if (project && (project as any).kanban_columns) {
      try {
        cols = JSON.parse((project as any).kanban_columns);
      } catch (e) {}
    } else if (user?.kanbanColumns) {
      try {
        cols = JSON.parse(user.kanbanColumns);
      } catch (e) {}
    }

    const lastColId = cols.length > 0 ? cols[cols.length - 1].id : 'Completed';
    const statusObj = cols.find(c => c.id === task.status);
    
    return {
      title: statusObj ? statusObj.title : task.status,
      isCompleted: task.status === lastColId
    };
  };

  const filteredProjects = projects.filter(project => {
    // Check if user's department is linked to the project
    const isUserDepartmentLinked = project.departmentIds?.includes(user?.departmentId || '') || project.departmentId === user?.departmentId;

    // Role-based visibility
    if (!canManageAllProjects) {
      // Regular users: only see projects linked to their department
      if (!isUserDepartmentLinked) return false;
    }

    const matchesSearch = (project.title || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    return matchesSearch;
  });

  const handleEdit = (project: Project) => {
    setProjectToEdit(project);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setProjectToEdit(undefined);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      const projectTasks = tasks.filter(t => t.project === projectToDelete.title && t.status !== 'Completed');
      if (projectTasks.length > 0) {
        toast.error(`Cannot delete project. It has ${projectTasks.length} active tasks. Please complete or reassign them first.`);
        setProjectToDelete(null);
        return;
      }

      try {
        await deleteProject(projectToDelete.id);
        toast.success('Project deleted successfully');
        setProjectToDelete(null);
      } catch (err) {
        console.error('Failed to delete project', err);
        toast.error('Failed to delete project');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-[#f8fafc]">
        <TopBar title="Projects" onMenuClick={onMenuClick} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] transition-colors relative">
      <TopBar title="Projects" icon="folder" onMenuClick={onMenuClick} />
      
      <div className="px-5 py-5">
        <div className="flex w-full items-center rounded-2xl bg-white h-14 px-5 gap-4 border border-slate-100 focus-within:border-primary-400 focus-within:ring-4 focus-within:ring-primary-500/10 transition-all shadow-soft">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-base font-medium text-slate-800 placeholder:text-slate-400 outline-none" 
            placeholder="Search projects..." 
          />
          <div className="w-px h-6 bg-slate-100 mx-1"></div>
          <button className="text-slate-400 hover:text-primary-600 transition-colors">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-5 mb-6 flex items-center justify-between">
        <div className="flex-1 mr-4">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">Your Projects</h2>
          <p className="text-sm text-slate-500 font-medium">{filteredProjects.length} active project{filteredProjects.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreateProject && (
          <button 
            onClick={handleCreate}
            className="w-12 h-12 bg-primary-600 text-white rounded-2xl flex items-center justify-center shadow-glow shadow-primary-600/30 hover:bg-primary-500 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="flex-1 px-5 flex flex-col gap-5 pb-24 overflow-y-auto no-scrollbar">
        {filteredProjects.length > 0 ? (
          filteredProjects.map(project => (
            <ProjectCard 
              key={project.id}
              project={project}
              tasks={tasks}
              departments={departments}
              onClick={() => setSelectedProject(project)}
              onEdit={(e) => { e.stopPropagation(); handleEdit(project); }}
              onDelete={(e) => { e.stopPropagation(); setProjectToDelete(project); }}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Folder className="w-12 h-12 mb-4 text-slate-300" />
            <p className="font-bold text-lg text-slate-700">No projects found</p>
            <p className="text-sm">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ProjectModal 
          onClose={() => setIsModalOpen(false)} 
          projectToEdit={projectToEdit} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-5 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Delete Project?</h3>
              <p className="text-sm text-slate-500 font-medium">
                Are you sure you want to delete <span className="text-slate-800 font-bold">"{projectToDelete.title}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button 
                onClick={() => setProjectToDelete(null)}
                className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <div className="w-px bg-slate-100"></div>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-4 text-sm font-black text-rose-600 hover:bg-rose-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-[#f8fafc] rounded-t-[2.5rem] w-full max-h-[90%] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex justify-center pt-4 pb-2 bg-white">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>
            
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
              <div>
                <span className="text-xs font-mono text-slate-400 block mb-1">{selectedProject.id}</span>
                <h2 className="text-xl font-black text-slate-800 truncate pr-4">{selectedProject.title}</h2>
              </div>
              <button onClick={() => setSelectedProject(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Departments */}
              {departments.filter(d => selectedProject.departmentIds?.includes(d.id) || selectedProject.departmentId === d.id).length > 0 && (
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Linked Departments</h3>
                  <div className="flex flex-wrap gap-2">
                    {departments.filter(d => selectedProject.departmentIds?.includes(d.id) || selectedProject.departmentId === d.id).map(dept => (
                      <span key={dept.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-100">
                        <Building2 className="w-4 h-4" />
                        {dept.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Description</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  {selectedProject.description || "No description provided for this project."}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800">{selectedProject.members}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Members</p>
                  </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <ListTodo className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-slate-800">{getProjectTasks(selectedProject.title).length}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasks</p>
                  </div>
                </div>
              </div>

              {/* Related Tasks */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Related Tasks</h3>
                {getProjectTasks(selectedProject.title).length > 0 ? (
                  <div className="space-y-3">
                    {getProjectTasks(selectedProject.title).map(task => (
                      <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getTaskStatusInfo(task, selectedProject).isCompleted ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                          <span className="text-sm font-bold text-slate-700">{task.title}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-400">{getTaskStatusInfo(task, selectedProject).title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
                    <p className="text-sm text-slate-500 font-medium">No tasks assigned to this project yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, tasks, departments, onEdit, onDelete, onClick }: { project: Project, tasks: any[], departments: any[], onEdit: (e: React.MouseEvent) => void, onDelete: (e: React.MouseEvent) => void, onClick: () => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();

  const getIcon = (name: string) => {
    switch (name) {
      case 'Folder': return <Folder className="w-8 h-8 text-white/80" />;
      case 'Globe': return <Globe className="w-8 h-8 text-white/80" />;
      case 'Lock': return <Lock className="w-8 h-8 text-white/80" />;
      case 'Briefcase': return <Briefcase className="w-8 h-8 text-white/80" />;
      case 'Code': return <Code className="w-8 h-8 text-white/80" />;
      case 'Palette': return <Palette className="w-8 h-8 text-white/80" />;
      case 'Megaphone': return <Megaphone className="w-8 h-8 text-white/80" />;
      case 'Zap': return <Zap className="w-8 h-8 text-white/80" />;
      default: return <Folder className="w-8 h-8 text-white/80" />;
    }
  };

  const projectTasks = tasks.filter(t => t.project === project.title);
  const totalTasks = projectTasks.length;
  
  let cols = [
    { id: 'Todo', title: 'To Do' },
    { id: 'In Progress', title: 'In Progress' },
    { id: 'Pending Approval', title: 'Review' },
    { id: 'Completed', title: 'Done' }
  ];

  if ((project as any).kanban_columns) {
    try {
      cols = JSON.parse((project as any).kanban_columns);
    } catch (e) {}
  } else if (user?.kanbanColumns) {
    try {
      cols = JSON.parse(user.kanbanColumns);
    } catch (e) {}
  }

  const lastColId = cols.length > 0 ? cols[cols.length - 1].id : 'Completed';
  
  const completedTasks = projectTasks.filter(t => t.status === lastColId).length;
  const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const projectDepts = departments.filter(d => project.departmentIds?.includes(d.id) || project.departmentId === d.id);

  return (
    <div 
      onClick={onClick}
      className="group bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-soft hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer"
    >
      <div className={`h-32 ${project.bgClass} relative flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        
        <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-500">
          {getIcon(project.iconName)}
        </div>

        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 rounded-xl text-white transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}></div>
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(e); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" /> Edit
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(e); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="p-5">
        <span className="text-xs font-mono text-slate-400 block mb-1">{project.id}</span>
        <h3 className="text-xl font-black text-slate-800 leading-tight mb-4 group-hover:text-primary-600 transition-colors">{project.title}</h3>
        
        {projectDepts.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {projectDepts.map(dept => (
              <span key={dept.id} className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-100">
                <Building2 className="w-3 h-3" />
                {dept.name}
              </span>
            ))}
          </div>
        )}

        <div className="mb-4">
          <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Progress</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className="bg-primary-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-bold">{project.members} <span className="font-medium">Members</span></span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            <CheckSquare className="w-4 h-4 text-slate-400" />
            <span className="font-bold">{project.tasks} <span className="font-medium">Tasks</span></span>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(e); }} 
            className="flex-1 h-12 bg-primary-50 hover:bg-primary-600 text-primary-600 hover:text-white rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all border border-primary-100 hover:border-primary-600 hover:shadow-md hover:shadow-primary-600/20"
          >
            <Edit2 className="w-4 h-4" /> Edit
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(e); }} 
            className="flex-1 h-12 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all border border-slate-100"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
