import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Save, AlertTriangle } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { generateId } from '../utils/idGenerator';
import { toast } from 'sonner';

interface KanbanColumn {
  id: string;
  title: string;
}

export default function KanbanCustomizationView() {
  const { setCurrentView } = useNavigation();
  const { user, updateUser } = useAuth();
  const { tasks, updateTask } = useTasks();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [moveToColumnId, setMoveToColumnId] = useState<string>('');

  useEffect(() => {
    if (user?.kanbanColumns) {
      try {
        setColumns(JSON.parse(user.kanbanColumns));
      } catch (e) {
        setColumns([
          { id: 'Todo', title: 'To Do' },
          { id: 'In Progress', title: 'In Progress' },
          { id: 'Pending Approval', title: 'Review' },
          { id: 'Completed', title: 'Done' }
        ]);
      }
    } else {
      setColumns([
        { id: 'Todo', title: 'To Do' },
        { id: 'In Progress', title: 'In Progress' },
        { id: 'Pending Approval', title: 'Review' },
        { id: 'Completed', title: 'Done' }
      ]);
    }
  }, [user]);

  const handleAddColumn = () => {
    const newId = generateId('COL');
    setColumns([...columns, { id: newId, title: 'New Column' }]);
  };

  const handleRemoveColumn = (id: string) => {
    if (columns.length <= 1) {
      toast.error('You must have at least one column');
      return;
    }
    
    const tasksInColumn = tasks.filter(t => t.status === id);
    if (tasksInColumn.length > 0) {
      setDeleteColumnId(id);
      setMoveToColumnId(columns.find(c => c.id !== id)?.id || '');
      return;
    }

    setColumns(columns.filter(c => c.id !== id));
  };

  const confirmDeleteColumn = async () => {
    if (!deleteColumnId || !moveToColumnId) return;
    
    const tasksInColumn = tasks.filter(t => t.status === deleteColumnId);
    
    try {
      // Move tasks to new column
      await Promise.all(tasksInColumn.map(t => updateTask(t.id, { status: moveToColumnId as any })));
      
      setColumns(columns.filter(c => c.id !== deleteColumnId));
      setDeleteColumnId(null);
      toast.success('Column deleted and tasks moved successfully');
    } catch (err) {
      toast.error('Failed to move tasks');
    }
  };

  const handleUpdateColumn = (id: string, title: string) => {
    setColumns(columns.map(c => c.id === id ? { ...c, title } : c));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newCols = [...columns];
    const temp = newCols[index];
    newCols[index] = newCols[index - 1];
    newCols[index - 1] = temp;
    setColumns(newCols);
  };

  const handleMoveDown = (index: number) => {
    if (index === columns.length - 1) return;
    const newCols = [...columns];
    const temp = newCols[index];
    newCols[index] = newCols[index + 1];
    newCols[index + 1] = temp;
    setColumns(newCols);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateUser({ kanbanColumns: JSON.stringify(columns) });
      toast.success('Kanban columns updated successfully');
      setCurrentView('settings');
    } catch (err) {
      toast.error('Failed to save kanban columns');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentView('settings')}
            className="p-2 -ml-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Kanban Customization</h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-sm disabled:opacity-50"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Customize Your Board</h2>
            <p className="text-slate-500 text-sm mb-6">
              Define the default columns for your personal Kanban board. These columns will be used when viewing all tasks or projects without specific column configurations.
            </p>

            <div className="space-y-3">
              {columns.map((column, index) => (
                <div key={column.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleMoveDown(index)}
                      disabled={index === columns.length - 1}
                      className="p-1 text-slate-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={column.title}
                    onChange={(e) => handleUpdateColumn(column.id, e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    placeholder="Column Title"
                  />
                  <button
                    onClick={() => handleRemoveColumn(column.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddColumn}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:text-primary-600 hover:border-primary-200 hover:bg-primary-50 transition-all font-bold text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Column
            </button>
          </div>
        </div>
      </div>

      {deleteColumnId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-rose-50/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <h2 className="text-xl font-black text-slate-800">Delete Column</h2>
            </div>
            <div className="p-6 space-y-5">
              <p className="text-sm font-medium text-slate-600">
                This column contains active tasks. Where would you like to move them?
              </p>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Move tasks to</label>
                <select
                  value={moveToColumnId}
                  onChange={(e) => setMoveToColumnId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {columns.filter(c => c.id !== deleteColumnId).map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteColumnId(null)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteColumn}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-sm shadow-rose-500/20 transition-all"
                >
                  Delete & Move Tasks
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
