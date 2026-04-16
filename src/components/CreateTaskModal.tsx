import React, { useState, useEffect, useRef } from 'react';
import { useTasks, Priority } from '../context/TaskContext';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { useRoles } from '../context/RolesContext';
import { useUsers } from '../context/UserContext';
import { useDepartments } from '../context/DepartmentContext';
import { X, AlignLeft, Calendar, ChevronDown, PlusCircle, Camera, Repeat, ListTodo, Trash2, Users, Sparkles, Loader2, Paperclip, Mic, MicOff } from 'lucide-react';
import { suggestTasks, parseVoiceToTask } from '../services/geminiService';
import { generateId } from '../utils/idGenerator';
import TaskMultiSelect from './TaskMultiSelect';

import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }: { position: {lat: number, lng: number}, setPosition: (pos: {lat: number, lng: number}) => void }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return position.lat !== 0 ? <Marker position={[position.lat, position.lng]} /> : null;
}

export default function CreateTaskModal({ onClose, initialData }: { onClose: () => void, initialData?: { title?: string, description?: string } }) {
  const { addTask, tasks } = useTasks();
  const { projects } = useProjects();
  const { user } = useAuth();
  const { hasPermission } = useRoles();
  const activeProjects = projects.filter(p => !(p as any).isArchived);

  const canManageAllTasks = user ? hasPermission(user.role, 'manage_tasks', user.roleId) : false;
  const isManager = user?.role.toLowerCase() === 'manager';

  const [title, setTitle] = useState(initialData?.title || '');
  const [projectId, setProjectId] = useState('');

  const [priority, setPriority] = useState<Priority>('Medium');
  const [proofType, setProofType] = useState<string>('None');
  const [recurring, setRecurring] = useState('None');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [employees, setEmployees] = useState<User[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [dueDate, setDueDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [relatedTasks, setRelatedTasks] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<{title: string, description?: string, priority: Priority, dueDate: string, recurring?: string, subtasks?: string[]}[]>([]);
  const [description, setDescription] = useState(initialData?.description || '');
  const [attachments, setAttachments] = useState<{ id: string; name: string; url: string; type: 'image' | 'video' | 'file' }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [enableGeofence, setEnableGeofence] = useState(false);
  const [geofence, setGeofence] = useState<{lat: number, lng: number, radius: number, enforcement: 'start' | 'complete' | 'both'}>({
    lat: 0,
    lng: 0,
    radius: 50,
    enforcement: 'both'
  });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isParsingVoice, setIsParsingVoice] = useState(false);

  const recognitionRef = useRef<any>(null);

  const handleVoiceInput = () => {
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.lang = 'en-US'; // Default to English or let browser decide
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      setIsParsingVoice(true);
      
      try {
        const parsedTask = await parseVoiceToTask(transcript);
        if (parsedTask) {
          if (parsedTask.title) setTitle(parsedTask.title);
          if (parsedTask.description) setDescription(parsedTask.description);
          if (parsedTask.priority) setPriority(parsedTask.priority as Priority);
          if (parsedTask.recurring) setRecurring(parsedTask.recurring);
          if (parsedTask.dueDate) {
            const today = new Date();
            if (parsedTask.dueDate.toLowerCase() === 'tomorrow') {
              today.setDate(today.getDate() + 1);
            } else if (parsedTask.dueDate.toLowerCase() === 'next week') {
              today.setDate(today.getDate() + 7);
            }
            setDueDate(today.toISOString().split('T')[0]);
          }
        }
      } catch (error) {
        console.error("Failed to parse voice input", error);
      } finally {
        setIsParsingVoice(false);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        toast.error("Microphone access denied. Please allow microphone access in your browser settings to use voice input.");
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error("Speech recognition error", event.error);
        toast.error(`Speech recognition error: ${event.error}`);
      }
      setIsRecording(false);
      setIsParsingVoice(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      // Don't set isParsingVoice to false here because onend fires before onresult finishes parsing
    };

    recognition.start();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('taskops_token');
      const headers: Record<string, string> = {
        'x-user-id': user.id,
        'x-user-role': user.role
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        const id = generateId('ATT');
        setAttachments(prev => [...prev, { id, name: file.name, url: data.url, type }]);
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSuggest = async () => {
    setIsSuggesting(true);
    try {
      const selectedProject = activeProjects.find(p => p.id === projectId);
      const suggested = await suggestTasks(selectedProject?.title || 'General');
      setSuggestions(suggested);
    } catch (error) {
      console.error("Failed to get suggestions", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const applySuggestion = (suggestion: {title: string, description?: string, priority: Priority, dueDate: string, recurring?: string, subtasks?: string[]}) => {
    setTitle(suggestion.title);
    setPriority(suggestion.priority);
    
    if (suggestion.description) setDescription(suggestion.description);
    if (suggestion.recurring) setRecurring(suggestion.recurring);
    if (suggestion.subtasks && suggestion.subtasks.length > 0) {
      setSubtasks(suggestion.subtasks.map(st => ({ id: Date.now().toString() + Math.random(), title: st, completed: false })));
    }
    
    if (suggestion.dueDate) {
      const today = new Date();
      if (suggestion.dueDate.toLowerCase() === 'tomorrow') {
        today.setDate(today.getDate() + 1);
      } else if (suggestion.dueDate.toLowerCase() === 'next week') {
        today.setDate(today.getDate() + 7);
      }
      setDueDate(today.toISOString().split('T')[0]);
    }
    
    setSuggestions([]);
  };

  const { users } = useUsers();
  const { departments: allDepartments } = useDepartments();

  useEffect(() => {
    if (users) {
      let filteredUsers = users;
      if (isManager && user?.departmentId) {
        filteredUsers = users.filter((u: any) => u.departmentId === user.departmentId || u.id === user.id);
      }
      setEmployees(filteredUsers);
      if (filteredUsers.length > 0 && !selectedAssignee) {
        setSelectedAssignee(filteredUsers[0].id);
      }
      setLoadingEmployees(false);
    }
  }, [users, isManager, user?.departmentId, user?.id]);

  useEffect(() => {
    if (allDepartments) {
      let filteredDepts = allDepartments;
      if (isManager && user?.departmentId) {
        filteredDepts = allDepartments.filter((d: any) => d.id === user.departmentId);
      }
      setDepartments(filteredDepts);
    }
  }, [allDepartments, isManager, user?.departmentId]);

  const handleAddSubtask = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSubtask.trim()) {
      e.preventDefault();
      setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtask.trim(), completed: false }]);
      setNewSubtask('');
    }
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(item => item.id !== id));
  };

  const handleGetLocation = () => {
    setIsGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeofence(prev => ({
            ...prev,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }));
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location", error);
          setIsGettingLocation(false);
          alert("Could not get your location. Please ensure location permissions are granted.");
        }
      );
    } else {
      setIsGettingLocation(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    
    let finalAssignee = selectedAssignee;
    let assignedToType = 'user';
    
    if (!canManageAllTasks && !isManager) {
      finalAssignee = user?.id || '';
    } else if (selectedAssignee.startsWith('dept_')) {
      finalAssignee = selectedAssignee.replace('dept_', '');
      assignedToType = 'department';
    }

    // Determine initial status based on project or user kanban columns
    let initialStatus = 'Todo';
    const selectedProjectObj = activeProjects.find(p => p.id === projectId);
    if (selectedProjectObj && (selectedProjectObj as any).kanban_columns) {
      try {
        const cols = JSON.parse((selectedProjectObj as any).kanban_columns);
        if (cols.length > 0) initialStatus = cols[0].id;
      } catch (e) {}
    } else if (user?.kanbanColumns) {
      try {
        const cols = JSON.parse(user.kanbanColumns);
        if (cols.length > 0) initialStatus = cols[0].id;
      } catch (e) {}
    }

    let finalDueDate = dueDate;
    if (recurring !== 'None' && !dueDate) {
      finalDueDate = new Date().toISOString().split('T')[0];
    }

    addTask({
      title,
      project: projectId,
      priority,
      status: initialStatus,
      dueDate: finalDueDate,
      dueTime,
      assignees: finalAssignee ? [finalAssignee] : [],
      assignedToType,
      tags: [],
      description,
      proofType: proofType as any,
      attachments,
      recurring: recurring !== 'None' ? recurring : null,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      dependencies: dependencies.length > 0 ? dependencies : undefined,
      relatedTasks: relatedTasks.length > 0 ? relatedTasks : undefined,
      requiresApproval,
      geofence: enableGeofence ? geofence : null
    });
    onClose();
  };

  return (
    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col justify-end transition-colors">
      <div className="bg-[#f8fafc] rounded-t-[2.5rem] w-full max-h-[92%] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full duration-300 transition-colors">
        <div className="flex justify-center pt-4 pb-2 bg-white">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>
        
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 transition-colors">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Create Task</h2>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-95">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 no-scrollbar">
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Task Title</label>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleVoiceInput}
                  disabled={isRecording || isParsingVoice}
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${isRecording ? 'text-rose-500 animate-pulse' : 'text-blue-600 hover:text-blue-700 disabled:text-slate-300'}`}
                >
                  {isParsingVoice ? <Loader2 className="w-3 h-3 animate-spin" /> : isRecording ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                  {isRecording ? 'Listening...' : isParsingVoice ? 'Parsing...' : 'Voice Input'}
                </button>
                <button 
                  onClick={handleSuggest}
                  disabled={isSuggesting}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-700 disabled:text-slate-300 transition-colors"
                >
                  {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI Suggest
                </button>
              </div>
            </div>
            <input 
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-4 text-lg font-bold text-slate-800 placeholder:text-slate-300 outline-none transition-all shadow-sm" 
              placeholder="What needs to be done?" 
            />
            {suggestions.length > 0 && (
              <div className="flex flex-col gap-2 mt-2 p-3 bg-primary-50/50 rounded-2xl border border-primary-100 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1 px-1">AI Task Templates</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map((s, i) => (
                    <button 
                      key={i}
                      onClick={() => applySuggestion(s)}
                      className="text-left bg-white px-4 py-3 rounded-xl border border-primary-100 hover:border-primary-300 hover:bg-primary-50 transition-all shadow-sm group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-slate-800 group-hover:text-primary-700 transition-colors">{s.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{s.priority}</span>
                      </div>
                      {s.description && <p className="text-xs text-slate-500 line-clamp-1">{s.description}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
              <AlignLeft className="w-4 h-4" /> Description
            </label>
            <div className="relative">
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-sm bg-white border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 px-5 py-4 resize-none text-slate-700 placeholder:text-slate-300 outline-none transition-all shadow-sm font-medium" 
                placeholder="Add details..." 
                rows={3}
              ></textarea>
              <div className="absolute bottom-3 right-3 flex gap-2">
                <label className={`p-2 bg-slate-50 hover:bg-primary-50 text-slate-400 hover:text-primary-600 rounded-xl transition-all shadow-sm border border-slate-100 cursor-pointer ${isUploading ? 'animate-pulse' : ''}`} title="Attach Photo">
                  <Camera className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={(e) => handleFileUpload(e, 'image')} />
                </label>
                <label className={`p-2 bg-slate-50 hover:bg-primary-50 text-slate-400 hover:text-primary-600 rounded-xl transition-all shadow-sm border border-slate-100 cursor-pointer ${isUploading ? 'animate-pulse' : ''}`} title="Attach Video">
                  <PlusCircle className="w-4 h-4" />
                  <input type="file" accept="video/*" className="hidden" disabled={isUploading} onChange={(e) => handleFileUpload(e, 'video')} />
                </label>
                <label className={`p-2 bg-slate-50 hover:bg-primary-50 text-slate-400 hover:text-primary-600 rounded-xl transition-all shadow-sm border border-slate-100 cursor-pointer ${isUploading ? 'animate-pulse' : ''}`} title="Attach File">
                  <Paperclip className="w-4 h-4" />
                  <input type="file" className="hidden" disabled={isUploading} onChange={(e) => handleFileUpload(e, 'file')} />
                </label>
              </div>
            </div>
            
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[100px]">{att.name}</span>
                    <button 
                      onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
              <ListTodo className="w-4 h-4" /> Subtasks
            </label>
            <div className="space-y-2">
              {subtasks.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm group">
                  <span className="text-sm font-bold text-slate-700 pl-2">{item.title}</span>
                  <button onClick={() => removeSubtask(item.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <input 
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={handleAddSubtask}
                placeholder="Add subtask (press Enter)"
                className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3.5 px-5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all placeholder:text-slate-300 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Project <span className="text-slate-300 font-medium normal-case tracking-normal ml-1">(Optional)</span></label>
              <div className="relative">
                <select 
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl py-3.5 pl-5 pr-10 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm"
                >
                  <option value="">No Project</option>
                  {activeProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {(canManageAllTasks || isManager) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Assignee</label>
                  <button 
                    onClick={() => setSelectedAssignee(user?.id || '')}
                    className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wider"
                  >
                    Assign to me
                  </button>
                </div>
                <div className="relative">
                  <select 
                    value={selectedAssignee}
                    onChange={e => setSelectedAssignee(e.target.value)}
                    disabled={loadingEmployees}
                    className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl py-3.5 pl-5 pr-10 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm disabled:opacity-50"
                  >
                    {loadingEmployees ? (
                      <option value="">Loading...</option>
                    ) : (
                      <>
                        <optgroup label="Departments">
                          {departments.map(dept => (
                            <option key={dept.id} value={`dept_${dept.id}`}>{dept.name}</option>
                          ))}
                        </optgroup>
                        {departments.map(dept => {
                          const deptUsers = employees.filter(emp => {
                            const empDeptIds = (emp as any).department_ids ? JSON.parse((emp as any).department_ids) : [];
                            return (emp as any).department_id === dept.id || empDeptIds.includes(dept.id);
                          });
                          if (deptUsers.length === 0) return null;
                          return (
                            <optgroup key={`users_${dept.id}`} label={`Users - ${dept.name}`}>
                              {deptUsers.map(emp => {
                                const empDeptIds = (emp as any).department_ids ? JSON.parse((emp as any).department_ids) : [];
                                const primaryDeptId = (emp as any).department_id;
                                const allDeptIds = Array.from(new Set([primaryDeptId, ...empDeptIds].filter(Boolean)));
                                const deptNames = allDeptIds.map(id => departments.find(d => d.id === id)?.name).filter(Boolean).join(', ');
                                
                                return (
                                  <option key={emp.id} value={emp.id}>
                                    {emp.name} {deptNames ? `(${deptNames})` : ''}
                                  </option>
                                );
                              })}
                            </optgroup>
                          );
                        })}
                        {employees.filter(emp => {
                          const empDeptIds = (emp as any).department_ids ? JSON.parse((emp as any).department_ids) : [];
                          return !(emp as any).department_id && empDeptIds.length === 0;
                        }).length > 0 && (
                          <optgroup label="Other Users">
                            {employees.filter(emp => {
                              const empDeptIds = (emp as any).department_ids ? JSON.parse((emp as any).department_ids) : [];
                              return !(emp as any).department_id && empDeptIds.length === 0;
                            }).map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    )}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Priority</label>
              <div className="flex gap-2">
                {(['High', 'Medium', 'Low', 'None'] as Priority[]).map(p => {
                  const isSelected = priority === p;
                  let activeClass = '';
                  if (isSelected) {
                    switch(p) {
                      case 'High': activeClass = 'border-rose-200 bg-rose-50 text-rose-600 shadow-sm'; break;
                      case 'Medium': activeClass = 'border-amber-200 bg-amber-50 text-amber-600 shadow-sm'; break;
                      case 'Low': activeClass = 'border-primary-200 bg-primary-50 text-primary-600 shadow-sm'; break;
                      case 'None': activeClass = 'border-slate-200 bg-slate-100 text-slate-700 shadow-sm'; break;
                    }
                  } else {
                    activeClass = 'border-slate-100 bg-white text-slate-400 hover:bg-slate-50 hover:border-slate-200';
                  }

                  return (
                    <button 
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-3 px-2 rounded-2xl border-2 text-xs sm:text-sm font-black transition-all active:scale-95 ${activeClass}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">
                Due Date & Time <span className="text-slate-300 font-medium normal-case tracking-normal ml-1">(Optional)</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl py-3.5 pl-10 pr-2 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm h-[52px]"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative flex-1">
                  <input 
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full appearance-none bg-white border-2 border-slate-100 rounded-2xl py-3.5 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm h-[52px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Dependencies</label>
              <TaskMultiSelect 
                tasks={tasks}
                selectedIds={dependencies}
                onChange={setDependencies}
                placeholder="Select dependencies..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Related Tasks</label>
              <TaskMultiSelect 
                tasks={tasks}
                selectedIds={relatedTasks}
                onChange={setRelatedTasks}
                placeholder="Select related tasks..."
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Verification & Rules</label>
            
            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-soft">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-50 text-primary-600 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Proof Required</p>
                  <p className="text-xs font-medium text-slate-400">Mandatory evidence</p>
                </div>
              </div>
              <div className="relative">
                <select 
                  value={proofType}
                  onChange={(e) => setProofType(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-100 rounded-xl py-2 pl-4 pr-10 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                >
                  <option value="None">None</option>
                  <option value="Image">Image</option>
                  <option value="Video">Video</option>
                  <option value="Document">Document</option>
                  <option value="Any">Any</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-soft">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Recurring Task</p>
                  <p className="text-xs font-medium text-slate-400">Automate operations</p>
                </div>
              </div>
              <div className="relative">
                <select 
                  value={recurring}
                  onChange={(e) => setRecurring(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-100 rounded-xl py-2 pl-4 pr-10 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                >
                  <option>None</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-soft">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Requires Approval</p>
                  <p className="text-xs font-medium text-slate-400">Manager review needed</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={requiresApproval}
                  onChange={(e) => setRequiresApproval(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex flex-col p-4 bg-white rounded-2xl border border-slate-100 shadow-soft">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">Geofencing</p>
                    <p className="text-xs font-medium text-slate-400">Location-based enforcement</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={enableGeofence}
                    onChange={(e) => setEnableGeofence(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {enableGeofence && (
                <div className="space-y-4 pt-4 mt-2 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Location</label>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGetLocation}
                        disabled={isGettingLocation}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-colors border border-slate-200 disabled:opacity-50"
                      >
                        {isGettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>}
                        Use Current Location
                      </button>
                      <button
                        onClick={() => setShowMap(!showMap)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-colors border ${showMap ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                        Pick on Map
                      </button>
                    </div>

                    {showMap && (
                      <div className="h-[200px] w-full rounded-xl overflow-hidden border border-slate-200 relative z-0">
                        <MapContainer 
                          center={[geofence.lat || 37.7749, geofence.lng || -122.4194]} 
                          zoom={13} 
                          style={{ height: '100%', width: '100%' }}
                        >
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          />
                          <LocationPicker 
                            position={{lat: geofence.lat, lng: geofence.lng}} 
                            setPosition={(pos) => setGeofence({...geofence, lat: pos.lat, lng: pos.lng})} 
                          />
                        </MapContainer>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        placeholder="Latitude" 
                        value={geofence.lat || ''}
                        onChange={e => setGeofence({...geofence, lat: parseFloat(e.target.value)})}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
                      />
                      <input 
                        type="number" 
                        placeholder="Longitude" 
                        value={geofence.lng || ''}
                        onChange={e => setGeofence({...geofence, lng: parseFloat(e.target.value)})}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Radius (meters)</label>
                      <input 
                        type="number" 
                        value={geofence.radius}
                        onChange={e => setGeofence({...geofence, radius: parseInt(e.target.value) || 50})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
                        min="10"
                        max="10000"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enforcement</label>
                      <div className="relative">
                        <select 
                          value={geofence.enforcement}
                          onChange={e => setGeofence({...geofence, enforcement: e.target.value as any})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:border-blue-500 appearance-none"
                        >
                          <option value="start">Required to Start</option>
                          <option value="complete">Required to Complete</option>
                          <option value="both">Both</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white transition-colors">
          <button 
            onClick={handleCreate}
            disabled={isUploading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white py-4.5 rounded-2xl font-black text-lg shadow-glow flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <PlusCircle className="w-6 h-6" />}
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
