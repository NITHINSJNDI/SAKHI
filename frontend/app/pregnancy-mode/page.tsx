"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import {
  Bell, GearSix, Baby, Drop, Brain, WarningCircle, FilePdf, Heartbeat, ShieldCheck, SignOut,
  Info, CaretDown, CaretUp, CheckCircle, ArrowLeft
} from "@phosphor-icons/react";
import PregnancyAvatar, { AIState } from "@/components/PregnancyAvatar";
import {
  PregnancyWeekProgress,
  BabyGrowthTimeline,
  WeightGainChart,
  BloodPressureChart,
  BloodSugarChart,
  BabyMovementChart,
  AppointmentTimeline,
  MoodTrackerChart,
  NutritionScoreChart,
  PregnancySleepGraph
} from "@/components/charts/PregnancyCharts";
import { usePregnancyNotifications } from "@/hooks/usePregnancyNotifications";
import PregnancyNotificationCenter from "@/components/PregnancyNotificationCenter";
import SettingsModal from "@/components/SettingsModal";

interface RiskExplainFactor {
  title: string;
  detail: string;
  impact: string;
  type: "positive" | "negative" | "neutral";
  source: "Daily Check-in" | "Initial Setup" | "Health Analysis";
}

const getPreeclampsiaExplainability = (
  profile: any,
  logs: any[],
  preeclampsiaMl: any
): { summary: string; factors: RiskExplainFactor[] } => {
  const factors: RiskExplainFactor[] = [];
  const latestBpLog = [...(logs || [])].reverse().find(l => l.blood_pressure_systolic && l.blood_pressure_diastolic);
  const hasLoggedBp = Boolean(latestBpLog);
  const systolic = latestBpLog?.blood_pressure_systolic ? Number(latestBpLog.blood_pressure_systolic) : 120;
  const diastolic = latestBpLog?.blood_pressure_diastolic ? Number(latestBpLog.blood_pressure_diastolic) : 80;
  
  const conditions: string[] = profile?.maternal_conditions || [];
  const hasHypertensionHistory = conditions.some((c: string) => 
    c.toLowerCase().includes("pressure") || c.toLowerCase().includes("hypertension")
  );

  // 1. Systolic BP
  if (systolic >= 140) {
    factors.push({
      title: `High Systolic BP (${systolic} mmHg)`,
      detail: hasLoggedBp 
        ? `Recorded in daily check-in. Reading is above 140 mmHg, reflecting higher arterial pressure.`
        : `Baseline pressure. Log your blood pressure to calibrate your live score.`,
      impact: "High",
      type: "negative",
      source: "Daily Check-in"
    });
  } else if (systolic >= 130) {
    factors.push({
      title: `Elevated Systolic BP (${systolic} mmHg)`,
      detail: hasLoggedBp
        ? `Recorded in daily check-in. Reading is in the elevated range (≥130 mmHg).`
        : `Baseline pressure. Log your blood pressure to calibrate your live score.`,
      impact: "Elevated",
      type: "negative",
      source: "Daily Check-in"
    });
  } else {
    factors.push({
      title: `Optimal Systolic BP (${systolic} mmHg)`,
      detail: hasLoggedBp
        ? `Recorded in daily check-in. Reading is within the healthy normal range (<120 mmHg).`
        : `Standard healthy baseline (<120 mmHg).`,
      impact: "Normal",
      type: "positive",
      source: "Daily Check-in"
    });
  }

  // 2. Diastolic BP
  if (diastolic >= 90) {
    factors.push({
      title: `High Diastolic BP (${diastolic} mmHg)`,
      detail: hasLoggedBp
        ? `Recorded in daily check-in. Reading is at or above 90 mmHg.`
        : `Standard baseline.`,
      impact: "High",
      type: "negative",
      source: "Daily Check-in"
    });
  } else if (diastolic >= 85) {
    factors.push({
      title: `Borderline Diastolic BP (${diastolic} mmHg)`,
      detail: hasLoggedBp
        ? `Recorded in daily check-in. Reading is approaching 90 mmHg.`
        : `Standard baseline.`,
      impact: "Borderline",
      type: "negative",
      source: "Daily Check-in"
    });
  } else {
    factors.push({
      title: `Healthy Diastolic BP (${diastolic} mmHg)`,
      detail: hasLoggedBp
        ? `Recorded in daily check-in. Reading is within the safe range (<80 mmHg).`
        : `Standard healthy baseline (<80 mmHg).`,
      impact: "Normal",
      type: "positive",
      source: "Daily Check-in"
    });
  }

  // 3. Maternal Hypertension History (Setup Data)
  if (hasHypertensionHistory) {
    factors.push({
      title: "Prior Hypertension Noted",
      detail: `Recorded in initial setup. Pre-existing blood pressure variance noted.`,
      impact: "Prior History",
      type: "negative",
      source: "Initial Setup"
    });
  } else {
    factors.push({
      title: "No Prior Hypertension",
      detail: `No history of chronic high blood pressure reported in initial setup.`,
      impact: "Healthy",
      type: "positive",
      source: "Initial Setup"
    });
  }

  // 4. Clinical Health Consensus
  const prob = preeclampsiaMl ? Math.round(preeclampsiaMl.probability * 100) : 0;
  factors.push({
    title: `Comprehensive Risk Assessment (${prob}%)`,
    detail: `Evaluates current blood pressure (${systolic}/${diastolic} mmHg) and health profile against clinical maternal guidelines.`,
    impact: preeclampsiaMl?.risk_level || "Calibrated",
    type: prob >= 55 ? "negative" : prob >= 30 ? "neutral" : "positive",
    source: "Health Analysis"
  });

  return {
    summary: prob >= 55 
      ? "Blood pressure readings are elevated. Rest, minimize sodium, and discuss this reading with your doctor."
      : prob >= 30
      ? "Blood pressure is slightly borderline. Continue regular daily check-ins to monitor trends."
      : "Blood pressure and vascular health are balanced and within normal ranges for your trimester.",
    factors
  };
};

const getGdmExplainability = (
  profile: any,
  logs: any[],
  gdmMl: any,
  weeks: number
): { summary: string; factors: RiskExplainFactor[] } => {
  const factors: RiskExplainFactor[] = [];
  const latestSugarLog = [...(logs || [])].reverse().find(l => l.blood_sugar !== null && l.blood_sugar !== undefined && Number(l.blood_sugar) > 0);
  const hasLoggedSugar = Boolean(latestSugarLog);
  const bloodSugar = latestSugarLog?.blood_sugar ? Number(latestSugarLog.blood_sugar) : 85.0;

  const conditions: string[] = profile?.maternal_conditions || [];
  const hasDiabetesHistory = conditions.some((c: string) => 
    c.toLowerCase().includes("diabetes") || c.toLowerCase().includes("sugar")
  );

  // 1. Fasting Blood Sugar
  if (bloodSugar >= 105) {
    factors.push({
      title: `High Fasting Blood Sugar (${bloodSugar} mg/dL)`,
      detail: hasLoggedSugar
        ? `Recorded in daily check-in. Reading is above the 95 mg/dL benchmark.`
        : `Standard baseline.`,
      impact: "High",
      type: "negative",
      source: "Daily Check-in"
    });
  } else if (bloodSugar >= 95) {
    factors.push({
      title: `Borderline Fasting Sugar (${bloodSugar} mg/dL)`,
      detail: hasLoggedSugar
        ? `Recorded in daily check-in. Reading is hovering near the 95 mg/dL threshold.`
        : `Standard baseline.`,
      impact: "Borderline",
      type: "negative",
      source: "Daily Check-in"
    });
  } else {
    factors.push({
      title: `Optimal Fasting Blood Sugar (${bloodSugar} mg/dL)`,
      detail: hasLoggedSugar
        ? `Recorded in daily check-in. Reading is safely within target range (<95 mg/dL).`
        : `Standard healthy fasting baseline (<95 mg/dL).`,
      impact: "Optimal",
      type: "positive",
      source: "Daily Check-in"
    });
  }

  // 2. Preexisting Diabetes in Setup
  if (hasDiabetesHistory) {
    factors.push({
      title: "Prior Diabetes Noted",
      detail: `Previous glucose sensitivity noted during initial setup.`,
      impact: "Prior History",
      type: "negative",
      source: "Initial Setup"
    });
  } else {
    factors.push({
      title: "No Diabetes History",
      detail: `No metabolic or diabetic conditions noted in initial setup.`,
      impact: "Healthy",
      type: "positive",
      source: "Initial Setup"
    });
  }

  // 3. Gestational Age Context
  const trimesterName = weeks <= 13 ? "First Trimester" : weeks <= 27 ? "Second Trimester" : "Third Trimester";
  factors.push({
    title: `Gestational Stage (${trimesterName}, Week ${weeks})`,
    detail: weeks < 24 
      ? `Standard early pregnancy stage; routine glucose screening typically occurs around weeks 24–28.`
      : `Placental hormones naturally elevate maternal insulin requirements in this stage.`,
    impact: weeks < 24 ? "Low Risk Stage" : "Routine Window",
    type: "neutral",
    source: "Initial Setup"
  });

  // 4. Clinical Health Consensus
  const prob = gdmMl ? Math.round(gdmMl.probability * 100) : 0;
  factors.push({
    title: `Comprehensive Risk Assessment (${prob}%)`,
    detail: `Evaluates current fasting glucose (${bloodSugar} mg/dL) and trimester history against clinical maternal guidelines.`,
    impact: gdmMl?.risk_level || "Calibrated",
    type: prob >= 55 ? "negative" : prob >= 30 ? "neutral" : "positive",
    source: "Health Analysis"
  });

  return {
    summary: prob >= 55
      ? "Fasting blood sugar is elevated. Discuss meal pacing and a glucose tolerance test with your doctor."
      : prob >= 30
      ? "Mild sugar elevation observed. Focus on balanced fiber-rich meals and regular daily activity."
      : "Fasting blood sugar is optimal. Insulin regulation is healthy and balanced for this stage.",
    factors
  };
};

const cardClass = "bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-pink-200/80 shadow-[0_8px_30px_rgba(244,114,182,0.12)] hover:border-pink-300 hover:shadow-[0_12px_36px_rgba(244,114,182,0.18)] transition-all duration-300 p-8 relative overflow-hidden";
const innerCardClass = "bg-white/70 backdrop-blur-sm rounded-[2rem] border border-pink-100/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_12px_rgba(244,114,182,0.06)] p-6 flex flex-col justify-between";
const iconWrapClass = "w-12 h-12 rounded-full bg-[#2D1B36]/5 flex items-center justify-center text-[#2D1B36] mb-4";

export default function PregnancyModePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [nutrition, setNutrition] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [aiState, setAiState] = useState<AIState>("idle");
  const [emergency, setEmergency] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExplainability, setShowExplainability] = useState(false);
  const [explainTab, setExplainTab] = useState<"preeclampsia" | "gdm">("preeclampsia");
  const [mlPredictions, setMlPredictions] = useState<{
    preeclampsia: any;
    gdm: any;
    isLoading: boolean;
  }>({
    preeclampsia: null,
    gdm: null,
    isLoading: false
  });

  // Initialize notification hook
  const { 
    preferences, reminders, toggleMaster, updatePreference, 
    markCompleted, snoozeReminder, deleteReminder 
  } = usePregnancyNotifications(profile, logs, appointments);

  const runMlRiskAssessment = async (prof: any, logList: any[]) => {
    setMlPredictions(prev => ({ ...prev, isLoading: true }));
    try {
      const conditions: string[] = prof?.maternal_conditions || [];
      const hasHypertensionHistory = conditions.some((c: string) => 
        c.toLowerCase().includes("pressure") || c.toLowerCase().includes("hypertension")
      );
      const hasDiabetesHistory = conditions.some((c: string) => 
        c.toLowerCase().includes("diabetes") || c.toLowerCase().includes("sugar")
      );

      const latestBpLog = [...(logList || [])].reverse().find(l => l.blood_pressure_systolic && l.blood_pressure_diastolic);
      const systolic = latestBpLog?.blood_pressure_systolic ? Number(latestBpLog.blood_pressure_systolic) : 120;
      const diastolic = latestBpLog?.blood_pressure_diastolic ? Number(latestBpLog.blood_pressure_diastolic) : 80;

      const latestSugarLog = [...(logList || [])].reverse().find(l => l.blood_sugar !== null && l.blood_sugar !== undefined && Number(l.blood_sugar) > 0);
      const bloodSugar = latestSugarLog?.blood_sugar ? Number(latestSugarLog.blood_sugar) : 85.0;

      const [preeclampsiaRes, gdmRes] = await Promise.all([
        fetch("/api/predict/preeclampsia", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systolic,
            diastolic,
            hypertension_history: hasHypertensionHistory ? 1 : 0
          })
        }),
        fetch("/api/predict/gdm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blood_sugar: bloodSugar,
            diabetes_history: hasDiabetesHistory ? 1 : 0
          })
        })
      ]);

      const preeclampsiaData = preeclampsiaRes.ok ? await preeclampsiaRes.json() : null;
      const gdmData = gdmRes.ok ? await gdmRes.json() : null;

      setMlPredictions({
        preeclampsia: preeclampsiaData,
        gdm: gdmData,
        isLoading: false
      });
    } catch (err) {
      console.warn("Failed to fetch ML risk assessments:", err);
      setMlPredictions(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    setMounted(true);
    localStorage.setItem("sakhi_active_mode", "pregnancy");
    document.cookie = "sakhi_active_mode=pregnancy; path=/; max-age=31536000";
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/pregnancy-data");
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        if (data.profile.preferred_name) {
          localStorage.setItem("sakhi_preferred_name", data.profile.preferred_name);
          document.cookie = `sakhi_preferred_name=${encodeURIComponent(data.profile.preferred_name)}; path=/; max-age=31536000`;
        }
        setLogs(data.logs || []);
        setNutrition(data.nutrition);
        setAppointments(data.appointments || []);
        runMlRiskAssessment(data.profile, data.logs || []);
        if (!data.profile.preferred_name) {
          router.push("/onboarding");
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setIsCheckingData(false);
    }
  };

  useEffect(() => {
    const handleNameUpdate = (e: any) => {
      if (e.detail?.name) {
        setProfile((prev: any) => ({ ...prev, preferred_name: e.detail.name }));
        localStorage.setItem("sakhi_preferred_name", e.detail.name);
        document.cookie = `sakhi_preferred_name=${encodeURIComponent(e.detail.name)}; path=/; max-age=31536000`;
      }
    };
    window.addEventListener('sakhi-name-updated', handleNameUpdate);
    window.addEventListener('sakhi_name_updated', handleNameUpdate);
    return () => {
      window.removeEventListener('sakhi-name-updated', handleNameUpdate);
      window.removeEventListener('sakhi_name_updated', handleNameUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isCheckingData) {
      const todayStr = new Date().toISOString().split("T")[0];
      const lastCheckIn = localStorage.getItem("sakhi_last_checkin_mom");
      const hasTodayLog = (logs || []).some((l: any) => (l.log_date || '').split('T')[0] === todayStr);
      if (lastCheckIn !== todayStr && !hasTodayLog) {
        setShowCheckIn(true);
        setAiState("talking");
      }
    }
  }, [isCheckingData, logs]);

  const handleCheckInComplete = async (data: any) => {
    if (data.isEmergency) {
      setEmergency(true);
    }

    const newEntry = {
      log_date: data.log_date,
      weight: logs.length > 0 && logs[logs.length - 1].weight ? logs[logs.length - 1].weight : null,
      blood_pressure_systolic: data.blood_pressure_systolic,
      blood_pressure_diastolic: data.blood_pressure_diastolic,
      blood_sugar: data.blood_sugar,
      mood: data.mood,
      sleep_hours: data.sleep_hours,
      baby_movement: data.baby_movement,
      symptoms: data.symptoms
    };

    setLogs((prev: any[]) => {
      const updated = [...prev, newEntry];
      runMlRiskAssessment(profile, updated);
      return updated;
    });

    try {
      await fetch('/api/pregnancy-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry)
      });
    } catch (err) {
      console.error("Failed to save pregnancy log:", err);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    localStorage.setItem("sakhi_last_checkin_mom", todayStr);

    setTimeout(() => {
      setShowCheckIn(false);
      setAiState("idle");
    }, 1500);
  };

  const handleChartUpdate = (data: any) => {
    if (!data) return;

    if (data.type === 'emergency') {
      setEmergency(true);
      return;
    }

    if (data.type === 'daily_log') {
      const updatedLog = data.log;
      setLogs((prev: any[]) => {
        const todayStr = (updatedLog.log_date || new Date().toISOString()).split('T')[0];
        const filtered = prev.filter((l: any) => (l.log_date || '').split('T')[0] !== todayStr);
        const updated = [...filtered, updatedLog].sort((a: any, b: any) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
        // Live re-calibration of ML preeclampsia & gestational diabetes models
        runMlRiskAssessment(profile, updated);
        return updated;
      });
    } else if (data.type === 'profile_update') {
      setProfile((prev: any) => {
        const updated = { ...prev, ...data.profile };
        runMlRiskAssessment(updated, logs);
        return updated;
      });
    } else if (data.type === 'appointment_update') {
      if (data.appointments) {
        setAppointments(data.appointments);
      }
    } else if (data.type === 'nutrition_update') {
      if (data.nutrition) {
        setNutrition(data.nutrition);
      }
    }
  };

  const handleToggleAppointment = async (index: number) => {
    const updated = [...appointments];
    if (updated[index]) {
      updated[index] = { ...updated[index], completed: !updated[index].completed };
      setAppointments(updated);

      try {
        await fetch('/api/pregnancy-appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle', index })
        });
      } catch (err) {
        console.error("Failed to toggle appointment", err);
      }
    }
  };

  const handleResetAppointmentsMonth = async () => {
    setAppointments([]);
    try {
      await fetch('/api/pregnancy-appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
    } catch (err) {
      console.error("Failed to reset appointments", err);
    }
  };

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sakhi-intro-played", "true");
    }
    localStorage.removeItem("sakhi_last_checkin");
    localStorage.removeItem("sakhi_last_checkin_mom");
    await signOut({ callbackUrl: '/', redirect: true });
  };

  if (!mounted || isCheckingData) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Baby weight="duotone" className="w-12 h-12 text-pink-400 animate-pulse opacity-50" />
      </div>
    );
  }

  const displayName = profile?.preferred_name || (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : null) || session?.user?.name?.split(" ")[0] || "Mama";
  const weeks = profile?.weeks_pregnant || 18;

  const todayDateStr = new Date().toISOString().split("T")[0];
  const isTodayCheckedIn = Boolean(
    (logs || []).some((l: any) => (l.log_date || '').split('T')[0] === todayDateStr) ||
    (typeof window !== 'undefined' && localStorage.getItem('sakhi_last_checkin_mom') === todayDateStr)
  );

  const preeclampsiaExplain = getPreeclampsiaExplainability(profile, logs, mlPredictions.preeclampsia);
  const gdmExplain = getGdmExplainability(profile, logs, mlPredictions.gdm, weeks);

  return (
    <div className="min-h-[100dvh] bg-[#FAF8F5] selection:bg-[#2D1B36]/10 font-sans relative">
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-white/80 border-2 border-pink-300/60 shadow-[0_4px_16px_rgba(244,114,182,0.2)] shrink-0 flex items-center justify-center">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={displayName || "User profile"}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-pink-200 to-purple-200 text-[#2D1B36] font-semibold text-lg">
                {displayName?.charAt(0)?.toUpperCase() || "M"}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 border border-pink-200/60">Mom Mode</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-[#2D1B36] flex items-center gap-2 mt-0.5">
              Good morning, {displayName} 
              <span className="inline-block hover:rotate-12 hover:scale-110 cursor-pointer transition-all duration-300">🍼</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3 relative print:hidden">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-12 h-12 rounded-full bg-white/50 backdrop-blur-md border border-white/40 flex items-center justify-center text-[#2D1B36]/60 hover:text-[#2D1B36] hover:bg-white/80 transition-all shadow-sm cursor-pointer"
            title="Settings"
          >
            <GearSix weight="duotone" className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              try {
                sessionStorage.setItem('sakhi-intro-played', 'true');
                localStorage.setItem('sakhi_active_mode', 'pregnancy');
                document.cookie = 'sakhi_active_mode=pregnancy; path=/; max-age=31536000';
                const nameToSave = profile?.preferred_name || localStorage.getItem('sakhi_preferred_name');
                if (nameToSave) {
                  localStorage.setItem('sakhi_preferred_name', nameToSave);
                  document.cookie = `sakhi_preferred_name=${encodeURIComponent(nameToSave)}; path=/; max-age=31536000`;
                }
              } catch (e) {}
              router.push('/');
            }}
            className="w-12 h-12 rounded-full bg-white/50 backdrop-blur-md border border-white/40 flex items-center justify-center text-[#2D1B36]/70 hover:text-[#2D1B36] hover:bg-white/80 transition-all shadow-sm cursor-pointer"
            title="Back to Landing Page"
            aria-label="Back to Landing Page"
          >
            <ArrowLeft weight="bold" className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        {emergency && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-red-500 text-white p-6 rounded-2xl shadow-lg mb-8 flex items-start gap-4 no-print"
          >
            <WarningCircle weight="fill" className="w-8 h-8 shrink-0" />
            <div>
              <h3 className="font-bold text-lg">⚠ High Risk Symptom Detected</h3>
              <p className="mt-1 opacity-90">Based on your recent input, you may be experiencing a dangerous symptom. <strong>Recommended Action: Visit nearest hospital or contact your OBGYN immediately.</strong></p>
            </div>
            <button onClick={() => setEmergency(false)} className="ml-auto bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-medium text-sm transition-colors">Dismiss</button>
          </motion.div>
        )}

        {/* VISUAL DASHBOARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 pb-24 print:pb-0"
        >
          {/* Avatar Section */}
          <div className="md:col-span-12 print:hidden no-print">
            <PregnancyAvatar 
              aiState={aiState} 
              onChartUpdate={handleChartUpdate} 
              pregnancyContext={{ profile, logs: logs.slice(-1) }}
              checkInMode={showCheckIn}
              onCheckInComplete={handleCheckInComplete}
              profileName={displayName}
              isCheckInCompleted={isTodayCheckedIn}
              onToggleCheckInMode={() => setShowCheckIn(prev => !prev)}
            />
          </div>

          {/* Top Hero Card - Week Progress & Baby Growth */}
          <div className={`${cardClass} md:col-span-12 flex flex-col justify-between`}>
            <div className="mb-8">
              <h2 className="text-3xl font-light tracking-tight text-[#2D1B36]">Pregnancy Progress</h2>
              <p className="text-[#2D1B36]/70 mt-2">
                You are currently in your {weeks <= 13 ? "First Trimester" : weeks <= 27 ? "Second Trimester" : "Third Trimester"}.
              </p>
            </div>
            <PregnancyWeekProgress weeks={weeks} />
            
            <div className="mt-10">
              <h3 className="text-sm font-medium tracking-widest uppercase text-[#2D1B36]/60 mb-4">Baby Growth Timeline</h3>
              <BabyGrowthTimeline weeks={weeks} />
            </div>
          </div>

          {/* Vitals Row */}
          <div className={`${cardClass} md:col-span-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Heartbeat className="text-red-400 w-5 h-5" />
              <h3 className="text-xl font-medium text-[#2D1B36]">Blood Pressure</h3>
            </div>
            <p className="text-xs text-[#2D1B36]/50 mb-6">Monitoring for Preeclampsia Risk</p>
            <BloodPressureChart data={logs} />
          </div>
          
          <div className={`${cardClass} md:col-span-6`}>
            <div className="flex items-center gap-2 mb-4">
              <Drop className="text-amber-500 w-5 h-5" weight="fill" />
              <h3 className="text-xl font-medium text-[#2D1B36]">Fasting Blood Sugar</h3>
            </div>
            <p className="text-xs text-[#2D1B36]/50 mb-6">Monitoring for Gestational Diabetes</p>
            <BloodSugarChart data={logs} />
          </div>

          {/* Growth & Movement Row */}
          <div className={`${cardClass} md:col-span-6`}>
            <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Weight Gain</h3>
            <WeightGainChart data={logs} />
          </div>

          <div className={`${cardClass} md:col-span-6`}>
            <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Fetal Movement Count</h3>
            <BabyMovementChart data={logs} />
          </div>

          {/* Appointments & Nutrition Row */}
          <div className={`${cardClass} md:col-span-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-medium text-[#2D1B36]">Appointments</h3>
                <span className="text-[11px] text-[#2D1B36]/50">
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Schedule • Resets monthly
                </span>
              </div>
              {appointments.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetAppointmentsMonth}
                  className="text-[11px] text-[#2D1B36]/60 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-black/5 cursor-pointer font-medium"
                  title="Clear appointments and start fresh for this month"
                >
                  Reset Month
                </button>
              )}
            </div>
            <AppointmentTimeline 
              appointments={appointments} 
              onToggleAppointment={handleToggleAppointment} 
            />
          </div>

          <div className={`${cardClass} md:col-span-6`}>
            <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Nutrition Breakdown</h3>
            <NutritionScoreChart nutrition={nutrition} />
          </div>


          {/* Mood & Sleep Row */}
          <div className={`${cardClass} md:col-span-6`}>
            <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Mood Tracker</h3>
            <MoodTrackerChart data={logs} />
          </div>

          <div className={`${cardClass} md:col-span-6`}>
            <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Sleep Graph</h3>
            <PregnancySleepGraph data={logs} />
          </div>

          {/* Machine Learning Maternal Risk Assessment */}
          <div className={`${cardClass} md:col-span-6 border ${
            (mlPredictions.preeclampsia?.risk_level === "High" || mlPredictions.gdm?.risk_level === "High") 
              ? "border-rose-200 bg-rose-50/30" 
              : (mlPredictions.preeclampsia?.risk_level === "Moderate" || mlPredictions.gdm?.risk_level === "Moderate")
              ? "border-amber-200 bg-amber-50/20"
              : "border-emerald-200 bg-emerald-50/20"
          } print:hidden`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={iconWrapClass}><ShieldCheck weight="duotone" className="w-6 h-6 text-emerald-600" /></div>
                <div>
                  <h3 className="text-xl font-medium text-[#2D1B36]">Maternal Risk Assessment</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      <Brain weight="bold" className="w-3 h-3" /> Clinical Intelligence
                    </span>
                    <span className="text-[10px] text-[#2D1B36]/60">
                      {mlPredictions.isLoading ? "Evaluating..." : "Real-time health assessment"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#2D1B36]/70 mb-4">
              {profile?.pregnancy_experience || "First-time Mother"} | Trimester {weeks <= 13 ? "1" : weeks <= 27 ? "2" : "3"} | Evaluated from medical profile & daily vitals
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Preeclampsia Card */}
              <div className="flex-1 bg-white/80 p-4 rounded-2xl shadow-[0_4px_20px_rgba(244,114,182,0.08)] border border-pink-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#2D1B36]/60">Preeclampsia Risk</span>
                    {mlPredictions.preeclampsia && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        mlPredictions.preeclampsia.risk_level === "High" ? "bg-red-100 text-red-700" :
                        mlPredictions.preeclampsia.risk_level === "Moderate" ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {mlPredictions.preeclampsia.risk_level}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-semibold text-[#2D1B36]">
                      {mlPredictions.preeclampsia 
                        ? `${Math.round(mlPredictions.preeclampsia.probability * 100)}%` 
                        : "—"}
                    </p>
                    <span className="text-xs text-[#2D1B36]/50">Probability</span>
                  </div>

                  <p className="text-[11px] text-[#2D1B36]/60 mt-2 leading-relaxed">
                    {mlPredictions.preeclampsia?.risk_level === "High" 
                      ? "Elevated blood pressure pattern detected. Priority vascular monitoring recommended."
                      : mlPredictions.preeclampsia?.risk_level === "Moderate"
                      ? "Borderline blood pressure reading. Continue regular daily check-ins."
                      : "Blood pressure vitals within optimal gestational baseline."}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-black/5 text-[10px] text-[#2D1B36]/50 flex items-center justify-between">
                  <span>Input Vitals:</span>
                  <span className="font-mono text-[#2D1B36]/70">
                    {mlPredictions.preeclampsia?.factors 
                      ? `${mlPredictions.preeclampsia.factors.systolic}/${mlPredictions.preeclampsia.factors.diastolic} mmHg`
                      : "120/80 mmHg"}
                  </span>
                </div>
              </div>

              {/* Gestational Diabetes Card */}
              <div className="flex-1 bg-white/80 p-4 rounded-2xl shadow-[0_4px_20px_rgba(244,114,182,0.08)] border border-pink-200/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#2D1B36]/60">Gestational Diabetes</span>
                    {mlPredictions.gdm && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        mlPredictions.gdm.risk_level === "High" ? "bg-red-100 text-red-700" :
                        mlPredictions.gdm.risk_level === "Moderate" ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {mlPredictions.gdm.risk_level}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-2xl font-semibold text-[#2D1B36]">
                      {mlPredictions.gdm 
                        ? `${Math.round(mlPredictions.gdm.probability * 100)}%` 
                        : "—"}
                    </p>
                    <span className="text-xs text-[#2D1B36]/50">Probability</span>
                  </div>

                  <p className="text-[11px] text-[#2D1B36]/60 mt-2 leading-relaxed">
                    {mlPredictions.gdm?.risk_level === "High"
                      ? "Elevated fasting blood sugar observed. Glucose tolerance evaluation suggested."
                      : mlPredictions.gdm?.risk_level === "Moderate"
                      ? "Mild glycemic elevation. Dietary carbohydrate balancing recommended."
                      : "Fasting blood sugar within healthy gestational target."}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-black/5 text-[10px] text-[#2D1B36]/50 flex items-center justify-between">
                  <span>Input Vitals:</span>
                  <span className="font-mono text-[#2D1B36]/70">
                    {mlPredictions.gdm?.factors 
                      ? `${mlPredictions.gdm.factors.blood_sugar} mg/dL`
                      : "85 mg/dL"}
                  </span>
                </div>
              </div>
            </div>

            {/* Expandable Explainability Accordion */}
            <div className="mt-5 pt-3 border-t border-[#2D1B36]/10">
              <button
                type="button"
                onClick={() => setShowExplainability(!showExplainability)}
                className="w-full flex items-center justify-between text-xs sm:text-sm font-semibold text-[#2D1B36] hover:text-[#2D1B36]/70 transition-colors py-1 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Info weight="bold" className="w-4 h-4 text-purple-600" />
                  Why this score? (Health Factors Breakdown)
                </span>
                {showExplainability ? <CaretUp weight="bold" className="w-4 h-4" /> : <CaretDown weight="bold" className="w-4 h-4" />}
              </button>

              <AnimatePresence>
                {showExplainability && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-3 space-y-3"
                  >
                    {/* Tab Switcher */}
                    <div className="flex gap-2 p-1 bg-black/5 rounded-xl w-fit">
                      <button
                        type="button"
                        onClick={() => setExplainTab("preeclampsia")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          explainTab === "preeclampsia" 
                            ? "bg-white text-[#2D1B36] shadow-sm" 
                            : "text-[#2D1B36]/60 hover:text-[#2D1B36]"
                        }`}
                      >
                        Preeclampsia Factors ({mlPredictions.preeclampsia ? `${Math.round(mlPredictions.preeclampsia.probability * 100)}%` : "—"})
                      </button>
                      <button
                        type="button"
                        onClick={() => setExplainTab("gdm")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          explainTab === "gdm" 
                            ? "bg-white text-[#2D1B36] shadow-sm" 
                            : "text-[#2D1B36]/60 hover:text-[#2D1B36]"
                        }`}
                      >
                        Gestational Diabetes Factors ({mlPredictions.gdm ? `${Math.round(mlPredictions.gdm.probability * 100)}%` : "—"})
                      </button>
                    </div>

                    {/* Summary sentence */}
                    <p className="text-xs text-[#2D1B36]/70 leading-relaxed font-medium">
                      {explainTab === "preeclampsia" ? preeclampsiaExplain.summary : gdmExplain.summary}
                    </p>

                    {/* Factor Breakdown List */}
                    <div className="space-y-2">
                      {(explainTab === "preeclampsia" ? preeclampsiaExplain.factors : gdmExplain.factors).map((f, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 rounded-xl bg-white/80 border border-black/5 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            {f.type === "positive" ? (
                              <CheckCircle weight="fill" className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : f.type === "negative" ? (
                              <WarningCircle weight="fill" className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            ) : (
                              <Info weight="fill" className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#2D1B36]">{f.title}</span>
                                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-black/5 text-[#2D1B36]/60">
                                  {f.source}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#2D1B36]/70 leading-relaxed mt-1">
                                {f.detail}
                              </div>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            f.type === "positive" ? "bg-emerald-100 text-emerald-700" :
                            f.type === "negative" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                          }`}>
                            {f.impact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div 
            onClick={() => window.print()}
            className={`${cardClass} md:col-span-6 flex flex-col justify-center items-center text-center group cursor-pointer no-print print:hidden`}
          >
            <div className="w-20 h-20 rounded-full bg-white/50 border border-white/40 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-md transition-all duration-500">
              <FilePdf weight="duotone" className="w-8 h-8 text-[#2D1B36]" />
            </div>
            <h3 className="text-lg font-medium text-[#2D1B36]">Doctor Summary</h3>
            <p className="text-sm text-[#2D1B36]/60 mt-2">Generate your Pregnancy PDF report for your next ANC visit.</p>
          </div>
        </motion.div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        mode="pregnancy" 
        currentData={profile} 
      />
    </div>
  );
}
