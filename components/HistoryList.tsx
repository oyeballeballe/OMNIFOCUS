import React, { useMemo } from 'react';
import { StudySession, Subject, isHexColor } from '../types';
import { Clock, BarChart2, Award, Hourglass } from 'lucide-react';

interface HistoryListProps {
  sessions: StudySession[];
  subjects: Subject[];
  lifetimeTotalMs?: number;
  averageSessionMs?: number;
}

export const HistoryList: React.FC<HistoryListProps> = ({ 
    sessions, 
    subjects,
    lifetimeTotalMs = 0,
    averageSessionMs = 0
}) => {
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.startTime - a.startTime);
  }, [sessions]);

  const getSubject = (id: string) => subjects.find(s => s.id === id);

  const formatDuration = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatHours = (ms: number) => (ms / 3600000).toFixed(1);
  const formatMins = (ms: number) => Math.round(ms / 60000);

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col h-full mt-4">
        <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 px-1">Overview</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                <div className="p-3 bg-indigo-500/20 rounded-full mb-2 text-indigo-400 group-hover:scale-110 transition-transform">
                    <Award size={24} />
                </div>
                <div className="text-2xl font-mono font-bold text-white">{formatHours(lifetimeTotalMs)}h</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Lifetime Focus</div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/5 flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-colors">
                <div className="p-3 bg-emerald-500/20 rounded-full mb-2 text-emerald-400 group-hover:scale-110 transition-transform">
                    <Hourglass size={24} />
                </div>
                <div className="text-2xl font-mono font-bold text-white">{formatMins(averageSessionMs)}m</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Avg Session</div>
            </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-slate-500/50 border-t border-white/5 pt-8">
            <BarChart2 size={48} className="mb-3" />
            <p className="text-sm font-medium">Ready to start today?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 w-full">
      <h2 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 px-1">Today's History</h2>
      <div className="space-y-3">
        {sortedSessions.map(session => {
          const subject = getSubject(session.subjectId);
          const color = subject?.color || '#64748b';
          const isHex = isHexColor(color);

          return (
            <div key={session.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex justify-between items-center transition-hover hover:bg-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div 
                    className={`w-1 h-10 rounded-full shadow-[0_0_10px_currentColor] opacity-80 ${!isHex ? color : ''}`} 
                    style={isHex ? { backgroundColor: color, color: color } : {}}
                />
                <div>
                  <h3 className="font-semibold text-slate-200">{subject?.name || 'Unknown'}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Clock size={12} />
                    <span>{formatTime(session.startTime)} - {formatTime(session.endTime)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="block font-mono font-bold text-lg text-slate-200">
                  {formatDuration(session.durationMs)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};