
import React from 'react';
import { Subject, isHexColor } from '../types';
import { Check, BookOpen } from 'lucide-react';

interface SubjectPickerProps {
  subjects: Subject[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  variant?: 'horizontal' | 'vertical';
}

export const SubjectPicker: React.FC<SubjectPickerProps> = ({ 
  subjects, 
  selectedId, 
  onSelect, 
  disabled,
  variant = 'horizontal'
}) => {
  // Filter out archived subjects
  const activeSubjects = subjects.filter(s => !s.isArchived);

  if (variant === 'vertical') {
    return (
      <div className="flex flex-col gap-2 w-full">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 px-1">Subjects</h3>
        <div className="flex flex-col gap-2">
            {activeSubjects.map((subject) => {
            const isSelected = subject.id === selectedId;
            const isHex = isHexColor(subject.color);
            return (
                <button
                key={subject.id}
                onClick={() => !disabled && onSelect(subject.id)}
                className={`
                    relative flex items-center gap-3 px-4 py-4 rounded-xl transition-all text-left group
                    ${isSelected 
                    ? `bg-white/10 border border-white/20 backdrop-blur-md shadow-lg` 
                    : 'hover:bg-white/5 border border-transparent'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                >
                <div 
                    className={`
                        w-8 h-8 rounded-lg flex items-center justify-center transition-all shadow-inner
                        ${!isHex ? subject.color : 'bg-white/10'}
                        ${isSelected && !isHex ? '' : 'group-hover:bg-white/20'}
                    `}
                    style={isHex ? { backgroundColor: subject.color } : {}}
                >
                    <BookOpen size={16} className="text-white mix-blend-overlay" />
                </div>
                <div className="flex-1">
                    <span className={`font-semibold text-sm block ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {subject.name}
                    </span>
                </div>
                {isSelected && <Check size={16} className="text-emerald-400" />}
                </button>
            );
            })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto no-scrollbar mask-linear-fade">
      <div className="flex flex-nowrap justify-center gap-3 px-2 min-w-max">
        {activeSubjects.map((subject) => {
          const isSelected = subject.id === selectedId;
          const isHex = isHexColor(subject.color);
          
          return (
            <button
              key={subject.id}
              onClick={() => !disabled && onSelect(subject.id)}
              className={`
                relative flex items-center gap-2 px-5 py-3 rounded-full transition-all duration-300
                border whitespace-nowrap backdrop-blur-md
                ${isSelected 
                  ? `border-white/20 text-white shadow-lg scale-105` 
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                }
                ${!isHex && isSelected ? subject.color : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}
              `}
              style={
                  isHex && isSelected 
                  ? { backgroundColor: subject.color, boxShadow: `0 10px 15px -3px ${subject.color}4D` } 
                  : {}
              }
            >
              <span 
                className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : ''} ${!isHex && !isSelected ? subject.color : ''}`} 
                style={!isSelected && isHex ? { backgroundColor: subject.color } : {}}
              />
              <span className="font-semibold text-sm">{subject.name}</span>
              {isSelected && <Check size={14} className="ml-1" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
