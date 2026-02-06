import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Send, Bot, Sparkles, MessageSquare } from 'lucide-react';
import { Subject, ChatMessage } from '../types';
import { dbService } from '../services/db';
import { DEFAULT_PERSONALITIES, Personality } from './AIAssistant';
import { useTheme } from '../contexts/ThemeContext';

interface QuickAIAssistantProps {
  subjects: Subject[];
}

export const QuickAIAssistant: React.FC<QuickAIAssistantProps> = ({ subjects }) => {
  // Lazy init from localStorage for persistence
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
  const [aiClient, setAiClient] = useState<GoogleGenAI | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { accent } = useTheme();

  useEffect(() => {
    if (process.env.API_KEY) {
        setAiClient(new GoogleGenAI({ apiKey: process.env.API_KEY }));
    }
    // No longer loading history via async dbService call on mount, handled by lazy init
  }, []);

  // Save chat to localStorage whenever it changes
  useEffect(() => {
      localStorage.setItem('omni_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    // Create placeholder for streaming
    const aiMsgId = crypto.randomUUID();
    const placeholderMsg: ChatMessage = {
      id: aiMsgId,
      role: 'model',
      text: '',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, placeholderMsg]);

    try {
      // Determine personality
      const savedPersonaId = localStorage.getItem('omni_ai_personality') || 'default';
      const customPersonasStr = localStorage.getItem('omni_custom_personas');
      const customPersonas: Personality[] = customPersonasStr ? JSON.parse(customPersonasStr) : [];
      const allPersonas = [...DEFAULT_PERSONALITIES, ...customPersonas];
      const selectedPersona = allPersonas.find(p => p.id === savedPersonaId) || DEFAULT_PERSONALITIES[3];

      const systemInstruction = `
      ${selectedPersona.prompt}
      You are currently in 'Quick Mode' on the student's dashboard. Keep responses concise, helpful, and direct.
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
          msg.id === aiMsgId ? { ...msg, text: "Connection error." } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/5">
            <Sparkles size={14} className={`text-${accent}-400`} />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">AI Assistant</span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs opacity-60">
                    <MessageSquare size={24} className="mb-2" />
                    <p>How can I help you?</p>
                </div>
            )}
            {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                        max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed
                        ${msg.role === 'user' 
                            ? `bg-${accent}-600 text-white rounded-br-sm` 
                            : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/5'}
                    `}>
                        {msg.role === 'model' ? (
                            <span>{msg.text || <span className="animate-pulse">...</span>}</span>
                        ) : (
                            msg.text
                        )}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-2 border-t border-white/5 bg-white/5">
            <div className="relative flex items-center">
                <input
                    className={`w-full bg-slate-900 border border-slate-700/50 rounded-xl py-2 pl-3 pr-9 text-xs text-white focus:outline-none focus:border-${accent}-500/50 placeholder:text-slate-600`}
                    placeholder="Ask AI..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !isLoading && handleSendMessage()}
                    disabled={isLoading}
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className={`absolute right-1.5 p-1.5 text-slate-400 hover:text-${accent}-400 disabled:opacity-50 transition-colors`}
                >
                    <Send size={14} />
                </button>
            </div>
        </div>
    </div>
  );
};