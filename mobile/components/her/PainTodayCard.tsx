/** Port of frontend/components/her/PainTodayCard.tsx: log pain as often as it changes through the day. */
import { Heartbeat, Lightning, Trash } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { atom, PillButton, ToggleChip } from "@/components/web/Atoms";
import { ink, Panel, PanelTitle } from "@/components/web/Panel";
import { apiFetch } from "@/lib/api";
import { localIso } from "@/lib/date";
import { selectHaptic, successHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { PAIN_WHERE, painEvents, worstPain, type PainEvent } from "@/lib/shared/painLog";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

 
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const band = (n: number) => (n === 0 ? "None" : n <= 3 ? "Mild" : n <= 6 ? "Moderate" : "Severe");
const LIME = { 100: "#ECFCCB", 200: "#D9F99D", 400: "#A3E635", 900: "#365314" };
const tone = (n: number) =>
  n === 0
    ? { bg: TW.emerald[100], fg: TW.emerald[800], border: TW.emerald[200] }
    : n <= 3
      ? { bg: LIME[100], fg: LIME[900], border: LIME[200] }
      : n <= 6
        ? { bg: TW.amber[100], fg: "#78350F", border: TW.amber[200] }
        : { bg: TW.rose[100], fg: TW.rose[800], border: TW.rose[200] };
const barTone = (n: number) => (n === 0 ? TW.emerald[400] : n <= 3 ? LIME[400] : n <= 6 ? TW.amber[400] : TW.rose[500]);

export default function PainTodayCard({ logs, onSaved, onOpenRelief }: { logs: any[]; onSaved: (log: any) => void; onOpenRelief?: () => void }) {
  const { t } = useT();
  const today = localIso();
  const entry = useMemo(() => logs.find((l) => String(l?.log_date || "").startsWith(today)), [logs, today]);
  const events: PainEvent[] = useMemo(() => painEvents(entry), [entry]);
  const worst = entry ? worstPain(entry) : 0;
  const [level, setLevel] = useState<number | null>(null);
  const [where, setWhere] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (level === null || busy) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ log: any }>("/api/pain-log", { method: "POST", body: JSON.stringify({ level, where, date: today }) });
      onSaved(data.log);
      successHaptic();
      setLevel(null);
      setWhere([]);
    } catch {
      setError("Couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (at: string) => {
    try {
      const data = await apiFetch<{ log: any }>("/api/pain-log", { method: "DELETE", body: JSON.stringify({ at, date: today }) });
      onSaved(data.log);
    } catch {
      /* stays as is */
    }
  };

  const rising = events.length >= 2 && events[events.length - 1].level >= events[events.length - 2].level + 3;
  const wt = tone(worst);

  return (
    <Panel>
      <PanelTitle
        icon={Lightning}
        iconColor={TW.rose[500]}
        title={t("relief.painRightNow", "Pain right now")}
        subtitle={t("relief.painCanChange", "Pain can change through the day. Log it whenever it does.")}
      />
      {events.length > 0 ? (
        <View style={{ marginTop: 8, alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: wt.bg, borderColor: wt.border }}>
          <AppText style={{ fontSize: 12, fontWeight: "600", color: wt.fg }}>
            {t("relief.worstToday", "Worst today")}: {worst}/10
          </AppText>
        </View>
      ) : null}

      <View style={{ marginTop: 16 }} accessibilityRole="radiogroup" accessibilityLabel={t("relief.painLevelHint")}>
        <View style={{ flexDirection: "row", gap: 3 }}>
          {Array.from({ length: 11 }, (_, n) => {
            const on = level === n;
            const tn = tone(n);
            return (
              <PressableScale
                key={n}
                haptic={false}
                scaleTo={0.9}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${n} out of 10, ${band(n)}`}
                onPress={() => {
                  selectHaptic();
                  setLevel(n);
                }}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: on ? palette.plum900 : tn.bg,
                  borderColor: on ? palette.plum900 : tn.border,
                }}
              >
                <AppText style={{ fontSize: 14, fontWeight: "600", color: on ? palette.cream : tn.fg }}>{n}</AppText>
              </PressableScale>
            );
          })}
        </View>
        <View style={{ marginTop: 4, flexDirection: "row", justifyContent: "space-between" }}>
          <AppText style={{ fontSize: 11, color: ink[55] }}>{t("checkin.painNone", "No pain")}</AppText>
          <AppText style={{ fontSize: 11, color: ink[55] }}>{t("checkin.painModerate", "Moderate")}</AppText>
          <AppText style={{ fontSize: 11, color: ink[55] }}>{t("relief.worst", "Worst")}</AppText>
        </View>
      </View>

      {level !== null && level > 0 ? (
        <View style={{ marginTop: 12, gap: 6 }}>
          <AppText style={{ fontSize: 12, fontWeight: "500", color: ink[70] }}>{t("relief.whereOptional")}</AppText>
          <View style={atom.wrap}>
            {PAIN_WHERE.map((w) => {
              const on = where.includes(w);
              return <ToggleChip key={w} label={w} on={on} onPress={() => setWhere(on ? where.filter((x) => x !== w) : [...where, w])} />;
            })}
          </View>
        </View>
      ) : null}

      <View style={[atom.wrap, { marginTop: 16 }]}>
        <PillButton
          label={busy ? "Saving…" : level === null ? "Pick a number" : `Log ${level}/10 at ${timeOf(new Date().toISOString())}`}
          onPress={() => void save()}
          disabled={level === null}
          busy={busy}
        />
        {error ? (
          <AppText accessibilityRole="alert" style={{ fontSize: 12, color: TW.rose[700] }}>
            {error}
          </AppText>
        ) : null}
      </View>

      {events.length > 0 ? (
        <View style={{ marginTop: 20 }}>
          <AppText style={{ fontSize: 12, fontWeight: "500", color: ink[70] }}>{t("common.today")}</AppText>
          <View style={{ marginTop: 8, gap: 8 }}>
            {events.map((e) => (
              <View key={e.at} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <AppText style={{ width: 62, fontSize: 12, color: ink[70] }}>{timeOf(e.at)}</AppText>
                <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: ink[7], overflow: "hidden" }}>
                  <View style={{ height: "100%", width: `${Math.max(e.level * 10, 4)}%`, borderRadius: 5, backgroundColor: barTone(e.level) }} />
                </View>
                <AppText numberOfLines={1} style={{ width: 86, fontSize: 12, color: palette.plum900 }}>
                  <AppText style={{ fontSize: 12, fontWeight: "700" }}>{e.level}/10</AppText>
                  {e.where?.length ? ` · ${e.where.join(", ")}` : ""}
                </AppText>
                {e.source !== "check-in" ? (
                  <Pressable onPress={() => void remove(e.at)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove the ${timeOf(e.at)} entry`}>
                    <Trash size={16} color={ink[40]} />
                  </Pressable>
                ) : (
                  <View style={{ width: 16 }} />
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {worst >= 5 || rising ? (
        <View style={{ marginTop: 16, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: worst >= 8 ? TW.rose[50] : TW.amber[50], flexDirection: "row", gap: 8 }}>
          <Heartbeat size={18} color={worst >= 8 ? TW.rose[800] : "#78350F"} style={{ marginTop: 2 }} />
          <AppText style={{ flex: 1, fontSize: 14, lineHeight: 20, color: worst >= 8 ? TW.rose[800] : "#78350F" }}>
            {rising ? "Your pain has gone up a lot since the last log. " : ""}
            {worst >= 8
              ? "Pain this strong is worth a doctor's check, especially if painkillers don't help or you have fever or very heavy bleeding."
              : "Warmth on your tummy, rest and water can help."}
            {onOpenRelief ? (
              <AppText onPress={onOpenRelief} style={{ fontSize: 14, fontWeight: "600", textDecorationLine: "underline", color: worst >= 8 ? TW.rose[800] : "#78350F" }}>
                {" "}Open pain relief
              </AppText>
            ) : null}
          </AppText>
        </View>
      ) : null}
    </Panel>
  );
}
