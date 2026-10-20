"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle, CheckCircle, Lightning } from "@phosphor-icons/react";

interface DailyCheckInChatProps {
  onComplete: (data: any) => void;
  profileName?: string;
}

export default function DailyCheckInChat({ onComplete, profileName }: DailyCheckInChatProps) {
  const [step, setStep] = useState(0);

  // Data state
  const [flow, setFlow] = useState<string | null>(null);
  const [cramps, setCramps] = useState<number>(0);
  const [mood, setMood] = useState<string | null>(null);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [symptoms, setSymptoms] = useState<string[]>([]);

  // 1-Tap Quick Log Shortcut
  const handleQuickLog = () => {
    setFlow("None");
    setCramps(0);
    setMood("Calm");
    setSymptoms(["None"]);
    setStep(99); // Closing
    setTimeout(() => {
      onComplete({
        onPeriod: "No",
        flowIntensity: "None",
        crampsSeverity: 0,
        symptoms: ["None"],
        mood: "Calm",
        sleepHours: 8,
        weight: null
      });
    }, 1500);
  };

  const handleFlowSelect = (val: string) => {
    setFlow(val);
    if (val === "None") {
      // SMART SKIP: If not bleeding, skip cramps and go straight to Mood & Energy
      setCramps(0);
      setTimeout(() => setStep(2), 350);
    } else {
      setTimeout(() => setStep(1), 350);
    }
  };

  const toggleSymptom = (sym: string) => {
    if (sym === "None") {
      setSymptoms(["None"]);
      return;
    }
    setSymptoms(prev => {
      const next = prev.filter(s => s !== "None");
      if (next.includes(sym)) return next.filter(s => s !== sym);
      return [...next, sym];
    });
  };

  const handleSubmit = () => {
    setStep(99); // Closing message
    setTimeout(() => {
      onComplete({
        onPeriod: flow !== "None" ? "Yes" : "No",
        flowIntensity: flow,
        crampsSeverity: cramps,
        symptoms: symptoms.length > 0 ? symptoms : ["None"],
        mood: mood || "Calm",
        sleepHours,
        weight: null
      });
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <AnimatePresence mode="popLayout">
        
        {/* Step 0: Flow Check */}
        <motion.div
          key="flow-step"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col w-full"
        >
          <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3 text-sm text-[#2D1B36] shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
            Hi {profileName || (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : null) || 'there'} 👋! 🌸 Let&apos;s do your morning check-in. How is your flow today?
          </div>

          {step === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-end gap-2 w-full">
              <div className="flex flex-wrap gap-2 justify-end">
                {["None", "Spotting", "Light", "Moderate", "Heavy", "Very Heavy"].map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleFlowSelect(opt)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      flow === opt
                        ? "bg-[#2D1B36] text-white"
                        : "bg-white/60 text-[#2D1B36] hover:bg-white border border-white/40"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step > 0 && flow && (
            <div className="bg-pink-100 rounded-2xl rounded-tr-sm p-2 px-4 text-xs font-medium text-pink-900 self-end shadow-sm mb-2">
              Flow: {flow}
            </div>
          )}
        </motion.div>

        {/* Step 1: Cramps (Only if Flow is NOT None) */}
        {flow && flow !== "None" && step >= 1 && (
          <motion.div
            key="cramps-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full"
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3 text-sm text-[#2D1B36] shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
              How severe are your cramps or pain today on a scale of 0 to 10?
            </div>

            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex flex-col items-end w-full">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={cramps}
                  onChange={(e) => setCramps(parseInt(e.target.value))}
                  className="w-full accent-pink-500 mb-2 cursor-pointer"
                />
                <div className="w-full flex justify-between text-[11px] text-[#2D1B36]/60 font-medium px-1 mb-3">
                  <span>0 (None)</span>
                  <span className="font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">{cramps}/10</span>
                  <span>10 (Severe)</span>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-1.5 rounded-full bg-[#2D1B36] text-white text-xs font-medium cursor-pointer hover:bg-black"
                >
                  Next
                </button>
              </motion.div>
            )}

            {step > 1 && (
              <div className="bg-pink-100 rounded-2xl rounded-tr-sm p-2 px-4 text-xs font-medium text-pink-900 self-end shadow-sm mb-2">
                Pain level: {cramps}/10
              </div>
            )}
          </motion.div>
        )}

        {/* Step 2: Mood & Energy */}
        {step >= 2 && (
          <motion.div
            key="mood-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full"
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3 text-sm text-[#2D1B36] shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
              How are you feeling emotionally and physically today?
            </div>

            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2 mt-2 justify-end">
                {[
                  { label: "Calm 😊", val: "Calm" },
                  { label: "Energetic ⚡", val: "Energetic" },
                  { label: "Happy 🌸", val: "Happy" },
                  { label: "Low Energy 😴", val: "Fatigued" },
                  { label: "Anxious 💭", val: "Anxious" },
                  { label: "Irritable 💢", val: "Irritable" },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => { setMood(opt.val); setTimeout(() => setStep(3), 350); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      mood === opt.val
                        ? "bg-[#2D1B36] text-white"
                        : "bg-white/60 text-[#2D1B36] hover:bg-white border border-white/40"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </motion.div>
            )}

            {step > 2 && mood && (
              <div className="bg-pink-100 rounded-2xl rounded-tr-sm p-2 px-4 text-xs font-medium text-pink-900 self-end shadow-sm mb-2">
                Mood: {mood}
              </div>
            )}
          </motion.div>
        )}

        {/* Step 3: Sleep */}
        {step >= 3 && (
          <motion.div
            key="sleep-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full"
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3 text-sm text-[#2D1B36] shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
              How many hours of sleep did you get last night?
            </div>

            {step === 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex flex-col items-end w-full">
                <div className="flex items-center gap-3 w-full mb-3 bg-white/60 p-2 px-3 rounded-xl border border-white/40">
                  <input
                    type="range"
                    min="3"
                    max="12"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                    className="w-full accent-pink-500 cursor-pointer"
                  />
                  <span className="font-semibold text-xs text-[#2D1B36] shrink-0 w-12 text-right">{sleepHours} hrs</span>
                </div>
                <button
                  onClick={() => setStep(4)}
                  className="px-4 py-1.5 rounded-full bg-[#2D1B36] text-white text-xs font-medium cursor-pointer hover:bg-black"
                >
                  Next
                </button>
              </motion.div>
            )}

            {step > 3 && (
              <div className="bg-pink-100 rounded-2xl rounded-tr-sm p-2 px-4 text-xs font-medium text-pink-900 self-end shadow-sm mb-2">
                Sleep: {sleepHours} hrs
              </div>
            )}
          </motion.div>
        )}

        {/* Step 4: Symptoms */}
        {step >= 4 && step !== 99 && (
          <motion.div
            key="symptoms-step"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full"
          >
            <div className="bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3 text-sm text-[#2D1B36] shadow-sm self-start max-w-[90%] border border-white/40 mb-2">
              Almost done! Any physical symptoms today? (Tap all that apply)
            </div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex flex-col items-end w-full">
              <div className="flex flex-wrap gap-2 justify-end mb-3">
                {["Fatigue", "Headache", "Bloating", "Acne", "Backache", "Nausea", "Breast Tenderness", "None"].map(sym => (
                  <button
                    key={sym}
                    onClick={() => toggleSymptom(sym)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      symptoms.includes(sym)
                        ? "bg-pink-500 text-white shadow-sm"
                        : "bg-white/60 text-[#2D1B36] hover:bg-white border border-white/40"
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#2D1B36] to-pink-950 text-white text-xs font-semibold self-end flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg"
              >
                <CheckCircle weight="bold" size={15} /> Complete Check-In
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Closing Confirmation */}
        {step === 99 && (
          <motion.div
            key="closing-step"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col w-full"
          >
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tl-sm p-3 text-sm text-emerald-900 shadow-sm self-start max-w-[90%] flex items-center gap-2">
              <Sparkle weight="fill" className="text-emerald-500 shrink-0" />
              Thank you for checking in! Your dashboard is being updated now 🌸
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
