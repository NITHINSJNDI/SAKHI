/** Port of frontend/components/charts/DashboardCharts.tsx (Her Mode charts) onto the SVG chart kit. */
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { BarChart, ChartEmpty, LineChart } from "@/components/charts/Charts";
import { useT } from "@/lib/i18n";

 
const fmtDay = (d: string) => (d ? new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const lastLogs = (data: any[], n = 14) => [...(data || [])].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()).slice(-n);

function Empty({ message }: { message: string }) {
  const { t } = useT();
  return <ChartEmpty height={150} text={`${message}\n${t("charts.completeDailyCheckIn")}`} />;
}

export function CycleLengthChart({ data }: { data: any[] }) {
  const { t } = useT();
  if (!data?.length) return <Empty message={t("charts.noCycleLengthHistory")} />;
  return <LineChart labels={data.map((d) => String(d.month))} series={[{ key: "len", color: "#EC4899", points: data.map((d) => Number(d.cycleLength) || null), fill: true }]} unit="" height={220} />;
}

export function PeriodDurationChart({ data }: { data: any[] }) {
  const { t } = useT();
  if (!data?.length) return <Empty message={t("charts.noPeriodDurationHistory")} />;
  return <BarChart data={data.map((d) => ({ label: String(d.month).replace(" (Setup)", ""), value: Number(d.periodDuration) || 0 }))} color="#F43F5E" unit="d" height={200} />;
}

export function SymptomFrequencyChart({ data }: { data: any[] }) {
  const { t, tValue } = useT();
  const map: Record<string, number> = {};
  (data || []).forEach((log) => (log.symptoms || []).forEach((s: string) => s && s !== "None" && (map[s] = (map[s] || 0) + 1)));
  const rows = Object.keys(map)
    .map((k) => ({ label: tValue(k), value: map[k] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  if (!rows.length) return <Empty message={t("charts.noSymptoms")} />;
  return <BarChart data={rows.map((r) => ({ label: r.label.length > 9 ? `${r.label.slice(0, 8)}…` : r.label, value: r.value }))} color="#8B5CF6" height={200} />;
}

const MOOD_SCORE: Record<string, number> = { Happy: 5, Calm: 4, Energetic: 4, Fatigued: 3, Anxious: 2, Irritable: 1, Sad: 0 };
const MOOD_COLOR: Record<number, string> = { 5: "#34d399", 4: "#60a5fa", 3: "#fbbf24", 2: "#f97316", 1: "#ef4444", 0: "#64748b" };

export function MoodCycleChart({ data }: { data: any[] }) {
  const { t, tValue } = useT();
  if (!data?.length) return <Empty message={t("charts.noMoodLogs")} />;
  const rows = lastLogs(data).map((l) => ({ label: fmtDay(l.log_date), mood: l.mood || "Calm", v: MOOD_SCORE[l.mood] ?? 4 }));
  return (
    <View>
      <LineChart labels={rows.map((r) => r.label)} series={[{ key: "mood", color: "#818CF8", points: rows.map((r) => r.v) }]} yMin={0} yMax={5} height={200} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
        {[5, 4, 3, 2, 1, 0].map((v) => (
          <View key={v} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MOOD_COLOR[v] }} />
            <AppText style={{ fontSize: 11, color: "rgba(42,21,47,0.6)" }}>
              {v}: {Object.keys(MOOD_SCORE).filter((k) => MOOD_SCORE[k] === v).map((k) => tValue(k)).join(" / ")}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const FLOW_SCORE: Record<string, number> = { None: 0, Spotting: 1, Light: 2, Moderate: 3, Medium: 3, Heavy: 4, "Very Heavy": 5 };

export function FlowIntensityChart({ data }: { data: any[] }) {
  const { t } = useT();
  if (!data?.length) return <Empty message={t("charts.noFlowLogs")} />;
  const rows = lastLogs(data).map((l) => ({ label: fmtDay(l.log_date), value: FLOW_SCORE[l.flow_intensity] || 0 }));
  return (
    <View>
      <BarChart data={rows} max={5} height={200} colorFor={(v) => (v > 3 ? "#E11D48" : v > 1 ? "#FB7185" : "#FBCFE8")} />
      <AppText style={{ fontSize: 11, color: "rgba(42,21,47,0.55)", marginTop: 4 }}>0 none · 1 spotting · 2 light · 3 moderate · 4 heavy · 5 very heavy</AppText>
    </View>
  );
}

export function PainTrendChart({ data }: { data: any[] }) {
  const { t } = useT();
  if (!data?.length) return <Empty message={t("charts.noPainLogs")} />;
  const rows = lastLogs(data);
  return <LineChart labels={rows.map((l) => fmtDay(l.log_date))} series={[{ key: "pain", color: "#F43F5E", points: rows.map((l) => Number(l.cramps_severity) || 0), fill: true }]} yMin={0} yMax={10} height={200} />;
}

export function SleepHoursChart({ data }: { data: any[] }) {
  const { t } = useT();
  if (!data?.length) return <Empty message={t("charts.noSleepLogs", "No sleep logged yet")} />;
  const rows = lastLogs(data);
  return (
    <LineChart
      labels={rows.map((l) => fmtDay(l.log_date))}
      series={[{ key: "sleep", color: "#8B5CF6", points: rows.map((l) => Number(l.sleep_hours) || 0), fill: true }]}
      yMin={0}
      yMax={12}
      unit="h"
      refLines={[{ y: 8, color: "#10B981", label: "8h" }]}
      height={200}
    />
  );
}
