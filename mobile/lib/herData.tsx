/**
 * Her Mode state shared by the Today / Cycle / Insights / Care tabs.
 * Port of the data flow in frontend/app/her-mode/page.tsx.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert } from "react-native";

import { apiFetch } from "./api";
import { chartBus } from "./events";
import { localIso } from "./date";
import { sendOrQueue } from "./outbox";
import { queryKeys } from "./queryKeys";
import { computePhase, dayNum, dayToIso, todayNum, type PhaseInfo } from "./shared/cyclePhase";
import { EMPTY_GOAL, type GoalDoc } from "./shared/herGoal";
import { patternsWorthMentioning, phaseHighlights, phaseStats, pmsForecast, type Pattern, type PhaseStat } from "./shared/herInsights";
import { addPainEvent } from "./shared/painLog";
import { contextFromLog, tipsForToday, type Tip, type TodayContext } from "./shared/phaseTips";
import { getString, setString } from "./storage";
import { useUserDoc } from "./useUserDoc";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface HygieneCycle {
  bleeding: boolean;
  daysUntilPeriod: number;
  periodLength: number;
  heavyFlow: boolean;
  periodStart: string | null;
}

interface DashboardData {
  profile: any;
  onboarded?: boolean;
  logs: any[];
  cycleHistory: any[];
}

interface HerData {
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  profile: any;
  logs: any[];
  cycleHistory: any[];
  displayName: string;
  phase: PhaseInfo;
  todayLog: any;
  ctx: TodayContext;
  tips: Tip[];
  stats: PhaseStat[];
  highlights: string[];
  forecast: { symptoms: string[]; inDays: number } | null;
  patterns: Pattern[];
  hygieneCycle: HygieneCycle;
  periodNear: boolean;
  goal: ReturnType<typeof useUserDoc<GoalDoc>>;
  favourites: string[];
  reloadFavourites: () => void;
  savingPeriod: boolean;
  markPeriodStarted: (date?: string) => Promise<void>;
  savePainLog: (log: any) => void;
  completeCheckIn: (data: any) => Promise<void>;
  applyChartUpdate: (data: any) => void;
  /** relief sheet */
  relief: { open: boolean; severity: number | null };
  openRelief: (severity?: number | null) => void;
  closeRelief: () => void;
  /** show the check-in chat on Today (no log yet today) */
  checkInDue: boolean;
}

const HerContext = createContext<HerData | null>(null);
const LAST_CHECKIN = "sakhi_last_checkin";

export function HerDataProvider({ children, fallbackName }: { children: ReactNode; fallbackName?: string | null }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => apiFetch<DashboardData>("/api/dashboard-data"),
  });
  const favQuery = useQuery({
    queryKey: ["relief-favourites"],
    queryFn: () => apiFetch<{ favourites?: { title: string }[] }>("/api/relief?peek=1"),
  });
  const goal = useUserDoc<GoalDoc>("her_goal", EMPTY_GOAL);
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [relief, setRelief] = useState<{ open: boolean; severity: number | null }>({ open: false, severity: null });
  const [lastCheckIn, setLastCheckIn] = useState<string | null | undefined>(undefined);

  if (lastCheckIn === undefined) void getString(LAST_CHECKIN).then((v) => setLastCheckIn(v));

  const data = query.data;
  const profile = data?.profile ?? null;
  const logs = useMemo(() => data?.logs ?? [], [data?.logs]);
  const cycleHistory = useMemo(() => data?.cycleHistory ?? [], [data?.cycleHistory]);

  const setData = useCallback(
    (fn: (d: DashboardData) => DashboardData) =>
      qc.setQueryData<DashboardData>(queryKeys.dashboard, (d) => (d ? fn(d) : d)),
    [qc],
  );

  const phase = useMemo(() => computePhase({ profile, logs, cycleHistory }), [profile, logs, cycleHistory]);
  const todayLog = useMemo(() => logs.find((l) => dayNum(l.log_date) === todayNum()), [logs]);
  const ctx = contextFromLog(todayLog);
  const tips = useMemo(
    () => tipsForToday(phase.phase, todayNum(), ctx),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phase.phase, ctx.lowEnergy, ctx.poorSleep, ctx.pain],
  );
  const stats = useMemo(() => phaseStats(profile, logs, phase.cycleLength, phase.periodLength), [profile, logs, phase.cycleLength, phase.periodLength]);
  const highlights = useMemo(() => phaseHighlights(stats), [stats]);
  const forecast = useMemo(() => pmsForecast(profile, logs, phase.daysUntilPeriod), [profile, logs, phase.daysUntilPeriod]);
  const patterns = useMemo(() => patternsWorthMentioning(profile, logs, cycleHistory), [profile, logs, cycleHistory]);
  const hygieneCycle = useMemo<HygieneCycle>(
    () => ({
      bleeding: phase.bleedingDay !== null,
      daysUntilPeriod: phase.late ? 0 : phase.daysUntilPeriod,
      periodLength: phase.usualPeriodLength,
      heavyFlow: logs.some((l) => dayNum(l.log_date) >= todayNum() - 120 && /heavy/i.test(String(l.flow_intensity || ""))),
      periodStart: Number.isFinite(phase.lastStart) ? dayToIso(phase.lastStart) : null,
    }),
    [phase.bleedingDay, phase.late, phase.daysUntilPeriod, phase.usualPeriodLength, phase.lastStart, logs],
  );
  const periodNear = hygieneCycle.bleeding || hygieneCycle.daysUntilPeriod <= 3;

  const refresh = useCallback(async () => {
    await Promise.all([query.refetch(), favQuery.refetch(), goal.reload()]);
  }, [query, favQuery, goal]);

  const applyChartUpdate = useCallback(
    (u: any) => {
      if (!u) return;
      if (u.type === "daily_log" && u.log) {
        const newLog = u.log;
        setData((d) => ({ ...d, logs: [...d.logs.filter((l) => dayNum(l.log_date) !== dayNum(newLog.log_date || new Date().toISOString())), newLog] }));
        if (Number(newLog.cramps_severity) >= 7) setRelief({ open: true, severity: Number(newLog.cramps_severity) });
        if (u.cycleUpdate) applyChartUpdate(u.cycleUpdate);
      } else if (u.type === "cycle_history_update") {
        setData((d) => ({ ...d, cycleHistory: u.cycleHistory ?? d.cycleHistory, profile: { ...d.profile, ...(u.profile || {}) } }));
      } else if (u.type === "profile_update") {
        setData((d) => ({ ...d, profile: { ...d.profile, ...(u.profile || {}) } }));
      }
    },
    [setData],
  );

  const markPeriodStarted = useCallback(
    async (date?: string) => {
      setSavingPeriod(true);
      try {
        // Always send the local date: the server runs on UTC
        const d = await apiFetch<any>("/api/period-start", {
          method: "POST",
          body: JSON.stringify({ date: date || localIso(), correction: Boolean(date) }),
        });
        if (d?.chartData) applyChartUpdate(d.chartData);
        await query.refetch();
      } catch (e) {
        Alert.alert("Couldn't save", e instanceof Error ? e.message : "Couldn't save your period start. Please try again.");
      } finally {
        setSavingPeriod(false);
      }
    },
    [applyChartUpdate, query],
  );

  const savePainLog = useCallback(
    (log: any) => {
      if (!log?.log_date) return;
      setData((d) => ({ ...d, logs: [...d.logs.filter((l) => dayNum(l.log_date) !== dayNum(log.log_date)), log] }));
    },
    [setData],
  );

  const completeCheckIn = useCallback(
    async (input: any) => {
      const todayStr = localIso();
      const isPeriod =
        input.onPeriod === true ||
        String(input.onPeriod || "").toLowerCase() === "yes" ||
        (Boolean(input.flowIntensity) && input.flowIntensity !== "None");
      const before = logs.find((l) => dayNum(l.log_date) === todayNum()) || {};
      const withPain = addPainEvent(before, Number(input.crampsSeverity ?? 0), "check-in");
      const newLog = {
        ...before,
        log_date: todayStr,
        on_period: isPeriod,
        flow_intensity: input.flowIntensity || "None",
        pain_events: withPain.pain_events,
        cramps_severity: withPain.cramps_severity,
        symptoms: Array.isArray(input.symptoms) && input.symptoms.length > 0 ? input.symptoms : ["None"],
        mood: input.mood || "Calm",
        sleep_hours: input.sleepHours !== undefined && input.sleepHours !== null ? Number(input.sleepHours) : 7.5,
        ...(input.weight !== undefined && input.weight !== null ? { weight: Number(input.weight) } : {}),
      };
      setData((d) => ({ ...d, logs: [...d.logs.filter((l) => dayNum(l.log_date) !== todayNum()), newLog] }));
      const res = await sendOrQueue<{ log?: any }>("/api/daily-log", "POST", newLog);
      if (!res.queued && res.data?.log) {
        const saved = res.data.log;
        setData((d) => ({ ...d, logs: [...d.logs.filter((l) => dayNum(l.log_date) !== todayNum()), saved] }));
      }
      await setString(LAST_CHECKIN, todayStr);
      setLastCheckIn(todayStr);
      if (!res.queued) await query.refetch();
      if (Number(input.crampsSeverity) >= 6) setRelief({ open: true, severity: Number(input.crampsSeverity) });
    },
    [logs, query, setData],
  );

  // Updates from the chat screen (it sits outside this provider)
  useEffect(() => chartBus.on(applyChartUpdate), [applyChartUpdate]);

  const displayName = profile?.preferred_name || fallbackName?.split(" ")[0] || "there";
  const checkInDue = Boolean(data) && lastCheckIn !== undefined && lastCheckIn !== localIso() && !todayLog;

  const value: HerData = {
    loading: query.isLoading,
    refreshing: query.isRefetching,
    refresh,
    profile,
    logs,
    cycleHistory,
    displayName,
    phase,
    todayLog,
    ctx,
    tips,
    stats,
    highlights,
    forecast,
    patterns,
    hygieneCycle,
    periodNear,
    goal,
    favourites: (favQuery.data?.favourites || []).map((f) => f.title),
    reloadFavourites: () => void favQuery.refetch(),
    savingPeriod,
    markPeriodStarted,
    savePainLog,
    completeCheckIn,
    applyChartUpdate,
    relief,
    openRelief: (severity = null) => setRelief({ open: true, severity }),
    closeRelief: () => {
      setRelief({ open: false, severity: null });
      void favQuery.refetch();
    },
    checkInDue,
  };

  return <HerContext.Provider value={value}>{children}</HerContext.Provider>;
}

export function useHer(): HerData {
  const v = useContext(HerContext);
  if (!v) throw new Error("useHer must be used inside HerDataProvider");
  return v;
}
