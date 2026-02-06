import React, { useState } from 'react';
import { CheckCircle2, Circle, Target, Plus, Trash2 } from 'lucide-react';
import { DailyGoal } from '../types';
import { dbService } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';

interface GoalChecklistProps {
  dailyTotalMs: number;
  goals: DailyGoal[];
  onGoalUpdate: () => void;
  selectedDate: string;
  targetHours: number;
  variant?: 'full' | 'compact';
}

export const GoalChecklist: React.FC<GoalChecklistProps> = ({ 
    dailyTotalMs, 
    goals, 
    onGoalUpdate,
    selectedDate,
    targetHours,
    variant = 'full'
}) => {
  const [newGoalText, setNewGoalText] = useState('');
  const { accent } = useTheme();
  
  const currentHours = dailyTotalMs / (1000 * 60 * 60);
  const progressPercent = Math.min((currentHours / targetHours) * 100, 100);
  const isTimeGoalMet = currentHours >= targetHours;
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const handleAddGoal = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newGoalText.trim()) return;

      const goal: DailyGoal = {
          id: crypto.randomUUID(),
          text: newGoalText.trim(),
          isCompleted: false,
          dateString: selectedDate,
          createdAt: Date.now()
      };

      await dbService.saveGoal(goal);
      setNewGoalText('');
      onGoalUpdate();
  };

  const toggleGoal = async (goal: DailyGoal) => {
      await dbService.saveGoal({ ...goal, isCompleted: !goal.isCompleted });
      onGoalUpdate();
  };

  const deleteGoal = async (id: string) => {
      await dbService.deleteGoal(id);
      onGoalUpdate();
  };

  if (variant === 'compact') {
      return (
          <div className="w-full bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 overflow-hidden flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      <Target size={14} /> Goals
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    {(progressPercent).toFixed(0)}%
                  </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-1.5 w-full bg-slate-700/30 rounded-full overflow-hidden mb-4">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isTimeGoalMet ? 'bg-emerald-500' : `bg-${accent}-500`}`}
                    style={{ width: `${progressPercent}%` }} 
                />
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                  {goals.filter(g => !g.isCompleted).map(goal => (
                      <button key={goal.id} onClick={() => toggleGoal(goal)} className="flex items-center gap-2 text-left w-full group hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                          <Circle size={14} className={`text-slate-500 group-hover:text-${accent}-400 flex-none`} />
                          <span className="text-sm text-slate-300 truncate">{goal.text}</span>
                      </button>
                  ))}
                  {goals.filter(g => !g.isCompleted).length === 0 && (
                      <div className="text-xs text-slate-600 italic text-center py-2">No pending goals</div>
                  )}
              </div>
              
              {/* Quick Add */}
               <form onSubmit={handleAddGoal} className="mt-2 relative">
                <input 
                    type="text"
                    value={newGoalText}
                    onChange={(e) => setNewGoalText(e.target.value)}
                    placeholder="+ New Goal"
                    className="w-full bg-white/5 border border-white/5 rounded-lg py-1.5 pl-3 pr-8 text-xs text-white focus:outline-none focus:bg-white/10 placeholder:text-slate-600"
                />
               </form>
          </div>
      )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <Target className={`text-${accent}-400`} size={20} />
            <h3 className="text-slate-200 font-bold">Goals for {isToday ? 'Today' : selectedDate}</h3>
        </div>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-1">
        {/* Main Time Goal */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
            <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-slate-300">Daily Study Target</span>
                <span className="text-xs font-mono text-slate-400">
                    {currentHours.toFixed(1)} / {targetHours.toFixed(1)} hrs
                </span>
            </div>
            <div className="h-2 w-full bg-slate-700/50 rounded-full overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isTimeGoalMet ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : `bg-${accent}-500 shadow-[0_0_10px_rgba(var(--color-${accent}-500),0.5)]`}`}
                    style={{ width: `${progressPercent}%` }} 
                />
            </div>
        </div>

        {/* Custom Goal Input */}
        <form onSubmit={handleAddGoal} className="relative">
            <input 
                type="text"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                placeholder="Add a new goal..."
                className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-${accent}-500/50 focus:bg-white/10 transition-colors placeholder:text-slate-500`}
            />
            <button 
                type="submit"
                disabled={!newGoalText.trim()}
                className={`absolute right-2 top-2 p-1.5 bg-${accent}-600 hover:bg-${accent}-500 text-white rounded-lg disabled:opacity-0 transition-all shadow-lg shadow-${accent}-500/20`}
            >
                <Plus size={16} />
            </button>
        </form>

        {/* Custom Goal List */}
        <div className="space-y-2">
            {goals.length === 0 ? (
                <p className="text-center text-slate-600 text-xs italic py-4">No custom goals set for this day.</p>
            ) : (
                goals.sort((a,b) => a.createdAt - b.createdAt).map(goal => (
                    <div 
                        key={goal.id} 
                        className={`group flex items-center justify-between p-3 rounded-xl transition-all border ${goal.isCompleted ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                    >
                        <button 
                            onClick={() => toggleGoal(goal)}
                            className="flex items-center gap-3 flex-1 text-left"
                        >
                            {goal.isCompleted ? (
                                <CheckCircle2 size={20} className="text-emerald-500 flex-none" />
                            ) : (
                                <Circle size={20} className={`text-slate-500 group-hover:text-${accent}-400 flex-none`} />
                            )}
                            <span className={`text-sm transition-all ${goal.isCompleted ? 'text-emerald-200/70 line-through decoration-emerald-500/30' : 'text-slate-300'}`}>
                                {goal.text}
                            </span>
                        </button>
                        
                        <button 
                            onClick={() => deleteGoal(goal.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};