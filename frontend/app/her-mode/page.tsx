"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import {
  Bell,
  GearSix,
  Drop,
  Calendar,
  Sparkle,
  Brain,
  WarningCircle,
  FilePdf,
  Baby,
  Heartbeat,
  SignOut,
  Info,
  CaretDown,
  CaretUp,
  CheckCircle,
  ArrowsClockwise,
  FadersHorizontal,
  ArrowLeft,
} from "@phosphor-icons/react";
import SakhiAvatar, { AIState } from "@/components/SakhiAvatar";
import {
  CycleLengthChart,
  PeriodDurationChart,
  SymptomFrequencyChart,
  MoodCycleChart,
  FlowIntensityChart,
  OvulationCalendar,
  PainTrendChart,
  WeightTrendChart,
  SleepHoursChart
} from "@/components/charts/DashboardCharts";
import SettingsModal from "@/components/SettingsModal";
import { useHerNotifications } from "@/hooks/useHerNotifications";
import HerNotificationCenter from "@/components/HerNotificationCenter";


interface RiskFactor {
  title: string;
  impact: string;
  type: "positive" | "negative" | "neutral";
  detail: string;
}

interface ClinicalBreakdown {
  score: number;
  riskCategory: "Low Risk" | "Moderate Risk" | "Elevated Risk";
  badgeClass: string;
  barGradient: string;
  summary: string;
  factors: RiskFactor[];
  isMlActive: boolean;
}

const getPcosAssessment = (profile: any, logs: any[], mlData: any): ClinicalBreakdown => {
  const factors: RiskFactor[] = [];
  const hasDailyLogs = logs && logs.length > 0;
  let score = 10; // Baseline general population prevalence (10%)

  factors.push({
    title: "General Population Baseline",
    impact: "10% base",
    type: "neutral",
    detail: "Standard baseline reference for reproductive-age women."
  });

  // 1. Cycle Regularity (From Initial Setup)
  const isIrregular = profile?.cycle_regularity === "No" || profile?.cycle_regularity === "Irregular";
  if (isIrregular) {
    score += 25;
    factors.push({
      title: "Irregular Menstrual Cycles",
      impact: "+25%",
      type: "negative",
      detail: "Setup noted irregular cycles, reflecting unpredictable ovulation."
    });
  } else {
    score -= 4;
    factors.push({
      title: "Consistent Regular Cycles",
      impact: "-4%",
      type: "positive",
      detail: "Setup confirmed predictable cycles, indicating healthy ovulation."
    });
  }

  // 2. Cycle Length Analysis (From Initial Setup)
  const cycleLen = profile?.cycle_length_avg || 28;
  if (cycleLen > 35) {
    score += 20;
    factors.push({
      title: `Prolonged Cycle Length (${cycleLen} days)`,
      impact: "+20%",
      type: "negative",
      detail: "Cycles longer than 35 days reflect delayed follicle maturation."
    });
  } else if (cycleLen < 21) {
    score += 15;
    factors.push({
      title: `Shortened Cycle Length (${cycleLen} days)`,
      impact: "+15%",
      type: "negative",
      detail: "Cycles shorter than 21 days can indicate shorter cycle phases."
    });
  } else {
    factors.push({
      title: `Healthy Cycle Window (${cycleLen} days)`,
      impact: "Normal",
      type: "positive",
      detail: "Cycle length sits comfortably in the healthy 24–35 day range."
    });
  }

  // 3. Daily Check-In Symptoms (Acne & Pelvic Pain)
  if (!hasDailyLogs) {
    factors.push({
      title: "Daily Symptoms Tracking",
      impact: "Awaiting Logs",
      type: "neutral",
      detail: "Submit daily check-ins to track skin breakouts and cramping severity."
    });
    factors.push({
      title: "Comprehensive Health Analysis",
      impact: "Awaiting 1st Log",
      type: "neutral",
      detail: "Will calibrate your personalized score once you submit your first check-in."
    });
  } else {
    const acneLogs = logs.filter((l: any) => l.symptoms?.includes("Acne"));
    if (acneLogs.length > 0) {
      const acneWeight = Math.min(25, 12 + acneLogs.length * 4);
      score += acneWeight;
      factors.push({
        title: `Hormonal Acne Breakouts (${acneLogs.length} logged)`,
        impact: `+${acneWeight}%`,
        type: "negative",
        detail: "Frequent breakouts can indicate androgen hormone sensitivity."
      });
    } else {
      factors.push({
        title: "No Hormonal Acne Logged",
        impact: "0%",
        type: "positive",
        detail: "Absence of skin breakouts lowers PCOS likelihood."
      });
    }

    const crampLogs = logs.filter((l: any) => typeof l.cramps_severity === 'number' && l.cramps_severity > 0);
    const avgCramps = crampLogs.length > 0 
      ? crampLogs.reduce((acc: number, curr: any) => acc + curr.cramps_severity, 0) / crampLogs.length 
      : 0;
    if (avgCramps >= 6) {
      score += 12;
      factors.push({
        title: `Elevated Pelvic Discomfort (Avg ${avgCramps.toFixed(1)}/10)`,
        impact: "+12%",
        type: "negative",
        detail: "Moderate to severe cramping reported in daily check-ins."
      });
    }

    if (mlData && typeof mlData.probability_pcos === 'number') {
      const mlScore = Math.round(mlData.probability_pcos * 100);
      score = Math.round((mlScore * 0.65) + (score * 0.35));
      factors.push({
        title: `Comprehensive Risk Assessment (${mlScore}%)`,
        impact: "Calibrated",
        type: mlScore > 50 ? "negative" : "positive",
        detail: "Evaluates cycle regularity, skin symptoms, and check-in history against clinical standards."
      });
    }
  }

  // 4. Diagnosed Conditions (From Setup)
  if (profile?.diagnosed_conditions?.includes("PCOS")) {
    score += 45;
    factors.push({
      title: "Clinical PCOS Diagnosis Confirmed",
      impact: "+45%",
      type: "negative",
      detail: "Confirmed medical diagnosis noted during onboarding setup."
    });
  }

  score = Math.max(5, Math.min(95, Math.round(score)));

  let riskCategory: "Low Risk" | "Moderate Risk" | "Elevated Risk" | "Setup Baseline" = "Low Risk";
  let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let barGradient = "from-emerald-400 to-teal-500";
  
  let summary = !hasDailyLogs
    ? `Initial baseline calculated from your setup (${cycleLen}-day cycle). Submit your daily check-in to calibrate your live score.`
    : "Low risk of PCOS. Your cycle timing and daily symptoms reflect healthy hormonal balance.";

  if (!hasDailyLogs) {
    riskCategory = "Setup Baseline";
    badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
  } else if (score >= 60) {
    riskCategory = "Elevated Risk";
    badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
    barGradient = "from-amber-400 to-rose-500";
    summary = "Elevated risk signals detected. Irregular cycle intervals or androgen symptoms suggest consulting your gynecologist.";
  } else if (score >= 30) {
    riskCategory = "Moderate Risk";
    badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    barGradient = "from-teal-400 to-amber-500";
    summary = "Moderate risk indicators noted. Isolated signs like acne or mild timing variations are present; continue daily tracking.";
  }

  return { score, riskCategory: riskCategory as any, badgeClass, barGradient, summary, factors, isMlActive: Boolean(hasDailyLogs && mlData) };
};

 const getThyroidAssessment = (profile: any, logs: any[], mlData: any): ClinicalBreakdown => {
  const factors: RiskFactor[] = [];
  const hasDailyLogs = logs && logs.length > 0;
  let score = 10; // Baseline prevalence

  factors.push({
    title: "General Population Baseline",
    impact: "10% base",
    type: "neutral",
    detail: "Standard baseline reference for thyroid wellness."
  });

  // 1. Period Duration (From Initial Setup)
  const duration = profile?.period_duration || 5;
  const hasHeavyFlow = hasDailyLogs && logs.some((l: any) => l.flow_intensity === 'Heavy' || l.flow_intensity === 'very_heavy');
  if (duration > 7 || hasHeavyFlow) {
    score += 25;
    factors.push({
      title: `Prolonged Bleeding Duration (${duration} days)`,
      impact: "+25%",
      type: "negative",
      detail: "Bleeding over 7 days or heavy flow can reflect thyroid hormone variance."
    });
  } else {
    score -= 4;
    factors.push({
      title: `Normal Bleeding Duration (${duration} days)`,
      impact: "-4%",
      type: "positive",
      detail: "Standard 3–7 day period duration indicates healthy thyroid regulation."
    });
  }

  // 2. Cycle Frequency (From Initial Setup)
  const cycleLen = profile?.cycle_length_avg || 28;
  if (cycleLen < 21) {
    score += 18;
    factors.push({
      title: `Short Cycle Frequency (${cycleLen} days)`,
      impact: "+18%",
      type: "negative",
      detail: "Cycles under 21 days can occur with heightened metabolic activity."
    });
  }

  // 3. Daily Check-In Symptoms (Fatigue & Heavy Flow)
  if (!hasDailyLogs) {
    factors.push({
      title: "Daily Symptoms Tracking",
      impact: "Awaiting Logs",
      type: "neutral",
      detail: "Submit daily check-ins to track daily energy levels and flow volume."
    });
    factors.push({
      title: "Comprehensive Health Analysis",
      impact: "Awaiting 1st Log",
      type: "neutral",
      detail: "Will calibrate your personalized score once you submit your first check-in."
    });
  } else {
    const fatigueLogs = logs.filter((l: any) => 
      l.symptoms?.includes("Fatigue") || 
      l.mood === "Tired" || 
      l.mood === "Fatigued"
    );
    if (fatigueLogs.length > 0) {
      const fatigueWeight = Math.min(24, 14 + fatigueLogs.length * 3);
      score += fatigueWeight;
      factors.push({
        title: `Persistent Fatigue Logged (${fatigueLogs.length} check-in${fatigueLogs.length > 1 ? 's' : ''})`,
        impact: `+${fatigueWeight}%`,
        type: "negative",
        detail: "Ongoing sluggishness or low energy reported in daily check-ins."
      });
    } else {
      factors.push({
        title: "Healthy Energy Levels",
        impact: "0%",
        type: "positive",
        detail: "No persistent fatigue or sluggishness reported in daily check-ins."
      });
    }

    if (mlData && typeof mlData.probability_thyroid === 'number') {
      const mlScore = Math.round(mlData.probability_thyroid * 100);
      score = Math.round((mlScore * 0.65) + (score * 0.35));
      factors.push({
        title: `Comprehensive Risk Assessment (${mlScore}%)`,
        impact: "Calibrated",
        type: mlScore > 50 ? "negative" : "positive",
        detail: "Evaluates bleeding duration, cycle timing, and energy patterns against thyroid guidelines."
      });
    }
  }

  // 4. Diagnosed Conditions (From Setup)
  if (profile?.diagnosed_conditions?.includes("Hypothyroidism") || profile?.diagnosed_conditions?.includes("Thyroid disorder")) {
    score += 50;
    factors.push({
      title: "Diagnosed Thyroid Condition",
      impact: "+50%",
      type: "negative",
      detail: "Confirmed thyroid diagnosis noted during onboarding setup."
    });
  }

  score = Math.max(5, Math.min(95, Math.round(score)));

  let riskCategory: "Low Risk" | "Moderate Risk" | "Elevated Risk" | "Setup Baseline" = "Low Risk";
  let badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let barGradient = "from-emerald-400 to-teal-500";
  
  let summary = !hasDailyLogs
    ? `Initial baseline calculated from your setup (${duration}-day period, ${cycleLen}-day cycle). Submit your daily check-in to calibrate your live score.`
    : "Low thyroid risk. Flow duration and energy levels reflect healthy metabolic balance.";

  if (!hasDailyLogs) {
    riskCategory = "Setup Baseline";
    badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
  } else if (score >= 60) {
    riskCategory = "Elevated Risk";
    badgeClass = "bg-rose-50 text-rose-700 border-rose-200";
    barGradient = "from-amber-400 to-rose-500";
    summary = "Elevated thyroid signals detected. Heavy bleeding or persistent fatigue suggest requesting a TSH lab test from your doctor.";
  } else if (score >= 30) {
    riskCategory = "Moderate Risk";
    badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    barGradient = "from-teal-400 to-amber-500";
    summary = "Moderate thyroid indicators noted. Continue tracking your daily energy and flow patterns.";
  }

  return { score, riskCategory: riskCategory as any, badgeClass, barGradient, summary, factors, isMlActive: Boolean(hasDailyLogs && mlData) };
};


const cardClass = "bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-pink-200/80 shadow-[0_8px_30px_rgba(244,114,182,0.12)] hover:border-pink-300 hover:shadow-[0_12px_36px_rgba(244,114,182,0.18)] transition-all duration-300 p-8 relative overflow-hidden";
const innerCardClass = "bg-white/70 backdrop-blur-sm rounded-[2rem] border border-pink-100/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_12px_rgba(244,114,182,0.06)] p-6 flex flex-col justify-between";
const iconWrapClass = "w-12 h-12 rounded-full bg-[#2D1B36]/5 flex items-center justify-center text-[#2D1B36] mb-4";

export default function HerModePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [cycleHistory, setCycleHistory] = useState<any[]>([]);
  const [aiState, setAiState] = useState<AIState>("idle");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [mlPredictions, setMlPredictions] = useState<any>({});
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [expandedPcos, setExpandedPcos] = useState(false);
  const [expandedThyroid, setExpandedThyroid] = useState(false);
  const [isMlLoading, setIsMlLoading] = useState(false);

  // Initialize notification hook
  const { 
    preferences, reminders, toggleMaster, updatePreference, 
    markCompleted, snoozeReminder, deleteReminder 
  } = useHerNotifications(profile, logs, cycleHistory);
  const [pulsingChart, setPulsingChart] = useState<string | null>(null);

  // Live FastAPI microservice prediction fetcher
  const fetchLivePredictions = async (userProfile: any, userLogs: any[]) => {
    // If no daily check-ins have been logged yet, do NOT query ML with fabricated default symptoms!
    if (!userLogs || userLogs.length === 0) {
      setMlPredictions({});
      return;
    }

    setIsMlLoading(true);
    try {
      const hasAcne = (userLogs || []).some((l: any) => l.symptoms?.includes("Acne"));
      const isRegular = (userProfile?.cycle_regularity === "No" || userProfile?.cycle_regularity === "Irregular") ? 0 : 1;
      
      // Parallel PCOS & Thyroid ML requests
      const [pcosRes, thyroidRes] = await Promise.all([
        fetch("/api/predict/pcos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weight: userProfile?.weight || 60,
            cycle_regularity: isRegular,
            acne_severity: hasAcne ? 6 : 2
          })
        }),
        fetch("/api/predict/thyroid", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fatigue_severity: hasFatigue ? 7 : 2,
            heavy_or_prolonged_flow: isProlongedOrHeavy ? 1 : 0,
            cycle_regularity: isRegular
          })
        })
      ]);

      const pcosData = pcosRes.ok ? await pcosRes.json() : null;
      const thyroidData = thyroidRes.ok ? await thyroidRes.json() : null;

      setMlPredictions({
        pcos: pcosData,
        thyroid: thyroidData
      });
    } catch (err) {
      console.warn("Could not query live ML microservice:", err);
    } finally {
      setIsMlLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sakhi_active_mode", "her");
    document.cookie = "sakhi_active_mode=her; path=/; max-age=31536000";
    if (status === "authenticated" || status === "unauthenticated") {
      fetchDashboardData();
    }
  }, [status]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard-data");
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        if (data.profile.preferred_name) {
          localStorage.setItem("sakhi_preferred_name", data.profile.preferred_name);
          document.cookie = `sakhi_preferred_name=${encodeURIComponent(data.profile.preferred_name)}; path=/; max-age=31536000`;
        }
        setLogs(data.logs || []);
        setCycleHistory(data.cycleHistory || []);
        if (!data.profile.preferred_name) {
          router.push("/onboarding");
        }
        // Auto trigger dynamic ML predictions
        fetchLivePredictions(data.profile, data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setIsCheckingData(false);
    }
  };

  useEffect(() => {
    if (!isCheckingData) {
      const todayStr = new Date().toISOString().split("T")[0];
      const lastCheckIn = localStorage.getItem("sakhi_last_checkin");
      if (lastCheckIn !== todayStr) {
        // Trigger chatbot check-in
        setShowCheckIn(true);
        setAiState("talking");
      }
    }
  }, [isCheckingData]);

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

  if (!mounted || isCheckingData) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <Sparkle weight="duotone" className="w-12 h-12 text-pink-400 animate-pulse opacity-50" />
      </div>
    );
  }

  const displayName = profile?.preferred_name || (typeof window !== 'undefined' ? localStorage.getItem('sakhi_preferred_name') : null) || session?.user?.name?.split(" ")[0] || "Beautiful";
  
  // Calculate next period
  const startDate = profile ? new Date(profile.last_period_start) : new Date();
  const nextPeriod = new Date(startDate);
  nextPeriod.setDate(startDate.getDate() + (profile?.cycle_length_avg || 28));
  const today = new Date();
  const diffTime = nextPeriod.getTime() - today.getTime();
  const daysUntilNext = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isPcosRisk = profile?.diagnosed_conditions?.includes("PCOS") || profile?.cycle_regularity === "No";

  const handleCheckInComplete = async (data: any) => {
    setAiState("thinking");
    
    // Optimistic cache update for the charts
    const newLog = {
      log_date: new Date().toISOString(),
      flow_intensity: data.flowIntensity,
      cramps_severity: data.crampsSeverity,
      symptoms: data.symptoms
    };
    
    const updatedLogs = [...logs, newLog];
    // Add to local state immediately so Recharts re-render
    setLogs(updatedLogs);
    fetchLivePredictions(profile, updatedLogs);
    
    try {
      // POST to backend
      await fetch("/api/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog)
      });
      
      // Mark as done for today
      localStorage.setItem("sakhi_last_checkin", new Date().toISOString().split("T")[0]);
      
      // Re-fetch to ensure sync
      fetchDashboardData();
    } catch (e) {
      console.error(e);
    }
    
    setAiState("idle");
    setShowCheckIn(false);
  };

  const handleChartUpdate = (data: any) => {
    if (data.type === 'daily_log') {
      const newLog = data.log;
      setLogs((prev: any[]) => {
        const dayStr = (newLog.log_date || new Date().toISOString()).split('T')[0];
        const filtered = prev.filter((l: any) => (l.log_date || '').split('T')[0] !== dayStr);
        const updated = [...filtered, newLog];
        fetchLivePredictions(profile, updated);
        return updated;
      });

      // Pulse the matching chart based on what the user chatted
      if (newLog.cramps_severity && newLog.cramps_severity > 0) {
        setPulsingChart('pain');
      } else if (newLog.flow_intensity && newLog.flow_intensity !== 'None') {
        setPulsingChart('flow');
      } else if (newLog.symptoms && newLog.symptoms.length > 0) {
        setPulsingChart('symptoms');
      } else if (newLog.mood) {
        setPulsingChart('mood');
      } else if (newLog.sleep_hours) {
        setPulsingChart('sleep');
      }
    } else if (data.type === 'cycle_history_update') {
      if (data.cycleHistory) setCycleHistory(data.cycleHistory);
      if (data.profile) {
        setProfile((prev: any) => {
          const updated = { ...prev, ...data.profile };
          fetchLivePredictions(updated, logs);
          return updated;
        });
      }
      setPulsingChart('cycle_length');
    } else if (data.type === 'profile_update') {
      setProfile((prev: any) => {
        const updated = { ...prev, ...data.profile };
        fetchLivePredictions(updated, logs);
        return updated;
      });
      setPulsingChart('calendar');
    } else if (data.type === 'pcos') {
      setMlPredictions((prev: any) => ({ ...prev, pcos: data.data }));
      setPulsingChart('pcos');
    } else if (data.type === 'cycle') {
      setMlPredictions((prev: any) => ({ ...prev, cycle: data.data }));
      setPulsingChart('cycle');
    }
    setTimeout(() => setPulsingChart(null), 3500);
  };

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sakhi-intro-played", "true");
    }
    localStorage.removeItem("sakhi_last_checkin");
    await signOut({ callbackUrl: '/', redirect: true });
  };

  // Dynamic Explainability & Risk Assessments
  const pcosAssessment = getPcosAssessment(profile, logs, mlPredictions.pcos);
  const thyroidAssessment = getThyroidAssessment(profile, logs, mlPredictions.thyroid);
  const pcosRiskScore = pcosAssessment.score;
  const thyroidRiskScore = thyroidAssessment.score;
  const cycleAvg = mlPredictions.cycle ? (profile?.cycle_length_avg || 28) : (profile?.cycle_length_avg || 28);
  const daysUntil = mlPredictions.cycle ? mlPredictions.cycle.days_until_next_period : daysUntilNext;

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
                {displayName?.charAt(0)?.toUpperCase() || "S"}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200/60">Her Mode</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-light tracking-tight text-[#2D1B36] flex items-center gap-2 mt-0.5">
              Good morning, {displayName} 
              <span className="inline-block hover:rotate-12 hover:scale-110 cursor-pointer transition-all duration-300">🌸</span>
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
                localStorage.setItem('sakhi_active_mode', 'her');
                document.cookie = 'sakhi_active_mode=her; path=/; max-age=31536000';
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 pb-24 print:pb-0"
        >
          {/* Main AI Avatar Section */}
        <div className="md:col-span-12 print:hidden">
          <SakhiAvatar 
            aiState={aiState} 
            checkInMode={showCheckIn} 
            onCheckInComplete={handleCheckInComplete} 
            defaultOpen={showCheckIn}
            onChartUpdate={handleChartUpdate}
            profileName={displayName}
          />
        </div>

          {/* Ovulation Calendar */}
          <motion.div 
            animate={pulsingChart === 'calendar' ? { scale: [1, 1.015, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 25px rgba(16,185,129,0.4)", "0px 0px 0px rgba(0,0,0,0)"] } : {}}
            transition={{ duration: 1.5, repeat: pulsingChart === 'calendar' ? 2 : 0 }}
            className={`${cardClass} md:col-span-12`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Calendar weight="duotone" className="w-6 h-6 text-emerald-400" />
              <span className="text-sm font-medium tracking-widest uppercase text-[#2D1B36]/60">Ovulation & Fertile Window</span>
            </div>
            <h2 className="text-2xl font-light tracking-tight text-[#2D1B36]">Your Window Calendar</h2>
            <OvulationCalendar profile={profile} />
          </motion.div>

          {/* Row 1: Cycles & Periods */}
          <motion.div 
            animate={pulsingChart === 'cycle_length' ? { scale: [1, 1.02, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 25px rgba(236,72,153,0.45)", "0px 0px 0px rgba(0,0,0,0)"] } : {}}
            transition={{ duration: 1.5, repeat: pulsingChart === 'cycle_length' ? 2 : 0 }}
            className={`${cardClass} md:col-span-6`}
          >
            <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Cycle Length Trend</h3>
            <CycleLengthChart data={cycleHistory} />
          </motion.div>
          
          <motion.div 
            animate={pulsingChart === 'cycle_length' ? { scale: [1, 1.02, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 25px rgba(244,63,94,0.45)", "0px 0px 0px rgba(0,0,0,0)"] } : {}}
            transition={{ duration: 1.5, repeat: pulsingChart === 'cycle_length' ? 2 : 0 }}
            className={`${cardClass} md:col-span-6`}
          >
             <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Period Duration Trend</h3>
             <PeriodDurationChart data={cycleHistory} />
          </motion.div>

          {/* Row 2: Symptoms & Mood */}
          <motion.div 
            animate={pulsingChart === 'symptoms' ? { scale: [1, 1.02, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 25px rgba(168,85,247,0.4)", "0px 0px 0px rgba(0,0,0,0)"] } : {}}
            transition={{ duration: 1.5, repeat: pulsingChart === 'symptoms' ? 2 : 0 }}
            className={`${cardClass} md:col-span-6`}
          >
            <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Common Symptoms</h3>
            <SymptomFrequencyChart data={logs} />
          </motion.div>

          <motion.div 
            animate={pulsingChart === 'mood' ? { scale: [1, 1.02, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 25px rgba(99,102,241,0.4)", "0px 0px 0px rgba(0,0,0,0)"] } : {}}
            transition={{ duration: 1.5, repeat: pulsingChart === 'mood' ? 2 : 0 }}
            className={`${cardClass} md:col-span-6`}
          >
            <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Mood vs Cycle Phase</h3>
            <MoodCycleChart data={logs} />
          </motion.div>

          {/* Row 3: Flow & Pain */}
          <motion.div 
            animate={pulsingChart === 'flow' ? { scale: [1, 1.02, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 25px rgba(244,63,94,0.4)", "0px 0px 0px rgba(0,0,0,0)"] } : {}}
            transition={{ duration: 1.5, repeat: pulsingChart === 'flow' ? 2 : 0 }}
            className={`${cardClass} md:col-span-6`}
          >
            <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Flow Intensity</h3>
            <FlowIntensityChart data={logs} />
          </motion.div>

          <motion.div 
            animate={pulsingChart === 'pain' ? { scale: [1, 1.02, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 25px rgba(244,63,94,0.5)", "0px 0px 0px rgba(0,0,0,0)"] } : {}}
            transition={{ duration: 1.5, repeat: pulsingChart === 'pain' ? 2 : 0 }}
            className={`${cardClass} md:col-span-6`}
          >
            <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Pain Trend</h3>
            <PainTrendChart data={logs} />
          </motion.div>

          {/* Row 4: Weight & Sleep */}
          <div className={`${cardClass} md:col-span-6`}>
             <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Weight Trend</h3>
             <WeightTrendChart data={logs} />
          </div>

          <motion.div 
            animate={pulsingChart === 'sleep' ? { scale: [1, 1.02, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 25px rgba(139,92,246,0.4)", "0px 0px 0px rgba(0,0,0,0)"] } : {}}
            transition={{ duration: 1.5, repeat: pulsingChart === 'sleep' ? 2 : 0 }}
            className={`${cardClass} md:col-span-6`}
          >
             <h3 className="text-xl font-medium text-[#2D1B36] mb-4">Sleep Hours</h3>
             <SleepHoursChart data={logs} />
          </motion.div>

          {/* Row 5: Dynamic PCOS & Thyroid Predictors with Full Explainability */}
          {/* PCOS Predictor Card */}
          <motion.div 
            animate={pulsingChart === 'pcos' ? { scale: [1, 1.02, 1], boxShadow: ["0px 0px 0px rgba(0,0,0,0)", "0px 0px 30px rgba(239,68,68,0.4)", "0px 0px 0px rgba(0,0,0,0)"] } : {}}
            transition={{ duration: 1.5, repeat: pulsingChart === 'pcos' ? 2 : 0 }}
            className={`${cardClass} md:col-span-6 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-100/70 border border-orange-200/50 flex items-center justify-center text-orange-600">
                    <WarningCircle weight="duotone" className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-[#2D1B36]">PCOS Predictor</h3>
                    <p className="text-xs text-[#2D1B36]/50 mt-0.5">Hormonal & Ovulation Health</p>
                  </div>
                </div>

                <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${pcosAssessment.badgeClass}`}>
                  {pcosAssessment.riskCategory} ({Math.round(pcosRiskScore)}%)
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 mb-2">
                <div className="h-3.5 w-full bg-[#2D1B36]/5 rounded-full overflow-hidden relative p-0.5 border border-black/[0.03]">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${pcosRiskScore}%` }} 
                    transition={{ duration: 1.2, ease: "easeOut" }} 
                    className={`h-full rounded-full bg-gradient-to-r ${pcosAssessment.barGradient}`} 
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#2D1B36]/40 mt-1.5 px-0.5">
                  <span>Low Risk (0-30%)</span>
                  <span>Moderate (30-60%)</span>
                  <span>Elevated (&gt;60%)</span>
                </div>
              </div>

              {/* Clinical summary */}
              <div className="p-3.5 rounded-2xl bg-white/60 border border-white/60 mt-3 text-xs text-[#2D1B36]/80 leading-relaxed">
                {pcosAssessment.summary}
              </div>

              {/* Expandable Explainability Accordion */}
              <div className="mt-4 pt-3 border-t border-[#2D1B36]/10">
                <button
                  type="button"
                  onClick={() => setExpandedPcos(!expandedPcos)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-[#2D1B36] hover:text-[#2D1B36]/70 transition-colors py-1"
                >
                  <span className="flex items-center gap-2">
                    <Info weight="bold" className="w-4 h-4 text-orange-500" />
                    Why this score? (Health Factors Breakdown)
                  </span>
                  {expandedPcos ? <CaretUp weight="bold" className="w-4 h-4" /> : <CaretDown weight="bold" className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                  {expandedPcos && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3 space-y-2.5"
                    >
                      <p className="text-sm text-[#2D1B36]/80 font-normal mb-3 leading-relaxed">
                        {logs && logs.length > 0 
                          ? "Key health indicators that calibrated your personalized score:"
                          : "Initial setup baseline. Submit daily check-ins to calibrate your score with live vitals:"}
                      </p>

                      {pcosAssessment.factors.map((f, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 rounded-xl bg-white/70 border border-white/60 flex items-start justify-between gap-3 text-sm"
                        >
                          <div className="flex items-start gap-2.5">
                            {f.type === "positive" ? (
                              <CheckCircle weight="fill" className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            ) : f.type === "negative" ? (
                              <WarningCircle weight="fill" className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            ) : (
                              <Info weight="fill" className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="text-sm font-semibold text-[#2D1B36]">{f.title}</div>
                              <div className="text-xs text-[#2D1B36]/70 leading-relaxed mt-1">{f.detail}</div>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${
                            f.type === "positive" ? "bg-emerald-100 text-emerald-700" :
                            f.type === "negative" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                          }`}>
                            {f.impact}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Thyroid Predictor Card */}
          <div className={`${cardClass} md:col-span-6 flex flex-col justify-between`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100/70 border border-indigo-200/50 flex items-center justify-center text-indigo-600">
                    <Brain weight="duotone" className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-[#2D1B36]">Thyroid Predictor</h3>
                    <p className="text-xs text-[#2D1B36]/50 mt-0.5">Metabolic & Bleeding Analysis</p>
                  </div>
                </div>

                <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${thyroidAssessment.badgeClass}`}>
                  {thyroidAssessment.riskCategory} ({Math.round(thyroidRiskScore)}%)
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 mb-2">
                <div className="h-3.5 w-full bg-[#2D1B36]/5 rounded-full overflow-hidden relative p-0.5 border border-black/[0.03]">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: `${thyroidRiskScore}%` }} 
                    transition={{ duration: 1.2, ease: "easeOut" }} 
                    className={`h-full rounded-full bg-gradient-to-r ${thyroidAssessment.barGradient}`} 
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#2D1B36]/40 mt-1.5 px-0.5">
                  <span>Low Risk (0-30%)</span>
                  <span>Moderate (30-60%)</span>
                  <span>Elevated (&gt;60%)</span>
                </div>
              </div>

              {/* Clinical summary */}
              <div className="p-3.5 rounded-2xl bg-white/60 border border-white/60 mt-3 text-xs text-[#2D1B36]/80 leading-relaxed">
                {thyroidAssessment.summary}
              </div>

              {/* Expandable Explainability Accordion */}
              <div className="mt-4 pt-3 border-t border-[#2D1B36]/10">
                <button
                  type="button"
                  onClick={() => setExpandedThyroid(!expandedThyroid)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-[#2D1B36] hover:text-[#2D1B36]/70 transition-colors py-1"
                >
                  <span className="flex items-center gap-2">
                    <Info weight="bold" className="w-4 h-4 text-indigo-500" />
                    Why this score? (Health Factors Breakdown)
                  </span>
                  {expandedThyroid ? <CaretUp weight="bold" className="w-4 h-4" /> : <CaretDown weight="bold" className="w-4 h-4" />}
                </button>

                <AnimatePresence>
                  {expandedThyroid && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-3 space-y-2.5"
                    >
                      <p className="text-sm text-[#2D1B36]/80 font-normal mb-3 leading-relaxed">
                        {logs && logs.length > 0 
                          ? "Key health indicators that calibrated your personalized score:"
                          : "Initial setup baseline. Submit daily check-ins to calibrate your score with live vitals:"}
                      </p>

                      {thyroidAssessment.factors.map((f, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 rounded-xl bg-white/70 border border-white/60 flex items-start justify-between gap-3 text-sm"
                        >
                          <div className="flex items-start gap-2.5">
                            {f.type === "positive" ? (
                              <CheckCircle weight="fill" className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                            ) : f.type === "negative" ? (
                              <WarningCircle weight="fill" className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            ) : (
                              <Info weight="fill" className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <div className="text-sm font-semibold text-[#2D1B36]">{f.title}</div>
                              <div className="text-xs text-[#2D1B36]/70 leading-relaxed mt-1">{f.detail}</div>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${
                            f.type === "positive" ? "bg-emerald-100 text-emerald-700" :
                            f.type === "negative" ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-700"
                          }`}>
                            {f.impact}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Full-width Doctor Summary Banner */}
          <div 
            onClick={() => window.print()}
            className={`${cardClass} md:col-span-12 flex flex-col sm:flex-row items-center justify-between gap-6 group cursor-pointer print:hidden hover:shadow-lg transition-all duration-300`}
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/80 border border-white/60 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                <FilePdf weight="duotone" className="w-8 h-8 text-[#2D1B36]" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-[#2D1B36]">Doctor Summary Report</h3>
                <p className="text-sm text-[#2D1B36]/60 mt-1 max-w-xl">
                  Print or save as PDF all your dashboard graphs, period rhythm, symptom trends, and AI risk evaluations.
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.print();
              }}
              className="px-6 py-3 rounded-full bg-[#2D1B36] text-white text-sm font-medium shadow-sm hover:bg-[#2D1B36]/90 transition-all shrink-0 cursor-pointer"
            >
              Print / Save PDF
            </button>
          </div>
        </motion.div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        mode="her" 
        currentData={profile} 
      />

      <HerNotificationCenter 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        preferences={preferences}
        reminders={reminders}
        onToggleMaster={toggleMaster}
        onUpdatePref={updatePreference}
        onMarkCompleted={markCompleted}
        onSnooze={snoozeReminder}
        onDelete={deleteReminder}
      />
    </div>
  );
}
