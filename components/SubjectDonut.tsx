import React from 'react';
import { Subject, isHexColor } from '../types';

interface SubjectDonutProps {
  sessions: { subjectId: string; durationMs: number }[];
  subjects: Subject[];
  className?: string;
}

export const SubjectDonut: React.FC<SubjectDonutProps> = ({ sessions, subjects, className = '' }) => {
  const totalMs = sessions.reduce((acc, s) => acc + s.durationMs, 0);

  // Group by subject
  const distribution = sessions.reduce((acc, s) => {
    acc[s.subjectId] = (acc[s.subjectId] || 0) + s.durationMs;
    return acc;
  }, {} as Record<string, number>);

  const segments = Object.entries(distribution)
    .map(([id, ms]: [string, number]) => {
      const subject = subjects.find(s => s.id === id);
      return {
        id,
        name: subject?.name || 'Unknown',
        color: subject?.color || '#64748b',
        value: ms,
        percentage: totalMs ? (ms / totalMs) * 100 : 0
      };
    })
    .sort((a, b) => b.value - a.value);

  if (totalMs === 0) {
      return (
          <div className={`flex items-center justify-center h-48 text-slate-500 text-xs italic ${className}`}>
              No data to display
          </div>
      );
  }

  // SVG Calculations
  const size = 160;
  const strokeWidth = 20;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative w-40 h-40">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          {segments.map((segment) => {
            const strokeDasharray = `${(segment.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((cumulativePercent / 100) * circumference);
            cumulativePercent += segment.percentage;
            
            const isHex = isHexColor(segment.color);
            const colorClass = !isHex ? segment.color.replace('bg-', 'text-') : '';

            return (
              <circle
                key={segment.id}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={isHex ? segment.color : 'currentColor'}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt" // Butt endings for continuous ring
                className={`transition-all duration-500 ease-out ${colorClass}`}
              />
            );
          })}
          {/* Inner Circle for Glass Effect */}
          <circle cx={center} cy={center} r={radius - strokeWidth/2} fill="rgba(255,255,255,0.02)" />
        </svg>
        
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-white shadow-black drop-shadow-md">
                {segments.length}
            </span>
            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Subjects</span>
        </div>
      </div>

      {/* Legend */}
      <div className="w-full mt-6 space-y-2">
          {segments.map(segment => {
              const isHex = isHexColor(segment.color);
              return (
                  <div key={segment.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                          <div 
                            className={`w-2.5 h-2.5 rounded-full ${!isHex ? segment.color : ''}`}
                            style={isHex ? { backgroundColor: segment.color } : {}}
                          />
                          <span className="text-slate-300 font-medium truncate max-w-[120px]">{segment.name}</span>
                      </div>
                      <span className="text-slate-400 font-mono">{segment.percentage.toFixed(1)}%</span>
                  </div>
              )
          })}
      </div>
    </div>
  );
};