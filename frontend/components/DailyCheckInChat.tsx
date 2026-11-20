"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkle, CheckCircle } from "@phosphor-icons/react";
import { useLanguage } from "@/context/LanguageContext";
import type { CycleStatus, Phase } from "@/lib/cyclePhase";

/** Where she is in her cycle today, so the check-in only asks what matters now. */
export interface CheckInContext {
  phase: Phase;
  status: CycleStatus;
  cycleDay: number;
  bleedingDay: number | null;
  usualPeriodLength: number;
  daysUntilPeriod: number;
  late: boolean;
  daysLate: number;
}

interface DailyCheckInChatProps {
  onComplete: (data: any) => void;
  profileName?: string;
  context?: CheckInContext;
}

type Step = "flow" | "pain" | "mood" | "sleep" | "symptoms";
const STEPS: Step[] = ["flow", "pain", "mood", "sleep", "symptoms"];

const NO_BLEED = new Set(["None", "No", "Not yet", "Stopped"]);
const isBleeding = (flow: string | null) => Boolean(flow) && !NO_BLEED.has(flow!) && flow !== "Spotting";

const SYMPTOMS_BY_PHASE: Record<Phase, string[]> = {
  menstrual: ["Back Pain", "Fatigue", "Headache", "Bloating", "Nausea", "Dizziness"],
  follicular: ["Acne", "Headache", "Fatigue", "Discharge Changes"],
  ovulatory: ["Ovulation Pain", "Discharge Changes", "Breast Tenderness", "Bloating", "Headache"],
  luteal: ["Bloating", "Breast Tenderness", "Cravings", "Acne", "Headache", "Fatigue"],
};
const ALL_SYMPTOMS = ["Fatigue", "Headache", "Bloating", "Acne", "Back Pain", "Nausea", "Breast Tenderness", "Cravings",
  "Ovulation Pain", "Discharge Changes", "Dizziness", "Hair Growth", "Hair Loss"];

const PAIN_CHIPS = [
  { label: "None", value: 0 },
  { label: "Mild", value: 2 },
  { label: "Moderate", value: 5 },
  { label: "Strong", value: 8 },
];

const bubbleBot = "bg-white/70 backdrop-blur-md rounded-2xl rounded-tl-sm p-3 text-sm text-plum-900 shadow-sm self-start max-w-[90%] border border-white/40 mb-2";
const bubbleMe = "bg-pink-100 rounded-2xl rounded-tr-sm p-2 px-4 text-xs font-medium text-pink-900 self-end shadow-sm mb-2";
const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${on ? "bg-plum-900 text-white" : "bg-white/60 text-plum-900 hover:bg-white border border-white/40"}`;

export default function DailyCheckInChat({ onComplete, profileName, context }: DailyCheckInChatProps) {
  const { t } = useLanguage();
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [flow, setFlow] = useState<string | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [sleepHours, setSleepHours] = useState<number>(7.5);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [showAllSymptoms, setShowAllSymptoms] = useState(false);

  const name = profileName || (typeof window !== "undefined" ? localStorage.getItem("sakhi_preferred_name") : null) || "there";
  const phase: Phase = context?.phase ?? "follicular";
  const step = STEPS[stepIdx];
  const next = () => setTimeout(() => setStepIdx(i => i + 1), 300);

  const FLOW_LABEL_MAP: Record<string, string> = {
    "No": t("checkin.optNo"),
    "Spotting": t("checkin.optSpotting"),
    "Light": t("checkin.optLight"),
    "Moderate": t("checkin.optModerate"),
    "Heavy": t("checkin.optHeavy"),
    "Very Heavy": t("checkin.optVeryHeavy"),
    "Stopped": t("checkin.optStopped"),
    "Not yet": t("checkin.optNotYet"),
  };

  const PAIN_OPTIONS = [
    { label: t("checkin.painNone"), value: 0 },
    { label: t("checkin.painMild"), value: 2 },
    { label: t("checkin.painModerate"), value: 5 },
    { label: t("checkin.painStrong"), value: 8 },
  ];

  const MOOD_OPTIONS = [
    { label: t("checkin.moodCalm"), val: "Calm" },
    { label: t("checkin.moodEnergetic"), val: "Energetic" },
    { label: t("checkin.moodHappy"), val: "Happy" },
    { label: t("checkin.moodFatigued"), val: "Fatigued" },
    { label: t("checkin.moodAnxious"), val: "Anxious" },
    { label: t("checkin.moodIrritable"), val: "Irritable" },
    { label: t("checkin.moodSad"), val: "Sad" },
  ];

  const SYMPTOM_MAP: Record<string, string> = {
    "Fatigue": t("checkin.symFatigue"),
    "Headache": t("checkin.symHeadache"),
    "Bloating": t("checkin.symBloating"),
    "Acne": t("checkin.symAcne"),
    "Back Pain": t("checkin.symBackPain"),
    "Nausea": t("checkin.symNausea"),
    "Breast Tenderness": t("checkin.symBreastTenderness"),
    "Cravings": t("checkin.symCravings"),
    "Ovulation Pain": t("checkin.symOvulationPain"),
    "Discharge Changes": t("checkin.symDischargeChanges"),
    "Dizziness": t("checkin.symDizziness"),
    "Hair Growth": t("checkin.symHairGrowth"),
    "Hair Loss": t("checkin.symHairLoss"),
    "None": t("checkin.symNone"),
  };

  // ---- question 1 adapts to where she is in her cycle
  const flowQ = useMemo(() => {
    const flows = ["Spotting", "Light", "Moderate", "Heavy", "Very Heavy"];
    if (context?.bleedingDay) {
      return {
        text: t("checkin.flowPeriodQ", { day: context.bleedingDay }),
        options: ["Stopped", ...flows],
      };
    }
    if (context?.late) {
      const d = context.daysLate;
      return {
        text: t("checkin.flowDueQ", { days: d === 1 ? t("common.yesterday") : `${d} ${t("common.days")}` }),
        options: ["Not yet", ...flows],
      };
    }
    if (phase === "menstrual" || (context && context.daysUntilPeriod <= 2)) {
      return { text: t("checkin.flowNearQ"), options: ["Not yet", ...flows] };
    }
    return { text: t("checkin.flowDefaultQ"), options: ["No", "Spotting", "Light", "Moderate", "Heavy"] };
  }, [context, phase, t]);

  const bleeding = isBleeding(flow);
  const painHint =
    phase === "ovulatory" ? t("checkin.painHintOvulatory")
    : phase === "luteal" && (context?.daysUntilPeriod ?? 99) <= 5 ? t("checkin.painHintLuteal")
    : null;
  const symptomList = showAllSymptoms ? ALL_SYMPTOMS : SYMPTOMS_BY_PHASE[phase];

  const toggleSymptom = (sym: string) => {
    if (sym === "None") return setSymptoms(["None"]);
    setSymptoms(prev => {
      const rest = prev.filter(s => s !== "None");
      return rest.includes(sym) ? rest.filter(s => s !== sym) : [...rest, sym];
    });
  };

  const handleSubmit = () => {
    setDone(true);
    const flowValue = !flow || NO_BLEED.has(flow) ? "None" : flow;
    const syms = symptoms.filter(s => s !== "None");
    if ((pain ?? 0) > 0 && !syms.includes("Cramps") && (bleeding || (pain ?? 0) >= 5)) syms.push("Cramps");
    setTimeout(() => {
      onComplete({
        onPeriod: bleeding ? "Yes" : "No",
        flowIntensity: flowValue,
        crampsSeverity: pain ?? 0,
        symptoms: syms.length ? syms : ["None"],
        mood: mood || "Calm",
        sleepHours,
        weight: null,
      });
    }, 1200);
  };

  const flowLabel = flow ? (NO_BLEED.has(flow) ? (flow === "Stopped" ? t("checkin.flowStoppedMsg") : t("checkin.flowNoBleedMsg")) : `${t("checkin.flowPrefix")} ${FLOW_LABEL_MAP[flow] || flow}`) : "";

  return (
    <div className="flex flex-col gap-4 w-full">
      <AnimatePresence mode="popLayout">
        {/* 1. Bleeding: phrased for her phase */}
        <motion.div key="flow-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col w-full">
          <div className={bubbleBot}>{t("checkin.greeting", { name })} {flowQ.text}</div>
          {step === "flow" && !done ? (
            <div className="flex flex-wrap gap-2 justify-end">
              {flowQ.options.map(opt => (
                <button key={opt} onClick={() => { setFlow(opt); next(); }} className={chip(flow === opt)}>
                  {FLOW_LABEL_MAP[opt] || opt}
                </button>
              ))}
            </div>
          ) : flow && <div className={bubbleMe}>{flowLabel}</div>}
        </motion.div>

        {/* 2. Pain: a slider while bleeding, quick chips on other days */}
        {stepIdx >= 1 && (
          <motion.div key="pain-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col w-full">
            <div className={bubbleBot}>
              {bleeding ? t("checkin.painBleedingQ") : t("checkin.painNonBleedingQ")}
              {!bleeding && painHint && <span className="block text-xs text-plum-900/55 mt-1">{painHint}</span>}
            </div>
            {step === "pain" && !done ? (
              bleeding ? (
                <div className="mt-1 flex flex-col items-end w-full">
                  <input type="range" min="0" max="10" value={pain ?? 0} onChange={e => setPain(parseInt(e.target.value))}
                    aria-label="Cramp strength" className="w-full accent-pink-500 mb-2 cursor-pointer" />
                  <div className="w-full flex justify-between text-[11px] text-plum-900/60 font-medium px-1 mb-3">
                    <span>{t("checkin.painZero")}</span>
                    <span className="font-bold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">{pain ?? 0}/10</span>
                    <span>{t("checkin.painTen")}</span>
                  </div>
                  <button onClick={() => { if (pain === null) setPain(0); setStepIdx(i => i + 1); }} className="px-4 py-1.5 rounded-full bg-plum-900 text-white text-xs font-medium cursor-pointer hover:bg-black">{t("common.next")}</button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 justify-end">
                  {PAIN_OPTIONS.map(c => (
                    <button key={c.label} onClick={() => { setPain(c.value); next(); }} className={chip(pain === c.value)}>{c.label}</button>
                  ))}
                </div>
              )
            ) : pain !== null && <div className={bubbleMe}>{pain === 0 ? t("checkin.painNoPain") : `${t("checkin.painPrefix")} ${pain}/10`}</div>}
          </motion.div>
        )}

        {/* 3. Mood & energy */}
        {stepIdx >= 2 && (
          <motion.div key="mood-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col w-full">
            <div className={bubbleBot}>{t("checkin.moodQ")}</div>
            {step === "mood" && !done ? (
              <div className="flex flex-wrap gap-2 justify-end">
                {MOOD_OPTIONS.map(o => (
                  <button key={o.val} onClick={() => { setMood(o.val); next(); }} className={chip(mood === o.val)}>{o.label}</button>
                ))}
              </div>
            ) : mood && <div className={bubbleMe}>{t("checkin.moodPrefix")} {MOOD_OPTIONS.find(m => m.val === mood)?.label || mood}</div>}
          </motion.div>
        )}

        {/* 4. Sleep */}
        {stepIdx >= 3 && (
          <motion.div key="sleep-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col w-full">
            <div className={bubbleBot}>{t("checkin.sleepQ")}</div>
            {step === "sleep" && !done ? (
              <div className="mt-1 flex flex-col items-end w-full">
                <div className="flex items-center gap-3 w-full mb-3 bg-white/60 p-2 px-3 rounded-xl border border-white/40">
                  <input type="range" min="3" max="12" step="0.5" value={sleepHours} onChange={e => setSleepHours(parseFloat(e.target.value))}
                    aria-label="Hours of sleep" className="w-full accent-pink-500 cursor-pointer" />
                  <span className="font-semibold text-xs text-plum-900 shrink-0 w-16 text-right">{t("checkin.sleepHrs", { hours: sleepHours })}</span>
                </div>
                <button onClick={() => setStepIdx(i => i + 1)} className="px-4 py-1.5 rounded-full bg-plum-900 text-white text-xs font-medium cursor-pointer hover:bg-black">{t("common.next")}</button>
              </div>
            ) : <div className={bubbleMe}>{t("checkin.sleepPrefix")} {t("checkin.sleepHrs", { hours: sleepHours })}</div>}
          </motion.div>
        )}

        {/* 5. Symptoms: the ones common in this phase first */}
        {stepIdx >= 4 && !done && (
          <motion.div key="symptoms-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col w-full">
            <div className={bubbleBot}>{t("checkin.symptomsQ")}</div>
            <div className="mt-1 flex flex-col items-end w-full">
              <div className="flex flex-wrap gap-2 justify-end mb-2">
                {[...symptomList, "None"].map(sym => (
                  <button key={sym} onClick={() => toggleSymptom(sym)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-[background-color,color,box-shadow] cursor-pointer ${symptoms.includes(sym) ? "bg-pink-500 text-white shadow-sm" : "bg-white/60 text-plum-900 hover:bg-white border border-white/40"}`}>
                    {SYMPTOM_MAP[sym] || sym}
                  </button>
                ))}
              </div>
              {!showAllSymptoms && (
                <button onClick={() => setShowAllSymptoms(true)} className="text-[11px] text-plum-900/55 hover:text-plum-900 underline underline-offset-2 mb-3 cursor-pointer">{t("checkin.moreSymptoms")}</button>
              )}
              <button onClick={handleSubmit}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-plum-900 to-pink-950 text-white text-xs font-semibold self-end flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-lg">
                <CheckCircle weight="bold" size={15} /> {t("checkin.completeCheckIn")}
              </button>
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div key="closing-step" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col w-full">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tl-sm p-3 text-sm text-emerald-900 shadow-sm self-start max-w-[90%] flex items-center gap-2">
              <Sparkle weight="fill" className="text-emerald-500 shrink-0" />
              {bleeding && !context?.bleedingDay ? t("checkin.loggedNewCycle") : t("checkin.loggedThanks")}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
