"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle, Microphone, SpeakerSlash, SpeakerHigh } from "@phosphor-icons/react";
import DailyCheckInChat from "./DailyCheckInChat";
import { useSakhiChat } from "@/hooks/useSakhiChat";

export type AIState = "idle" | "thinking" | "talking";

interface SakhiAvatarProps {
  aiState: AIState;
  checkInMode?: boolean;
  onCheckInComplete?: (data: any) => void;
  defaultOpen?: boolean;
  onChartUpdate?: (data: any) => void;
  profileName?: string;
}

export default function SakhiAvatar({ aiState, checkInMode = false, onCheckInComplete, defaultOpen = false, onChartUpdate, profileName }: SakhiAvatarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [inputVal, setInputVal] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { messages, isLoading, sendMessage, speakText, isSpeaking, stopSpeaking, autoPlayVoice, toggleAutoPlayVoice } = useSakhiChat(onChartUpdate || (() => {}), profileName);

  // Preload doll assets immediately so they are cached in memory and never flicker/reload
  useEffect(() => {
    if (typeof window !== "undefined") {
      const img1 = new window.Image();
      img1.src = "/sakhi-doll.png";
      const img2 = new window.Image();
      img2.src = "/sakhi-doll-open.png";
    }
  }, []);

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
          setInputVal(transcript);
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
      setInputVal("");
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const isDollTalking = (aiState === "talking" || isSpeaking) && autoPlayVoice;

  // Lip-sync animation logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDollTalking) {
      interval = setInterval(() => {
        // Randomize the flapping a bit so it looks more natural than a strict metronome
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

      <div className="w-full md:w-2/3 flex flex-col h-[400px] bg-white/70 rounded-[2rem] border border-pink-100/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_12px_rgba(244,114,182,0.06)] p-6 overflow-hidden">
        
        {checkInMode ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 w-full">
            <DailyCheckInChat onComplete={onCheckInComplete || (() => {})} profileName={profileName} />
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar mb-4 flex flex-col gap-4 pr-2">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-4 text-pink-400">
                    <Sparkle weight="duotone" className="w-8 h-8" />
                  </div>
                  <h4 className="text-2xl font-medium text-[#2D1B36] flex items-center justify-center gap-2">
                    Hi {profileName || 'there'} <span className="inline-block animate-bounce">👋</span>
                  </h4>
                </div>
              )}
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`max-w-[85%] p-4 rounded-2xl text-base shadow-sm border border-white/40 ${
                    m.role === 'user' 
                      ? 'bg-pink-100/90 text-pink-900 self-end rounded-tr-sm' 
                      : 'bg-white/90 backdrop-blur-md text-[#2D1B36] self-start rounded-tl-sm'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {isLoading && (
                <div className="bg-white/90 backdrop-blur-md text-[#2D1B36] self-start rounded-2xl rounded-tl-sm p-4 shadow-sm border border-white/40 flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
            
            {/* Input Area */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputVal);
                setInputVal("");
              }} 
              className="relative shrink-0 mt-auto"
            >
              <div className="relative w-full">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Type your question or speak to me..."
                  className="w-full bg-white/60 border border-[#2D1B36]/10 rounded-2xl pl-5 pr-32 py-4 text-[#2D1B36] placeholder:text-[#2D1B36]/40 focus:outline-none focus:ring-2 focus:ring-pink-300/50 transition-all text-base shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
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
                    type="submit" 
                    disabled={!inputVal.trim() || isLoading}
                    className="p-2.5 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors disabled:opacity-50 disabled:bg-[#2D1B36]/10 disabled:text-[#2D1B36]/30 shadow-md"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
