import React, { useState } from 'react';
import { Subject, SUBJECT_COLORS, isHexColor } from '../types';
import { Plus, X, Edit2, Archive, Trash2, Check, RotateCcw, Palette } from 'lucide-react';
import { dbService } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';

interface SubjectManagerProps {
  subjects: Subject[];
  onUpdate: () => void;
  onClose: () => void;
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({ subjects, onUpdate, onClose }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const { accent } = useTheme();

  const handleStartEdit = (subject: Subject) => {
    setEditingId(subject.id);
    setName(subject.name);
    setColor(subject.color);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setName('');
    setColor(SUBJECT_COLORS[0]);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    const newSubject: Subject = {
      id: isCreating ? crypto.randomUUID() : editingId!,
      name: name.trim(),
      color,
      isArchived: false,
    };

    // Preserve archived status if editing
    if (!isCreating) {
       const existing = subjects.find(s => s.id === editingId);
       if (existing) newSubject.isArchived = existing.isArchived;
    }

    await dbService.saveSubject(newSubject);
    onUpdate();
    resetForm();
  };

  const handleArchiveToggle = async (subject: Subject) => {
    const updated = { ...subject, isArchived: !subject.isArchived };
    await dbService.saveSubject(updated);
    onUpdate();
  };
  
  const handleDelete = async (id: string) => {
      if(window.confirm("Are you sure? This will hide stats associated with this subject (but not delete session data).")) {
          await dbService.deleteSubject(id);
          onUpdate();
      }
  };

  const resetForm = () => {
    setEditingId(null);
    setIsCreating(false);
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="font-bold text-lg text-white">Manage Subjects</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {isCreating || editingId ? (
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 animate-in fade-in zoom-in-95 duration-200">
              <div className="mb-4">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Subject Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-2 text-white focus:outline-none focus:border-${accent}-500 focus:bg-slate-900 transition-colors`}
                  placeholder="e.g. Advanced Calculus"
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">Color Tag</label>
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {SUBJECT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                {/* Custom Color Picker */}
                <div className="flex items-center gap-3 bg-slate-900/50 p-2 rounded-lg border border-white/5">
                     <div className="p-2 bg-white/5 rounded-full">
                         <Palette size={16} className="text-slate-400" />
                     </div>
                     <span className="text-xs text-slate-300 font-medium">Custom Color:</span>
                     <div className="relative flex-1 flex items-center justify-end">
                         <input 
                            type="color" 
                            value={color.startsWith('#') ? color : '#3b82f6'} 
                            onChange={(e) => setColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                         />
                         <span className="ml-2 font-mono text-xs text-slate-500 uppercase">{color}</span>
                     </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={resetForm} className="px-3 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button 
                    onClick={handleSave} 
                    className={`px-4 py-2 bg-${accent}-600 hover:bg-${accent}-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-${accent}-500/20`}
                >
                    <Check size={16} /> Save
                </button>
              </div>
            </div>
          ) : (
             <button
                onClick={handleStartCreate}
                className="w-full py-3 border-2 border-dashed border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition-all flex items-center justify-center gap-2 mb-4"
              >
                <Plus size={18} /> New Subject
              </button>
          )}

          <div className="space-y-2">
            {subjects.sort((a, b) => (a.isArchived === b.isArchived ? 0 : a.isArchived ? 1 : -1)).map((subject) => {
              const isHex = isHexColor(subject.color);
              return (
                <div 
                    key={subject.id} 
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${subject.isArchived ? 'bg-slate-900/50 border-white/5 opacity-60' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                >
                    <div className="flex items-center gap-3">
                        <div 
                            className={`w-3 h-3 rounded-full shadow-[0_0_8px_currentColor] ${!isHex ? subject.color : ''}`} 
                            style={isHex ? { backgroundColor: subject.color, color: subject.color } : {}}
                        />
                        <span className={`font-medium ${subject.isArchived ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {subject.name}
                        </span>
                        {subject.isArchived && <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">Archived</span>}
                    </div>
                    
                    <div className="flex items-center gap-1">
                        {!subject.isArchived && (
                            <button onClick={() => handleStartEdit(subject)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <Edit2 size={16} />
                            </button>
                        )}
                        <button 
                            onClick={() => handleArchiveToggle(subject)} 
                            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-white/10 rounded-lg transition-colors"
                            title={subject.isArchived ? "Restore" : "Archive"}
                        >
                            {subject.isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
                        </button>
                        {subject.isArchived && (
                            <button onClick={() => handleDelete(subject.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};