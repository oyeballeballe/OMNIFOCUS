import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStopwatch } from './hooks/useStopwatch';
import { SubjectPicker } from './components/SubjectPicker';
import { TimerDisplay } from './components/TimerDisplay';
import { HistoryList } from './components/HistoryList';
import { HeatmapCalendar } from './components/HeatmapCalendar';
import { DailyTimeline } from './components/DailyTimeline';
import { GoalChecklist } from './components/GoalChecklist';
import { MobileNav, MobileTab } from './components/MobileNav';
import { SubjectManager } from './components/SubjectManager';
import { AIAssistant } from './components/AIAssistant';
import { QuickAIAssistant } from './components/QuickAIAssistant';
import { SubjectDonut } from './components/SubjectDonut';
import { dbService } from './services/db';
import { StudySession, Subject, DEFAULT_SUBJECTS, DailyGoal, isHexColor } from './types';
import { Zap, Wifi, WifiOff, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Settings, Timer, BarChart3, CalendarDays, Target, Trash2, AlertCircle, Sparkles, PanelLeftClose, PanelLeftOpen, CheckSquare, Palette, AlertTriangle, Image as ImageIcon, ToggleLeft, ToggleRight, Maximize2, X } from 'lucide-react';
import { useTheme, ACCENT_COLORS } from './contexts/ThemeContext';

const App: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_SUBJECTS);
  const [allSessions, setAllSessions] = useState<StudySession[]>([]);
  const [dailyGoals, setDailyGoals] = useState<DailyGoal[]>([]);
  const [targetHours, setTargetHours] = useState(4);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Zen Mode / Wallpaper State
  const [enableZenMode, setEnableZenMode] = useState(false);
  const [zenWallpaperUrl, setZenWallpaperUrl] = useState('');
  const [isZenActive, setIsZenActive] = useState(false);
  const [showZenPrompt, setShowZenPrompt] = useState(false);

  const { accent, setAccent } = useTheme();
  
  // UI State
  const [activeTab, setActiveTab] = useState<MobileTab>('timer');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubjectManagerOpen, setIsSubjectManagerOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ type: 'today' | 'all'; title: string; message: string; } | null>(null);
  
  // Desktop Focus Panel State
  const [focusSideView, setFocusSideView] = useState<'goals' | 'ai'>('goals');
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(false);

  // Shared View State
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Init
  useEffect(() => {
    const initData = async () => {
      try {
        await refreshSubjects();
        loadSessions();
        loadGoals();
        
        // Load target hours
        const savedTarget = localStorage.getItem('studySync_targetHours');
        if (savedTarget) setTargetHours(parseFloat(savedTarget));

        // Load Zen Settings
        const savedZenEnabled = localStorage.getItem('studySync_enableZenMode');
        if (savedZenEnabled) setEnableZenMode(savedZenEnabled === 'true');
        
        const savedZenUrl = localStorage.getItem('studySync_zenWallpaperUrl');
        if (savedZenUrl) setZenWallpaperUrl(savedZenUrl);

      } catch (e) {
        console.error("Failed to initialize DB", e);
      }
    };
    initData();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch goals whenever date changes
  useEffect(() => {
      loadGoals();
  }, [selectedDate]);

  const refreshSubjects = async () => {
      const storedSubjects = await dbService.getSubjects();
      setSubjects(storedSubjects.length ? storedSubjects : DEFAULT_SUBJECTS);
  };

  const loadSessions = async () => {
    const sessions = await dbService.getAllSessions();
    setAllSessions(sessions);
  };

  const loadGoals = async () => {
      const goals = await dbService.getGoalsByDate(selectedDate);
      setDailyGoals(goals);
  };

  const handleSessionComplete = useCallback(() => {
    loadSessions();
  }, []);

  const handleTargetHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setTargetHours(val);
      localStorage.setItem('studySync_targetHours', val.toString());
  };

  const handleZenToggle = () => {
      const newState = !enableZenMode;
      setEnableZenMode(newState);
      localStorage.setItem('studySync_enableZenMode', String(newState));
  };

  const handleZenUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      setZenWallpaperUrl(url);
      localStorage.setItem('studySync_zenWallpaperUrl', url);
  };

  const handleSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setTimeout(() => { setIsSyncing(false); }, 1500);
  };

  // --- Deletion Logic ---

  const requestClearToday = () => {
    setConfirmModal({
        type: 'today',
        title: "Clear Today's Progress?",
        message: "This will permanently delete all study sessions and goals recorded for today. This action cannot be undone."
    });
  };

  const requestClearAll = () => {
      setConfirmModal({
          type: 'all',
          title: "Reset All Progress?",
          message: "WARNING: This will permanently delete your entire history of sessions and goals. Your subjects and settings will remain. This action cannot be undone."
      });
  };

  const executeClear = async () => {
      if (!confirmModal) return;

      if (confirmModal.type === 'today') {
          const today = new Date().toISOString().split('T')[0];
          await dbService.deleteSessionsByDate(today);
          await dbService.deleteGoalsByDate(today);
      } else if (confirmModal.type === 'all') {
          await dbService.clearAllSessions();
          await dbService.clearAllGoals();
      }

      // Refresh UI
      await loadSessions();
      await loadGoals();
      setConfirmModal(null);
  };

  const { elapsedMs, status, mode, currentSubjectId, setSubjectId, setMode, start, pause, stop } = useStopwatch(DEFAULT_SUBJECTS[0].id, handleSessionComplete);
  const currentSubject = subjects.find(s => s.id === currentSubjectId) || subjects[0];

  // Derived Data
  const selectedDateSessions = useMemo(() => allSessions.filter(s => s.dateString === selectedDate), [allSessions, selectedDate]);
  const todaySessions = useMemo(() => allSessions.filter(s => s.dateString === new Date().toISOString().split('T')[0]), [allSessions]);
  const dailyTotalMs = selectedDateSessions.reduce((acc, curr) => acc + curr.durationMs, 0);
  
  // Lifetime Stats
  const lifetimeTotalMs = useMemo(() => allSessions.reduce((acc, s) => acc + s.durationMs, 0), [allSessions]);
  const averageSessionMs = useMemo(() => allSessions.length ? lifetimeTotalMs / allSessions.length : 0, [lifetimeTotalMs, allSessions]);

  // Calculate total time for current subject today
  const currentSubjectTodayTotal = useMemo(() => {
      return todaySessions
        .filter(s => s.subjectId === currentSubjectId)
        .reduce((acc, curr) => acc + curr.durationMs, 0);
  }, [todaySessions, currentSubjectId]);

  const changeDate = (offset: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  // --- Start / Zen Logic ---

  const handleStartRequest = () => {
      if (enableZenMode && zenWallpaperUrl && status === 'idle' && !isZenActive) {
          setShowZenPrompt(true);
      } else {
          start();
      }
  };

  const handleZenResponse = (shouldEnter: boolean) => {
      setShowZenPrompt(false);
      start(); // Always start the timer
      if (shouldEnter) {
          setIsZenActive(true);
      }
  };

  // --- Render Components ---

  const Header = () => (
    <div className="flex justify-between items-center mb-6">
       <div className="flex items-center gap-2">
         <div className={`w-8 h-8 bg-${accent}-500/20 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center shadow-lg shadow-${accent}-500/10`}>
           <Zap size={18} className={`text-${accent}-400 fill-${accent}-400`} />
         </div>
         <h1 className="font-bold text-xl tracking-tight text-slate-100">OMNIFOCUS</h1>
       </div>
       <button 
         onClick={handleSync}
         disabled={!isOnline || isSyncing}
         className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
       >
         {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
         <span className="hidden sm:inline">{isSyncing ? 'Syncing' : isOnline ? 'Online' : 'Offline'}</span>
       </button>
    </div>
  );

  const MobileDrawer = () => (
    <div className={`fixed bottom-16 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl transition-all duration-300 ease-out z-40 flex flex-col ${isDrawerOpen ? 'h-[70vh]' : 'h-12'}`}>
       <button 
         onClick={() => setIsDrawerOpen(!isDrawerOpen)}
         className="w-full flex justify-center items-center h-12 flex-none text-slate-400 hover:text-white"
       >
         {isDrawerOpen ? <ChevronDown size={20} /> : <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><ChevronUp size={16} /> Timeline</div>}
       </button>
       <div className="flex-1 overflow-y-auto px-4 pb-4">
          <DailyTimeline sessions={todaySessions} subjects={subjects} className="h-full min-h-[500px]" />
       </div>
    </div>
  );

  const ConfirmationModal = () => {
    if (!confirmModal) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4 text-red-400">
                    <AlertTriangle size={32} />
                    <h3 className="text-xl font-bold text-white leading-tight">{confirmModal.title}</h3>
                </div>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                    {confirmModal.message}
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setConfirmModal(null)}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors border border-white/5"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={executeClear}
                        className="flex-1 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={18} /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
  };

  const SettingsContent = () => (
    <div className="space-y-6">
        {/* Appearance Settings */}
        <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 bg-${accent}-500/20 rounded-lg text-${accent}-400`}>
                    <Palette size={20} />
                </div>
                <span className="font-semibold text-slate-200">Appearance</span>
            </div>
            
            <p className="text-xs text-slate-500 mb-3">Choose an accent color for your interface.</p>
            
            <div className="grid grid-cols-6 sm:grid-cols-6 gap-2">
                {ACCENT_COLORS.map(color => (
                    <button
                        key={color.id}
                        onClick={() => setAccent(color.id)}
                        className={`
                            relative aspect-square rounded-full transition-all flex items-center justify-center
                            ${color.colorClass}
                            ${accent === color.id ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-60 hover:opacity-100 hover:scale-105'}
                        `}
                        title={color.label}
                    />
                ))}
            </div>
        </div>

        {/* Zen Mode Settings */}
        <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                        <ImageIcon size={20} />
                    </div>
                    <span className="font-semibold text-slate-200">Enable Zen Mode Feature</span>
                </div>
                <button 
                    onClick={handleZenToggle}
                    className={`transition-colors ${enableZenMode ? `text-${accent}-400` : 'text-slate-600 hover:text-slate-400'}`}
                >
                    {enableZenMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
            </div>
            
            {enableZenMode && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <input 
                        type="text"
                        value={zenWallpaperUrl}
                        onChange={handleZenUrlChange}
                        placeholder="Paste wallpaper URL here..."
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                        If enabled, clicking Start Focus will ask if you want to enter a full-screen Zen Mode with this background.
                    </p>
                </div>
            )}
        </div>

        {/* Subject Manager */}
        <button 
        onClick={() => setIsSubjectManagerOpen(true)}
        className="w-full flex items-center justify-between p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 bg-${accent}-500/20 rounded-lg text-${accent}-400`}>
                    <Settings size={20} />
                </div>
                <span className="font-semibold text-slate-200">Manage Subjects</span>
            </div>
            <ChevronRight size={16} className="text-slate-500" />
        </button>

        {/* Daily Target Setting */}
        <div className="p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                    <Target size={20} />
                </div>
                <span className="font-semibold text-slate-200">Daily Goal Target</span>
            </div>
            <div className="flex items-center gap-4">
                <input 
                    type="range" 
                    min="0.5" 
                    max="12" 
                    step="0.5"
                    value={targetHours}
                    onChange={handleTargetHoursChange}
                    className="flex-1 h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="font-mono text-xl font-bold w-16 text-right">{targetHours}h</div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Adjust your daily study hours target.</p>
        </div>

        {/* Danger Zone */}
        <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 mt-8">
            <div className="flex items-center gap-2 mb-4 text-red-400">
                <AlertCircle size={20} />
                <h3 className="font-bold uppercase tracking-wider text-xs">Danger Zone</h3>
            </div>
            
            <div className="space-y-3">
                <button 
                    onClick={requestClearToday}
                    className="w-full flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all group"
                >
                    <div className="text-left">
                        <span className="block font-semibold text-slate-200 group-hover:text-red-200">Clear Today's History</span>
                        <span className="text-xs text-slate-500 group-hover:text-red-300/60">Removes sessions & goals for today</span>
                    </div>
                    <Trash2 size={18} className="text-slate-600 group-hover:text-red-400" />
                </button>

                <button 
                    onClick={requestClearAll}
                    className="w-full flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-red-500/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all group"
                >
                    <div className="text-left">
                        <span className="block font-semibold text-slate-200 group-hover:text-red-200">Reset All Progress</span>
                        <span className="text-xs text-slate-500 group-hover:text-red-300/60">Permanently deletes all history</span>
                    </div>
                    <Trash2 size={18} className="text-slate-600 group-hover:text-red-400" />
                </button>
            </div>
        </div>
    </div>
  );

  // Desktop Navigation Component
  const DesktopSidebar = () => {
    const tabs = [
      { id: 'timer', label: 'Focus', icon: Timer },
      { id: 'timeline', label: 'Stats', icon: BarChart3 },
      { id: 'assistant', label: 'Mentor', icon: Sparkles },
      { id: 'calendar', label: 'Plan', icon: CalendarDays },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
      <nav className="flex flex-col gap-4 w-24 flex-none py-8 h-full">
         <div className="flex justify-center mb-8 flex-none">
             <div className={`w-12 h-12 bg-${accent}-500/20 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center shadow-lg shadow-${accent}-500/20`}>
                <Zap size={24} className={`text-${accent}-400 fill-${accent}-400`} />
             </div>
         </div>
         
         <div className="flex-1 space-y-4">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as MobileTab)}
                    className={`w-full flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl transition-all duration-300 group relative
                    ${isActive ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                >
                    {isActive && (
                        <div className={`absolute left-0 w-1 h-8 bg-${accent}-500 rounded-r-full shadow-[0_0_10px_rgba(var(--color-${accent}-500),0.5)]`} />
                    )}
                    <Icon size={24} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="text-[10px] font-medium tracking-wide opacity-80">{tab.label}</span>
                </button>
                )
            })}
         </div>

         {/* Attribution */}
         <div className="flex-none mt-auto pt-4 border-t border-white/5 text-center">
             <p className="text-[9px] text-slate-600 font-mono leading-tight tracking-wider opacity-60 hover:opacity-100 transition-opacity cursor-default">
                Made by<br/>Abu Dhabi<br/>(ABHYUDAY)
             </p>
         </div>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* ZEN MODE PROMPT MODAL */}
      {showZenPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full transform scale-100 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-white mb-2">Enter Zen Mode?</h3>
                <p className="text-slate-400 text-sm mb-6">Would you like to switch to the immersive fullscreen background?</p>
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleZenResponse(false)} 
                        className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium transition-colors"
                    >
                        No
                    </button>
                    <button 
                        onClick={() => handleZenResponse(true)} 
                        className={`flex-1 py-3 rounded-xl bg-${accent}-600 text-white hover:bg-${accent}-500 font-bold transition-colors shadow-lg shadow-${accent}-500/20`}
                    >
                        Yes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* ZEN MODE OVERLAY (Fullscreen) */}
      {isZenActive && (
          <div className="fixed inset-0 z-[50] animate-in fade-in duration-700 bg-black">
              {/* Wallpaper - No Blur, Object Cover */}
              {zenWallpaperUrl && (
                  <img src={zenWallpaperUrl} alt="Zen Background" className="absolute inset-0 w-full h-full object-cover" />
              )}
              {/* Subtle Overlay for contrast */}
              <div className="absolute inset-0 bg-black/20" /> 
              
              {/* Exit Button */}
              <button 
                onClick={() => setIsZenActive(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/50 hover:text-white transition-all z-[60]"
              >
                  <X size={24} />
              </button>

              {/* Timer Container - Bottom Center */}
              <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end items-center pb-12">
                  <div className="pointer-events-auto">
                    <TimerDisplay 
                        elapsedMs={elapsedMs} 
                        status={status} 
                        mode={mode}
                        todaySubjectTotal={currentSubjectTodayTotal}
                        subjectColor={currentSubject.color} 
                        onStart={start} 
                        onPause={pause} 
                        onStop={stop} 
                        onSetMode={setMode}
                        isWallpaperMode={true}
                    />
                  </div>
              </div>
          </div>
      )}

      {/* Ambient Background (Hidden in Zen) */}
      <div className={`fixed inset-0 pointer-events-none ${isZenActive ? 'hidden' : ''}`}>
          <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-${accent}-600/20 blur-[120px] rounded-full mix-blend-screen opacity-50 md:opacity-80 animate-pulse`} style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full mix-blend-screen opacity-50 md:opacity-80" />
          <div className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-violet-600/10 blur-[100px] rounded-full mix-blend-screen opacity-40" />
      </div>

      {isSubjectManagerOpen && (
          <SubjectManager 
            subjects={subjects} 
            onUpdate={refreshSubjects} 
            onClose={() => setIsSubjectManagerOpen(false)} 
          />
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal />

      {/* --- Mobile Layout (< md) --- */}
      <div className={`md:hidden flex flex-col h-[100dvh] relative z-10 ${isZenActive ? 'hidden' : ''}`}>
        <div className="flex-none px-4 pt-4 transition-all">
           <Header />
        </div>
        
        <main className="flex-1 relative overflow-hidden flex flex-col">
           {activeTab === 'timer' && (
             <div className="flex-1 flex flex-col px-4 relative overflow-y-auto no-scrollbar">
                
                {/* Standard Timer View */}
                <div className="flex-none mt-2 mb-2 relative z-10">
                  <SubjectPicker subjects={subjects} selectedId={currentSubjectId} onSelect={setSubjectId} disabled={status !== 'idle'} variant="horizontal" />
                </div>
                
                <div className="flex-1 flex flex-col relative z-10 justify-center items-center pb-24">
                  <TimerDisplay 
                    elapsedMs={elapsedMs} 
                    status={status} 
                    mode={mode}
                    todaySubjectTotal={currentSubjectTodayTotal}
                    subjectColor={currentSubject.color} 
                    onStart={handleStartRequest} 
                    onPause={pause} 
                    onStop={stop} 
                    onSetMode={setMode}
                    isWallpaperMode={false}
                  />
                  
                  {/* Re-enter Zen Mode Button (if enabled but closed manually) */}
                  {enableZenMode && zenWallpaperUrl && status === 'running' && !isZenActive && (
                      <button 
                        onClick={() => setIsZenActive(true)}
                        className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-${accent}-500/10 text-${accent}-400 border border-${accent}-500/20 text-xs font-semibold hover:bg-${accent}-500/20 transition-all`}
                      >
                          <Maximize2 size={14} /> Enter Zen Mode
                      </button>
                  )}
                </div>

                {/* Mobile Floating Goals Button/Indicator */}
                <div className="absolute top-4 right-4 z-20">
                    <button 
                        onClick={() => setActiveTab('calendar')}
                        className="bg-slate-900/60 backdrop-blur border border-white/10 p-2 rounded-full shadow-lg"
                    >
                        <Target size={18} className={`text-${accent}-400`} />
                    </button>
                </div>
                <MobileDrawer />
             </div>
           )}

           {activeTab === 'timeline' && (
             <div className="flex-1 flex flex-col px-4 overflow-y-auto pb-4">
                <div className="flex items-center justify-between mb-4 bg-white/5 backdrop-blur-md border border-white/5 p-3 rounded-xl">
                   <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/10 rounded-lg"><ChevronLeft size={16}/></button>
                   <span className="font-mono font-bold">{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}</span>
                   <button onClick={() => changeDate(1)} className="p-2 hover:bg-white/10 rounded-lg"><ChevronRight size={16}/></button>
                </div>
                <div className="h-[400px] flex-none mb-8">
                   <DailyTimeline sessions={selectedDateSessions} subjects={subjects} className="h-full" />
                </div>
                <HistoryList 
                    sessions={selectedDateSessions} 
                    subjects={subjects} 
                    lifetimeTotalMs={lifetimeTotalMs}
                    averageSessionMs={averageSessionMs}
                />
             </div>
           )}

           {activeTab === 'assistant' && (
             <div className="flex-1 flex flex-col overflow-hidden">
                <AIAssistant subjects={subjects} currentSubjectId={currentSubjectId} />
             </div>
           )}

           {activeTab === 'calendar' && (
             <div className="flex-1 px-4 overflow-y-auto pt-4">
               <HeatmapCalendar sessions={allSessions} currentDate={calendarMonth} selectedDate={selectedDate} onDateSelect={setSelectedDate} onPrevMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} onNextMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} />
               <div className="mt-8">
                 <GoalChecklist 
                    dailyTotalMs={dailyTotalMs} 
                    goals={dailyGoals}
                    onGoalUpdate={loadGoals}
                    selectedDate={selectedDate}
                    targetHours={targetHours}
                 />
               </div>
             </div>
           )}
           
           {activeTab === 'settings' && (
             <div className="flex-1 p-6 overflow-y-auto">
               <h2 className="text-xl font-bold mb-6">Settings</h2>
               <SettingsContent />
               <div className="mt-12 text-center pb-8">
                 <p className="text-slate-500 text-[10px] font-mono font-medium tracking-wide">
                    Made by Abu Dhabi (ABHYUDAY)
                 </p>
               </div>
             </div>
           )}
        </main>
        
        <MobileNav activeTab={activeTab} setTab={setActiveTab} />
      </div>


      {/* --- Desktop Layout (>= md) --- */}
      <div className={`hidden md:flex h-screen w-full max-w-[1920px] mx-auto p-6 gap-8 relative z-10 ${isZenActive ? 'hidden' : ''}`}>
         <DesktopSidebar />

         {/* Main Glass Panel */}
         <main className="flex-1 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col p-8 transition-all duration-500">
            {/* Top Bar inside glass */}
            <div className="flex justify-between items-center mb-4 flex-none z-30 relative transition-opacity">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                   {activeTab === 'timer' && 'Focus Session'}
                   {activeTab === 'timeline' && 'Your Progress'}
                   {activeTab === 'assistant' && 'AI Mentor'}
                   {activeTab === 'calendar' && 'Plan & Track'}
                   {activeTab === 'settings' && 'Preferences'}
                   <span className="text-sm font-normal text-slate-400 bg-white/5 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
                      {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                   </span>
                </h2>
                <div className="flex gap-4">
                     {activeTab === 'timeline' && (
                        <div className="flex items-center bg-white/5 rounded-xl border border-white/5 p-1">
                            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><ChevronLeft size={16}/></button>
                            <span className="px-4 font-mono font-bold text-sm">{selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}</span>
                            <button onClick={() => changeDate(1)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"><ChevronRight size={16}/></button>
                        </div>
                     )}
                     <button 
                        onClick={handleSync}
                        disabled={!isOnline || isSyncing}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border backdrop-blur-md transition-all ${isOnline ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}
                    >
                        {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                        <span className="">{isSyncing ? 'Syncing...' : isOnline ? 'Connected' : 'Offline'}</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden flex flex-col">
                {activeTab === 'timer' && (
                    <div className="h-full flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                        
                        {/* Top: Subject Picker Section */}
                        <div className="flex-none py-2 flex justify-center relative z-20">
                            <div className="bg-slate-900/30 backdrop-blur-md border border-white/10 rounded-2xl p-2 shadow-xl max-w-[95%]">
                                <SubjectPicker subjects={subjects} selectedId={currentSubjectId} onSelect={setSubjectId} disabled={status !== 'idle'} variant="horizontal" />
                            </div>
                        </div>

                        {/* Main Body */}
                        <div className="flex-1 flex flex-col relative rounded-3xl mt-6 z-10 justify-center items-center">
                            <TimerDisplay 
                                elapsedMs={elapsedMs} 
                                status={status} 
                                mode={mode}
                                todaySubjectTotal={currentSubjectTodayTotal}
                                subjectColor={currentSubject.color} 
                                onStart={handleStartRequest} 
                                onPause={pause} 
                                onStop={stop} 
                                onSetMode={setMode}
                                isWallpaperMode={false}
                                sidePanel={
                                    <div 
                                        className={`transition-all duration-500 ease-in-out flex flex-col bg-slate-900/30 backdrop-blur-sm rounded-3xl border border-white/5 overflow-hidden
                                        ${isSidePanelCollapsed ? 'w-14' : 'w-80'} h-full hover:bg-slate-900/40`}
                                    >
                                        {/* Side Panel Header */}
                                        <div className="flex-none flex items-center justify-between p-3 border-b border-white/5">
                                            {!isSidePanelCollapsed && (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setFocusSideView('goals')}
                                                        className={`text-xs px-2 py-1 rounded-md transition-colors ${focusSideView === 'goals' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        Goals
                                                    </button>
                                                    <button 
                                                        onClick={() => setFocusSideView('ai')}
                                                        className={`text-xs px-2 py-1 rounded-md transition-colors ${focusSideView === 'ai' ? `bg-${accent}-500/20 text-${accent}-300` : 'text-slate-500 hover:text-slate-300'}`}
                                                    >
                                                        AI Chat
                                                    </button>
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)}
                                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 ml-auto"
                                                title={isSidePanelCollapsed ? "Expand" : "Collapse"}
                                            >
                                                {isSidePanelCollapsed ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
                                            </button>
                                        </div>

                                        {/* Side Panel Content */}
                                        {!isSidePanelCollapsed ? (
                                            <div className="flex-1 overflow-hidden relative">
                                                {focusSideView === 'goals' ? (
                                                    <div className="absolute inset-0 p-4 overflow-y-auto custom-scrollbar">
                                                        <GoalChecklist 
                                                            dailyTotalMs={dailyTotalMs}
                                                            goals={dailyGoals}
                                                            onGoalUpdate={loadGoals}
                                                            selectedDate={new Date().toISOString().split('T')[0]} 
                                                            targetHours={targetHours}
                                                            variant="compact"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="absolute inset-0 p-2">
                                                        <QuickAIAssistant subjects={subjects} />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Collapsed View Icons */
                                            <div className="flex-1 flex flex-col items-center gap-4 pt-4">
                                                <button 
                                                    onClick={() => { setFocusSideView('goals'); setIsSidePanelCollapsed(false); }}
                                                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
                                                >
                                                    <CheckSquare size={20} />
                                                </button>
                                                <button 
                                                    onClick={() => { setFocusSideView('ai'); setIsSidePanelCollapsed(false); }}
                                                    className={`p-2 rounded-xl text-${accent}-400 hover:text-${accent}-300 hover:bg-white/10`}
                                                >
                                                    <Sparkles size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                            
                            {/* Re-enter Zen Mode Button (if enabled but closed manually) */}
                            {enableZenMode && zenWallpaperUrl && status === 'running' && !isZenActive && (
                                <button 
                                    onClick={() => setIsZenActive(true)}
                                    className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-${accent}-500/10 text-${accent}-400 border border-${accent}-500/20 text-xs font-semibold hover:bg-${accent}-500/20 transition-all`}
                                >
                                    <Maximize2 size={14} /> Enter Zen Mode
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="h-full grid grid-cols-12 gap-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="col-span-8 bg-black/20 rounded-3xl border border-white/5 p-6 overflow-hidden flex flex-col">
                             <DailyTimeline sessions={selectedDateSessions} subjects={subjects} className="h-full" />
                        </div>
                        <div className="col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
                             <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex-none">
                                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Daily Focus</h3>
                                <div className="text-4xl font-mono font-bold text-white mb-6">{(dailyTotalMs / 3600000).toFixed(1)}<span className="text-lg text-slate-500 ml-1">hrs</span></div>
                                <div className="pt-4 border-t border-white/5">
                                    <SubjectDonut sessions={selectedDateSessions} subjects={subjects} />
                                </div>
                             </div>
                             <div className="bg-white/5 rounded-3xl p-6 border border-white/5 flex-1">
                                <HistoryList 
                                    sessions={selectedDateSessions} 
                                    subjects={subjects} 
                                    lifetimeTotalMs={lifetimeTotalMs}
                                    averageSessionMs={averageSessionMs}
                                />
                             </div>
                        </div>
                    </div>
                )}

                {activeTab === 'assistant' && (
                    <div className="h-full animate-in slide-in-from-right-4 duration-500">
                        <AIAssistant subjects={subjects} currentSubjectId={currentSubjectId} />
                    </div>
                )}

                {activeTab === 'calendar' && (
                    <div className="h-full grid grid-cols-12 gap-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="col-span-7 bg-white/5 rounded-3xl border border-white/5 p-8">
                            <HeatmapCalendar sessions={allSessions} currentDate={calendarMonth} selectedDate={selectedDate} onDateSelect={setSelectedDate} onPrevMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} onNextMonth={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} />
                        </div>
                        <div className="col-span-5 bg-white/5 rounded-3xl border border-white/5 p-8">
                             <GoalChecklist 
                                dailyTotalMs={dailyTotalMs} 
                                goals={dailyGoals}
                                onGoalUpdate={loadGoals}
                                selectedDate={selectedDate}
                                targetHours={targetHours}
                             />
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="h-full w-full overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-500">
                        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-8 p-4 md:p-8">
                            
                            {/* Left Column: Visuals & Preferences */}
                            <div className="flex flex-col gap-8">
                                
                                {/* Theme / Appearance */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden group min-h-[400px]">
                                     <div className={`absolute top-0 right-0 p-40 bg-${accent}-500/10 rounded-full blur-3xl -mr-20 -mt-20 transition-all duration-700 opacity-50 group-hover:opacity-100`} />
                                     
                                     <div className="relative z-10 flex flex-col h-full">
                                         <div className="flex items-center gap-4 mb-2 flex-none">
                                             <div className={`p-3 bg-${accent}-500/20 rounded-2xl text-${accent}-400`}>
                                                 <Palette size={28} />
                                             </div>
                                             <div>
                                                 <h3 className="text-2xl font-bold text-white">Interface Theme</h3>
                                                 <p className="text-slate-400 text-sm">Select your preferred accent color</p>
                                             </div>
                                         </div>
                                         
                                         <div className="flex-1 flex items-center justify-center">
                                             <div className="grid grid-cols-4 gap-4 w-full max-w-md">
                                                {ACCENT_COLORS.map(color => (
                                                    <button
                                                        key={color.id}
                                                        onClick={() => setAccent(color.id)}
                                                        className={`
                                                            relative aspect-square rounded-2xl transition-all duration-300 flex items-center justify-center group/btn
                                                            ${color.colorClass}
                                                            ${accent === color.id ? 'ring-4 ring-white/20 scale-110 shadow-xl' : 'opacity-60 hover:opacity-100 hover:scale-105'}
                                                        `}
                                                        title={color.label}
                                                    >
                                                        {accent === color.id && (
                                                            <div className="text-black bg-white rounded-full p-1 shadow-sm animate-in zoom-in duration-300">
                                                                <CheckSquare size={16} />
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                             </div>
                                         </div>
                                     </div>
                                </div>

                                {/* Zen Mode Settings */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group flex-none">
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
                                                    <ImageIcon size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-white">Enable Zen Mode Feature</h3>
                                                    <p className="text-slate-400 text-sm">Immersive focus background</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={handleZenToggle}
                                                className={`transition-colors ${enableZenMode ? `text-${accent}-400` : 'text-slate-600 hover:text-slate-400'}`}
                                            >
                                                {enableZenMode ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                                            </button>
                                        </div>
                                        
                                        {enableZenMode && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-2">
                                                <input 
                                                    type="text"
                                                    value={zenWallpaperUrl}
                                                    onChange={handleZenUrlChange}
                                                    placeholder="Paste wallpaper URL here..."
                                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                                />
                                                <p className="text-xs text-slate-500 mt-2">
                                                    If enabled, clicking Start Focus will ask if you want to enter a full-screen Zen Mode with this background.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Daily Goal Target */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group flex-none">
                                     <div className="absolute bottom-0 left-0 p-32 bg-emerald-500/5 rounded-full blur-3xl -ml-16 -mb-16 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                                     
                                     <div className="relative z-10">
                                         <div className="flex items-center justify-between mb-8">
                                             <div className="flex items-center gap-4">
                                                 <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                                                     <Target size={24} />
                                                 </div>
                                                 <div>
                                                     <h3 className="text-xl font-bold text-white">Daily Goal</h3>
                                                     <p className="text-slate-400 text-sm">Target study hours</p>
                                                 </div>
                                             </div>
                                             <div className="text-right">
                                                 <span className="text-4xl font-mono font-bold text-white">{targetHours}</span>
                                                 <span className="text-slate-500 text-sm font-medium ml-1">hrs</span>
                                             </div>
                                         </div>
                                         
                                         <div className="px-2">
                                            <input 
                                                type="range" 
                                                min="0.5" 
                                                max="12" 
                                                step="0.5"
                                                value={targetHours}
                                                onChange={handleTargetHoursChange}
                                                className="w-full h-4 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            />
                                            <div className="flex justify-between text-xs text-slate-500 font-mono mt-3 font-medium uppercase tracking-wider">
                                                <span>30 min</span>
                                                <span>12 hours</span>
                                            </div>
                                         </div>
                                     </div>
                                </div>
                            </div>

                            {/* Right Column: Management */}
                            <div className="flex flex-col gap-8">
                                
                                {/* Subject Manager Button */}
                                <button 
                                    onClick={() => setIsSubjectManagerOpen(true)}
                                    className="bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 text-left transition-all group relative overflow-hidden flex flex-col justify-center min-h-[160px] flex-none"
                                >
                                    <div className="absolute top-1/2 right-0 p-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -translate-y-1/2 transition-all duration-700 opacity-50 group-hover:opacity-100 group-hover:bg-indigo-500/20" />
                                    
                                    <div className="relative z-10 flex items-center justify-between w-full">
                                        <div className="flex items-center gap-5">
                                             <div className={`p-4 bg-${accent}-500/20 rounded-2xl text-${accent}-400 group-hover:scale-110 group-hover:rotate-180 transition-all duration-500`}>
                                                <Settings size={32} />
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-white mb-1 group-hover:translate-x-1 transition-transform">Subject Manager</h3>
                                                <p className="text-slate-400 group-hover:text-slate-300 transition-colors">Configure subjects & colors</p>
                                            </div>
                                        </div>
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-white/20 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                           <ChevronRight size={24} />
                                        </div>
                                    </div>
                                </button>

                                {/* Danger Zone */}
                                <div className="bg-red-500/5 backdrop-blur-xl border border-red-500/10 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden hover:border-red-500/20 transition-colors">
                                    <div className="flex items-center gap-3 mb-8 text-red-400 flex-none">
                                        <AlertCircle size={24} />
                                        <h3 className="font-bold text-xl uppercase tracking-wider">Danger Zone</h3>
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col justify-center gap-4">
                                        <button 
                                            onClick={requestClearToday}
                                            className="w-full flex items-center justify-between p-6 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 rounded-3xl transition-all group"
                                        >
                                            <div className="text-left">
                                                <span className="block font-bold text-lg text-red-200 group-hover:text-white transition-colors">Clear Today's Data</span>
                                                <span className="text-xs text-red-400/60 group-hover:text-red-300">Reset sessions & goals for current day</span>
                                            </div>
                                            <div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
                                                <Trash2 size={24} className="text-red-500/70 group-hover:text-red-400 transition-colors" />
                                            </div>
                                        </button>

                                        <button 
                                            onClick={requestClearAll}
                                            className="w-full flex items-center justify-between p-6 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/30 rounded-3xl transition-all group"
                                        >
                                            <div className="text-left">
                                                <span className="block font-bold text-lg text-red-200 group-hover:text-white transition-colors">Factory Reset</span>
                                                <span className="text-xs text-red-400/60 group-hover:text-red-300">Permanently delete all history & data</span>
                                            </div>
                                             <div className="p-3 bg-red-500/10 rounded-xl group-hover:bg-red-500/20 transition-colors">
                                                <Trash2 size={24} className="text-red-500/70 group-hover:text-red-400 transition-colors" />
                                            </div>
                                        </button>
                                    </div>

                                    <div className="mt-8 text-center flex-none">
                                       <p className="text-slate-700 text-[10px] font-mono font-medium tracking-widest uppercase hover:text-slate-500 transition-colors cursor-default select-none">
                                           OMNIFOCUS v1.0 • Built by Abu Dhabi
                                       </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
         </main>
      </div>
    </div>
  );
};

export default App;