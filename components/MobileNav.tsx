import React from 'react';
import { Timer, BarChart3, CalendarDays, Settings, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export type MobileTab = 'timer' | 'timeline' | 'calendar' | 'settings' | 'assistant';

interface MobileNavProps {
  activeTab: MobileTab;
  setTab: (tab: MobileTab) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, setTab }) => {
  const { accent } = useTheme();
  const tabs: { id: MobileTab; label: string; icon: React.FC<any> }[] = [
    { id: 'timer', label: 'Focus', icon: Timer },
    { id: 'timeline', label: 'Timeline', icon: BarChart3 },
    { id: 'assistant', label: 'Mentor', icon: Sparkles },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'settings', label: 'Manage', icon: Settings },
  ];

  return (
    <div className="flex-none bg-slate-900 border-t border-slate-800 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors
                ${isActive ? `text-${accent}-400` : 'text-slate-500 hover:text-slate-400'}
              `}
            >
              <Icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};