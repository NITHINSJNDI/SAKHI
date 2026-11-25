/**
 * Mom Mode panels that live inline in frontend/app/pregnancy-mode/page.tsx:
 * this week, latest readings, the pregnancy risk check (with "why this
 * score?"), and the doctor summary link.
 */
import { useRouter } from "expo-router";
import { CaretDown, CaretUp, CheckCircle, FilePdf, Info, ShieldCheck, WarningCircle } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { Panel, ink } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import type { MlState } from "@/lib/momData";
import { sizeFor } from "@/lib/shared/chat/offline/knowledge";
import { daysSince, measuredByShort, staleNote } from "@/lib/shared/readings";
import { TW } from "@/lib/tw";
import { fonts, palette } from "@/theme";

import { BabyGrowthTimeline, PregnancyWeekProgress } from "./PregnancyCharts";

 

/** Where she is this week: first on Today. */
export function WeekCard({ weeks, daysToGo }: { weeks: number; daysToGo: number | null }) {
  const { t } = useT();
  return (
    <Panel>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 13, color: ink[60] }}>{weeks <= 13 ? t("pregnancy.firstTrimester") : weeks <= 27 ? t("pregnancy.secondTrimester") : t("pregnancy.thirdTrimester")}</AppText>
          <AppText style={{ marginTop: 4, fontSize: 24, lineHeight: 30, fontWeight: "600", letterSpacing: -0.5, color: palette.plum900 }} accessibilityRole="header">
            {t("pregnancy.week")} {weeks}. Baby is about the size of <AppText style={{ fontFamily: fonts.serifItalic, fontSize: 26, color: palette.blush500 }}>{sizeFor(weeks)}</AppText>.
          </AppText>
        </View>
        {daysToGo !== null ? (
          <View style={{ alignItems: "flex-end" }}>
            <AppText style={{ fontSize: 26, fontWeight: "600", color: palette.plum900 }}>{daysToGo}</AppText>
            <AppText style={{ fontSize: 12, color: ink[60], textAlign: "right", maxWidth: 80 }}>{t("pregnancy.daysToDue", "days to go")}</AppText>
          </View>
        ) : null}
      </View>
      <View style={{ marginTop: 18 }}>
        <PregnancyWeekProgress weeks={weeks} />
      </View>
      <AppText style={{ marginTop: 20, marginBottom: 8, fontSize: 13, fontWeight: "500", color: ink[60] }}>{t("pregnancy.babyGrowthTimeline")}</AppText>
      <BabyGrowthTimeline weeks={weeks} />
    </Panel>
  );
}

/** Today: the most recent reading of each vital, colour-coded. */
export function LatestVitalsCard({ logs, onOpenVitals, afterBirth = false }: { logs: any[]; onOpenVitals: () => void; afterBirth?: boolean }) {
  const { t } = useT();
  const sorted = [...(logs || [])].sort((a, b) => String(b.log_date).localeCompare(String(a.log_date)));
  const latest = (key: string) => sorted.find((l) => l[key] !== undefined && l[key] !== null && Number(l[key]) > 0);
  const bp = latest("blood_pressure_systolic");
  const sugar = latest("blood_sugar");
  const kicks = sorted.find((l) => l.baby_movement && (typeof l.baby_movement === "object" ? Object.values(l.baby_movement).some((v) => Number(v) > 0) : Number(l.baby_movement) > 0));
  const weight = latest("weight");
  const when = (l: any) => (l ? new Date(String(l.log_date).slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
  const kickCount = (m: any) => (typeof m === "object" ? (Number(m.morning) || 0) + (Number(m.afternoon) || Number(m.count) || 0) + (Number(m.night) || 0) : Number(m));
  const sys = Number(bp?.blood_pressure_systolic), dia = Number(bp?.blood_pressure_diastolic);
  const bpLevel = !bp ? "none" : sys >= 140 || dia >= 90 ? "high" : sys >= 130 || dia >= 80 ? "watch" : "ok";
  const bs = Number(sugar?.blood_sugar);
  const bsLevel = !sugar ? "none" : bs >= 140 ? "high" : bs >= 95 ? "watch" : "ok";
  const tone = (l: string) =>
    l === "high" ? { bg: TW.rose[50], border: TW.rose[200], fg: TW.rose[700] } : l === "watch" ? { bg: TW.amber[50], border: TW.amber[200], fg: TW.amber[700] } : l === "ok" ? { bg: TW.emerald[50], border: TW.emerald[200], fg: TW.emerald[700] } : { bg: "rgba(255,255,255,0.7)", border: TW.pink[100], fg: ink[60] };
  const items = [
    { label: "Blood pressure", value: bp ? `${sys}/${dia}` : "—", unit: "mmHg", level: bpLevel, log: bp, note: bpLevel === "high" ? "High: contact your doctor today" : bpLevel === "watch" ? "A little raised: recheck soon" : bpLevel === "ok" ? "In a healthy range" : "Not logged yet" },
    { label: "Blood sugar", value: sugar ? `${bs}` : "—", unit: "mg/dL", level: bsLevel, log: sugar, note: bsLevel === "high" ? "High: mention it to your doctor" : bsLevel === "watch" ? "Above fasting target" : bsLevel === "ok" ? "Within target" : "Not logged yet" },
    { label: "Baby kicks", value: kicks ? `${kickCount(kicks.baby_movement)}` : "—", unit: "counted", level: "none", log: kicks, note: "Call your doctor if movements slow down or change" },
    { label: "Weight", value: weight ? `${weight.weight}` : "—", unit: "kg", level: "none", log: weight, note: weight ? "Latest check-in" : "Not logged yet" },
  ].filter((i) => !(afterBirth && i.label === "Baby kicks"));

  return (
    <Panel>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <AppText style={{ fontSize: 20, fontWeight: "600", letterSpacing: -0.4, color: palette.plum900 }} accessibilityRole="header">{t("pregnancy.latestReadings")}</AppText>
        <PressableScale onPress={onOpenVitals} accessibilityRole="link" style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 4 }}>
          <AppText style={{ fontSize: 14, fontWeight: "500", color: TW.pink[600] }}>See trends →</AppText>
        </PressableScale>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {items.map((i) => {
          const c = tone(i.level);
          return (
            <View key={i.label} style={{ flexBasis: "47%", flexGrow: 1, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg }}>
              <AppText style={{ fontSize: 12, fontWeight: "600", color: c.fg, opacity: 0.85 }}>{i.label}</AppText>
              <AppText style={{ marginTop: 4, fontSize: 22, fontWeight: "600", color: palette.plum900 }}>
                {i.value} <AppText style={{ fontSize: 11, color: ink[50] }}>{i.unit}</AppText>
              </AppText>
              <AppText style={{ marginTop: 4, fontSize: 12, lineHeight: 16, color: c.fg }}>{i.note}</AppText>
              {i.log ? <AppText style={{ marginTop: 4, fontSize: 11, color: ink[45] }}>{when(i.log)}</AppText> : null}
            </View>
          );
        })}
      </View>
    </Panel>
  );
}

interface Factor {
  title: string;
  detail: string;
  impact: string;
  type: "positive" | "negative" | "neutral";
  source: string;
}

function modelFactors(ml: any, label: string): Factor[] {
  if (!ml) return [];
  const prob = Math.round((ml.probability || 0) * 100);
  const drivers = (ml.explanation || [])
    .filter((e: any) => e.provided && Math.abs(e.impact) >= 0.05)
    .slice(0, 3)
    .map((e: any) => `${e.label} ${e.value} ${e.unit} (${e.impact > 0 ? "raises" : "lowers"} risk)`);
  const rows: Factor[] = [
    {
      title: `${label} model score (${prob}%)`,
      detail: ml.model ? `${ml.model.name}, trained on ${ml.model.dataset} (n=${ml.model.n}, cross-validated AUC ${ml.model.roc_auc}).${drivers.length ? ` Main drivers: ${drivers.join("; ")}.` : ""}` : "Evaluated against clinical maternal guidelines.",
      impact: ml.risk_level || "Calibrated",
      type: ml.risk_level === "High" ? "negative" : ml.risk_level === "Moderate" ? "neutral" : "positive",
      source: "Health Analysis",
    },
  ];
  for (const flag of ml.clinical_flags || []) rows.push({ title: flag, detail: "Clinical guideline threshold (ACOG / DIPSI).", impact: "Guideline", type: "negative", source: "Health Analysis" });
  return rows;
}

function bpExplain(profile: any, logs: any[], ml: any): { summary: string; factors: Factor[] } {
  const last = [...(logs || [])].reverse().find((l) => l.blood_pressure_systolic && l.blood_pressure_diastolic);
  if (!last) return { summary: 'No blood pressure logged yet, so this risk isn\'t scored. Add a reading in your check-in, or tell Sakhi something like "BP 118 over 76".', factors: [] };
  const sys = Number(last.blood_pressure_systolic), dia = Number(last.blood_pressure_diastolic);
  const htn = (profile?.maternal_conditions || []).some((c: string) => /pressure|hypertension/i.test(c));
  const f: Factor[] = [];
  f.push(sys >= 140 ? { title: `High Systolic BP (${sys} mmHg)`, detail: "Recorded in daily check-in. Reading is above 140 mmHg, reflecting higher arterial pressure.", impact: "High", type: "negative", source: "Daily Check-in" } : sys >= 130 ? { title: `Elevated Systolic BP (${sys} mmHg)`, detail: "Recorded in daily check-in. Reading is in the elevated range (≥130 mmHg).", impact: "Elevated", type: "negative", source: "Daily Check-in" } : { title: `Optimal Systolic BP (${sys} mmHg)`, detail: "Recorded in daily check-in. Reading is within the healthy normal range (<120 mmHg).", impact: "Normal", type: "positive", source: "Daily Check-in" });
  f.push(dia >= 90 ? { title: `High Diastolic BP (${dia} mmHg)`, detail: "Recorded in daily check-in. Reading is at or above 90 mmHg.", impact: "High", type: "negative", source: "Daily Check-in" } : dia >= 85 ? { title: `Borderline Diastolic BP (${dia} mmHg)`, detail: "Recorded in daily check-in. Reading is approaching 90 mmHg.", impact: "Borderline", type: "negative", source: "Daily Check-in" } : { title: `Healthy Diastolic BP (${dia} mmHg)`, detail: "Recorded in daily check-in. Reading is within the safe range (<80 mmHg).", impact: "Normal", type: "positive", source: "Daily Check-in" });
  f.push(htn ? { title: "Prior Hypertension Noted", detail: "Recorded in initial setup. Pre-existing blood pressure variance noted.", impact: "Prior History", type: "negative", source: "Initial Setup" } : { title: "No Prior Hypertension", detail: "No history of chronic high blood pressure reported in initial setup.", impact: "Healthy", type: "positive", source: "Initial Setup" });
  f.push(...modelFactors(ml, "General pregnancy risk"));
  const level = ml?.risk_level;
  return {
    summary: level === "High" ? "Blood pressure readings are elevated. Rest, minimize sodium, and discuss this reading with your doctor." : level === "Moderate" ? "Blood pressure is slightly borderline. Continue regular daily check-ins to monitor trends." : "Blood pressure and vascular health are balanced and within normal ranges for your trimester.",
    factors: f,
  };
}

function sugarExplain(profile: any, logs: any[], ml: any, weeks: number): { summary: string; factors: Factor[] } {
  const last = [...(logs || [])].reverse().find((l) => l.blood_sugar !== null && l.blood_sugar !== undefined && Number(l.blood_sugar) > 0);
  if (!last) return { summary: 'No blood sugar logged yet, so this risk isn\'t scored. Add a fasting reading in your check-in, or tell Sakhi something like "fasting sugar 88".', factors: [] };
  const bs = Number(last.blood_sugar);
  const dm = (profile?.maternal_conditions || []).some((c: string) => /diabetes|sugar/i.test(c));
  const f: Factor[] = [];
  f.push(bs >= 105 ? { title: `High Fasting Blood Sugar (${bs} mg/dL)`, detail: "Recorded in daily check-in. Reading is above the 95 mg/dL benchmark.", impact: "High", type: "negative", source: "Daily Check-in" } : bs >= 95 ? { title: `Borderline Fasting Sugar (${bs} mg/dL)`, detail: "Recorded in daily check-in. Reading is hovering near the 95 mg/dL threshold.", impact: "Borderline", type: "negative", source: "Daily Check-in" } : { title: `Optimal Fasting Blood Sugar (${bs} mg/dL)`, detail: "Recorded in daily check-in. Reading is safely within target range (<95 mg/dL).", impact: "Optimal", type: "positive", source: "Daily Check-in" });
  f.push(dm ? { title: "Prior Diabetes Noted", detail: "Previous glucose sensitivity noted during initial setup.", impact: "Prior History", type: "negative", source: "Initial Setup" } : { title: "No Diabetes History", detail: "No metabolic or diabetic conditions noted in initial setup.", impact: "Healthy", type: "positive", source: "Initial Setup" });
  const tri = weeks <= 13 ? "First Trimester" : weeks <= 27 ? "Second Trimester" : "Third Trimester";
  f.push({ title: `Gestational Stage (${tri}, Week ${weeks})`, detail: weeks < 24 ? "Standard early pregnancy stage; routine glucose screening typically occurs around weeks 24–28." : "Placental hormones naturally elevate maternal insulin requirements in this stage.", impact: weeks < 24 ? "Low Risk Stage" : "Routine Window", type: "neutral", source: "Initial Setup" });
  f.push(...modelFactors(ml, "Diabetes tendency"));
  f.push({ title: "About this model", detail: "Trained on general diabetes data from adult women who were not pregnant, so it is a guide only. The glucose tolerance test (OGTT) your doctor offers around weeks 24 to 28 is what diagnoses gestational diabetes.", impact: "Guide only", type: "neutral", source: "Health Analysis" });
  const level = ml?.risk_level;
  return {
    summary: level === "High" ? "Blood sugar is elevated. Discuss meal pacing and a glucose tolerance test with your doctor." : level === "Moderate" ? "Mild sugar elevation observed. Focus on balanced fiber-rich meals and regular daily activity." : "Blood sugar is in a healthy range. Insulin regulation looks balanced for this stage.",
    factors: f,
  };
}

const levelStyle = (l: string) => (l === "High" ? { bg: TW.rose[100], fg: TW.rose[700] } : l === "Moderate" ? { bg: TW.amber[100], fg: TW.amber[700] } : { bg: TW.emerald[100], fg: TW.emerald[700] });
const shortDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");

function RiskTile({ title, ml, loading, reading, date, by, stale, notes, missing }: { title: string; ml: any; loading: boolean; reading: string; date: string | null; by?: string | null; stale?: string | null; notes: { High: string; Moderate: string; Low: string }; missing: string }) {
  const { t } = useT();
  const ls = ml ? levelStyle(ml.risk_level) : null;
  return (
    <View style={{ padding: 14, borderRadius: 18, borderWidth: 1, borderColor: ink[7], backgroundColor: "rgba(255,255,255,0.8)" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <AppText style={{ fontSize: 12, fontWeight: "600", color: ink[65] }}>{title}</AppText>
        {ml && ls ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: ls.bg }}>
            <AppText style={{ fontSize: 11, fontWeight: "700", color: ls.fg }}>{ml.risk_level}</AppText>
          </View>
        ) : !loading ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: ink[5] }}>
            <AppText style={{ fontSize: 11, fontWeight: "600", color: ink[55] }}>{t("pregnancy.notScored")}</AppText>
          </View>
        ) : null}
      </View>
      {ml ? (
        <>
          <AppText style={{ marginTop: 4, fontSize: 24, fontWeight: "600", color: palette.plum900 }}>
            {Math.round(ml.probability * 100)}% <AppText style={{ fontSize: 12, color: ink[50] }}>model estimate</AppText>
          </AppText>
          <AppText style={{ marginTop: 6, fontSize: 12, lineHeight: 17, color: ink[65] }}>{notes[ml.risk_level as "High" | "Moderate" | "Low"] ?? notes.Low}</AppText>
        </>
      ) : (
        <AppText style={{ marginTop: 6, fontSize: 12, lineHeight: 17, color: ink[65] }}>{loading ? "Checking…" : missing}</AppText>
      )}
      <View style={{ marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: ink[5], flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <AppText style={{ fontSize: 11, color: ink[50] }}>{t("pregnancy.basedOn")}</AppText>
        <AppText style={{ flexShrink: 1, textAlign: "right", fontSize: 11, fontWeight: "500", color: ink[75] }}>{ml ? `${reading}${date ? ` · ${shortDate(date)}` : ""}${by ? ` · ${by}` : ""}` : "No reading yet"}</AppText>
      </View>
      {ml && stale ? (
        <View style={{ marginTop: 8, borderRadius: 12, backgroundColor: TW.amber[50], padding: 8 }}>
          <AppText style={{ fontSize: 11, lineHeight: 16, color: "#78350F" }}>{stale}</AppText>
        </View>
      ) : null}
    </View>
  );
}

/** Pregnancy risk check: scores only readings she logged. */
export function RiskCard({ profile, logs, ml, weeks }: { profile: any; logs: any[]; ml: MlState; weeks: number }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"pe" | "gdm">("pe");
  const pe = ml.preeclampsia, gd = ml.gdm;
  const levels = [pe?.risk_level, gd?.risk_level];
  const tint = levels.includes("High") ? { borderColor: TW.rose[200], backgroundColor: "rgba(255,241,242,0.5)" } : levels.includes("Moderate") ? { borderColor: TW.amber[200], backgroundColor: "rgba(255,251,235,0.5)" } : undefined;
  const explain = tab === "pe" ? bpExplain(profile, logs, pe) : sugarExplain(profile, logs, gd, weeks);
  const addReading = (by: "mcp_card" | "asha") => router.push({ pathname: "/lab-report", params: { mode: "pregnancy", measuredBy: by, add: "1" } });

  return (
    <Panel style={tint}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: ink[5], alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck size={24} color={palette.lavender600} weight="duotone" />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontSize: 20, fontWeight: "600", letterSpacing: -0.4, color: palette.plum900 }} accessibilityRole="header">{t("pregnancy.riskCheck")}</AppText>
          <AppText style={{ marginTop: 2, fontSize: 12, lineHeight: 16, color: ink[60] }}>{ml.isLoading ? "Checking your latest readings…" : "From readings you logged, your MCP card or your ASHA worker · a screening guide, not a diagnosis"}</AppText>
        </View>
      </View>
      <AppText style={{ marginTop: 10, fontSize: 12, color: ink[60] }}>
        {profile?.pregnancy_experience || "First-time mother"} · Trimester {weeks <= 13 ? "1" : weeks <= 27 ? "2" : "3"}
      </AppText>
      <View style={{ marginTop: 12, gap: 12 }}>
        <RiskTile
          title="Blood pressure"
          ml={pe}
          loading={ml.isLoading}
          reading={pe?.factors ? `${pe.factors.systolic}/${pe.factors.diastolic} mmHg` : ""}
          date={ml.bpDate}
          by={measuredByShort(ml.bpBy)}
          stale={staleNote("bp", daysSince(ml.bpDate), weeks)}
          notes={{ High: "Your blood pressure reading is high. Please contact your doctor today.", Moderate: "A little above the ideal range. Recheck in a day or two and keep logging.", Low: "Your latest reading is in a healthy range. Keep checking at each visit." }}
          missing='No BP machine? Add the reading from your MCP card after a check-up, or one your ASHA worker took. Or tell Sakhi "BP 118 over 76".'
        />
        <RiskTile
          title="Blood sugar"
          ml={gd}
          loading={ml.isLoading}
          reading={gd?.factors ? `${gd.factors.blood_sugar} mg/dL` : ""}
          date={ml.sugarDate}
          by={measuredByShort(ml.sugarBy)}
          stale={staleNote("sugar", daysSince(ml.sugarDate), weeks)}
          notes={{ High: "Your sugar reading is high. Mention it to your doctor and ask about a glucose test (OGTT).", Moderate: "Slightly above the fasting target. Balanced, fibre-rich meals and a short walk after eating help.", Low: "Your latest reading is within the fasting target." }}
          missing='Add a sugar result from your lab report or MCP card, or tell Sakhi "fasting sugar 88".'
        />
      </View>
      <View style={{ marginTop: 12, borderRadius: 18, backgroundColor: palette.lavender50, padding: 14 }}>
        <AppText style={{ fontSize: 13, fontWeight: "600", color: palette.plum900 }}>{t("pregnancy.noMeterFine")}</AppText>
        <AppText style={{ marginTop: 2, fontSize: 12, lineHeight: 17, color: ink[65] }}>Your BP, Hb and urine are checked at every antenatal visit and written on your MCP card. Your ASHA worker can check BP too.</AppText>
        <View style={{ marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <PressableScale onPress={() => addReading("mcp_card")} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", backgroundColor: palette.plum900 }}>
            <AppText style={{ fontSize: 13, fontWeight: "600", color: palette.cream }}>Add from MCP card</AppText>
          </PressableScale>
          <PressableScale onPress={() => addReading("asha")} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: "rgba(42,21,47,0.15)" }}>
            <AppText style={{ fontSize: 13, fontWeight: "600", color: palette.plum900 }}>Reading from ASHA / ANM</AppText>
          </PressableScale>
        </View>
      </View>
      <AppText style={{ marginTop: 12, fontSize: 11, lineHeight: 16, color: ink[50] }}>
        The blood sugar estimate comes from a general diabetes model (trained on women who were not pregnant), so treat it as a guide. Gestational diabetes is diagnosed with the glucose tolerance test around weeks 24 to 28.
      </AppText>

      <View style={{ marginTop: 14, paddingTop: 6, borderTopWidth: 1, borderTopColor: ink[10] }}>
        <PressableScale onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Info size={16} color="#9333EA" weight="bold" />
            <AppText style={{ fontSize: 14, fontWeight: "600", color: palette.plum900 }}>Why this score?</AppText>
          </View>
          {open ? <CaretUp size={16} color={palette.plum900} weight="bold" /> : <CaretDown size={16} color={palette.plum900} weight="bold" />}
        </PressableScale>
        {open ? (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: 10, marginTop: 6 }}>
            <View style={{ flexDirection: "row", gap: 6, padding: 4, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.05)", alignSelf: "flex-start" }}>
              {(["pe", "gdm"] as const).map((k) => {
                const on = tab === k;
                const m = k === "pe" ? pe : gd;
                return (
                  <PressableScale key={k} onPress={() => setTab(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ minHeight: 36, paddingHorizontal: 10, borderRadius: 9, justifyContent: "center", backgroundColor: on ? "#fff" : "transparent" }}>
                    <AppText style={{ fontSize: 12, fontWeight: "600", color: on ? palette.plum900 : ink[60] }}>
                      {k === "pe" ? "BP factors" : "Sugar factors"} ({m ? `${Math.round(m.probability * 100)}%` : "not scored"})
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
            <AppText style={{ fontSize: 12, lineHeight: 17, fontWeight: "500", color: ink[70] }}>{explain.summary}</AppText>
            {explain.factors.map((f, i) => {
              const I = f.type === "positive" ? CheckCircle : f.type === "negative" ? WarningCircle : Info;
              const ic = f.type === "positive" ? TW.emerald[500] : f.type === "negative" ? TW.amber[500] : TW.blue[500];
              const badge = f.type === "positive" ? { bg: TW.emerald[100], fg: TW.emerald[700] } : f.type === "negative" ? { bg: TW.amber[100], fg: TW.amber[800] } : { bg: "#F3F4F6", fg: "#374151" };
              return (
                <View key={i} style={{ flexDirection: "row", gap: 10, padding: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.8)", borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" }}>
                  <I size={16} color={ic} weight="fill" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText style={{ fontSize: 12, fontWeight: "600", color: palette.plum900 }}>{f.title}</AppText>
                    <AppText style={{ fontSize: 10, fontWeight: "700", color: ink[60] }}>{f.source}</AppText>
                    <AppText style={{ fontSize: 11, lineHeight: 16, color: ink[70] }}>{f.detail}</AppText>
                  </View>
                  <View style={{ alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: badge.bg }}>
                    <AppText style={{ fontSize: 10, fontWeight: "700", color: badge.fg }}>{f.impact}</AppText>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        ) : null}
      </View>
    </Panel>
  );
}

/** Link to the doctor summary for the next ANC visit. */
export function DoctorSummaryLink() {
  const router = useRouter();
  return (
    <PressableScale onPress={() => router.push({ pathname: "/doctor-summary", params: { mode: "pregnancy" } })} scaleTo={0.98} accessibilityRole="link">
      <Panel style={{ alignItems: "center", paddingVertical: 28 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.6)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <FilePdf size={32} color={palette.plum900} weight="duotone" />
        </View>
        <AppText style={{ fontSize: 18, fontWeight: "500", color: palette.plum900 }}>Doctor Summary</AppText>
        <AppText style={{ marginTop: 6, fontSize: 14, textAlign: "center", color: ink[60] }}>Generate your Pregnancy PDF report for your next ANC visit.</AppText>
      </Panel>
    </PressableScale>
  );
}
