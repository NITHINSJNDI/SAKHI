/**
 * Mom Mode state shared by the Today / Vitals / Plan / Care tabs.
 * Port of the data flow in frontend/app/pregnancy-mode/page.tsx: pregnancy
 * data, the two ML risk scores (only from readings she logged), appointments,
 * the daily check-in, after-birth stage and the reminder plan.
 */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiFetch } from "./api";
import { chartBus, emitEmergency } from "./events";
import { sendOrQueue } from "./outbox";
import { queryKeys } from "./queryKeys";
import { ageDays, EMPTY_POSTPARTUM, stageOf, type PostpartumDoc, type PostpartumStage } from "./shared/postpartum";
import type { MeasuredBy } from "./shared/readings";
import { getString, setString } from "./storage";
import { useMomReminders } from "./useHerReminders";
import { dayKey, useUserDoc } from "./useUserDoc";

interface PregnancyData {
  profile: any;
  logs: any[];
  nutrition?: any;
  appointments?: any[];
}
export interface MlState {
  preeclampsia: any;
  gdm: any;
  isLoading: boolean;
  bpDate: string | null;
  sugarDate: string | null;
  bpBy?: MeasuredBy | null;
  sugarBy?: MeasuredBy | null;
}

const LAST_CHECKIN = "sakhi_last_checkin_mom";
const isoDay = (v: any) => String(v || "").slice(0, 10);

function useMlRisk(profile: any, logs: any[]) {
  const latestBp = useMemo(() => [...logs].reverse().find((l) => l.blood_pressure_systolic && l.blood_pressure_diastolic), [logs]);
  const latestSugar = useMemo(() => [...logs].reverse().find((l) => l.blood_sugar !== null && l.blood_sugar !== undefined && Number(l.blood_sugar) > 0), [logs]);
  const conditions: string[] = profile?.maternal_conditions || [];
  const htn = conditions.some((c) => /pressure|hypertension/i.test(c));
  const dm = conditions.some((c) => /diabetes|sugar/i.test(c));
  const recentSymptoms = logs.slice(-3).flatMap((l) => l.symptoms || []);

  const pe = useQuery({
    queryKey: ["predict", "preeclampsia", latestBp?.blood_pressure_systolic, latestBp?.blood_pressure_diastolic, latestSugar?.blood_sugar, htn, profile?.age, recentSymptoms.join(",")],
    enabled: Boolean(profile && latestBp),
    queryFn: () =>
      apiFetch<any>("/api/predict/preeclampsia", {
        method: "POST",
        body: JSON.stringify({
          systolic: Number(latestBp.blood_pressure_systolic),
          diastolic: Number(latestBp.blood_pressure_diastolic),
          hypertension_history: htn ? 1 : 0,
          ...(latestSugar ? { blood_sugar: Number(latestSugar.blood_sugar) } : {}),
          ...(profile?.age ? { age: Number(profile.age) } : {}),
          symptoms: recentSymptoms,
        }),
      }).catch(() => null),
  });
  const gdm = useQuery({
    queryKey: ["predict", "gdm", latestSugar?.blood_sugar, dm, profile?.age, profile?.bmi],
    enabled: Boolean(profile && latestSugar),
    queryFn: () =>
      apiFetch<any>("/api/predict/gdm", {
        method: "POST",
        body: JSON.stringify({
          blood_sugar: Number(latestSugar.blood_sugar),
          diabetes_history: dm ? 1 : 0,
          ...(profile?.age ? { age: Number(profile.age) } : {}),
          ...(profile?.bmi ? { bmi: Number(profile.bmi) } : {}),
        }),
      }).catch(() => null),
  });

  return {
    preeclampsia: latestBp ? (pe.data ?? null) : null,
    gdm: latestSugar ? (gdm.data ?? null) : null,
    isLoading: pe.isFetching || gdm.isFetching,
    bpDate: latestBp ? isoDay(latestBp.log_date) : null,
    sugarDate: latestSugar ? isoDay(latestSugar.log_date) : null,
    bpBy: latestBp?.measured_by ?? null,
    sugarBy: latestSugar?.measured_by ?? null,
  } satisfies MlState;
}

function useMomValue(fallbackName?: string | null) {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.pregnancyData, queryFn: () => apiFetch<PregnancyData>("/api/pregnancy-data") });
  const pp = useUserDoc<PostpartumDoc>("postpartum", EMPTY_POSTPARTUM);
  const [lastCheckIn, setLastCheckIn] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    void getString(LAST_CHECKIN).then((v) => setLastCheckIn(v));
  }, []);

  const data = query.data;
  const profile = data?.profile ?? null;
  const logs = useMemo(() => data?.logs ?? [], [data?.logs]);
  const appointments = useMemo(() => data?.appointments ?? [], [data?.appointments]);
  const setData = useCallback((fn: (d: PregnancyData) => PregnancyData) => qc.setQueryData<PregnancyData>(queryKeys.pregnancyData, (d) => (d ? fn(d) : d)), [qc]);

  const born = pp.loaded && Boolean(pp.doc.birth_date);
  const daysOld = born ? ageDays(pp.doc.birth_date!, dayKey()) : null;
  const ppStage: PostpartumStage | null = daysOld !== null ? stageOf(daysOld) : null;
  const weeks: number = Number(profile?.weeks_pregnant) || 18;
  const dueMs = profile?.expected_due_date ? Date.parse(isoDay(profile.expected_due_date) + "T00:00:00") : NaN;
  // eslint-disable-next-line react-hooks/purity
  const daysToGo = useMemo(() => (isNaN(dueMs) ? null : Math.max(0, Math.ceil((dueMs - Date.now()) / 86_400_000))), [dueMs]);
  const displayName: string = profile?.preferred_name || fallbackName?.split(" ")[0] || "Mama";
  const ml = useMlRisk(profile, logs);

  const today = dayKey();
  const hasTodayLog = logs.some((l) => l.source !== "lab" && isoDay(l.log_date) === today);
  const checkInDue = Boolean(data) && pp.loaded && !born && lastCheckIn !== undefined && lastCheckIn !== today && !hasTodayLog;

  const completeCheckIn = useCallback(
    async (d: any) => {
      if (d.isEmergency) emitEmergency(null);
      const entry = {
        log_date: d.log_date || dayKey(),
        weight: logs.length && logs[logs.length - 1].weight ? logs[logs.length - 1].weight : null,
        blood_pressure_systolic: d.blood_pressure_systolic,
        blood_pressure_diastolic: d.blood_pressure_diastolic,
        blood_sugar: d.blood_sugar,
        mood: d.mood,
        sleep_hours: d.sleep_hours,
        baby_movement: d.baby_movement,
        symptoms: d.symptoms,
      };
      setData((p) => ({ ...p, logs: [...p.logs.filter((l) => isoDay(l.log_date) !== entry.log_date), entry] }));
      await sendOrQueue("/api/pregnancy-log", "POST", entry).catch(() => null);
      await setString(LAST_CHECKIN, today);
      setLastCheckIn(today);
      void query.refetch();
    },
    [logs, setData, today, query],
  );

  const toggleAppointment = useCallback(
    async (index: number) => {
      setData((p) => ({ ...p, appointments: (p.appointments || []).map((a, i) => (i === index ? { ...a, completed: !a.completed } : a)) }));
      await apiFetch("/api/pregnancy-appointments", { method: "POST", body: JSON.stringify({ action: "toggle", index }) }).catch(() => null);
    },
    [setData],
  );
  const resetAppointments = useCallback(async () => {
    setData((p) => ({ ...p, appointments: [] }));
    await apiFetch("/api/pregnancy-appointments", { method: "POST", body: JSON.stringify({ action: "reset" }) }).catch(() => null);
  }, [setData]);

  // Live updates from the chat (a log, the profile, appointments)
  useEffect(
    () =>
      chartBus.on((d: any) => {
        if (!d) return;
        if (d.type === "daily_log" && d.log) setData((p) => ({ ...p, logs: [...p.logs.filter((l) => isoDay(l.log_date) !== isoDay(d.log.log_date || today)), d.log].sort((a, b) => String(a.log_date).localeCompare(String(b.log_date))) }));
        else if (d.type === "profile_update" && d.profile) setData((p) => ({ ...p, profile: { ...p.profile, ...d.profile } }));
        else if (d.type === "appointment_update" && d.appointments) setData((p) => ({ ...p, appointments: d.appointments }));
      }),
    [setData, today],
  );

  const reminders = useMomReminders(profile, logs, appointments, born ? { babyName: pp.doc.baby_name, daysOld: daysOld ?? 0 } : null);

  return {
    loading: query.isLoading || !pp.loaded,
    refreshing: query.isRefetching,
    refresh: async () => {
      await Promise.all([query.refetch(), pp.reload()]);
    },
    profile,
    logs,
    appointments,
    nutrition: data?.nutrition ?? null,
    pp,
    born,
    ppStage,
    weeks,
    daysToGo,
    displayName,
    ml,
    checkInDue,
    completeCheckIn,
    toggleAppointment,
    resetAppointments,
    reminders,
  };
}

export type MomData = ReturnType<typeof useMomValue>;
const MomContext = createContext<MomData | null>(null);

export function MomDataProvider({ children, fallbackName }: { children: ReactNode; fallbackName?: string | null }) {
  const value = useMomValue(fallbackName);
  return <MomContext.Provider value={value}>{children}</MomContext.Provider>;
}

export function useMom(): MomData {
  const v = useContext(MomContext);
  if (!v) throw new Error("useMom must be used inside MomDataProvider");
  return v;
}
