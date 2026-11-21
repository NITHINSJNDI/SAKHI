/**
 * Port of HerNotificationCenter / PregnancyNotificationCenter: master switch,
 * Upcoming / Missed / Completed / Settings tabs, done / snooze / delete.
 */
import { BellRinging, BellZ, Brain, Calendar, CheckCircle, Clock, Drop, Flower, Heartbeat, Trash, WarningCircle, type Icon } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, Switch, View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { atom } from "@/components/web/Atoms";
import { ink } from "@/components/web/Panel";
import { Sheet } from "@/components/web/Sheet";
import { useT } from "@/lib/i18n";
import type { Reminder } from "@/lib/useHerReminders";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

const ICON: Record<string, { icon: Icon; color: string }> = {
  hydration: { icon: Drop, color: "#3B82F6" },
  water: { icon: Drop, color: "#3B82F6" },
  bp: { icon: Heartbeat, color: "#EF4444" },
  emergency: { icon: WarningCircle, color: "#DC2626" },
  progress: { icon: BellRinging, color: palette.pink500 },
  pain_mgmt: { icon: Heartbeat, color: "#EF4444" },
  ovulation: { icon: Flower, color: TW.amber[500] },
  fertile_start: { icon: Flower, color: TW.amber[500] },
  fertile_end: { icon: Flower, color: TW.amber[500] },
  period_prep_3d: { icon: Calendar, color: palette.pink500 },
  period_prep_1d: { icon: Calendar, color: palette.pink500 },
  period_start: { icon: Calendar, color: palette.pink500 },
  appointment: { icon: Calendar, color: palette.pink500 },
  ai_insight: { icon: Brain, color: "#A855F7" },
  irregular_cycle: { icon: Brain, color: "#A855F7" },
  missed_period: { icon: WarningCircle, color: "#DC2626" },
  danger: { icon: WarningCircle, color: "#DC2626" },
};

type Tab = "upcoming" | "missed" | "completed" | "settings";

export default function NotificationCenter<P extends { enabled: boolean }>({
  open,
  onClose,
  title,
  disabledHint,
  preferences,
  prefKeys,
  reminders,
  onToggleMaster,
  onUpdatePref,
  onMarkCompleted,
  onSnooze,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  disabledHint: string;
  preferences: P;
  prefKeys: (keyof P & string)[];
  reminders: Reminder[];
  onToggleMaster: () => void;
  onUpdatePref: (key: keyof P, v: boolean) => void;
  onMarkCompleted: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("upcoming");
  const names: Record<Tab, string> = {
    upcoming: t("notifications.upcoming"),
    missed: t("notifications.missed"),
    completed: t("notifications.completed"),
    settings: t("notifications.settings"),
  };
  const list = reminders.filter((r) => (tab === "upcoming" ? r.status === "upcoming" || r.status === "snoozed" : r.status === tab));
  const missedCount = reminders.filter((r) => r.status === "missed").length;

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingVertical: 8 }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 16, fontWeight: "500", color: palette.plum900 }}>{t("notifications.enableNotifications")}</AppText>
          <AppText style={atom.small}>Reminders arrive as phone notifications.</AppText>
        </View>
        <Switch value={preferences.enabled} onValueChange={onToggleMaster} trackColor={{ true: "#A855F7", false: "#E5E7EB" }} thumbColor="#fff" />
      </View>

      {preferences.enabled ? (
        <>
          <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)", marginTop: 8 }} accessibilityRole="tablist">
            {(["upcoming", "missed", "completed", "settings"] as Tab[]).map((k) => {
              const on = tab === k;
              return (
                <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: on ? "#A855F7" : "transparent" }}>
                  <AppText numberOfLines={1} style={{ fontSize: 13, fontWeight: "500", color: on ? "#9333EA" : ink[60] }}>
                    {names[k]}
                    {k === "missed" && missedCount > 0 ? ` (${missedCount})` : ""}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: 16, gap: 12 }}>
            {tab === "settings" ? (
              prefKeys.map((key) => (
                <View key={key} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" }}>
                  <AppText style={{ fontSize: 15, fontWeight: "500", color: palette.plum900, textTransform: "capitalize" }}>{key.replace(/_/g, " ")}</AppText>
                  <Switch value={Boolean(preferences[key])} onValueChange={(v) => onUpdatePref(key, v)} trackColor={{ true: "#C084FC", false: "#E5E7EB" }} thumbColor="#fff" />
                </View>
              ))
            ) : list.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
                <BellZ size={56} color="rgba(42,21,47,0.15)" />
                <AppText style={{ fontSize: 14, color: ink[45] }}>{t("notifications.noNotifications", { tab: names[tab] })}</AppText>
              </View>
            ) : (
              list.map((r) => {
                const ic = ICON[r.category] ?? { icon: BellRinging, color: ink[60] };
                const I = ic.icon;
                return (
                  <View key={r.id} style={{ backgroundColor: "#fff", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", flexDirection: "row", gap: 14 }}>
                    <I size={24} color={ic.color} weight="fill" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 15, fontWeight: "500", color: palette.plum900 }}>{r.title}</AppText>
                      <AppText style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: ink[70] }}>{r.message}</AppText>
                      <AppText style={{ marginTop: 8, fontSize: 12, color: r.status === "snoozed" ? TW.amber[500] : ink[50], fontWeight: r.status === "snoozed" ? "500" : "400" }}>
                        {r.status === "snoozed"
                          ? `Snoozed until ${new Date(r.snoozedUntil || 0).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : `Due: ${new Date(r.scheduledTime).toLocaleString([], { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })}`}
                      </AppText>
                      {tab === "upcoming" || tab === "missed" ? (
                        <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
                          <PressableScale onPress={() => onMarkCompleted(r.id)} style={{ flex: 1, flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center", minHeight: 40, borderRadius: 10, backgroundColor: "#F3E8FF" }}>
                            <CheckCircle size={16} color="#7E22CE" weight="bold" />
                            <AppText style={{ fontSize: 14, fontWeight: "500", color: "#7E22CE" }}>Done</AppText>
                          </PressableScale>
                          <PressableScale onPress={() => onSnooze(r.id, 1)} style={{ flex: 1, flexDirection: "row", gap: 4, alignItems: "center", justifyContent: "center", minHeight: 40, borderRadius: 10, backgroundColor: "#F3F4F6" }}>
                            <Clock size={16} color="#374151" weight="bold" />
                            <AppText style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>Snooze 1h</AppText>
                          </PressableScale>
                          <PressableScale onPress={() => onDelete(r.id)} accessibilityLabel="Delete reminder" style={{ width: 40, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: TW.red[50] }}>
                            <Trash size={16} color={TW.red[500]} weight="bold" />
                          </PressableScale>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </>
      ) : (
        <View style={{ alignItems: "center", paddingVertical: 40, gap: 12 }}>
          <BellRinging size={56} color="rgba(42,21,47,0.15)" />
          <AppText style={{ fontSize: 14, textAlign: "center", color: ink[50] }}>{disabledHint}</AppText>
        </View>
      )}
    </Sheet>
  );
}
