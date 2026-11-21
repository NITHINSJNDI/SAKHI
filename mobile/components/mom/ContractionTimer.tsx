/**
 * Port of frontend/components/ContractionTimer.tsx: tap when a contraction
 * starts and again when it ends; checks the 5-1-1 pattern over the last hour.
 * The session is kept on the phone so closing the app doesn't lose it.
 */
import { ArrowCounterClockwise, Phone, Timer, Warning } from "phosphor-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { Bullet } from "@/components/web/Atoms";
import { ink } from "@/components/web/Panel";
import { tapHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { call } from "@/lib/links";
import { getJSON, setJSON } from "@/lib/storage";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

interface Contraction {
  start: number;
  end: number | null;
}
const KEY = "sakhi_contractions";
const HOUR = 3_600_000;
const nowMs = () => Date.now();
const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function checkPattern(list: Contraction[], now = Date.now()) {
  const done = list.filter((c) => c.end !== null) as { start: number; end: number }[];
  const lastHour = done.filter((c) => c.start >= now - HOUR);
  const gaps: number[] = [];
  for (let i = 1; i < lastHour.length; i++) gaps.push(lastHour[i].start - lastHour[i - 1].start);
  const avgGapMin = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length / 60_000 : null;
  const avgLenSec = lastHour.length ? lastHour.reduce((a, c) => a + (c.end - c.start), 0) / lastHour.length / 1000 : null;
  const span = lastHour.length >= 2 ? (lastHour[lastHour.length - 1].end - lastHour[0].start) / 60_000 : 0;
  if (lastHour.length < 3 || avgGapMin === null || avgLenSec === null) return { level: "none" as const, avgGapMin, avgLenSec };
  const regular = gaps.length >= 2 && Math.max(...gaps) - Math.min(...gaps) <= 4 * 60_000;
  if (avgGapMin <= 5.5 && avgLenSec >= 45 && span >= 50 && regular) return { level: "go" as const, avgGapMin, avgLenSec };
  if (avgGapMin <= 7 && avgLenSec >= 40) return { level: "close" as const, avgGapMin, avgLenSec };
  return { level: "early" as const, avgGapMin, avgLenSec };
}

export default function ContractionTimer({ weeks }: { weeks?: number | null }) {
  const { t, meta } = useT();
  const [list, setList] = useState<Contraction[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(nowMs);

  useEffect(() => {
    void getJSON<Contraction[]>(KEY, []).then((saved) => {
      if (Array.isArray(saved)) setList(saved.filter((c) => c && c.start > Date.now() - 12 * HOUR));
      setLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (loaded) void setJSON(KEY, list);
  }, [list, loaded]);

  const active = list.length > 0 && list[list.length - 1].end === null ? list[list.length - 1] : null;
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), active ? 250 : 5000);
    return () => clearInterval(id);
  }, [active]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.set(active ? withRepeat(withTiming(0.92, { duration: 700 }), -1, true) : withTiming(1));
  }, [active, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  const toggle = () => {
    tapHaptic();
    const at = Date.now();
    setList((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.end === null) return [...prev.slice(0, -1), { ...last, end: at }];
      return [...prev, { start: at, end: null }].slice(-60);
    });
  };
  const reset = () =>
    Alert.alert(t("mom.resetBtn"), t("mom.clearConfirm"), [
      { text: t("common.cancel", "Cancel"), style: "cancel" },
      { text: t("mom.resetBtn"), style: "destructive", onPress: () => setList([]) },
    ]);

  const check = useMemo(() => checkPattern(list, now), [list, now]);
  const title = { go: t("mom.timeForHospital"), close: t("mom.gettingCloser"), early: t("mom.earlyPattern"), none: t("mom.keepTiming") }[check.level];
  const detail = { go: t("mom.timeForHospitalDetail"), close: t("mom.gettingCloserDetail"), early: t("mom.earlyPatternDetail"), none: t("mom.keepTimingDetail") }[check.level];
  const tone = check.level === "go" ? { bg: TW.rose[50], border: TW.rose[200], fg: "#881337" } : check.level === "close" ? { bg: TW.amber[50], border: TW.amber[200], fg: "#78350F" } : { bg: "rgba(255,255,255,0.7)", border: ink[10], fg: ink[80] };
  const clock = (ms: number) => new Date(ms).toLocaleTimeString(meta.bcp47 || "en-IN", { hour: "numeric", minute: "2-digit" });
  const recent = list.slice(-6).reverse();
  const preterm = weeks !== undefined && weeks !== null && weeks < 37;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ alignItems: "center" }}>
        <Animated.View style={pulseStyle}>
          <PressableScale
            onPress={toggle}
            haptic={false}
            scaleTo={0.95}
            accessibilityRole="button"
            accessibilityState={{ selected: Boolean(active) }}
            accessibilityLabel={active ? t("mom.tapWhenEnds") : t("mom.tapWhenStarts")}
            style={{ width: 168, height: 168, borderRadius: 84, alignItems: "center", justifyContent: "center", backgroundColor: active ? TW.rose[500] : palette.plum900, shadowColor: "#2A152F", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 }}
          >
            <Timer size={32} color="#fff" weight="duotone" />
            <AppText style={{ marginTop: 4, fontSize: 14, fontWeight: "600", color: "#fff" }}>{active ? t("mom.tapWhenEnds") : t("mom.tapWhenStarts")}</AppText>
            <AppText style={{ marginTop: 2, fontSize: 26, fontWeight: "600", color: "#fff", fontVariant: ["tabular-nums"] }} accessibilityLiveRegion="polite">
              {active ? mmss(now - active.start) : list.length ? mmss(now - list[list.length - 1].start) : "0:00"}
            </AppText>
            <AppText style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{active ? t("mom.lengthSoFar") : list.length ? t("mom.sinceLastBegan") : t("mom.tapToStart")}</AppText>
          </PressableScale>
        </Animated.View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Stat label={t("mom.avgApart")} value={check.avgGapMin === null ? "—" : `${check.avgGapMin.toFixed(1)} min`} />
        <Stat label={t("mom.avgLength")} value={check.avgLenSec === null ? "—" : `${Math.round(check.avgLenSec)} sec`} />
      </View>
      <View style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: tone.border, backgroundColor: tone.bg }} accessibilityLiveRegion="polite">
        <AppText style={{ fontSize: 14, fontWeight: "600", color: tone.fg }}>{title}</AppText>
        <AppText style={{ marginTop: 2, fontSize: 12, lineHeight: 17, color: tone.fg }}>{detail}</AppText>
      </View>

      {recent.length ? (
        <View>
          <View style={{ flexDirection: "row", paddingBottom: 4 }}>
            {[t("mom.tableStarted"), t("mom.tableLength"), t("mom.tableApart")].map((h) => (
              <AppText key={h} style={{ flex: 1, fontSize: 11, color: ink[50] }}>{h}</AppText>
            ))}
          </View>
          {recent.map((c, i) => {
            const prev = list[list.length - 1 - i - 1];
            return (
              <View key={c.start} style={{ flexDirection: "row", paddingVertical: 6, borderTopWidth: 1, borderTopColor: ink[5] }}>
                <AppText style={{ flex: 1, fontSize: 12, color: ink[80] }}>{clock(c.start)}</AppText>
                <AppText style={{ flex: 1, fontSize: 12, color: ink[80] }}>{c.end ? mmss(c.end - c.start) : t("mom.tableTiming")}</AppText>
                <AppText style={{ flex: 1, fontSize: 12, color: ink[80] }}>{prev ? mmss(c.start - prev.start) : "—"}</AppText>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={{ padding: 12, borderRadius: 16, borderWidth: 1, borderColor: TW.rose[200], backgroundColor: "rgba(255,241,242,0.7)", gap: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Warning size={16} color="#881337" weight="fill" />
          <AppText style={{ fontSize: 13, fontWeight: "600", color: "#881337" }}>{t("mom.emergencyHospitalWarningTitle")}</AppText>
        </View>
        <Bullet color={TW.rose[500]}>{t("mom.waterBreaks")}</Bullet>
        <Bullet color={TW.rose[500]}>{t("mom.bleedingSeverePain")}</Bullet>
        <Bullet color={TW.rose[500]}>{t("mom.babyMovingLess")}</Bullet>
        {preterm ? <Bullet color={TW.rose[500]}>{t("mom.regularBefore37")}</Bullet> : null}
        <PressableScale onPress={() => call("112")} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, alignSelf: "flex-start" }}>
          <Phone size={14} color="#881337" weight="fill" />
          <AppText style={{ fontSize: 13, fontWeight: "600", color: "#881337", textDecorationLine: "underline" }}>{t("mom.call112")}</AppText>
        </PressableScale>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <AppText style={{ flex: 1, fontSize: 11, color: ink[50] }}>{t("mom.generalGuide")}</AppText>
        {list.length ? (
          <PressableScale onPress={reset} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 40, paddingHorizontal: 6 }}>
            <ArrowCounterClockwise size={14} color={ink[60]} />
            <AppText style={{ fontSize: 12, color: ink[60] }}>{t("mom.resetBtn")}</AppText>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: ink[10], backgroundColor: "rgba(255,255,255,0.8)" }}>
      <AppText style={{ fontSize: 11, color: ink[55] }}>{label}</AppText>
      <AppText style={{ marginTop: 2, fontSize: 18, fontWeight: "600", color: palette.plum900 }}>{value}</AppText>
    </View>
  );
}
