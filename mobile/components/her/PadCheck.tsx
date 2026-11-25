/**
 * Private pad-change reminder. While she's bleeding, a notification is set for
 * when her pad / cloth / cup is due. Its text never says what it's about
 * ("Sakhi is calling you 💜"). Tapping it, or opening the app once a change is
 * due, shows a small sheet to log the change or be reminded in an hour.
 */
import * as Notifications from "expo-notifications";
import { Drop } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform, View } from "react-native";

import { AppText } from "@/components/AppText";
import { PillButton } from "@/components/web/Atoms";
import { ink } from "@/components/web/Panel";
import { Sheet } from "@/components/web/Sheet";
import { successHaptic } from "@/lib/haptics";
import { useHer } from "@/lib/herData";
import { useT } from "@/lib/i18n";
import { setDateReminders } from "@/lib/localReminders";
import { EMPTY_HYGIENE, lastChangeAt, PRODUCTS, recordChange, type HygieneDoc } from "@/lib/shared/hygiene";
import { TW } from "@/lib/tw";
import { useUserDoc } from "@/lib/useUserDoc";
import { palette } from "@/theme";

const HOUR = 3_600_000;
const nowMs = () => Date.now();

export default function PadCheck() {
  const { t } = useT();
  const { hygieneCycle } = useHer();
  const { doc, save, loaded } = useUserDoc<HygieneDoc>("hygiene", EMPTY_HYGIENE);
  const [open, setOpen] = useState(false);
  const [snoozeUntil, setSnoozeUntil] = useState(0);
  const handled = useRef<string | null>(null);

  const guide = doc.product ? PRODUCTS[doc.product] : null;
  const last = lastChangeAt(doc.changes);
  // A change older than a day belongs to an earlier period
  const dueAt = hygieneCycle.bleeding && guide && last && nowMs() - last < 24 * HOUR ? last + guide.maxHours * HOUR : null;

  // Keep exactly one private reminder: at the due time, or the snooze time
  useEffect(() => {
    if (!loaded) return;
    const at = snoozeUntil > Date.now() ? snoozeUntil : dueAt;
    void setDateReminders("pad_change", at ? [{ at, title: "Sakhi", body: t("padCheck.calling", "Sakhi is calling you 💜"), data: { kind: "pad" } }] : []);
  }, [loaded, dueAt, snoozeUntil, t]);

  // Opened from that notification (cold start or while running); notifications don't exist on web
  useEffect(() => {
    if (Platform.OS === "web") return;
    const onResponse = (r: Notifications.NotificationResponse | null) => {
      const id = r?.notification.request.identifier;
      if (!id || handled.current === id || r?.notification.request.content.data?.kind !== "pad") return;
      handled.current = id;
      setOpen(true);
    };
    const last = Notifications.getLastNotificationResponse();
    void Promise.resolve().then(() => onResponse(last));
    const sub = Notifications.addNotificationResponseReceivedListener(onResponse);
    return () => sub.remove();
  }, []);

  // Opened the app (or came back to it) once a change is due
  useEffect(() => {
    const check = () => {
      if (dueAt && Date.now() >= dueAt && Date.now() >= snoozeUntil) setOpen(true);
    };
    void Promise.resolve().then(check);
    const sub = AppState.addEventListener("change", (s) => s === "active" && check());
    return () => sub.remove();
  }, [dueAt, snoozeUntil]);

  if (!guide) return null;
  const hours = last ? Math.max(1, Math.round((nowMs() - last) / HOUR)) : 0;
  const item = t(`hygiene.${doc.product}`, guide.label).toLowerCase();

  return (
    <Sheet open={open} onClose={() => setOpen(false)} title={t("padCheck.title", { item })}>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: TW.rose[50], alignItems: "center", justifyContent: "center" }}>
          <Drop size={22} color={palette.blush500} weight="duotone" />
        </View>
        <AppText style={{ flex: 1, fontSize: 15, lineHeight: 22, color: ink[75] }}>
          {t("padCheck.body", { hours })}
        </AppText>
      </View>
      <View style={{ marginTop: 20, gap: 10 }}>
        <PillButton
          label={t("padCheck.changed", "I changed just now")}
          onPress={() => {
            void save((prev) => recordChange(prev));
            successHaptic();
            setSnoozeUntil(0);
            setOpen(false);
          }}
        />
        <PillButton
          label={t("padCheck.later", "Remind me in 1 hour")}
          variant="secondary"
          onPress={() => {
            setSnoozeUntil(Date.now() + HOUR);
            setOpen(false);
          }}
        />
      </View>
    </Sheet>
  );
}
