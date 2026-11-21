/**
 * Port of frontend/hooks/useHerNotifications.ts. Same reminder plan (period prep,
 * fertile window, check-ins, hydration, iron, pain, mood, irregular cycles,
 * weekly summary). On the phone each upcoming reminder is a real scheduled
 * notification instead of a 10-second in-page timer.
 */
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { requestNotificationPermission, setDateReminders } from "./localReminders";
import { getJSON, setJSON } from "./storage";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ReminderStatus = "upcoming" | "completed" | "snoozed" | "missed";
export interface Reminder {
  id: string;
  title: string;
  message: string;
  category: string;
  scheduledTime: number;
  status: ReminderStatus;
  snoozedUntil?: number;
}
export interface HerPrefs {
  enabled: boolean;
  period_alerts: boolean;
  fertile_alerts: boolean;
  daily_checkins: boolean;
  health_tips: boolean;
}
const DEFAULT_PREFS: HerPrefs = { enabled: false, period_alerts: true, fertile_alerts: true, daily_checkins: true, health_tips: true };
const DAY = 86_400_000;

export function useReminderStore<P extends { enabled: boolean }>(prefix: string, defaults: P) {
  const [preferences, setPreferences] = useState<P>(defaults);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      setPreferences({ ...defaults, ...(await getJSON<Partial<P>>(`${prefix}_notif_prefs`, {})) });
      setReminders(await getJSON<Reminder[]>(`${prefix}_reminders`, []));
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefix]);
  useEffect(() => {
    if (ready) void setJSON(`${prefix}_notif_prefs`, preferences);
  }, [preferences, prefix, ready]);
  useEffect(() => {
    if (ready) void setJSON(`${prefix}_reminders`, reminders);
  }, [reminders, prefix, ready]);

  // Schedule the phone notifications for everything still upcoming / snoozed
  useEffect(() => {
    if (!ready) return;
    const items = preferences.enabled
      ? reminders
          .filter((r) => r.status === "upcoming" || r.status === "snoozed")
          .map((r) => ({ at: r.status === "snoozed" ? r.snoozedUntil || r.scheduledTime : r.scheduledTime, title: r.title, body: r.message }))
      : [];
    void setDateReminders(`${prefix}_plan`, items);
  }, [reminders, preferences.enabled, prefix, ready]);

  const toggleMaster = useCallback(async () => {
    if (!preferences.enabled) {
      const ok = await requestNotificationPermission();
      if (ok) setPreferences((p) => ({ ...p, enabled: true }));
      else Alert.alert("Notifications are off", "Turn on notifications for Sakhi in your phone's settings to get reminders.");
    } else setPreferences((p) => ({ ...p, enabled: false }));
  }, [preferences.enabled]);

  const updatePreference = (key: keyof P, value: boolean) => setPreferences((p) => ({ ...p, [key]: value }));
  const markCompleted = (id: string) => setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, status: "completed" } : r)));
  const snoozeReminder = (id: string, hours = 1) =>
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, status: "snoozed", snoozedUntil: Date.now() + hours * 3_600_000 } : r)));
  const deleteReminder = (id: string) => setReminders((prev) => prev.filter((r) => r.id !== id));

  // A reminder whose time has passed shows as "missed" (it already fired on the phone)
  const now = Date.now();
  const shown = reminders.map((r) => {
    const at = r.status === "snoozed" ? r.snoozedUntil || 0 : r.scheduledTime;
    return (r.status === "upcoming" || r.status === "snoozed") && at <= now ? { ...r, status: "missed" as ReminderStatus } : r;
  });

  return { ready, preferences, setPreferences, reminders: shown, setReminders, toggleMaster, updatePreference, markCompleted, snoozeReminder, deleteReminder };
}

/** Merge newly generated reminders without overwriting the status of existing ones. */
export function mergeReminders(prev: Reminder[], next: Reminder[]) {
  const now = Date.now();
  const merged = [...prev];
  next.forEach((nr) => {
    if (!merged.find((r) => r.id === nr.id)) merged.push(nr);
  });
  return merged.sort((a, b) => a.scheduledTime - b.scheduledTime).filter((r) => r.scheduledTime > now - 30 * DAY);
}

export function useHerReminders(profile: any, logs: any[], cycleHistory: any[]) {
  const store = useReminderStore<HerPrefs>("her", DEFAULT_PREFS);
  const { preferences, setReminders, ready } = store;

  useEffect(() => {
    if (!ready) return;
    if (!preferences.enabled) {
      setReminders((prev) => prev.filter((r) => r.status !== "upcoming"));
      return;
    }
    if (!profile?.last_period_start) return;
    const now = Date.now();
    const out: Reminder[] = [];
    const cycleLength = profile.cycle_length_avg || 28;
    const periodDuration = profile.period_duration || 5;
    const last = new Date(profile.last_period_start);
    const nextPeriod = new Date(last.getTime() + cycleLength * DAY);
    const ovulation = new Date(nextPeriod.getTime() - 14 * DAY);
    const fertileStart = new Date(ovulation.getTime() - 4 * DAY);
    const fertileEnd = new Date(ovulation.getTime() + 1 * DAY);
    const add = (id: string, title: string, message: string, category: string, at: number, cond = true) => {
      if (cond && at > now - DAY) {
        out.push({ id: `${id}_${new Date(at).toDateString()}`, title, message, category, scheduledTime: Math.max(at, now + 60_000), status: "upcoming" });
      }
    };
    const todayAt = (h: number) => new Date().setHours(h, 0, 0, 0);

    if (preferences.period_alerts) {
      add("prep_3d", "Period Preparation", "🌸 Your period is expected in 3 days. Remember to carry sanitary pads, tampons, or your menstrual cup.", "period_prep_3d", nextPeriod.getTime() - 3 * DAY);
      add("prep_1d", "Period Tomorrow", "🌸 Your period is expected tomorrow. Keep your menstrual essentials ready.", "period_prep_1d", nextPeriod.getTime() - DAY);
      add("start_0d", "Period Start Reminder", "🩸 Your period is expected to begin today. Don't forget to update your flow and symptoms.", "period_start", nextPeriod.getTime());
      add("missed_alert", "Missed Period?", "⚠️ Your period appears delayed. Please update your cycle or consult a healthcare professional if delays continue.", "missed_period", nextPeriod.getTime() + 3 * DAY);
    }
    if (preferences.fertile_alerts) {
      add("ovu_day", "Ovulation Day", "🌼 Today is your predicted ovulation day.", "ovulation", ovulation.getTime());
      add("fert_start", "Fertile Window Start", "🌸 Your fertile window starts today.", "fertile_start", fertileStart.getTime());
      add("fert_end", "Fertile Window End", "🌼 Your fertile window ends today.", "fertile_end", fertileEnd.getTime());
    }
    const daysSince = Math.floor((now - last.getTime()) / DAY);
    const onPeriod = daysSince >= 0 && daysSince < periodDuration;
    if (preferences.daily_checkins && onPeriod) {
      add("daily_check", "Daily Period Check-in", "How are you feeling today? Please update: Flow, Pain, Symptoms, and Mood.", "daily_checkin", todayAt(19));
    }
    if (preferences.health_tips) {
      if (onPeriod) {
        add("hydrate", "Hydration Reminder", "💧 Stay hydrated today. Proper hydration may help reduce cramps and fatigue.", "hydration", todayAt(14));
        add("iron", "Iron-rich Food Reminder", "🥗 Your recent cycles indicate heavy flow. Include iron-rich foods such as spinach, beans, dates, and leafy vegetables today.", "iron_food", todayAt(13), logs.some((l) => l.flow_intensity === "Heavy" || l.flow_intensity === "Very Heavy"));
        add("pain", "Pain Management Reminder", "🌿 Based on your previous cycles, cramps usually begin today. Use a heating pad or light stretching.", "pain_mgmt", todayAt(10), logs.some((l) => l.cramps_severity >= 6));
      }
      if (daysSince >= 15 && daysSince < cycleLength) {
        add("mood", "Mood Support Reminder", "😊 Your mood usually changes around this phase. Take some time to rest, relax, or practice self-care.", "mood_support", todayAt(18));
      }
      if (profile.cycle_regularity === "No" || cycleHistory.some((c) => c.cycleLength > 35 || c.cycleLength < 21)) {
        add("irreg", "Irregular Cycle Alert", "📋 We've noticed recurring irregular cycles. Consider consulting a gynecologist.", "irregular_cycle", todayAt(11) > now ? todayAt(11) : todayAt(11) + DAY);
      }
      add("symp", "Symptom Monitoring", "🤕 You usually experience headaches before your period. Please update today's symptoms.", "symptom_monitor", nextPeriod.getTime() - 2 * DAY);
    }
    const sunday = new Date();
    sunday.setDate(sunday.getDate() + (7 - sunday.getDay()));
    sunday.setHours(9, 0, 0, 0);
    add("weekly", "Weekly Health Summary", "📊 Weekly Summary available: View your Cycle, Mood, and upcoming predictions.", "weekly_summary", sunday.getTime());

    setReminders((prev) => mergeReminders(prev, out));
  }, [profile, logs, cycleHistory, preferences, ready, setReminders]);

  return store;
}

/* ---------- Mom Mode: port of frontend/hooks/usePregnancyNotifications.ts ---------- */
export interface MomPrefs {
  enabled: boolean;
  water: boolean;
  meal: boolean;
  vitamins: boolean;
  exercise: boolean;
  bp: boolean;
  sugar: boolean;
}
const MOM_DEFAULTS: MomPrefs = { enabled: false, water: true, meal: true, vitamins: true, exercise: true, bp: true, sugar: true };
/** Pregnancy-only reminders that must stop once the baby is born. */
const PREGNANCY_ONLY = ["progress", "development", "movement", "sugar", "hospital_bag", "due_date", "ultrasound", "appointment"];

export function useMomReminders(profile: any, logs: any[], appointments: any[], afterBirth: { babyName?: string | null; daysOld: number } | null) {
  const store = useReminderStore<MomPrefs>("pregnancy", MOM_DEFAULTS);
  const { preferences, setReminders, ready } = store;
  const daysOld = afterBirth?.daysOld;
  const babyName = afterBirth?.babyName;

  useEffect(() => {
    if (!ready) return;
    if (!preferences.enabled) {
      setReminders((prev) => prev.filter((r) => r.status !== "upcoming"));
      return;
    }
    if (!profile) return;
    const now = Date.now();
    const out: Reminder[] = [];
    const addDaily = (id: string, title: string, message: string, category: string, hour: number) => {
      const at = new Date().setHours(hour, 0, 0, 0);
      if (at > now) out.push({ id: `${id}_${new Date().toDateString()}`, title, message, category, scheduledTime: at, status: "upcoming" });
    };

    if (daysOld !== undefined) {
      const baby = babyName || "baby";
      addDaily("health_check", "How are you both?", `How are you and ${baby} today? Sakhi is here if anything worries you.`, "health_check", 20);
      if (preferences.water) addDaily("water_1", "Drink water", "💧 Breastfeeding needs extra water. Keep a glass near you while you feed.", "water", 14);
      if (preferences.meal) addDaily("meal_1", "Eat well", "🥗 Eat a proper meal, even if baby keeps you busy. You need more food while breastfeeding.", "meal", 13);
      if (preferences.vitamins) addDaily("vitamins_1", "Your tablets", "💊 Keep taking your iron and calcium tablets for 6 months after birth.", "vitamins", 9);
      if (preferences.bp && daysOld <= 42) addDaily("bp_1", "Blood pressure", "❤️ Check your BP today, especially if you have a headache or blurred vision.", "bp", 10);
      setReminders((prev) => mergeReminders(prev.filter((r) => !(r.status === "upcoming" && PREGNANCY_ONLY.includes(r.category))), out));
      return;
    }

    const weeks = Number(profile.weeks_pregnant) || 0;
    // The weekly welcome lands next morning at 9 instead of a 10-second demo timer
    const tomorrow9 = new Date();
    tomorrow9.setDate(tomorrow9.getDate() + (tomorrow9.getHours() >= 9 ? 1 : 0));
    tomorrow9.setHours(9, 0, 0, 0);
    out.push({ id: `prog_wk_${weeks}`, title: `Welcome to Week ${weeks}!`, message: `Your baby is now approximately the size of a ${profile.baby_size_fruit || "fruit"}.`, category: "progress", scheduledTime: tomorrow9.getTime(), status: "upcoming" });
    addDaily("health_check", "Daily Health Check", "How are you feeling today? Update symptoms and mood.", "health_check", 20);
    if (preferences.water) addDaily("water_1", "Stay Hydrated", "💧 Stay hydrated today for a healthy pregnancy.", "water", 14);
    if (preferences.meal) addDaily("meal_1", "Meal Reminder", "🥗 Don't skip today's nutritious meals.", "meal", 13);
    if (preferences.vitamins) addDaily("vitamins_1", "Prenatal Vitamins", "💊 Time to take your prenatal vitamins.", "vitamins", 9);
    addDaily("sleep_1", "Time to Rest", "😴 Aim for adequate rest tonight.", "sleep", 22);
    if (weeks >= 28) addDaily("movement_1", "Baby Movement", "👶 Have you felt your baby move today? Please record it.", "movement", 19);
    appointments.forEach((apt, i) => {
      if (!apt.completed) {
        const when = apt.date ? new Date(String(apt.date).slice(0, 10) + "T09:00:00").getTime() - DAY : now + 2 * DAY;
        out.push({ id: `apt_${i}`, title: `Upcoming: ${apt.name}`, message: `📅 Your ${apt.name} is scheduled soon.`, category: "appointment", scheduledTime: Math.max(when, now + 60_000), status: "upcoming" });
      }
    });
    if (preferences.bp) addDaily("bp_1", "Blood Pressure", "❤️ Time to record today's blood pressure.", "bp", 10);
    if (preferences.sugar) addDaily("sugar_1", "Blood Sugar", "🩸 Please record today's blood sugar level.", "sugar", 8);
    if (logs.length > 0 && Number(logs[0].sleep_hours) > 0 && Number(logs[0].sleep_hours) < 7) {
      addDaily("ai_sleep", "AI Insight: Rest Needed", "😴 Your sleep has been below 7 hours this week. Try to get more rest tonight.", "ai_insight", 21);
    }
    if (weeks === 36) out.push({ id: "bag_36", title: "Preparation", message: "🎒 It's time to prepare your hospital bag.", category: "hospital_bag", scheduledTime: now + 60 * 60_000, status: "upcoming" });

    setReminders((prev) => mergeReminders(prev, out));
  }, [profile, logs, appointments, preferences, ready, setReminders, daysOld, babyName]);

  return store;
}
