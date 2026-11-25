/** Port of frontend/components/BabyGrowthCard.tsx: baby's weight on the WHO lines. */
import { CaretDown, CaretUp, ChartLineUp, Trash } from "phosphor-react-native";
import { useState } from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, G, Line, Polygon, Polyline, Text as SvgText } from "react-native-svg";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { Field, PillButton, ToggleChip } from "@/components/web/Atoms";
import { DateField } from "@/components/web/DateField";
import { Panel, PanelTitle, ink } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { BAND_TEXT, checkGrowth, linesAt, monthsOld, plausibleWeight, type Band, type Sex } from "@/lib/shared/babyGrowth";
import { effectiveAgeStart } from "@/lib/shared/postpartum";
import { TW } from "@/lib/tw";
import { dayKey } from "@/lib/useUserDoc";
import { fonts, palette } from "@/theme";

import type { PP } from "./Postpartum";

const BAND_STYLE: Record<Band, { bg: string; fg: string }> = {
  green: { bg: TW.emerald[50], fg: TW.emerald[800] },
  yellow: { bg: TW.amber[50], fg: "#78350F" },
  red: { bg: TW.rose[50], fg: TW.rose[800] },
  high: { bg: palette.lavender50, fg: palette.plum900 },
};
const NOTE_COLOR = { info: ink[60], watch: TW.amber[800], doctor: TW.rose[700] } as const;
const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function BabyGrowthCard({ pp, dueDate }: { pp: PP; dueDate?: string | null }) {
  const { t } = useT();
  const { doc, save } = pp;
  const today = dayKey();
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!doc.birth_date) return null;
  const birth = doc.birth_date;
  const age = effectiveAgeStart(birth, dueDate);
  const entries = [...(doc.growth || [])].sort((a, b) => a.date.localeCompare(b.date));
  const check = checkGrowth(doc.sex, birth, entries, today);
  const last = entries[entries.length - 1];
  const beforeDue = Boolean(age.corrected && last && last.date < age.from);
  const band = doc.sex && last && !beforeDue ? checkGrowth(doc.sex, age.from, entries, today).band : null;

  const add = () => {
    const w = Number(kg.replace(",", "."));
    if (!plausibleWeight(w)) return setError("Enter baby's weight in kg, like 4.6.");
    if (!date || date < birth || date > today) return setError("Pick a date between the birth and today.");
    setError(null);
    void save((d) => ({ ...d, growth: [...(d.growth || []).filter((e) => e.date !== date), { date, weight: Math.round(w * 100) / 100 }].sort((a, b) => a.date.localeCompare(b.date)).slice(-60) }));
    setKg("");
  };
  const remove = (d: string) => void save((x) => ({ ...x, growth: (x.growth || []).filter((e) => e.date !== d) }));

  return (
    <Panel>
      <PanelTitle
        title={doc.baby_name ? `${doc.baby_name}'s growth` : t("mom.growthTitle")}
        icon={ChartLineUp}
        iconColor={TW.emerald[600]}
        subtitle={`Weigh baby once a month (free at the Anganwadi) and add it here. A line that keeps rising is what matters most.${age.corrected ? ` Born ${age.weeksEarly} weeks early, so Sakhi uses the age from the due date.` : ""}`}
      />
      <AppText style={{ marginTop: 4, fontSize: 11, color: ink[45] }}>{t("pregnancy.whoGrowthNote")}</AppText>

      <View style={{ marginTop: 14 }}>
        {!doc.sex ? (
          <View style={{ padding: 14, borderRadius: 16, backgroundColor: "rgba(245,240,255,0.7)", gap: 10 }}>
            <AppText style={{ fontSize: 14, color: palette.plum900 }}>Girls and boys have different growth lines. Is your baby a…</AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["girl", "boy"] as Sex[]).map((s) => (
                <ToggleChip key={s} label={s === "girl" ? "Girl" : "Boy"} on={false} onPress={() => void save((d) => ({ ...d, sex: s }))} />
              ))}
            </View>
          </View>
        ) : (
          <GrowthChart sex={doc.sex} from={age.from} entries={entries} today={today} />
        )}
      </View>

      {band && last ? (
        <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: BAND_STYLE[band].bg }} accessibilityRole={band === "red" || band === "yellow" ? "alert" : undefined}>
          <AppText style={{ fontSize: 14, fontWeight: "600", color: BAND_STYLE[band].fg }}>
            {last.weight} kg on {fmt(last.date)}: {BAND_TEXT[band].label}
          </AppText>
          <AppText style={{ marginTop: 2, fontSize: 14, lineHeight: 20, color: BAND_STYLE[band].fg }}>{BAND_TEXT[band].advice}</AppText>
        </View>
      ) : null}
      {beforeDue ? (
        <View style={{ marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: palette.lavender50 }}>
          <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>Until the due date, the doctor checks an early baby&apos;s weight on special preterm charts. Sakhi starts the WHO chart from the due date.</AppText>
        </View>
      ) : null}
      {check.notes.length ? (
        <View style={{ marginTop: 10, gap: 4 }}>
          {check.notes.map((n) => (
            <AppText key={n.text} style={{ fontSize: 14, lineHeight: 20, color: NOTE_COLOR[n.level], fontWeight: n.level === "doctor" ? "500" : "400" }}>{n.text}</AppText>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: 16, gap: 12 }}>
        <DateField label={t("pregnancy.dateWeighed")} value={date} onChange={setDate} min={birth} max={today} />
        <Field label={t("pregnancy.weightKg")} value={kg} onChangeText={setKg} keyboardType="decimal-pad" placeholder="e.g. 4.6" />
        <PillButton label={t("mom.addWeight")} onPress={add} />
        {error ? <AppText style={{ fontSize: 14, color: TW.rose[700] }} accessibilityRole="alert">{error}</AppText> : null}
      </View>

      {entries.length ? (
        <View style={{ marginTop: 12 }}>
          <PressableScale onPress={() => setShowAll((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showAll }} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40 }}>
            <AppText style={{ fontSize: 14, color: ink[60] }}>All weighings ({entries.length})</AppText>
            {showAll ? <CaretUp size={14} color={ink[60]} /> : <CaretDown size={14} color={ink[60]} />}
          </PressableScale>
          {showAll
            ? [...entries].reverse().map((e) => (
                <View key={e.date} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4, borderTopWidth: 1, borderTopColor: ink[7] }}>
                  <AppText style={{ flex: 1, fontSize: 14, color: palette.plum900 }}>
                    {fmt(e.date)}
                    {e.date === birth ? " (birth)" : ""}
                  </AppText>
                  <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{e.weight} kg</AppText>
                  <PressableScale onPress={() => remove(e.date)} accessibilityLabel={`Remove the ${fmt(e.date)} weight`} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                    <Trash size={16} color={ink[45]} />
                  </PressableScale>
                </View>
              ))
            : null}
        </View>
      ) : null}
    </Panel>
  );
}

/** Coloured zones (red / yellow / green) with baby's line drawn over them. */
function GrowthChart({ sex, from, entries, today }: { sex: Sex; from: string; entries: { date: string; weight: number }[]; today: string }) {
  const [W, setW] = useState(0);
  const nowM = monthsOld(from, today);
  const xMax = Math.min(24, Math.max(6, Math.ceil(nowM) + 2));
  const yMin = Math.max(0, Math.floor(linesAt(sex, 0).sd3neg - 1));
  const yMax = Math.ceil(Math.max(linesAt(sex, xMax).sd2 + 0.5, ...entries.map((e) => e.weight + 0.5)));
  const H = 230, L = 28, R = 8, T = 10, B = 26;
  const x = (m: number) => L + (m / xMax) * (W - L - R);
  const y = (kg: number) => T + (1 - (kg - yMin) / (yMax - yMin)) * (H - T - B);
  const steps = Array.from({ length: xMax * 4 + 1 }, (_, i) => i / 4);
  const lineOf = (k: "median") => steps.map((m) => `${x(m)},${y(linesAt(sex, m)[k])}`).join(" ");
  const area = (lower: (m: number) => number, upper: (m: number) => number) => [...steps.map((m) => `${x(m)},${y(upper(m))}`), ...[...steps].reverse().map((m) => `${x(m)},${y(lower(m))}`)].join(" ");
  const pts = entries.filter((e) => e.date >= from).map((e) => ({ ...e, m: monthsOld(from, e.date) })).filter((p) => p.m <= xMax);
  const yTicks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i).filter((v) => (yMax - yMin > 8 ? v % 2 === 0 : true));
  const xTicks = Array.from({ length: xMax + 1 }, (_, i) => i).filter((m) => (xMax > 12 ? m % 3 === 0 : xMax > 6 ? m % 2 === 0 : true));
  const last = pts[pts.length - 1];

  return (
    <View>
      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={{ height: H }} accessibilityLabel={last ? `Growth chart: latest weight ${last.weight} kg at ${last.m.toFixed(1)} months` : "Growth chart with no weights yet"}>
        {W > 0 ? (
          <Svg width={W} height={H}>
            <Polygon points={area(() => yMin, (m) => linesAt(sex, m).sd3neg)} fill="rgba(254,205,211,0.7)" />
            <Polygon points={area((m) => linesAt(sex, m).sd3neg, (m) => linesAt(sex, m).sd2neg)} fill="rgba(253,230,138,0.7)" />
            <Polygon points={area((m) => linesAt(sex, m).sd2neg, (m) => linesAt(sex, m).sd2)} fill={TW.emerald[100]} />
            <Polyline points={lineOf("median")} fill="none" stroke="rgba(5,150,105,0.6)" strokeWidth={1.5} strokeDasharray="5 4" />
            {yTicks.map((v) => (
              <G key={v}>
                <Line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgba(42,21,47,0.07)" />
                <SvgText x={L - 5} y={y(v) + 4} fontSize={10} fill={ink[50]} textAnchor="end" fontFamily={fonts.regular}>{v}</SvgText>
              </G>
            ))}
            {xTicks.map((m) => (
              <SvgText key={m} x={x(m)} y={H - 8} fontSize={10} fill={ink[50]} textAnchor="middle" fontFamily={fonts.regular}>{m === 0 ? "Birth" : `${m}m`}</SvgText>
            ))}
            <Line x1={x(Math.min(nowM, xMax))} x2={x(Math.min(nowM, xMax))} y1={T} y2={H - B} stroke="rgba(42,21,47,0.25)" strokeDasharray="2 3" />
            {pts.length > 1 ? <Polyline points={pts.map((p) => `${x(p.m)},${y(p.weight)}`).join(" ")} fill="none" stroke={palette.plum900} strokeWidth={2.5} strokeLinejoin="round" /> : null}
            {pts.map((p) => (
              <Circle key={p.date} cx={x(p.m)} cy={y(p.weight)} r={5} fill="#fff" stroke={palette.plum900} strokeWidth={2.5} />
            ))}
          </Svg>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
        {[
          { c: TW.emerald[100], l: "Normal" },
          { c: TW.amber[200], l: "Underweight" },
          { c: TW.rose[200], l: "Severely underweight" },
        ].map((k) => (
          <View key={k.l} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: k.c }} />
            <AppText style={{ fontSize: 11, color: ink[60] }}>{k.l}</AppText>
          </View>
        ))}
        <AppText style={{ fontSize: 11, color: ink[60] }}>- - Average · kg by age in months</AppText>
      </View>
    </View>
  );
}
