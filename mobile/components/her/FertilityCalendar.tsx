/** Port of frontend/components/her/FertilityCalendar.tsx: month calendar of periods, fertile windows and forecast. */
import { CaretLeft, CaretRight } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { ink } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { dayNum, dayToIso, type PhaseInfo } from "@/lib/shared/cyclePhase";
import { planFertility, type DayKind } from "@/lib/shared/fertility";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

 

type Kind = Exclude<DayKind, null>;
const STYLE: Record<Kind, { cell: ViewStyle; text: string }> = {
  period: { cell: { backgroundColor: TW.rose[400] }, text: "#fff" },
  "predicted-period": { cell: { borderWidth: 1, borderStyle: "dashed", borderColor: TW.rose[300], backgroundColor: TW.rose[50] }, text: TW.rose[700] },
  peak: { cell: { backgroundColor: TW.emerald[500] }, text: "#fff" },
  fertile: { cell: { backgroundColor: TW.emerald[100] }, text: TW.emerald[800] },
  "predicted-peak": { cell: { borderWidth: 1, borderStyle: "dashed", borderColor: TW.emerald[500], backgroundColor: TW.emerald[100] }, text: TW.emerald[800] },
  "predicted-fertile": { cell: { borderWidth: 1, borderStyle: "dashed", borderColor: TW.emerald[300], backgroundColor: TW.emerald[50] }, text: TW.emerald[700] },
  "past-fertile": { cell: { backgroundColor: TW.emerald[50] }, text: "rgba(4,120,87,0.7)" },
};

const WEEKDAYS_MAP: Record<string, string[]> = {
  en: ["M", "T", "W", "T", "F", "S", "S"],
  ta: ["தி", "செ", "பு", "வி", "வெ", "ச", "ஞா"],
  hi: ["सो", "मं", "बु", "गु", "शु", "श", "र"],
  te: ["సో", "మం", "బు", "గు", "శు", "శ", "ఆ"],
  ml: ["തി", "ചൊ", "ബു", "വ്യാ", "വെ", "ശ", "ഞാ"],
  kn: ["ಸೋ", "ಮಂ", "ಬು", "ಗು", "ಶು", "ಶ", "ಭಾ"],
  bn: ["সো", "ম", "বু", "বৃ", "শু", "শ", "র"],
  mr: ["सो", "मं", "बु", "गु", "शु", "श", "र"],
};

export default function FertilityCalendar({ phase, profile, logs, cycleHistory, tried = [], trying = false }: {
  phase: PhaseInfo; profile: any; logs: any[]; cycleHistory: any[]; tried?: string[]; trying?: boolean;
}) {
  const { language, meta, t } = useT();
  const locale = meta.bcp47 || "en-IN";
  const labelMap: Record<Kind, string> = {
    period: t("cycle.period"),
    "predicted-period": t("cycle.expectedPeriod"),
    peak: t("cycle.mostFertile"),
    fertile: t("cycle.fertile"),
    "predicted-peak": t("cycle.mostFertile"),
    "predicted-fertile": t("cycle.fertile"),
    "past-fertile": t("cycle.fertile"),
  };
  const fmt = (n: number, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
    new Date(dayToIso(n) + "T00:00:00").toLocaleDateString(locale, opts);

  const today = dayNum(new Date());
  const plan = useMemo(() => planFertility({ phase, profile, logs, cycleHistory, today }), [phase, profile, logs, cycleHistory, today]);
  const triedSet = useMemo(() => new Set(tried.map(dayNum)), [tried]);
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const startNum = dayNum(first);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => startNum + i)];
  while (cells.length % 7) cells.push(null);

  const w = plan.nextWindow;
  const summary = plan.late
    ? `${t("cycle.periodLateForecast", { count: phase.daysLate })}${trying ? ` ${t("cycle.homePregnancyReliable")}` : ""}`
    : w
      ? w.start <= today
        ? t("cycle.fertileNowUntil", { end: fmt(w.end), peak: fmt(w.peak) })
        : t("cycle.nextFertileDays", { start: fmt(w.start), end: fmt(w.end), peak: fmt(w.peak) })
      : "";
  const basis = plan.cyclesLogged >= 2 ? t("cycle.basedOnLastCycles", { count: plan.cyclesLogged }) : t("cycle.basedOnGivenLength");
  const weekdays = WEEKDAYS_MAP[language] || WEEKDAYS_MAP.en;

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={{ marginBottom: 16, gap: 4 }}>
        {summary ? <AppText style={{ fontSize: 14, fontWeight: "600", color: palette.plum900 }}>{summary}</AppText> : null}
        <AppText style={s.soft}>{basis}</AppText>
        {trying && !plan.late && plan.testFrom !== null ? <AppText style={s.soft}>{t("cycle.reliableFrom", { date: fmt(plan.testFrom) })}</AppText> : null}
      </View>

      <View style={s.monthRow}>
        <PressableScale
          onPress={() => setOffset((o) => Math.max(-6, o - 1))}
          disabled={offset <= -6}
          accessibilityLabel={t("cycle.prevMonth")}
          style={s.navBtn}
        >
          <CaretLeft size={18} color={palette.plum900} />
        </PressableScale>
        <AppText style={{ fontSize: 15, fontWeight: "600", color: palette.plum900 }} accessibilityLiveRegion="polite">
          {first.toLocaleDateString(locale, { month: "long", year: "numeric" })}
        </AppText>
        <PressableScale
          onPress={() => setOffset((o) => Math.min(3, o + 1))}
          disabled={offset >= 3}
          accessibilityLabel={t("cycle.nextMonth")}
          style={s.navBtn}
        >
          <CaretRight size={18} color={palette.plum900} />
        </PressableScale>
      </View>

      <View style={s.week}>
        {weekdays.map((d, i) => (
          <AppText key={i} style={s.weekday}>
            {d}
          </AppText>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={s.week}>
          {row.map((n, ci) => {
            if (n === null) return <View key={`b${ri}-${ci}`} style={s.cellWrap} />;
            const k = plan.kindOf(n);
            const isToday = n === today;
            const didTry = triedSet.has(n);
            const st = k.kind ? STYLE[k.kind as Kind] : null;
            const label = `${fmt(n, { day: "numeric", month: "long" })}${k.kind ? `, ${labelMap[k.kind as Kind]}` : ""}${didTry ? `, ${t("cycle.tried")}` : ""}${isToday ? `, ${t("common.today")}` : ""}`;
            return (
              <View key={n} style={s.cellWrap} accessible accessibilityLabel={label}>
                <View style={[s.cell, st?.cell, isToday ? s.today : null]}>
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: isToday ? "600" : "400",
                      color: st ? st.text : n < today ? ink[45] : palette.plum900,
                    }}
                  >
                    {new Date(dayToIso(n) + "T00:00:00").getDate()}
                  </AppText>
                  {didTry ? <View style={s.triedDot} /> : null}
                </View>
              </View>
            );
          })}
        </View>
      ))}

      <View style={s.legend}>
        <Legend swatch={{ backgroundColor: TW.rose[400] }} label={t("cycle.period")} />
        <Legend swatch={{ borderWidth: 1, borderStyle: "dashed", borderColor: TW.rose[300], backgroundColor: TW.rose[50] }} label={t("cycle.expectedPeriod")} />
        <Legend swatch={{ backgroundColor: TW.emerald[500] }} label={t("cycle.mostFertile")} />
        <Legend swatch={{ backgroundColor: TW.emerald[100] }} label={t("cycle.fertile")} />
        <Legend swatch={{ borderWidth: 1, borderStyle: "dashed", borderColor: TW.emerald[300], backgroundColor: TW.emerald[50] }} label={t("cycle.forecast")} />
        {trying ? <Legend swatch={{ width: 6, height: 6, borderRadius: 3, backgroundColor: palette.blush500 }} label={t("cycle.tried")} /> : null}
      </View>
      <AppText style={[s.soft, { marginTop: 12, color: ink[45] }]}>{t("cycle.calendarDisclaimer")}</AppText>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: ViewStyle; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={[{ width: 12, height: 12, borderRadius: 3 }, swatch]} />
      <AppText style={s.soft}>{label}</AppText>
    </View>
  );
}

const s = StyleSheet.create({
  soft: { fontSize: 12, lineHeight: 17, color: "rgba(42,21,47,0.68)" },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  navBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", paddingBottom: 4, fontSize: 11, fontWeight: "500", color: ink[45] },
  cellWrap: { flex: 1, aspectRatio: 1, padding: 2 },
  cell: { flex: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  today: { borderWidth: 2, borderColor: palette.plum900 },
  triedDot: { position: "absolute", bottom: 4, width: 6, height: 6, borderRadius: 3, backgroundColor: palette.blush500 },
  legend: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 8 },
});
