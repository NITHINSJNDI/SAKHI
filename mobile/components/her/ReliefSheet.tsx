/** Port of frontend/components/her/ReliefSheet.tsx: asks how bad the pain is, then offers rotating relief steps. */
import { ArrowsClockwise, CaretDown, Heart, Pause, Play, ThumbsDown, ThumbsUp, Timer, WarningCircle } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { atom } from "@/components/web/Atoms";
import { ink } from "@/components/web/Panel";
import { Sheet } from "@/components/web/Sheet";
import { apiFetch } from "@/lib/api";
import { selectHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { useCountdown } from "@/lib/useCountdown";
import type { ReliefTip } from "@/lib/shared/reliefTips";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

interface ReliefData {
  tips: ReliefTip[];
  favourites: ReliefTip[];
  redFlags: string[];
  seeDoctor: string;
  urgent: boolean;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function TipTimer({ seconds }: { seconds: number }) {
  const { t } = useT();
  const { left, running, toggle } = useCountdown(seconds);
  const I = running ? Pause : left === 0 ? ArrowsClockwise : Play;
  return (
    <PressableScale
      onPress={toggle}
      scaleTo={0.94}
      accessibilityRole="button"
      style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: ink[5], paddingHorizontal: 12, minHeight: 36 }}
    >
      <I size={14} color={palette.plum900} weight="fill" />
      <Timer size={14} color={palette.plum900} />
      <AppText style={{ fontSize: 12, fontWeight: "600", color: palette.plum900 }}>{left === 0 ? t("relief.doneAgain") : fmt(left)}</AppText>
    </PressableScale>
  );
}

export default function ReliefSheet({ open, initialSeverity, onClose }: { open: boolean; initialSeverity?: number | null; onClose: () => void }) {
  const { t } = useT();
  const [severity, setSeverity] = useState<number | null>(initialSeverity ?? null);
  const [data, setData] = useState<ReliefData | null>(null);
  const [loading, setLoading] = useState(false);
  const [rated, setRated] = useState<Record<string, boolean>>({});
  const [helpOpen, setHelpOpen] = useState(false);

  const levels = [
    { label: t("relief.levelMild"), sub: "1–3", value: 3 },
    { label: t("relief.levelModerate"), sub: "4–6", value: 5 },
    { label: t("relief.levelBad"), sub: "7–8", value: 7 },
    { label: t("relief.levelSevere"), sub: "9–10", value: 9 },
  ];

  const load = async (sev: number) => {
    setLoading(true);
    setRated({});
    try {
      const d = await apiFetch<ReliefData>(`/api/relief?severity=${sev}`);
      setData(d);
      setHelpOpen(Boolean(d.urgent));
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  };

  // Reset when the sheet opens (state adjusted during render, not in an effect)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSeverity(initialSeverity ?? null);
      setData(null);
    }
  }
  useEffect(() => {
    // load sets state, so it runs after this effect rather than inside it
    if (open && initialSeverity) void Promise.resolve().then(() => load(initialSeverity));
     
  }, [open, initialSeverity]);

  const rate = (tipId: string, helped: boolean) => {
    setRated((r) => ({ ...r, [tipId]: helped }));
    apiFetch("/api/relief", { method: "POST", body: JSON.stringify({ tipId, helped }) }).catch(() => {});
  };

  return (
    <Sheet open={open} onClose={onClose} title={t("relief.letUsEase")} subtitle={t("relief.reliefSubtitle")}>
      <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{t("relief.howBad")}</AppText>
      <View style={{ marginTop: 8, flexDirection: "row", gap: 8 }}>
        {levels.map((l) => {
          const on = severity === l.value;
          return (
            <PressableScale
              key={l.value}
              haptic={false}
              onPress={() => {
                selectHaptic();
                setSeverity(l.value);
                void load(l.value);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={{ flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 10, alignItems: "center", backgroundColor: on ? TW.rose[50] : "rgba(255,255,255,0.7)", borderColor: on ? TW.rose[400] : ink[10] }}
            >
              <AppText style={{ fontSize: 14, fontWeight: "600", color: on ? TW.rose[700] : ink[80] }}>{l.label}</AppText>
              <AppText style={{ fontSize: 11, color: on ? TW.rose[700] : ink[50] }}>{l.sub}</AppText>
            </PressableScale>
          );
        })}
      </View>

      {data?.urgent ? (
        <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 1, borderColor: TW.red[200], backgroundColor: TW.red[50], padding: 16, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <WarningCircle size={16} color={TW.red[800]} weight="fill" />
            <AppText style={{ fontSize: 14, fontWeight: "600", color: TW.red[800] }}>{t("relief.urgentTitle")}</AppText>
          </View>
          <AppText style={{ fontSize: 14, lineHeight: 20, color: TW.red[800] }}>{t("relief.urgentDesc")}</AppText>
        </View>
      ) : null}

      {loading ? (
        <View style={{ marginTop: 24, flexDirection: "row", gap: 8, alignItems: "center" }}>
          <ActivityIndicator color={TW.rose[500]} />
          <AppText style={{ fontSize: 14, color: ink[50] }}>{t("relief.finding")}</AppText>
        </View>
      ) : null}

      {data && !loading ? (
        <>
          {data.favourites.length > 0 ? (
            <View style={{ marginTop: 20, flexDirection: "row", gap: 6, alignItems: "flex-start" }}>
              <Heart size={14} color={TW.rose[400]} weight="fill" style={{ marginTop: 2 }} />
              <AppText style={[atom.small, { flex: 1, color: ink[60] }]}>{t("relief.helpedBefore", { tips: data.favourites.map((f) => f.title).join(", ") })}</AppText>
            </View>
          ) : null}
          <View style={{ marginTop: 16, gap: 12 }}>
            {data.tips.map((tip, i) => (
              <View key={tip.id} style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.8)", borderWidth: 1, borderColor: palette.pink100, padding: 16, flexDirection: "row", gap: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: TW.rose[100], alignItems: "center", justifyContent: "center" }}>
                  <AppText style={{ fontSize: 14, fontWeight: "600", color: TW.rose[600] }}>{i + 1}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 16, fontWeight: "600", color: palette.plum900 }}>{tip.title}</AppText>
                  <View style={{ marginTop: 6, gap: 4 }}>
                    {tip.steps.map((st) => (
                      <AppText key={st} style={{ fontSize: 14, lineHeight: 20, color: ink[75] }}>
                        {st}
                      </AppText>
                    ))}
                  </View>
                  {tip.why ? <AppText style={{ marginTop: 6, fontSize: 12, color: ink[50] }}>{tip.why}</AppText> : null}
                  <View style={[atom.wrap, { marginTop: 12 }]}>
                    {tip.seconds ? <TipTimer seconds={tip.seconds} /> : null}
                    {rated[tip.id] === undefined ? (
                      <>
                        <PressableScale onPress={() => rate(tip.id, true)} scaleTo={0.94} style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: TW.emerald[50], paddingHorizontal: 12, minHeight: 36 }}>
                          <ThumbsUp size={14} color={TW.emerald[700]} />
                          <AppText style={{ fontSize: 12, fontWeight: "500", color: TW.emerald[700] }}>{t("relief.helped")}</AppText>
                        </PressableScale>
                        <PressableScale onPress={() => rate(tip.id, false)} scaleTo={0.94} style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.05)", paddingHorizontal: 12, minHeight: 36 }}>
                          <ThumbsDown size={14} color={ink[60]} />
                          <AppText style={{ fontSize: 12, fontWeight: "500", color: ink[60] }}>{t("relief.notReally")}</AppText>
                        </PressableScale>
                      </>
                    ) : (
                      <AppText style={{ fontSize: 12, color: ink[50] }}>{rated[tip.id] ? t("relief.notedHelped") : t("relief.notedNotReally")}</AppText>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
          <PressableScale
            onPress={() => severity && void load(severity)}
            style={{ marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, borderWidth: 1, borderColor: "rgba(42,21,47,0.15)", minHeight: 48 }}
          >
            <ArrowsClockwise size={16} color={palette.plum900} />
            <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{t("relief.otherIdeas")}</AppText>
          </PressableScale>

          <View style={{ marginTop: 20, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: ink[10] }}>
            <Pressable onPress={() => setHelpOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: helpOpen }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, minHeight: 48 }}>
              <AppText style={{ fontSize: 14, fontWeight: "600", color: palette.plum900 }}>{t("relief.whenToGetHelp")}</AppText>
              <CaretDown size={16} color={palette.plum900} style={{ transform: [{ rotate: helpOpen ? "180deg" : "0deg" }] }} />
            </Pressable>
            {helpOpen ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 6 }}>
                {data.redFlags.map((f) => (
                  <AppText key={f} style={{ fontSize: 14, lineHeight: 20, color: ink[75] }}>
                    • {f}
                  </AppText>
                ))}
                <AppText style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: ink[65] }}>{data.seeDoctor}</AppText>
              </View>
            ) : null}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
