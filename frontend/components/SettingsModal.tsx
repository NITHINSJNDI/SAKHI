"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Baby, Clock, CheckCircle, ArrowsLeftRight } from '@phosphor-icons/react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: void | any;
  mode: 'her' | 'pregnancy';
  currentData: any; // The profile data
}

export default function SettingsModal({ isOpen, onClose, mode, currentData }: SettingsModalProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<any>({});
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(currentData || {});
      const storedVoice = localStorage.getItem('sakhi_voice_enabled');
      setVoiceEnabled(storedVoice !== 'false');
    }
  }, [isOpen, currentData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Save voice setting
    localStorage.setItem('sakhi_voice_enabled', voiceEnabled.toString());
    const trimmedName = formData.preferred_name ? formData.preferred_name.trim() : '';
    if (trimmedName) {
      localStorage.setItem('sakhi_preferred_name', trimmedName);
      if (typeof document !== 'undefined') {
        document.cookie = `sakhi_preferred_name=${encodeURIComponent(trimmedName)}; path=/; max-age=31536000`;
        const cookies = document.cookie.split(';');
        for (const c of cookies) {
          const trimmed = c.trim();
          if (trimmed.startsWith('sakhi_preg_profile_') || trimmed.startsWith('sakhi_her_profile_')) {
            const eqPos = trimmed.indexOf('=');
            const cookieName = eqPos > -1 ? trimmed.substring(0, eqPos) : trimmed;
            try {
              const parsed = JSON.parse(decodeURIComponent(trimmed.substring(eqPos + 1)));
              parsed.preferred_name = trimmedName;
              document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(parsed))}; path=/; max-age=31536000`;
            } catch (err) {}
          }
        }
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('sakhi-name-updated', { detail: { name: trimmedName } }));
        window.dispatchEvent(new CustomEvent('sakhi_name_updated', { detail: { name: trimmedName } }));
      }
    }
    
    // Save profile data
    try {
      await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, profile: formData })
      });
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
        window.location.reload(); // Quickest way to refresh all components and charts
      }, 1000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestartSetup = () => {
    // Clear all profile cookies to force onboarding
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
      if (name.startsWith("sakhi_her_profile") || name.startsWith("sakhi_preg_profile")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    }
    router.push("/onboarding");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-full max-w-lg bg-white border-2 border-pink-200/90 shadow-[0_20px_60px_rgba(244,114,182,0.22)] z-50 rounded-3xl md:rounded-[2.5rem] overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-4 sm:p-6 border-b border-black/5 flex items-center justify-between bg-pink-50/50 shrink-0">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#2D1B36]">Settings</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 text-[#2D1B36]/60">
                <X weight="bold" className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              
              {/* Voice Settings */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-[#2D1B36] flex items-center gap-2 mb-3 sm:mb-4">
                  <User weight="duotone" className="text-pink-500" /> Sakhi Voice
                </h3>
                <div className="flex items-center justify-between p-3.5 sm:p-4 bg-gray-50 rounded-2xl border border-black/5">
                  <div>
                    <p className="font-medium text-sm sm:text-base text-[#2D1B36]">Auto-Play Voice</p>
                    <p className="text-xs sm:text-sm text-[#2D1B36]/60">Sakhi will read her replies aloud.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const next = !voiceEnabled;
                      setVoiceEnabled(next);
                      localStorage.setItem('sakhi_voice_enabled', next.toString());
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('sakhi-voice-toggled', { detail: { enabled: next } }));
                        if (!next && window.speechSynthesis) {
                          window.speechSynthesis.cancel();
                        }
                      }
                    }}
                    className={`w-12 sm:w-14 h-7 sm:h-8 rounded-full p-1 transition-colors ${voiceEnabled ? 'bg-pink-500' : 'bg-gray-200'}`}
                  >
                    <div className={`w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-white shadow-sm transition-transform ${voiceEnabled ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              {/* Profile Data - Only Name can be changed */}
              <div>
                <h3 className="text-base sm:text-lg font-medium text-[#2D1B36] flex items-center gap-2 mb-3 sm:mb-4">
                  <User weight="duotone" className="text-pink-500" /> 
                  Personal Profile
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-[#2D1B36]/80 mb-1">Preferred Name</label>
                    <input 
                      type="text" name="preferred_name"
                      value={formData.preferred_name || ''} 
                      onChange={handleChange}
                      placeholder="Enter your name"
                      className="w-full p-3 rounded-xl border border-black/10 focus:ring-2 focus:ring-pink-300 outline-none text-sm sm:text-base"
                    />
                    <p className="text-[11px] sm:text-xs text-[#2D1B36]/50 mt-1">
                      Sakhi will address you with this name in your conversations and dashboards.
                    </p>
                  </div>
                </div>
              </div>

              {/* Switch to Mom Mode - Dedicated Square Box */}
              <div className="pt-2">
                <div className="p-4 sm:p-5 rounded-2xl border-2 border-pink-200/90 bg-pink-50/60 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ArrowsLeftRight weight="bold" className="text-pink-600 w-5 h-5" />
                    <h3 className="text-sm sm:text-base font-semibold text-[#2D1B36]">
                      {mode === 'her' ? 'Switch to Mom Mode' : 'Switch to Her Mode'}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#2D1B36]/70 mb-3 sm:mb-4 leading-relaxed">
                    {mode === 'her' 
                      ? 'Transition your dashboard to pregnancy wellness tracking, weekly baby progress, and maternal care.' 
                      : 'Transition back to cycle rhythm, ovulation prediction, and hormonal balance.'}
                  </p>
                  <button 
                    type="button"
                    onClick={() => {
                      onClose();
                      const targetMode = mode === 'her' ? 'mom' : 'her';
                      const activeTarget = mode === 'her' ? 'pregnancy' : 'her';
                      localStorage.setItem('sakhi_active_mode', activeTarget);
                      document.cookie = `sakhi_active_mode=${activeTarget}; path=/; max-age=31536000`;
                      router.push(`/onboarding?mode=${targetMode}&switch=true`);
                    }}
                    className="w-full py-3 sm:py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer group text-sm sm:text-base"
                  >
                    <Baby weight="bold" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="tracking-wide">
                      {mode === 'her' ? 'Switch to Mom Mode' : 'Switch to Her Mode'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-black/5 bg-gray-50 flex items-center justify-end shrink-0">
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-medium text-[#2D1B36]/70 hover:bg-black/5 transition-colors cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleSave} disabled={isSaving || showSuccess} className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm sm:text-base font-medium text-white bg-pink-500 hover:bg-pink-600 transition-colors flex items-center gap-2 cursor-pointer">
                  {showSuccess ? <><CheckCircle weight="bold" /> Saved!</> : (isSaving ? "Saving..." : "Save Changes")}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
