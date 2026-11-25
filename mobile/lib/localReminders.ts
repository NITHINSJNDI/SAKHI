/**
 * Phone notifications scheduled on the device (no server needed), e.g. a daily
 * reminder for each tablet dose. Each group is replaced as a whole whenever the
 * plan changes, so reminders never pile up.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { discreetNotice } from "./discreet";
import { getJSON, setJSON } from "./storage";

const idsKey = (group: string) => `sakhi_local_reminders_${group}`;

export interface DailyReminder {
  hour: number;
  minute: number;
  title: string;
  body: string;
}

async function allowed(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return true;
    if (!p.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Replace every reminder in `group` with `items` (repeating daily). */
export async function setDailyReminders(group: string, items: DailyReminder[]): Promise<void> {
  if (Platform.OS === "web") return;
  const old = await getJSON<string[]>(idsKey(group), []);
  await Promise.all(old.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  if (!items.length || !(await allowed())) {
    await setJSON(idsKey(group), []);
    return;
  }
  const ids: string[] = [];
  for (const it of items) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { ...discreetNotice(it.title, it.body), sound: "default" },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: it.hour, minute: it.minute },
      });
      ids.push(id);
    } catch {
      // skip one that couldn't be scheduled
    }
  }
  await setJSON(idsKey(group), ids);
}

/** Replace every reminder in `group` with one-off notifications at the given times (past ones are skipped). */
export async function setDateReminders(group: string, items: { at: number; title: string; body: string; data?: Record<string, string> }[]): Promise<void> {
  if (Platform.OS === "web") return;
  const old = await getJSON<string[]>(idsKey(group), []);
  await Promise.all(old.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  const future = items.filter((i) => i.at > Date.now() + 5_000).slice(0, 40);
  if (!future.length || !(await allowed())) {
    await setJSON(idsKey(group), []);
    return;
  }
  const ids: string[] = [];
  for (const it of future) {
    try {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: { ...discreetNotice(it.title, it.body), sound: "default", data: it.data },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(it.at) },
        }),
      );
    } catch {
      // skip
    }
  }
  await setJSON(idsKey(group), ids);
}

/** Ask for notification permission now (e.g. when she turns reminders on). */
export const requestNotificationPermission = allowed;

/** Cancel every Sakhi reminder on this phone (sign-out). */
export async function clearAllLocalReminders(): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
