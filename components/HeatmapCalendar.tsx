import React, { useMemo } from 'react';
import { StudySession } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HeatmapCalendarProps {
  sessions: StudySession[];
  currentDate: Date; // The month we are viewing
  selectedDate: string; // The specific day selected "YYYY-MM-DD"
  onDateSelect: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  sessions,
  currentDate,
  selectedDate,
  onDateSelect,
  onPrevMonth,
  onNextMonth,
}) => {
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDayOfWeek = monthStart.getDay(); // 0 = Sunday
  const daysInMonth = monthEnd.getDate();

  // Create grid cells (padding for start day)
  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - startDayOfWeek + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
  });

  // Pre-calculate daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    sessions.forEach(s => {
      const date = s.dateString;
      totals[date] = (totals[date] || 0) + s.durationMs;
    });
    return totals;
  }, [sessions]);

  const getIntensityClass = (ms: number) => {
    if (!ms) return 'bg-slate-800 text-slate-500';
    const hours = ms / (1000 * 60 * 60);
    if (hours < 1) return 'bg-orange-900/40 text-orange-200 border-orange-900/50';
    if (hours < 3) return 'bg-orange-700/60 text-orange-100 border-orange-700/50';
    if (hours < 6) return 'bg-orange-600 text-white border-orange-500/50 shadow-[0_0_10px_rgba(234,88,12,0.2)]';
    return 'bg-orange-500 text-white border-orange-400 font-bold shadow-[0_0_15px_rgba(249,115,22,0.3)]';
  };

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-sm font-bold text-slate-200">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-1">
          <button onClick={onPrevMonth} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={onNextMonth} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-slate-500 font-mono font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date, i) => {
          if (!date) return <div key={i} className="aspect-square" />;
          
          const dateStr = date.toISOString().split('T')[0];
          const totalMs = dailyTotals[dateStr] || 0;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === new Date().toISOString().split('T')[0];

          return (
            <button
              key={i}
              onClick={() => onDateSelect(dateStr)}
              className={`
                aspect-square rounded-lg flex items-center justify-center text-xs transition-all border
                ${getIntensityClass(totalMs)}
                ${isSelected ? 'ring-2 ring-white scale-110 z-10' : 'border-transparent'}
                ${!totalMs && !isSelected ? 'hover:bg-slate-750' : ''}
              `}
            >
              <div className="flex flex-col items-center">
                <span>{date.getDate()}</span>
                {isToday && <div className="w-1 h-1 rounded-full bg-indigo-400 mt-0.5" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};