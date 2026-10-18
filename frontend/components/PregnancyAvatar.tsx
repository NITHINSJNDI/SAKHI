"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PaperPlaneRight, X, Sparkle, Microphone, SpeakerSlash, SpeakerHigh } from "@phosphor-icons/react";
import Image from "next/image";
import PregnancyDailyCheckIn from "./PregnancyDailyCheckIn";

export type AIState = "idle" | "listening" | "thinking" | "talking";

interface Message {
  role: "user" | "ai";
  text: string;
}

interface PregnancyAvatarProps {
  aiState?: AIState;
  onChartUpdate?: (data: any) => void;
  pregnancyContext?: any;
  checkInMode?: boolean;
  onCheckInComplete?: (data: any) => void;
  profileName?: string;
  isCheckInCompleted?: boolean;
  onToggleCheckInMode?: () => void;
}

export default function PregnancyAvatar({ 
  aiState = "idle", 
  onChartUpdate, 
  pregnancyContext,
  checkInMode = false,
  onCheckInComplete,
  profileName,
  isCheckInCompleted = false,
  onToggleCheckInMode
}: PregnancyAvatarProps) {
  const [internalState, setInternalState] = useState<AIState>(aiState);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoPlayVoice, setAutoPlayVoice] = useState(true);
  const [currentName, setCurrentName] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : null) || profileName || pregnancyContext?.profile?.preferred_name || 'Mama';
  });
  const [isCompletedToday, setIsCompletedToday] = useState(false);

  // Preload doll assets immediately so they are cached in memory and never flicker/reload
  useEffect(() => {
    if (typeof window !== "undefined") {
      const img1 = new window.Image();
      img1.src = "/sakhi-doll.png";
      const img2 = new window.Image();
      img2.src = "/sakhi-doll-open.png";
    }
  }, []);

  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sakhi_last_checkin_mom') : null;
    const hasLogToday = (pregnancyContext?.logs || []).some((l: any) => (l.log_date || '').split('T')[0] === todayStr);
    if (isCheckInCompleted || stored === todayStr || hasLogToday) {
      setIsCompletedToday(true);
    }
  }, [isCheckInCompleted, pregnancyContext?.logs]);

  useEffect(() => {
    const nextName = (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : null) || profileName || pregnancyContext?.profile?.preferred_name || 'Mama';
    setCurrentName(nextName);
  }, [profileName, pregnancyContext?.profile?.preferred_name]);

  useEffect(() => {
    const handleNameChange = (e: any) => {
      const newName = e.detail?.name;
      if (newName) {
        setCurrentName(newName);
        setMessages(prev => {
          if (prev.length <= 1) {
            return [{
              role: "ai",
              text: `Hi ${newName} 👋! I'm here to support you and your baby. How are you feeling today?`
            }];
          }
          return prev;
        });
      }
    };
    window.addEventListener('sakhi-name-updated', handleNameChange);
    return () => window.removeEventListener('sakhi-name-updated', handleNameChange);
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: `Hi ${(typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : null) || profileName || pregnancyContext?.profile?.preferred_name || 'Mama'} 👋! I'm here to support you and your baby. How are you feeling today?` }
  ]);
  const [inputValue, setInputValue] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Setup Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          setInputValue(transcript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setInputValue("");
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Sync voice setting
  useEffect(() => {
    const checkVoice = () => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('sakhi_voice_enabled') : null;
      if (stored !== null) {
        setAutoPlayVoice(stored !== 'false');
      }
    };
    checkVoice();
    const handleVoiceToggle = (e: any) => {
      if (e.detail && typeof e.detail.enabled === 'boolean') {
        setAutoPlayVoice(e.detail.enabled);
        if (!e.detail.enabled && typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          setInternalState("idle");
        }
      } else {
        checkVoice();
      }
    };
    window.addEventListener('storage', checkVoice);
    window.addEventListener('sakhi-voice-toggled', handleVoiceToggle);
    return () => {
      window.removeEventListener('storage', checkVoice);
      window.removeEventListener('sakhi-voice-toggled', handleVoiceToggle);
    };
  }, []);

  const toggleAutoPlayVoice = () => {
    setAutoPlayVoice(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sakhi_voice_enabled', next.toString());
        window.dispatchEvent(new CustomEvent('sakhi-voice-toggled', { detail: { enabled: next } }));
        if (!next && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          setInternalState("idle");
        }
      }
      return next;
    });
  };

  // Sync external state changes
  useEffect(() => {
    if (aiState !== "idle") setInternalState(aiState);
  }, [aiState]);

  // Auto-scroll chat without moving the main page window
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isExpanded, internalState]);

  const speakText = (text: string) => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('sakhi_voice_enabled') : null;
    const isVoiceAllowed = stored !== 'false' && autoPlayVoice;
    if (!isVoiceAllowed || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      let femaleVoice = voices.find(v => 
        v.name.includes("Google UK English Female") || 
        v.name.includes("Samantha") || 
        v.name.includes("Tessa") ||
        v.name.includes("Victoria") ||
        v.name.includes("Zira")
      );
      if (!femaleVoice) femaleVoice = voices.find(v => v.name.includes("Female"));
      if (femaleVoice) utterance.voice = femaleVoice;
    };
    
    setVoice();
    window.speechSynthesis.onvoiceschanged = setVoice;

    utterance.pitch = 1.5;
    utterance.rate = 0.9;

    utterance.onstart = () => setInternalState("talking");
    utterance.onend = () => setInternalState("idle");
    utterance.onerror = () => setInternalState("idle");

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setInternalState("idle");
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const userMsg = inputValue.trim();
    setInputValue("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInternalState("thinking");

    const effectiveName = (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : null) || currentName || profileName || pregnancyContext?.profile?.preferred_name || 'Mama';

    try {
      const res = await fetch("/api/ask-sakhi-pregnancy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg,
          chatHistory: messages,
          data: pregnancyContext,
          userName: effectiveName
        })
      });
      
      const data = await res.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, { role: "ai", text: data.reply }]);
        speakText(data.reply);
        
        // Simple mock detection for danger signs to trigger UI updates
        const lowerReply = data.reply.toLowerCase();
        if (lowerReply.includes("bleeding") || lowerReply.includes("hospital") || lowerReply.includes("immediately")) {
          onChartUpdate && onChartUpdate({ type: 'emergency', data: true });
        }
      }

      if (data.updatedChartData && onChartUpdate) {
        onChartUpdate(data.updatedChartData);
      }
    } catch (e) {
      console.error(e);
      setInternalState("idle");
    }
  };

  const isDollTalking = internalState === "talking";

  // Lip-sync animation logic
  const [mouthOpen, setMouthOpen] = useState(false);
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDollTalking) {
      interval = setInterval(() => {
        setMouthOpen(prev => (Math.random() > 0.3 ? !prev : prev));
      }, 150);
    } else {
      setMouthOpen(false);
    }
    return () => clearInterval(interval);
  }, [isDollTalking]);

  return (
    <div className="w-full bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-pink-200/80 shadow-[0_8px_30px_rgba(244,114,182,0.14)] p-8 flex flex-col md:flex-row gap-8 mb-8 overflow-hidden relative">
      
      {/* Subtle background glow when talking */}
      {isDollTalking && (
        <div className="absolute inset-0 bg-pink-100/30 animate-pulse pointer-events-none" />
      )}

      {/* Left Column: Doll Avatar */}
      <div className="w-full md:w-1/3 flex flex-col items-center justify-center relative">
        <div
          className="relative w-64 h-64 rounded-full overflow-hidden border-8 border-white shadow-[0_10px_40px_rgba(244,114,182,0.3)] bg-pink-50 select-none"
        >
          {/* Base doll image - always rendered, never unmounts, never disappears */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/sakhi-doll.png" 
            alt="Sakhi Doll" 
            loading="eager"
            decoding="sync"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/sakhi-doll.png";
            }}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
          {/* Mouth open layer - smoothly overlays when speaking via opacity without changing src */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/sakhi-doll-open.png" 
            alt="Sakhi Doll Speaking" 
            loading="eager"
            decoding="sync"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-100 ${
              mouthOpen ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Sparkle weight="duotone" className="text-pink-500 w-6 h-6" />
          <h3 className="text-[#2D1B36] font-semibold text-2xl tracking-tight">Sakhi</h3>
        </div>
      </div>

      {/* Right Column: Chat Interface or Daily Check-in */}
      <div className="w-full md:w-2/3 flex flex-col h-[400px] bg-white/70 rounded-[2rem] border border-pink-100/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_12px_rgba(244,114,182,0.06)] p-6 overflow-hidden">
        {checkInMode ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 w-full flex flex-col">
            <PregnancyDailyCheckIn
              onComplete={(data: any) => {
                setIsCompletedToday(true);
                if (onCheckInComplete) onCheckInComplete(data);
              }}
              profileName={profileName || pregnancyContext?.profile?.preferred_name}
            />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2 shrink-0">
              <span className="text-xs text-ink-soft">Ask Sakhi anything about your baby or health</span>
              {!isCompletedToday && onToggleCheckInMode && (
                <button
                  type="button"
                  onClick={onToggleCheckInMode}
                  className="text-xs px-2.5 py-1 rounded-full bg-pink-100/70 hover:bg-pink-100 text-pink-700 font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sparkle weight="fill" size={12} className="text-pink-500" /> Daily Check-in
                </button>
              )}
            </div>

            {/* Messages Area */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto custom-scrollbar mb-4 flex flex-col gap-4 pr-2">
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`max-w-[85%] p-4 rounded-2xl text-base shadow-sm border border-white/40 ${
                    m.role === 'user' 
                      ? 'bg-pink-100/90 text-pink-900 self-end rounded-tr-sm' 
                      : 'bg-white/90 backdrop-blur-md text-[#2D1B36] self-start rounded-tl-sm'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {internalState === "thinking" && (
                <div className="bg-white/90 backdrop-blur-md text-[#2D1B36] self-start rounded-2xl rounded-tl-sm p-4 shadow-sm border border-white/40 flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
            
            {/* Input Area */}
            <div className="relative shrink-0 mt-auto">
              <div className="relative w-full">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your question or speak to me..."
                  className="w-full bg-white/60 border border-[#2D1B36]/10 rounded-2xl pl-5 pr-24 py-4 text-[#2D1B36] placeholder:text-[#2D1B36]/40 focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition-all text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={toggleAutoPlayVoice}
                    className={`p-2.5 rounded-full transition-all duration-300 ${autoPlayVoice ? 'bg-pink-100 text-pink-600 hover:bg-pink-200 shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    title={autoPlayVoice ? "Auto-play voice is ON (click to mute)" : "Auto-play voice is OFF (click to unmute)"}
                  >
                    {autoPlayVoice ? (
                      <SpeakerHigh weight="fill" className="w-5 h-5" />
                    ) : (
                      <SpeakerSlash weight="fill" className="w-5 h-5" />
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={toggleListening}
                    className={`p-2.5 rounded-full transition-all duration-300 ${isListening ? 'bg-pink-200 text-pink-600 shadow-[0_0_15px_rgba(244,114,182,0.5)] animate-pulse' : 'bg-[#2D1B36]/5 text-[#2D1B36] hover:bg-pink-100 hover:text-pink-600'}`}
                  >
                    <Microphone weight={isListening ? "fill" : "regular"} className="w-5 h-5" />
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSend}
                    disabled={!inputValue.trim() || internalState === "thinking"}
                    className="p-2.5 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:bg-[#2D1B36]/10 disabled:text-[#2D1B36]/30 shadow-md"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
      

