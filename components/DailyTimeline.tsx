
import React from 'react';
import { StudySession, Subject, isHexColor } from '../types';

interface DailyTimelineProps {
  sessions: StudySession[];
  subjects: Subject[];
  className?: string;
}

export const DailyTimeline: React.FC<DailyTimelineProps> = ({ sessions, subjects, className = "h-[600px]" }) => {
  const getSubjectColor = (id: string) => subjects.find(s => s.id === id)?.color || '#64748b';

  // Sort sessions by start time
  const sortedSessions = [...sessions].sort((a, b) => a.startTime - b.startTime);

  const hours = Array.from({ length: 25 }, (_, i) => i); // 0 to 24

  return (
    <div className={`w-full relative flex ${className}`}>
        {/* Time Axis */}
        <div className="flex flex-col justify-between h-full pr-2 text-[10px] text-slate-500 font-mono select-none w-8 flex-none">
            {hours.map((h) => (
                <div key={h} className="relative h-0">
                   <span className="absolute -top-[6px] right-0">
                     {h === 24 ? '00' : h.toString().padStart(2, '0')}
                   </span>
                </div>
            ))}
        </div>

        {/* Timeline Track */}
        <div className="relative flex-1 h-full border-l border-slate-700/50">
            {/* Horizontal Grid Lines */}
            {hours.map((h) => (
                <div 
                    key={h} 
                    className="absolute w-full border-t border-slate-700/20"
                    style={{ top: `${(h / 24) * 100}%` }} 
                />
            ))}

            {/* Session Blocks */}
            {sortedSessions.map((session) => {
                const startDate = new Date(session.startTime);
                const startHour = startDate.getHours();
                const startMin = startDate.getMinutes();
                
                // Calculate position relative to 24h day
                const startTotalMinutes = (startHour * 60) + startMin;
                const durationMinutes = session.durationMs / 60000;
                
                const topPercent = (startTotalMinutes / 1440) * 100;
                const heightPercent = (durationMinutes / 1440) * 100;
                
                // Min height for visibility
                const safeHeight = Math.max(heightPercent, 0.5);

                const subjectColor = getSubjectColor(session.subjectId);
                const isHex = isHexColor(subjectColor);

                return (
                    <div
                        key={session.id}
                        className={`absolute left-1 right-1 rounded-sm bg-opacity-90 border border-white/10 hover:brightness-110 hover:z-10 transition-all shadow-sm group ${!isHex ? subjectColor : ''}`}
                        style={{
                            top: `${topPercent}%`,
                            height: `${safeHeight}%`,
                            backgroundColor: isHex ? subjectColor : undefined,
                        }}
                    >
                      {/* Tooltip on Hover */}
                      <div className="opacity-0 group-hover:opacity-100 absolute left-full ml-2 top-0 bg-slate-900 border border-slate-700 text-xs p-2 rounded z-50 whitespace-nowrap pointer-events-none">
                        <div className="font-bold text-slate-200">{subjects.find(s => s.id === session.subjectId)?.name}</div>
                        <div className="text-slate-400">
                             {startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                             ({durationMinutes.toFixed(0)}m)
                        </div>
                      </div>
                    </div>
                );
            })}
            
            {/* Current Time Indicator (if today) */}
            {new Date().toDateString() === new Date(sessions[0]?.startTime || Date.now()).toDateString() && (
               <div 
                 className="absolute w-full border-t-2 border-red-500/50 z-20 flex items-center pointer-events-none"
                 style={{ top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 1440) * 100}%` }}
               >
                 <div className="w-2 h-2 -ml-1 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
               </div>
            )}
        </div>
    </div>
  );
};
