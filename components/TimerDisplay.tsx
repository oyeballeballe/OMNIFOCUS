import React, { useEffect, useState } from 'react';
import { TimerStatus, TimerMode, isHexColor } from '../types';
import { Play, Pause, Square, Timer, Hourglass, CheckCircle2, Coffee, Armchair, Settings2, Save } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { DEFAULT_PERSONALITIES, Personality } from './AIAssistant';
import { useTheme } from '../contexts/ThemeContext';

interface TimerDisplayProps {
  elapsedMs: number;
  status: TimerStatus;
  mode: TimerMode;
  subjectColor: string;
  todaySubjectTotal: number;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onSetMode: (mode: TimerMode) => void;
  sidePanel?: React.ReactNode;
  isWallpaperMode?: boolean; 
}

const DEFAULT_DURATIONS = {
    pomodoro: 25,
    'short-break': 5,
    'long-break': 15,
};

const FALLBACK_QUOTES = [
    "Focus on the step in front of you, not the whole staircase.",
    "The only way to do great work is to love what you do.",
    "It always seems impossible until it's done.",
    "Don't watch the clock; do what it does. Keep going.",
    "Success is the sum of small efforts, repeated day in and day out.",
    "Believe you can and you're halfway there.",
    "Your future is created by what you do today, not tomorrow."
];

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  elapsedMs,
  status,
  mode,
  subjectColor,
  todaySubjectTotal,
  onStart,
  onPause,
  onStop,
  onSetMode,
  sidePanel,
  isWallpaperMode = false
}) => {
  // State for custom durations (in minutes)
  const [durations, setDurations] = useState(DEFAULT_DURATIONS);
  const [isEditing, setIsEditing] = useState(false);
  const [quote, setQuote] = useState<string>('');
  const { accent } = useTheme();
  
  // Load saved durations on mount
  useEffect(() => {
      const saved = localStorage.getItem('omni_timer_durations');
      if (saved) {
          try {
              setDurations(JSON.parse(saved));
          } catch (e) {
              console.error("Failed to parse saved durations");
          }
      }
      if (!isWallpaperMode) {
          fetchMotivationalQuote();
      }
  }, [isWallpaperMode]);

  const fetchMotivationalQuote = async () => {
     // Use fallback if no key
     if (!process.env.API_KEY) {
         setQuote(FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
         return;
     }
     
     // Determine personality
     const savedPersonaId = localStorage.getItem('omni_ai_personality') || 'default';
     const customPersonasStr = localStorage.getItem('omni_custom_personas');
     const customPersonas: Personality[] = customPersonasStr ? JSON.parse(customPersonasStr) : [];
     const allPersonas = [...DEFAULT_PERSONALITIES, ...customPersonas];
     const selectedPersona = allPersonas.find(p => p.id === savedPersonaId) || DEFAULT_PERSONALITIES[3];

     try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a short, single-sentence motivational quote (max 15 words) for a student who is about to study.
            
            Persona instructions: ${selectedPersona.prompt}
            
            Do not include the persona name. Just the quote.`,
        });
        if (response.text) {
            setQuote(response.text.replace(/^"|"$/g, '').trim());
        }
     } catch (e: any) {
         // Handle Quota errors gracefully
         if (e.message?.includes('429') || e.status === 429) {
            console.warn("Quota exceeded for quotes. Using fallback.");
         } else {
            console.error("Failed to fetch quote", e);
         }
         setQuote(FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
     }
  };

  const handleSaveDurations = () => {
      localStorage.setItem('omni_timer_durations', JSON.stringify(durations));
      setIsEditing(false);
  };

  const handleResetDurations = () => {
      setDurations(DEFAULT_DURATIONS);
  };

  const isTimerMode = mode !== 'stopwatch';
  // Calculate target based on current mode and custom durations
  const targetDuration = isTimerMode ? (durations[mode as keyof typeof durations] || 25) * 60 * 1000 : 0;
  
  const remainingMs = Math.max(0, targetDuration - elapsedMs);
  const displayMs = isTimerMode ? remainingMs : elapsedMs;
  const isComplete = isTimerMode && elapsedMs >= targetDuration;

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (isComplete && status === 'running') {
       if ('Notification' in window && Notification.permission === 'granted') {
           new Notification("Timer Complete!", {
               body: mode === 'pomodoro' ? "Focus session done. Time for a break!" : "Break is over. Back to focus!",
               icon: "/favicon.ico"
           });
       }
       const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
       audio.volume = 0.5;
       audio.play().catch(() => {});
    }
  }, [isComplete, status, mode]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000); 
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    
    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const formatShort = (ms: number) => {
      const hours = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      if (hours === 0 && mins === 0) return '0m';
      if (hours === 0) return `${mins}m`;
      return `${hours}h ${mins}m`;
  };

  // Determine colors based on mode (Hex or Class)
  const getTheme = () => {
      // Break colors (Fixed Hex for simplicity)
      if (mode === 'short-break') return { bg: '#14b8a6', text: '#2dd4bf', stroke: '#14b8a6', isHex: true }; // teal-500
      if (mode === 'long-break') return { bg: '#6366f1', text: '#818cf8', stroke: '#6366f1', isHex: true }; // indigo-500

      // Subject color
      if (isHexColor(subjectColor)) {
          return { bg: subjectColor, text: subjectColor, stroke: subjectColor, isHex: true };
      }
      
      // Legacy Class fallback
      return { 
          bg: subjectColor, 
          text: subjectColor.replace('bg-', 'text-'), 
          stroke: subjectColor.replace('bg-', 'text-'), 
          isHex: false 
      };
  };

  const theme = getTheme();

  // SVG Config
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = isTimerMode 
    ? Math.max(0, remainingMs / targetDuration) 
    : 0;
  const strokeDashoffset = circumference * (1 - progressPercent);

  // IMMERSIVE / ZEN MODE LAYOUT
  if (isWallpaperMode) {
      return (
          <div className="flex items-center gap-6 p-6 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl animate-in slide-in-from-bottom-8">
            {/* Time */}
            <div className="text-6xl font-mono font-bold text-white tabular-nums tracking-tight drop-shadow-lg">
                {isComplete ? "DONE" : formatTime(displayMs)}
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3 border-l border-white/20 pl-6">
                <div className="text-white/80 text-xs font-bold uppercase tracking-widest mr-2 hidden sm:block">
                     {mode === 'pomodoro' ? 'Focus' : mode === 'stopwatch' ? 'Timer' : 'Break'}
                </div>
                {status === 'running' ? (
                     <button onClick={onPause} className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg">
                         <Pause size={20} fill="currentColor" />
                     </button>
                ) : (
                     <button onClick={onStart} className={`p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg ${isComplete ? 'hidden' : ''}`}>
                         <Play size={20} fill="currentColor" className="ml-0.5" />
                     </button>
                )}
                
                {(status === 'paused' || status === 'running' || isComplete) && (
                     <button onClick={onStop} className="p-3 bg-red-500/20 text-red-200 hover:bg-red-500 hover:text-white rounded-full transition-colors backdrop-blur-md border border-red-500/30">
                         {isComplete ? <CheckCircle2 size={20} /> : <Square size={20} fill="currentColor" />}
                     </button>
                )}
            </div>
        </div>
      );
  }

  // STANDARD LAYOUT
  return (
    <div className="flex flex-col items-center relative w-full h-full select-none overflow-hidden px-4 md:px-12 justify-center">
        <style>{`
          @keyframes breathe {
            0%, 100% { transform: scale(1); filter: brightness(1); }
            50% { transform: scale(1.02); filter: brightness(1.1); }
          }
          @keyframes slideUpFade {
            from { opacity: 0; transform: translateY(20px) scale(0.9); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.3); opacity: 0; }
          }
          .animate-breathe {
            animation: breathe 4s ease-in-out infinite;
          }
          .animate-enter {
            animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-pulse-ring {
             animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>

        <div className="relative z-10 flex flex-col md:grid md:grid-cols-3 items-center w-full max-w-[1600px] gap-4 md:gap-8 justify-between py-2 md:py-0 md:items-center md:justify-center h-full">
            
            {/* --- LEFT COLUMN: Side Panel (Goals/AI) --- */}
            {sidePanel ? (
                <div className="hidden md:block w-full h-full max-h-[500px] justify-self-start animate-in fade-in slide-in-from-left-8 duration-700 order-3 md:order-1">
                    {sidePanel}
                </div>
            ) : (
                <div className="hidden md:block w-full order-3 md:order-1"></div>
            )}

            {/* --- MIDDLE COLUMN: VISUALIZATION --- */}
            <div className="relative w-full flex flex-col items-center justify-center order-1 md:order-2 md:justify-self-center flex-1 min-h-0">
                
                {/* Visualization Container - fluid max width for mobile */}
                <div className="relative w-full aspect-square max-w-[260px] sm:max-w-[320px] md:max-w-[50vmin] flex items-center justify-center">
                    {/* Animated Background Blob */}
                    <div 
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] rounded-full blur-[100px] transition-all duration-1000 pointer-events-none
                        ${status === 'running' ? 'opacity-40 scale-100' : 'opacity-10 scale-75'}
                        ${!theme.isHex && status === 'running' ? theme.bg : 'bg-slate-700'}
                        ${isComplete ? 'bg-emerald-500 opacity-40 scale-110' : ''}
                        `}
                        style={theme.isHex && status === 'running' && !isComplete ? { backgroundColor: theme.bg } : {}}
                    />
                    
                    {/* Second pulsing blob */}
                    <div 
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] rounded-full blur-[60px] pointer-events-none transition-all duration-700
                        ${status === 'running' ? 'opacity-30 animate-pulse' : 'opacity-0'}
                        ${!theme.isHex ? theme.bg : ''}
                        `} 
                        style={theme.isHex ? { backgroundColor: theme.bg } : {}}
                    />

                    {/* Visual Rings */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {isTimerMode ? (
                            <svg className="w-full h-full -rotate-90 drop-shadow-2xl overflow-visible" viewBox="0 0 100 100">
                                {/* Track */}
                                <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-white/5" />
                                {/* Progress */}
                                <circle cx="50" cy="50" r={radius} fill="none" 
                                    stroke={isComplete ? '#34d399' : (theme.isHex ? theme.stroke : 'currentColor')}
                                    strokeWidth="5" 
                                    strokeLinecap="round" 
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    className={`transition-all duration-1000 ease-linear ${!theme.isHex ? theme.stroke : ''} ${status === 'running' ? 'drop-shadow-[0_0_10px_currentColor]' : ''}`}
                                />
                            </svg>
                        ) : (
                            // Stopwatch Spinner
                            <>
                            <div className={`absolute inset-0 rounded-full border-2 border-dashed border-white/10 transition-all duration-1000 ${status === 'running' ? 'animate-[spin_12s_linear_infinite] opacity-100 scale-100' : 'opacity-30 scale-95'}`} />
                            <div className={`absolute inset-4 rounded-full border border-white/5 transition-all duration-1000 ${status === 'running' ? 'animate-[spin_8s_linear_infinite_reverse] opacity-80' : 'opacity-20'}`} />
                            {/* Pulse Ring when running */}
                            {status === 'running' && (
                                    <div className={`absolute inset-0 rounded-full border border-white/5 animate-pulse-ring`} />
                            )}
                            </>
                        )}
                    </div>

                    {/* Digital Time & Stats */}
                    <div className={`flex flex-col items-center z-10 transition-transform duration-500 ${status === 'running' ? 'animate-breathe' : ''}`}>
                        <div 
                            className={`font-mono font-bold select-none drop-shadow-2xl leading-none tracking-tighter tabular-nums font-feature-settings-tnum transition-all duration-500 text-[18vw] sm:text-[15vmin] md:text-[10vmin] ${isComplete ? 'text-emerald-400 scale-110' : (!theme.isHex ? theme.text : '')}`}
                            style={theme.isHex && !isComplete ? { color: theme.text } : {}}
                        >
                            {isComplete ? "DONE" : formatTime(displayMs)}
                        </div>
                        
                        {/* Contextual Info */}
                        {mode === 'stopwatch' || mode === 'pomodoro' ? (
                            <div className={`mt-2 md:mt-4 px-3 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-slate-300 text-[10px] md:text-xs font-medium flex items-center gap-2 animate-enter`}>
                                <div 
                                    className={`w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor] ${!theme.isHex ? theme.bg : ''} ${status === 'running' ? 'animate-pulse' : ''}`} 
                                    style={theme.isHex ? { backgroundColor: theme.bg, boxShadow: `0 0 5px ${theme.bg}` } : {}}
                                />
                                <span>Today: {formatShort(todaySubjectTotal + (status !== 'idle' ? elapsedMs : 0))}</span>
                            </div>
                        ) : (
                            <div className="mt-4 text-xs font-medium text-slate-400 animate-enter bg-slate-900/40 px-3 py-1 rounded-full border border-white/5">
                                {mode === 'short-break' ? 'Take a breath' : 'Rest & Recharge'}
                            </div>
                        )}
                    
                    </div>
                </div>

                {/* AI Motivational Quote */}
                {quote && (
                    <div className="mt-4 md:mt-8 text-center max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 px-4">
                        <p className="text-sm md:text-base font-medium text-slate-300 italic opacity-80 leading-relaxed line-clamp-2 md:line-clamp-none">"{quote}"</p>
                    </div>
                )}
            </div>

            {/* --- RIGHT COLUMN: CONTROLS --- */}
            <div className="flex flex-col items-center md:items-end gap-6 md:gap-8 order-2 md:order-3 w-full max-w-xs md:justify-self-end flex-none pb-4 md:pb-0">
                
                {/* Top Level Mode Switcher */}
                <div className="flex bg-slate-900/60 backdrop-blur-xl rounded-full p-1 border border-white/10 shadow-2xl transition-transform duration-300 hover:scale-105">
                    <button 
                        onClick={() => onSetMode('stopwatch')}
                        disabled={status !== 'idle' || isEditing}
                        className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-bold transition-all duration-300 ${mode === 'stopwatch' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Timer size={14} className={mode === 'stopwatch' ? `text-${accent}-400` : ''} /> Stopwatch
                    </button>
                    <button 
                        onClick={() => onSetMode('pomodoro')} 
                        disabled={status !== 'idle' || isEditing}
                        className={`flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-bold transition-all duration-300 ${isTimerMode ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Hourglass size={14} className={isTimerMode ? `text-${accent}-400` : ''} /> Timer
                    </button>
                </div>

                {/* Timer Sub-options & Custom Settings Toggle */}
                {isTimerMode && (
                    <div className="w-full flex flex-col items-center md:items-end">
                         <div className="flex flex-wrap justify-center md:justify-end gap-2 animate-in slide-in-from-top-2 fade-in duration-300 mb-2 md:mb-4">
                            <button 
                                onClick={() => onSetMode('pomodoro')}
                                disabled={status !== 'idle' || isEditing}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${mode === 'pomodoro' ? `bg-${accent}-500/20 border-${accent}-500/30 text-${accent}-300` : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                Focus ({durations.pomodoro}m)
                            </button>
                            <button 
                                onClick={() => onSetMode('short-break')}
                                disabled={status !== 'idle' || isEditing}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${mode === 'short-break' ? 'bg-teal-500/20 border-teal-500/30 text-teal-300' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                <Coffee size={12} /> Short ({durations['short-break']}m)
                            </button>
                            <button 
                                onClick={() => onSetMode('long-break')}
                                disabled={status !== 'idle' || isEditing}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${mode === 'long-break' ? 'bg-blue-600/20 border-blue-600/30 text-blue-300' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                <Armchair size={12} /> Long ({durations['long-break']}m)
                            </button>
                        </div>
                        
                        {/* Edit Button */}
                        <div className="flex justify-center md:justify-end w-full">
                             <button 
                                onClick={() => setIsEditing(!isEditing)}
                                disabled={status !== 'idle'}
                                className={`text-[10px] flex items-center gap-1 hover:text-white transition-colors ${isEditing ? `text-${accent}-400` : 'text-slate-600'}`}
                             >
                                 <Settings2 size={12} /> {isEditing ? 'Cancel Editing' : 'Customize Sessions'}
                             </button>
                        </div>
                    </div>
                )}

                {/* Controls OR Edit Form */}
                {isEditing ? (
                    <div className="w-full bg-slate-800/50 border border-white/5 p-4 rounded-2xl animate-in fade-in slide-in-from-right-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 text-right">Custom Durations (min)</h4>
                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">Focus</span>
                                <input 
                                    type="number" 
                                    className={`w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-center text-sm text-white focus:border-${accent}-500 outline-none`}
                                    value={durations.pomodoro}
                                    onChange={(e) => setDurations({...durations, pomodoro: Math.max(1, parseInt(e.target.value) || 0)})}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">Short Break</span>
                                <input 
                                    type="number" 
                                    className={`w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-center text-sm text-white focus:border-${accent}-500 outline-none`}
                                    value={durations['short-break']}
                                    onChange={(e) => setDurations({...durations, 'short-break': Math.max(1, parseInt(e.target.value) || 0)})}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-300">Long Break</span>
                                <input 
                                    type="number" 
                                    className={`w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-center text-sm text-white focus:border-${accent}-500 outline-none`}
                                    value={durations['long-break']}
                                    onChange={(e) => setDurations({...durations, 'long-break': Math.max(1, parseInt(e.target.value) || 0)})}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={handleResetDurations} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 text-xs font-semibold">Reset</button>
                             <button onClick={handleSaveDurations} className={`flex-1 py-2 bg-${accent}-600 hover:bg-${accent}-500 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-1`}>
                                 <Save size={12} /> Save
                             </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-6 items-center h-20 md:h-24">
                        {status === 'running' ? (
                            <div key="pause-btn" className="animate-enter">
                                <button 
                                    onClick={onPause}
                                    className="group relative p-5 md:p-6 rounded-[2rem] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 backdrop-blur-xl transition-all hover:scale-110 active:scale-95 shadow-lg border border-amber-500/20"
                                >
                                    <Pause size={28} className="md:w-8 md:h-8" fill="currentColor" />
                                </button>
                            </div>
                        ) : (
                            <div key="play-btn" className={`animate-enter ${isComplete ? 'hidden' : ''}`}>
                                <button 
                                    onClick={onStart}
                                    className={`group relative p-5 md:p-6 rounded-[2rem] bg-slate-100 text-slate-900 hover:bg-white hover:scale-110 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.15)]`}
                                >
                                    <Play size={28} className="md:w-8 md:h-8 ml-1" fill="currentColor" />
                                </button>
                            </div>
                        )}

                        {(status === 'paused' || status === 'running' || isComplete) && (
                            <div key="stop-btn" className="animate-enter" style={{ animationDelay: '50ms' }}>
                                <button 
                                    onClick={onStop}
                                    className={`group relative p-5 md:p-6 rounded-[2rem] backdrop-blur-xl transition-all hover:scale-110 active:scale-95 shadow-lg border 
                                        ${isComplete 
                                            ? 'bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-bounce' 
                                            : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'}
                                    `}
                                >
                                    {isComplete ? <CheckCircle2 size={28} className="md:w-8 md:h-8" /> : <Square size={28} className="md:w-8 md:h-8" fill="currentColor" />}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};