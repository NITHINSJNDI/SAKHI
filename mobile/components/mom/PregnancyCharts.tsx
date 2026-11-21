/** Port of frontend/components/charts/PregnancyCharts.tsx onto the SVG chart kit. */
import { Check } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View, type LayoutChangeEvent } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

import { AppText } from "@/components/AppText";
import { ChartEmpty, Legend, LineChart } from "@/components/charts/Charts";
import { PressableScale } from "@/components/ui";
import { ink } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { TW } from "@/lib/tw";
import { fonts, palette } from "@/theme";

 
const day = (d: any) => new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const byDate = (rows: any[]) => [...rows].sort((a, b) => String(a.log_date).localeCompare(String(b.log_date)));

function Empty({ icon }: { icon: string }) {
  const { t } = useT();
  return <ChartEmpty height={170} text={`${icon}\n${t("charts.noLogs")}\n${t("charts.completeDailyCheckIn")}`} />;
}

/** A. Week progress bar (animated fill). */
export function PregnancyWeekProgress({ weeks }: { weeks: number }) {
  const { t } = useT();
  const pct = Math.min((weeks / 40) * 100, 100);
  const w = useSharedValue(0);
  useEffect(() => {
    w.set(withTiming(pct, { duration: 1200, easing: Easing.out(Easing.cubic) }));
  }, [pct, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.get()}%` }));
  return (
    <View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.pink500 }} />
          <AppText style={{ fontSize: 14, fontWeight: "700", color: TW.pink[700] }}>
            {t("pregnancy.week")} {weeks} {t("cycle.ofAbout")} 40
          </AppText>
        </View>
        <AppText style={{ fontSize: 12, color: ink[60] }}>
          {Math.round(pct)}% {t("notifications.completed")}
        </AppText>
      </View>
      <View style={{ height: 16, borderRadius: 8, backgroundColor: TW.pink[50], borderWidth: 1, borderColor: "rgba(251,207,232,0.7)", overflow: "hidden" }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 40, now: weeks }}>
        <Animated.View style={[{ height: "100%", borderRadius: 8, backgroundColor: palette.pink500 }, fill]} />
      </View>
    </View>
  );
}

const FRUITS = [
  { w: 8, e: "🫘", name: "Rajma bean" },
  { w: 12, e: "🍋", name: "Lime" },
  { w: 16, e: "🥑", name: "Avocado" },
  { w: 20, e: "🍌", name: "Banana" },
  { w: 24, e: "🌽", name: "Corn cob" },
  { w: 28, e: "🍆", name: "Brinjal" },
  { w: 32, e: "🥥", name: "Coconut" },
  { w: 36, e: "🍈", name: "Large papaya" },
  { w: 40, e: "🍉", name: "Watermelon" },
];

/** B. Baby growth timeline: horizontally scrolling size cards. */
export function BabyGrowthTimeline({ weeks }: { weeks: number }) {
  const { t } = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 6, paddingHorizontal: 2 }}>
      {FRUITS.map((f, i) => {
        const current = weeks >= f.w && weeks < (FRUITS[i + 1]?.w || 41);
        const past = weeks >= f.w;
        return (
          <View
            key={f.w}
            style={{
              width: 84,
              height: 92,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: current ? TW.pink[400] : past ? "rgba(251,207,232,0.6)" : ink[5],
              backgroundColor: current ? TW.pink[50] : past ? "rgba(255,255,255,0.7)" : ink[5],
              opacity: past || current ? 1 : 0.45,
            }}
          >
            <AppText style={{ fontSize: 11, fontWeight: "700", color: current ? TW.pink[700] : ink[60] }}>
              {t("pregnancy.week")} {f.w}
            </AppText>
            <AppText style={{ fontSize: 28, marginTop: 2 }}>{f.e}</AppText>
            <AppText numberOfLines={1} style={{ fontSize: 10, fontWeight: "600", color: ink[55], maxWidth: 76 }}>
              {f.name}
            </AppText>
          </View>
        );
      })}
    </ScrollView>
  );
}

/** D. Blood pressure, last 14 readings, with the 140 line. */
export function BloodPressureChart({ data }: { data: any[] }) {
  const rows = byDate((data || []).filter((l) => Number(l.blood_pressure_systolic) > 0 && Number(l.blood_pressure_diastolic) > 0)).slice(-14);
  if (!rows.length) return <Empty icon="🩺" />;
  return (
    <View>
      <LineChart
        labels={rows.map((r) => day(r.log_date))}
        series={[
          { key: "sys", color: "#EF4444", points: rows.map((r) => Number(r.blood_pressure_systolic)) },
          { key: "dia", color: "#3B82F6", points: rows.map((r) => Number(r.blood_pressure_diastolic)) },
        ]}
        yMin={50}
        yMax={160}
        refLines={[{ y: 140, color: "#EF4444", label: "High (140)" }]}
        height={220}
      />
      <Legend items={[{ color: "#EF4444", label: "Systolic" }, { color: "#3B82F6", label: "Diastolic" }, { color: "#EF4444", label: "High threshold", dashed: true }]} />
    </View>
  );
}

/** E. Fasting blood sugar with the 95 target. */
export function BloodSugarChart({ data }: { data: any[] }) {
  const rows = byDate((data || []).filter((l) => Number(l.blood_sugar) > 0)).slice(-14);
  if (!rows.length) return <Empty icon="🩸" />;
  return (
    <View>
      <LineChart
        labels={rows.map((r) => day(r.log_date))}
        series={[{ key: "sugar", color: "#F59E0B", points: rows.map((r) => Number(r.blood_sugar)), fill: true }]}
        yMin={60}
        yMax={150}
        unit=""
        refLines={[{ y: 95, color: "#10B981", label: "Fasting target (95)" }]}
        height={220}
      />
      <Legend items={[{ color: "#F59E0B", label: "Blood sugar (mg/dL)" }, { color: "#10B981", label: "Fasting target", dashed: true }]} />
    </View>
  );
}

const kicksOf = (m: any) => {
  if (m === null || m === undefined || m === "") return { morning: 0, afternoon: 0, night: 0 };
  if (typeof m === "number" || (typeof m === "string" && !isNaN(Number(m)))) return { morning: 0, afternoon: Number(m), night: 0 };
  if (typeof m === "object") return { morning: Number(m.morning) || 0, afternoon: Number(m.afternoon) || Number(m.count) || 0, night: Number(m.night) || 0 };
  return { morning: 0, afternoon: 0, night: 0 };
};

/** F. Baby movement: stacked morning / afternoon / night, last 7 days. */
export function BabyMovementChart({ data }: { data: any[] }) {
  const [w, setW] = useState(0);
  const rows = byDate(data || [])
    .map((l) => ({ label: day(l.log_date), ...kicksOf(l.baby_movement) }))
    .filter((r) => r.morning + r.afternoon + r.night > 0)
    .slice(-7);
  if (!rows.length) return <Empty icon="👣" />;
  const height = 200, top = 14, bottom = 22;
  const ih = height - top - bottom;
  const hi = Math.max(1, ...rows.map((r) => r.morning + r.afternoon + r.night));
  const slot = w / rows.length;
  const bw = Math.min(30, slot * 0.6);
  const parts: { key: "morning" | "afternoon" | "night"; color: string }[] = [
    { key: "morning", color: "#FDE047" },
    { key: "afternoon", color: "#FB923C" },
    { key: "night", color: "#6366F1" },
  ];
  return (
    <View>
      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height }}>
        {w > 0 ? (
          <Svg width={w} height={height}>
            <Line x1={0} x2={w} y1={top + ih} y2={top + ih} stroke="rgba(244,114,182,0.15)" />
            {rows.map((r, i) => {
              const cx = slot * i + slot / 2;
              let y = top + ih;
              const total = r.morning + r.afternoon + r.night;
              return (
                <G key={i}>
                  {parts.map((p) => {
                    const h = (r[p.key] / hi) * ih;
                    y -= h;
                    return h > 0 ? <Rect key={p.key} x={cx - bw / 2} y={y} width={bw} height={h} fill={p.color} /> : null;
                  })}
                  <SvgText x={cx} y={top + ih - (total / hi) * ih - 4} fontSize={10} fill={ink[60]} textAnchor="middle" fontFamily={fonts.medium}>
                    {total}
                  </SvgText>
                  <SvgText x={cx} y={height - 6} fontSize={10} fill={ink[55]} textAnchor="middle" fontFamily={fonts.regular}>
                    {r.label}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
      <Legend items={[{ color: "#FDE047", label: "Morning" }, { color: "#FB923C", label: "Afternoon / Kicks" }, { color: "#6366F1", label: "Night" }]} />
    </View>
  );
}

/** G. Appointments: tap to mark done / pending. */
export function AppointmentTimeline({ appointments, onToggle }: { appointments: any[]; onToggle?: (i: number) => void }) {
  if (!appointments?.length) return <Empty icon="📅" />;
  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      {appointments.map((apt, i) => (
        <PressableScale
          key={i}
          onPress={() => onToggle?.(i)}
          scaleTo={0.98}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: Boolean(apt.completed) }}
          accessibilityLabel={apt.name}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            minHeight: 56,
            padding: 14,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: apt.completed ? "rgba(167,243,208,0.6)" : "rgba(252,231,243,0.9)",
            backgroundColor: apt.completed ? "rgba(236,253,245,0.5)" : "rgba(255,255,255,0.8)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: apt.completed ? TW.emerald[500] : "#fff", borderWidth: apt.completed ? 0 : 2, borderColor: TW.pink[300] }}>
              {apt.completed ? <Check size={14} color="#fff" weight="bold" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 15, fontWeight: "500", color: apt.completed ? ink[40] : palette.plum900, textDecorationLine: apt.completed ? "line-through" : "none" }}>{apt.name}</AppText>
              {apt.date && apt.date !== "Upcoming" ? <AppText style={{ marginTop: 2, fontSize: 12, color: ink[50] }}>{apt.date}</AppText> : null}
            </View>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, backgroundColor: apt.completed ? TW.emerald[100] : TW.pink[100] }}>
            <AppText style={{ fontSize: 11, fontWeight: "600", color: apt.completed ? TW.emerald[700] : TW.pink[700] }}>{apt.completed ? "Done" : "Pending"}</AppText>
          </View>
        </PressableScale>
      ))}
    </View>
  );
}

const MOOD_SCORE: Record<string, number> = { Happy: 4, Calm: 3, Fatigued: 2, Anxious: 1, Nauseous: 1, Irritable: 0 };

/** H. Mood across the last 14 logs. */
export function MoodTrackerChart({ data }: { data: any[] }) {
  const rows = byDate((data || []).filter((l) => l.mood)).slice(-14);
  if (!rows.length) return <Empty icon="🌸" />;
  return (
    <View>
      <LineChart labels={rows.map((r) => day(r.log_date))} series={[{ key: "mood", color: "#818CF8", points: rows.map((r) => MOOD_SCORE[r.mood] ?? 3) }]} yMin={0} yMax={4} height={200} />
      <AppText style={{ marginTop: 6, fontSize: 11, color: ink[60] }}>4 Happy · 3 Calm · 2 Fatigued · 1 Anxious / Nauseous · 0 Irritable</AppText>
    </View>
  );
}

/** J. Sleep hours with the 8h line. */
export function PregnancySleepGraph({ data }: { data: any[] }) {
  const rows = byDate((data || []).filter((l) => l.sleep_hours !== null && l.sleep_hours !== undefined && !isNaN(Number(l.sleep_hours)))).slice(-14);
  if (!rows.length) return <Empty icon="🌙" />;
  return (
    <LineChart
      labels={rows.map((r) => day(r.log_date))}
      series={[{ key: "sleep", color: "#8B5CF6", points: rows.map((r) => Number(r.sleep_hours) || 0), fill: true }]}
      yMin={0}
      yMax={12}
      unit="h"
      refLines={[{ y: 8, color: "#10B981" }]}
      height={200}
    />
  );
}
