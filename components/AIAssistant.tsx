import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Sparkles, GraduationCap, Calendar, Plus, Trash2, BookOpen, Bot, Clock, UserCog, Check, Brain, Zap, Coffee, UserPen, X, Save, MessageSquare, Sun, Moon, Sunset, Quote } from 'lucide-react';
import { Subject, Exam, ChatMessage, isHexColor } from '../types';
import { dbService } from '../services/db';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAssistantProps {
  subjects: Subject[];
  currentSubjectId?: string;
}

export interface Personality {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon?: React.FC<any>; 
  color?: string;
  isCustom?: boolean;
}

const FALLBACK_QUOTES = [
    "Focus on the step in front of you, not the whole staircase.",
    "The only way to do great work is to love what you do.",
    "It always seems impossible until it's done.",
    "Don't watch the clock; do what it does. Keep going.",
    "Success is the sum of small efforts, repeated day in and day out.",
    "Believe you can and you're halfway there.",
    "Your future is created by what you do today, not tomorrow."
];

export const DEFAULT_PERSONALITIES: Personality[] = [
  {
    id: 'friendly',
    name: 'Study Buddy',
    icon: Coffee,
    color: 'text-amber-400',
    description: 'Encouraging, empathetic, and cheerful. Focuses on motivation.',
    prompt: 'You are a supportive, empathetic, and cheerful study buddy. Use emojis, be encouraging, and focus on positive reinforcement. Make studying feel less stressful. Address the user as "friend" or "buddy".'
  },
  {
    id: 'strict',
    name: 'Drill Sergeant',
    icon: Zap,
    color: 'text-rose-500',
    description: 'No-nonsense, discipline-focused. Pushes you to stop procrastinating.',
    prompt: 'You are a strict, no-nonsense study coach. Focus on discipline, hard work, and efficiency. Do not sugarcoat things. Call out procrastination immediately. Be direct and concise. Push the student to be their best.'
  },
  {
    id: 'socratic',
    name: 'The Professor',
    icon: Brain,
    color: 'text-indigo-400',
    description: 'Wise and patient. Guides you to deep understanding.',
    prompt: 'You are a wise and patient professor. Do not just give the answer; guide the student by asking leading questions (Socratic method). Focus on deep understanding, critical thinking, and academic rigor.'
  },
  {
    id: 'default',
    name: 'Standard Mentor',
    icon: Bot,
    color: 'text-slate-400',
    description: 'Balanced, helpful, and organized. The default assistant experience.',
    prompt: 'You are a supportive, professional, and organized AI Study Mentor.'
  }
];

export const AIAssistant: React.FC<AIAssistantProps> = ({ subjects, currentSubjectId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
        const saved = localStorage.getItem('omni_chat_history');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Failed to load chat history", e);
        return [];
    }
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [showExamForm, setShowExamForm] = useState(false);
  
  // Personality State
  const [personality, setPersonality] = useState<string>('default');
  const [customPersonalities, setCustomPersonalities] = useState<Personality[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  
  // Custom Personality Creation State
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaDesc, setNewPersonaDesc] = useState('');
  const [newPersonaPrompt, setNewPersonaPrompt] = useState('');

  // Mobile View State
  const [activeView, setActiveView] = useState<'chat' | 'tools'>('chat');
  
  // Time and Quotes
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [currentQuote, setCurrentQuote] = useState<string>('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // New Exam State
  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamSubject, setNewExamSubject] = useState(subjects[0]?.id || '');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamTopics, setNewExamTopics] = useState('');

  const [aiClient, setAiClient] = useState<GoogleGenAI | null>(null);

  const { accent } = useTheme();

useEffect(() => {
    const key = import.meta.env.VITE_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (key) {
      setAiClient(new GoogleGenerativeAI(key));
    }
  }, []);

  useEffect(() => {
    loadData();
    updateTimeOfDay();
  }, []);
    
    // Load Custom Personalities
    const savedCustom = localStorage.getItem('omni_custom_personas');
    if (savedCustom) {
        try {
            setCustomPersonalities(JSON.parse(savedCustom));
        } catch (e) {
            console.error("Failed to parse custom personalities", e);
        }
    }

    // Load Personality Preference
    const savedPersona = localStorage.getItem('omni_ai_personality');
    if (savedPersona) {
        setPersonality(savedPersona);
    } else {
        setShowSelector(true);
    }

    const interval = setInterval(updateTimeOfDay, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Generate quote if no exams
  useEffect(() => {
     if (exams.length === 0) {
         generateMotivationalQuote();
     }
  }, [exams.length, personality, aiClient]);

  // Save chat to localStorage whenever it changes
  useEffect(() => {
      localStorage.setItem('omni_chat_history', JSON.stringify(messages));
  }, [messages]);

  const updateTimeOfDay = () => {
      const hour = new Date().getHours();
      if (hour < 12) setTimeOfDay('morning');
      else if (hour < 18) setTimeOfDay('afternoon');
      else setTimeOfDay('evening');
  };

  const loadData = async () => {
    const loadedExams = await dbService.getExams();
    setExams(loadedExams.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  };

  useEffect(() => {
    if (activeView === 'chat' || window.innerWidth >= 1024) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeView, showSelector]);

  const selectPersonality = (id: string) => {
      setPersonality(id);
      localStorage.setItem('omni_ai_personality', id);
      setShowSelector(false);
      
      const allPersonas = [...DEFAULT_PERSONALITIES, ...customPersonalities];
      const selected = allPersonas.find(p => p.id === id);

      if (messages.length > 0) {
          const infoMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'model',
              text: `*Personality changed to ${selected?.name || 'Unknown'}.*`,
              timestamp: Date.now()
          };
          setMessages(prev => [...prev, infoMsg]);
      }
  };

  const generateMotivationalQuote = async () => {
      if (!aiClient) {
          // Fallback immediately if client not ready or no API key
          setCurrentQuote(FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
          return;
      }

      const allPersonas = [...DEFAULT_PERSONALITIES, ...customPersonalities];
      const selectedPersona = allPersonas.find(p => p.id === personality) || DEFAULT_PERSONALITIES[3];
      
      try {
          const response = await aiClient.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a short, inspiring quote (max 15 words) for a student. ${selectedPersona.prompt}`,
          });
          if (response.text) {
              setCurrentQuote(response.text.trim());
          }
      } catch (e: any) {
          if (e.message?.includes('429') || e.status === 429) {
             console.warn("Quota exceeded for quotes in Assistant. Using fallback.");
          } else {
             console.error("Quote gen failed", e);
          }
          setCurrentQuote(FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
      }
  };

  const handleSaveCustomPersona = () => {
      if (!newPersonaName.trim() || !newPersonaPrompt.trim()) return;

      const newPersona: Personality = {
          id: `custom-${crypto.randomUUID()}`,
          name: newPersonaName.trim(),
          description: newPersonaDesc.trim() || 'Custom personality',
          prompt: newPersonaPrompt.trim(),
          isCustom: true,
          color: 'text-emerald-400'
      };

      const updated = [...customPersonalities, newPersona];
      setCustomPersonalities(updated);
      localStorage.setItem('omni_custom_personas', JSON.stringify(updated));
      
      // Reset and select
      setIsCreatingPersona(false);
      setNewPersonaName('');
      setNewPersonaDesc('');
      setNewPersonaPrompt('');
      selectPersonality(newPersona.id);
  };

  const handleDeleteCustomPersona = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm("Delete this custom personality?")) {
          const updated = customPersonalities.filter(p => p.id !== id);
          setCustomPersonalities(updated);
          localStorage.setItem('omni_custom_personas', JSON.stringify(updated));
          
          if (personality === id) {
              selectPersonality('default');
          }
      }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !aiClient) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const aiMsgId = crypto.randomUUID();
    const placeholderMsg: ChatMessage = {
      id: aiMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, placeholderMsg]);
    
    try {
      const subjectList = subjects.map(s => s.name).join(', ');
      const examList = exams.map(e => `${e.title} (${subjects.find(s => s.id === e.subjectId)?.name}) on ${e.date}. Topics: ${e.topics}`).join('\n');
      const activeSubjectName = subjects.find(s => s.id === currentSubjectId)?.name || "General";
      
      const allPersonas = [...DEFAULT_PERSONALITIES, ...customPersonalities];
      const selectedPersona = allPersonas.find(p => p.id === personality) || DEFAULT_PERSONALITIES[3];

      const systemInstruction = `${selectedPersona.prompt}
      
      Context:
      Current Active Subject: ${activeSubjectName}
      Available Subjects: ${subjectList}
      Upcoming Exams:
      ${examList || "No exams scheduled yet."}
      
      General Rules:
      - When asked for a schedule, provide a time-blocked table.
      - When asked for goals, suggest actionable goals.
      - Refer to the current active subject (${activeSubjectName}) if contextually relevant.
      `;

      const prompt = `${systemInstruction}\n\nUser Question: ${userMsg.text}`;

      const stream = await aiClient.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: prompt, 
      });

      let accumulatedText = '';
      for await (const chunk of stream) {
          const chunkText = chunk.text;
          if (chunkText) {
              accumulatedText += chunkText;
              setMessages(prev => prev.map(msg => 
                  msg.id === aiMsgId ? { ...msg, text: accumulatedText } : msg
              ));
          }
      }
      
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId ? { ...msg, text: "Sorry, I couldn't connect to the AI service. Please check your connection." } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExam = async () => {
      if (!newExamTitle || !newExamDate) return;

      const exam: Exam = {
          id: crypto.randomUUID(),
          title: newExamTitle,
          subjectId: newExamSubject,
          date: newExamDate,
          topics: newExamTopics
      };

      await dbService.saveExam(exam);
      setExams(prev => [...prev, exam].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setShowExamForm(false);
      setNewExamTitle('');
      setNewExamTopics('');
  };

  const handleDeleteExam = async (id: string) => {
      await dbService.deleteExam(id);
      setExams(prev => prev.filter(e => e.id !== id));
  };

  const handleClearChat = async () => {
      if (confirm("Clear chat history?")) {
          setMessages([]);
      }
  };

  const handleQuickAsk = (text: string) => {
      setInput(text);
      setActiveView('chat');
      setTimeout(() => {
          inputRef.current?.focus();
      }, 100);
  };

  const getSubject = (id: string) => subjects.find(s => s.id === id);

  const activePersonaName = [...DEFAULT_PERSONALITIES, ...customPersonalities].find(p => p.id === personality)?.name;
  const currentSubjectName = subjects.find(s => s.id === currentSubjectId)?.name || 'None';
  
  // Calculate days to next exam for status bar
  const nextExam = exams.length > 0 ? exams[0] : null;
  const daysToNextExam = nextExam ? Math.ceil((new Date(nextExam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  // Smart Actions based on Time
  const getSmartActions = () => {
      switch(timeOfDay) {
          case 'morning': return [
              { label: "Plan my day", icon: Clock, prompt: "Create a study schedule for today considering my subjects." },
              { label: "Morning Motivation", icon: Sun, prompt: "Give me a morning motivation boost to start studying." }
          ];
          case 'afternoon': return [
              { label: "Focus Boost", icon: Zap, prompt: "I'm feeling a slump. Give me a quick tip to regain focus." },
              { label: "Concept Review", icon: Brain, prompt: `Quiz me on a key concept from ${currentSubjectName}.` }
          ];
          case 'evening': return [
              { label: "Daily Review", icon: BookOpen, prompt: "Help me review what I might have learned today." },
              { label: "Prep for Tomorrow", icon: Moon, prompt: "How should I prepare for tomorrow's study session?" }
          ];
      }
  };

  const smartActions = getSmartActions();

  return (
    <div className="h-full flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 p-0 lg:p-0">
        
        {/* Mobile View Switcher */}
        <div className="lg:hidden flex-none px-4 pt-2 pb-1">
            <div className="bg-slate-900/80 backdrop-blur border border-white/10 p-1 rounded-2xl flex relative">
                <div 
                    className={`absolute inset-y-1 w-[calc(50%-4px)] bg-${accent}-600 rounded-xl shadow-lg transition-all duration-300 ease-out
                        ${activeView === 'chat' ? 'left-1' : 'left-[calc(50%+4px)]'}
                    `}
                />
                <button
                    onClick={() => setActiveView('chat')}
                    className={`relative flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 z-10 ${activeView === 'chat' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <MessageSquare size={16} /> Chat
                </button>
                <button
                    onClick={() => setActiveView('tools')}
                    className={`relative flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 z-10 ${activeView === 'tools' ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                    <GraduationCap size={16} /> Tools
                </button>
            </div>
        </div>

        {/* LEFT PANEL: Context & Tools */}
        <div className={`
            lg:col-span-4 flex flex-col gap-4 lg:gap-6 overflow-y-auto px-4 pb-4 lg:px-0 lg:pb-0
            ${activeView === 'tools' ? 'flex-1 animate-in slide-in-from-right-8' : 'hidden lg:flex'}
        `}>
            {/* Status Bar */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg flex items-center justify-between">
                <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Active Subject</div>
                    <div className="flex items-center gap-2 font-semibold text-slate-200">
                        <div className={`w-2 h-2 rounded-full ${subjects.find(s => s.id === currentSubjectId)?.color || 'bg-slate-500'}`} />
                        {currentSubjectName}
                    </div>
                </div>
                {nextExam && (
                    <div className="text-right">
                         <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Next Exam</div>
                         <div className={`text-sm font-bold ${daysToNextExam && daysToNextExam <= 3 ? 'text-rose-400' : 'text-slate-200'}`}>
                             {daysToNextExam} days
                         </div>
                    </div>
                )}
            </div>

            {/* Smart Actions */}
            <div className="grid grid-cols-2 gap-3">
                 {smartActions.map((action, i) => (
                     <motion.button
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleQuickAsk(action.prompt)}
                        className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-2xl p-4 text-left transition-colors flex flex-col justify-between h-24"
                     >
                         <action.icon size={20} className={`text-${accent}-400 mb-2`} />
                         <span className="text-xs font-bold text-slate-200">{action.label}</span>
                     </motion.button>
                 ))}
            </div>

            {/* Exam Tracker Card */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl flex-none min-h-[200px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 bg-${accent}-500/20 rounded-xl text-${accent}-400`}>
                            <GraduationCap size={20} />
                        </div>
                        <h3 className="font-bold text-slate-100">Exam Tracker</h3>
                    </div>
                    <button 
                        onClick={() => setShowExamForm(!showExamForm)} 
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 transition-colors"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                {showExamForm && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-800/50 p-4 rounded-xl border border-white/5 mb-4 overflow-hidden"
                    >
                        <input 
                            className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white mb-3 focus:border-${accent}-500 outline-none`}
                            placeholder="Exam Title"
                            value={newExamTitle}
                            onChange={e => setNewExamTitle(e.target.value)}
                        />
                        <select 
                            className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white mb-3 focus:border-${accent}-500 outline-none`}
                            value={newExamSubject}
                            onChange={e => setNewExamSubject(e.target.value)}
                        >
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input 
                            type="date"
                            className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white mb-3 focus:border-${accent}-500 outline-none`}
                            value={newExamDate}
                            onChange={e => setNewExamDate(e.target.value)}
                        />
                        <button 
                            onClick={handleAddExam}
                            className={`w-full bg-${accent}-600 hover:bg-${accent}-500 text-white py-3 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-${accent}-500/20`}
                        >
                            Add Exam
                        </button>
                    </motion.div>
                )}

                <div className="space-y-3 flex-1">
                    {exams.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/10 rounded-xl">
                             <Quote size={24} className="text-slate-600 mb-2" />
                             <p className="text-slate-300 text-sm font-medium italic">"{currentQuote || 'Stay focused and keep learning.'}"</p>
                             <p className="text-slate-500 text-[10px] mt-2 uppercase tracking-wide">- {activePersonaName}</p>
                        </div>
                    ) : (
                        exams.map(exam => {
                            const subject = getSubject(exam.subjectId);
                            const daysLeft = Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            const isClose = daysLeft <= 3 && daysLeft >= 0;

                            return (
                                <div key={exam.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 group relative hover:bg-white/10 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className={`w-2 h-2 rounded-full ${!isHexColor(subject?.color || '') ? (subject?.color || 'bg-slate-500') : ''}`}
                                                style={isHexColor(subject?.color || '') ? { backgroundColor: subject?.color } : {}}
                                            />
                                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{subject?.name}</span>
                                        </div>
                                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${isClose ? 'bg-red-500/20 text-red-300' : 'bg-slate-800 text-slate-400'}`}>
                                            {daysLeft < 0 ? 'Past' : `${daysLeft}d`}
                                        </span>
                                    </div>
                                    <h4 className="font-semibold text-slate-200 mb-1">{exam.title}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Calendar size={12} />
                                        <span>{new Date(exam.date).toLocaleDateString()}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteExam(exam.id)}
                                        className="absolute top-3 right-3 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>

        {/* RIGHT PANEL: CHAT & PERSONA */}
        <div className={`
            lg:col-span-8 flex flex-col bg-slate-900/60 backdrop-blur-xl border-t lg:border border-white/10 rounded-none lg:rounded-3xl shadow-none lg:shadow-2xl overflow-hidden relative
            ${activeView === 'chat' ? 'flex-1 h-full' : 'hidden lg:flex lg:h-auto'}
        `}>
             <AnimatePresence>
            {/* Personality Selector Overlay */}
            {showSelector && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 text-center overflow-hidden"
                >
                    
                    {/* Close Button */}
                    <button 
                        onClick={() => setShowSelector(false)}
                        className="absolute top-4 right-4 p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors z-30"
                    >
                        <X size={20} />
                    </button>

                    {isCreatingPersona ? (
                        /* Creation Form */
                        <div className="w-full max-w-lg bg-slate-900 sm:bg-slate-800 rounded-3xl border border-white/10 p-5 sm:p-6 text-left shadow-2xl flex flex-col h-full sm:h-auto max-h-full overflow-hidden mt-8 sm:mt-0">
                             <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 flex-none">
                                <UserPen size={20} className={`text-${accent}-400`} /> Create Custom Personality
                             </h2>
                             
                             <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-2">
                                 <div>
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Name</label>
                                     <input 
                                        className={`w-full bg-slate-950 sm:bg-slate-900 border border-slate-700 rounded-xl p-3 text-base text-white focus:border-${accent}-500 outline-none`}
                                        placeholder="e.g. Sarcastic Robot"
                                        value={newPersonaName}
                                        onChange={e => setNewPersonaName(e.target.value)}
                                        autoFocus
                                     />
                                 </div>
                                 <div>
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Description</label>
                                     <input 
                                        className={`w-full bg-slate-950 sm:bg-slate-900 border border-slate-700 rounded-xl p-3 text-base text-white focus:border-${accent}-500 outline-none`}
                                        placeholder="Short description of style..."
                                        value={newPersonaDesc}
                                        onChange={e => setNewPersonaDesc(e.target.value)}
                                     />
                                 </div>
                                 <div className="flex-1 min-h-[150px]">
                                     <label className="block text-xs font-bold uppercase text-slate-400 mb-1">System Instructions (Prompt)</label>
                                     <textarea 
                                        className={`w-full bg-slate-950 sm:bg-slate-900 border border-slate-700 rounded-xl p-3 text-base text-white focus:border-${accent}-500 outline-none h-full min-h-[120px] leading-relaxed resize-none`}
                                        placeholder="You are a sarcastic robot study assistant. Use humor, but be helpful. Refer to the user as 'Human'..."
                                        value={newPersonaPrompt}
                                        onChange={e => setNewPersonaPrompt(e.target.value)}
                                     />
                                 </div>
                             </div>
                             
                             <div className="flex justify-end gap-2 pt-4 flex-none border-t border-white/5 mt-2">
                                 <button 
                                    onClick={() => setIsCreatingPersona(false)}
                                    className="px-4 py-3 sm:py-2 text-slate-400 hover:text-white"
                                 >
                                     Cancel
                                 </button>
                                 <button 
                                    onClick={handleSaveCustomPersona}
                                    disabled={!newPersonaName || !newPersonaPrompt}
                                    className={`px-5 py-3 sm:py-2 bg-${accent}-600 hover:bg-${accent}-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-${accent}-500/20`}
                                 >
                                     <Save size={18} /> Save Personality
                                 </button>
                             </div>
                        </div>
                    ) : (
                        /* Selection Grid */
                        <>
                            <div className="flex-none flex flex-col items-center mt-8 sm:mt-0">
                                <div className={`w-16 h-16 rounded-2xl bg-${accent}-500/20 flex items-center justify-center mb-4 border border-white/10 shadow-lg shadow-${accent}-500/10 shrink-0`}>
                                    <Bot size={32} className={`text-${accent}-400`} />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Choose Your Mentor</h2>
                                <p className="text-slate-400 mb-6 max-w-md text-sm">Select a personality for your AI assistant.</p>
                            </div>
                            
                            <div className="flex-1 w-full max-w-2xl overflow-y-auto min-h-0 pr-1 custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-safe">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                                    {[...DEFAULT_PERSONALITIES, ...customPersonalities].map(p => {
                                        const Icon = p.icon || UserPen;
                                        const isActive = personality === p.id;
                                        return (
                                            <motion.button 
                                                key={p.id}
                                                onClick={() => selectPersonality(p.id)}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`
                                                    rounded-2xl p-4 text-left transition-all group relative overflow-hidden flex flex-col gap-2
                                                    ${isActive 
                                                        ? `bg-${accent}-500/10 border border-${accent}-500/50 shadow-[0_0_20px_rgba(var(--color-${accent}-500),0.15)]` 
                                                        : 'bg-white/5 border border-white/10 hover:bg-white/10'}
                                                `}
                                            >
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-3">
                                                        <Icon size={22} className={p.color} />
                                                        <h3 className={`font-bold transition-colors text-base ${isActive ? 'text-white' : 'text-slate-200'}`}>{p.name}</h3>
                                                    </div>
                                                    {p.isCustom && (
                                                        <div 
                                                            onClick={(e) => handleDeleteCustomPersona(e, p.id)}
                                                            className="p-2 -mr-2 text-slate-600 hover:text-rose-400 hover:bg-white/10 rounded-lg transition-colors z-10"
                                                        >
                                                            <Trash2 size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-400 leading-relaxed pr-6 line-clamp-2">{p.description}</p>
                                                {isActive && <div className="absolute top-4 right-4 text-emerald-400"><Check size={20}/></div>}
                                            </motion.button>
                                        );
                                    })}
                                    
                                    {/* Create New Button */}
                                    <button 
                                        onClick={() => setIsCreatingPersona(true)}
                                        className={`bg-slate-800/50 hover:bg-slate-800 border-2 border-dashed border-slate-700 hover:border-${accent}-500/50 rounded-2xl p-4 flex flex-row sm:flex-col items-center justify-center gap-3 transition-all group min-h-[80px] sm:min-h-[120px]`}
                                    >
                                        <div className={`w-10 h-10 rounded-full bg-slate-700/50 group-hover:bg-${accent}-500/20 flex items-center justify-center transition-colors`}>
                                            <Plus size={20} className={`text-slate-400 group-hover:text-${accent}-400`} />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-400 group-hover:text-white">Create Custom</span>
                                    </button>
                                </div>
                                
                                <div className="h-16 sm:hidden"></div> {/* Spacer for bottom scroll */}
                            </div>
                        </>
                    )}
                </motion.div>
            )}
            </AnimatePresence>

            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5 flex-none backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-tr from-${accent}-500 to-purple-500 flex items-center justify-center shadow-lg`}>
                        <Bot size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-100 text-sm">AI Study Mentor</h2>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {activePersonaName} Mode
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setShowSelector(true)}
                        className={`p-2 text-slate-500 hover:text-${accent}-400 hover:bg-white/5 rounded-lg transition-colors`}
                        title="Change Personality"
                    >
                        <UserCog size={18} />
                    </button>
                    <button onClick={handleClearChat} className="text-xs text-slate-500 hover:text-rose-400 transition-colors px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg">
                        Clear
                    </button>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/30">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                        <Bot size={48} className="mb-4" />
                        <p className="text-sm font-medium">Hello! I'm here to help you succeed.</p>
                        <p className="text-xs mt-1">Ask me about your schedule, goals, or exams.</p>
                    </div>
                )}
                {messages.map(msg => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={msg.id} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`
                            max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm
                            ${msg.role === 'user' 
                                ? `bg-${accent}-600 text-white rounded-br-sm shadow-${accent}-500/10` 
                                : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/5'}
                        `}>
                            {msg.role === 'model' ? (
                                <div className="markdown-prose whitespace-pre-wrap">
                                    {msg.text || <span className="animate-pulse">...</span>}
                                </div>
                            ) : (
                                msg.text
                            )}
                        </div>
                    </motion.div>
                ))}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 lg:p-4 bg-white/5 border-t border-white/5 flex-none pb-safe">
                <div className="relative flex items-center">
                    <input
                        ref={inputRef}
                        className={`w-full bg-slate-900 border border-slate-700 rounded-2xl py-3 pl-4 pr-12 text-base lg:text-sm text-white focus:outline-none focus:border-${accent}-500/50 transition-colors shadow-inner`}
                        placeholder="Ask for a schedule, tips, or help..."
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !isLoading && handleSendMessage()}
                        disabled={isLoading}
                    />
                    <button 
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isLoading}
                        className={`absolute right-2 p-2 bg-${accent}-600 hover:bg-${accent}-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-all shadow-lg shadow-${accent}-500/20`}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
