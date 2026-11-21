/** Port of frontend/components/WeightTracker.tsx: log weight, trend chips, chart with healthy-gain band in pregnancy. */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info, Scales, X } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { ChartEmpty, LineChart } from "@/components/charts/Charts";
import { atom, Field, PillButton } from "@/components/web/Atoms";
import { DateField } from "@/components/web/DateField";
import { IconBubble, ink } from "@/components/web/Panel";
import { apiFetch } from "@/lib/api";
import { localIso } from "@/lib/date";
import { successHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { bmi, expectedGainAt, gainGuide, gainStatus, weekOnDay, weightSeries, weightStats } from "@/lib/shared/weight";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

 
interface WeightDoc { entries: { date: string; kg: number }[]; heightCm?: number; preKg?: number }
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(1)} kg`;

function Chip({ label, value, tone = "plain" }: { label: string; value: string; tone?: "plain" | "good" | "watch" }) {
  const c = tone === "good" ? { bg: TW.emerald[50], border: TW.emerald[200], fg: TW.emerald[800] } : tone === "watch" ? { bg: TW.amber[50], border: TW.amber[200], fg: TW.amber[800] } : { bg: "rgba(255,255,255,0.8)", border: ink[10], fg: ink[80] };
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, paddingHorizontal: 12, paddingVertical: 8 }}>
      <AppText style={{ fontSize: 10, letterSpacing: 0.4, color: c.fg, opacity: 0.7 }}>{label}</AppText>
      <AppText style={{ fontSize: 14, fontWeight: "600", color: c.fg }}>{value}</AppText>
    </View>
  );
}

export default function WeightTracker({ mode, logs, weeks }: { mode: "her" | "pregnancy"; logs: any[]; weeks?: number | null }) {
  const { t, meta } = useT();
  const qc = useQueryClient();
  const fmtDate = (iso: string) => new Date(iso + "T00:00:00Z").toLocaleDateString(meta.bcp47 || "en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  const q = useQuery({ queryKey: ["weight"], queryFn: () => apiFetch<WeightDoc>("/api/weight") });
  const doc: WeightDoc = q.data && Array.isArray(q.data.entries) ? q.data : { entries: [] };
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(localIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setup, setSetup] = useState(false);
  const [height, setHeight] = useState("");
  const [preKg, setPreKg] = useState("");

  const save = async (body: Record<string, any>) => {
    setSaving(true);
    setError(null);
    try {
      const d = await apiFetch<WeightDoc>("/api/weight", { method: "POST", body: JSON.stringify(body) });
      qc.setQueryData(["weight"], d);
      successHaptic();
      return true;
    } catch (e: any) {
      setError(e?.message || "Couldn't save. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };
  const addWeight = async () => {
    if (!kg.trim()) return;
    if (await save({ kg, date })) {
      setKg("");
      setDate(localIso());
    }
  };
  const remove = async (d: string) => {
    try {
      const res = await apiFetch<WeightDoc>(`/api/weight?date=${d}`, { method: "DELETE" });
      if (res?.entries) qc.setQueryData(["weight"], res);
    } catch {
      /* ignore */
    }
  };

  const series = useMemo(() => weightSeries(doc.entries, logs), [doc.entries, logs]);
  const stats = useMemo(() => weightStats(series), [series]);
  const guide = mode === "pregnancy" && doc.preKg && doc.heightCm ? gainGuide(doc.preKg, doc.heightCm) : null;
  const chart = series.slice(-60);
  const bands = chart.map((p) => {
    if (!guide || !doc.preKg || !weeks) return null;
    const [lo, hi] = expectedGainAt(weekOnDay(p.day, weeks), guide);
    return [Math.round((doc.preKg + lo) * 10) / 10, Math.round((doc.preKg + hi) * 10) / 10] as [number, number];
  });
  const gained = mode === "pregnancy" && doc.preKg && stats.latest ? Math.round((stats.latest.kg - doc.preKg) * 10) / 10 : null;
  const range = guide && weeks ? expectedGainAt(weeks, guide) : null;
  const status = gained !== null && range ? gainStatus(gained, range) : null;

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <IconBubble icon={Scales} bg={palette.pink100} color={palette.pink600} size={40} />
        <View>
          <AppText style={{ fontSize: 24, fontWeight: "600", color: palette.plum900 }}>{stats.latest ? `${stats.latest.kg} kg` : "—"}</AppText>
          <AppText style={{ fontSize: 12, color: ink[55] }}>{stats.latest ? t("weight.lastLogged", { date: fmtDate(stats.latest.date) }) : t("weight.noWeightLogged")}</AppText>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <Field style={{ width: 96 }} value={kg} onChangeText={setKg} placeholder={t("charts.weightKg", "kg")} keyboardType="decimal-pad" accessibilityLabel={t("weight.weightKg")} />
          <View style={{ flex: 1 }}>
            <DateField value={date} onChange={setDate} max={localIso()} />
          </View>
        </View>
        <PillButton label={saving ? t("weight.saving") : t("weight.logWeight")} onPress={() => void addWeight()} disabled={!kg.trim()} busy={saving} style={{ backgroundColor: palette.pink500 }} />
      </View>
      {error ? (
        <View accessibilityRole="alert" style={{ borderRadius: 12, borderWidth: 1, borderColor: TW.rose[200], backgroundColor: TW.rose[50], paddingHorizontal: 12, paddingVertical: 8 }}>
          <AppText style={{ fontSize: 12, color: TW.rose[700] }}>{error}</AppText>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Chip label={t("weight.last7Days")} value={stats.change7 === null ? "—" : signed(stats.change7)} />
        <Chip label={t("weight.last30Days")} value={stats.change30 === null ? "—" : signed(stats.change30)} />
        {mode === "pregnancy" ? (
          <>
            <Chip label={t("weight.gainedSoFar")} value={gained === null ? "—" : signed(gained)} tone={status === "within" ? "good" : status ? "watch" : "plain"} />
            <Chip label={weeks ? t("weight.healthyByWeek", { week: weeks }) : t("weight.healthyRange")} value={range ? `${range[0]}–${range[1]} kg` : t("weight.setUpBelow")} />
          </>
        ) : (
          <>
            <Chip label={t("weight.trend")} value={stats.perWeek === null ? "—" : `${stats.perWeek > 0 ? "+" : ""}${stats.perWeek.toFixed(2)} kg/wk`} />
            <Chip label={t("weight.sinceFirstLog")} value={stats.sinceFirst === null ? "—" : signed(stats.sinceFirst)} />
          </>
        )}
      </View>

      {chart.length >= 2 ? (
        <LineChart labels={chart.map((p) => fmtDate(p.date))} series={[{ key: "kg", color: "#EC4899", points: chart.map((p) => p.kg) }]} bands={guide ? bands : undefined} height={220} />
      ) : (
        <ChartEmpty text={mode === "her" ? t("weight.logWeightHintHer") : t("weight.logWeightHintPregnancy")} />
      )}

      {mode === "pregnancy" ? (
        <View style={{ borderRadius: 16, backgroundColor: "rgba(253,242,248,0.6)", borderWidth: 1, borderColor: palette.pink100, padding: 12, gap: 8 }}>
          {status && gained !== null && range ? (
            <AppText style={{ fontSize: 12, lineHeight: 17, color: ink[75] }}>
              {status === "within"
                ? `You've gained ${gained} kg, right in the healthy range for week ${weeks} (${range[0]}–${range[1]} kg). Lovely and steady.`
                : status === "below"
                  ? `You've gained ${gained} kg, a little under the usual ${range[0]}–${range[1]} kg for week ${weeks}. Mention it at your next check-up; your doctor may suggest small extra meals.`
                  : `You've gained ${gained} kg, a little over the usual ${range[0]}–${range[1]} kg for week ${weeks}. Every body is different; mention it at your next check-up, and call sooner if you gain suddenly with swelling.`}
              {guide ? ` Your pre-pregnancy BMI of ${bmi(doc.preKg!, doc.heightCm!)} is ${guide.label}, so the total range is ${guide.total[0]}–${guide.total[1]} kg.` : ""}
            </AppText>
          ) : (
            <View style={{ flexDirection: "row", gap: 6 }}>
              <Info size={16} color={ink[70]} />
              <AppText style={{ flex: 1, fontSize: 12, lineHeight: 17, color: ink[70] }}>{t("weight.pregnancyPrompt")}</AppText>
            </View>
          )}
          <Pressable
            onPress={() => {
              setHeight(doc.heightCm ? String(doc.heightCm) : "");
              setPreKg(doc.preKg ? String(doc.preKg) : "");
              setSetup((v) => !v);
            }}
            accessibilityRole="button"
            style={{ minHeight: 32, justifyContent: "center" }}
          >
            <AppText style={{ fontSize: 12, fontWeight: "500", color: palette.pink700, textDecorationLine: "underline" }}>
              {setup ? t("weight.close") : doc.preKg && doc.heightCm ? t("weight.editHeightWeight") : t("weight.setUpHealthyGain")}
            </AppText>
          </Pressable>
          {setup ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Field style={{ flex: 1 }} value={height} onChangeText={setHeight} placeholder={t("weight.heightCm")} keyboardType="number-pad" accessibilityLabel={t("weight.heightCm")} />
                <Field style={{ flex: 1 }} value={preKg} onChangeText={setPreKg} placeholder={t("weight.beforePregnancyKg")} keyboardType="decimal-pad" accessibilityLabel={t("weight.beforePregnancyKg")} />
              </View>
              <PillButton
                label={t("weight.save")}
                busy={saving}
                onPress={async () => {
                  if (await save({ heightCm: height, preKg })) setSetup(false);
                }}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Info size={16} color={ink[55]} />
          <AppText style={{ flex: 1, fontSize: 12, lineHeight: 17, color: ink[55] }}>{t("weight.herDisclaimer")}</AppText>
        </View>
      )}

      {doc.entries.length > 0 ? (
        <View style={atom.wrap}>
          {doc.entries
            .slice(-5)
            .reverse()
            .map((e) => (
              <View key={e.date} style={{ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, borderWidth: 1, borderColor: ink[10], backgroundColor: "rgba(255,255,255,0.8)", paddingLeft: 10, paddingRight: 2, paddingVertical: 2 }}>
                <AppText style={{ fontSize: 11, color: ink[70] }}>
                  {fmtDate(e.date)} · {e.kg} kg
                </AppText>
                <Pressable onPress={() => void remove(e.date)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Delete weight for ${fmtDate(e.date)}`} style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
                  <X size={10} color={ink[60]} weight="bold" />
                </Pressable>
              </View>
            ))}
        </View>
      ) : null}
    </View>
  );
}
