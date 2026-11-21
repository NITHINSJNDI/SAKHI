/** Port of frontend/components/her/GoalCard.tsx: just tracking, trying to conceive, or perimenopause. */
import DateTimePicker from "@react-native-community/datetimepicker";
import { Plant, Target, Thermometer } from "phosphor-react-native";
import { useRef, useState } from "react";
import { Platform, Pressable, View } from "react-native";

import { AppText } from "@/components/AppText";
import { atom, InfoBox, OptionCard, Stepper, ToggleChip } from "@/components/web/Atoms";
import { Panel, PanelTitle } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { dayNum, dayToIso, type PhaseInfo } from "@/lib/shared/cyclePhase";
import { planFertility } from "@/lib/shared/fertility";
import { monthsTrying, PERI_SIGNS, periRedFlags, periSummary, ttcAdvice, type GoalDoc, type HerGoal, type PeriDay } from "@/lib/shared/herGoal";
import { TW } from "@/lib/tw";
import { dayKey } from "@/lib/useUserDoc";
import { palette } from "@/theme";

 
interface CycleInfo { phase: PhaseInfo; profile: any; logs: any[]; cycleHistory: any[]; irregular: boolean }
type Save = (next: GoalDoc | ((p: GoalDoc) => GoalDoc)) => Promise<boolean>;

const GOALS: { id: HerGoal; label: string; hint: string }[] = [
  { id: "track", label: "Just tracking", hint: "Periods, symptoms and patterns" },
  { id: "ttc", label: "Trying for a baby", hint: "Fertile days and when to see a doctor" },
  { id: "peri", label: "Nearing menopause", hint: "Hot flashes, sleep and changes in your 40s" },
];

export default function GoalCard({ cycle, goal }: { cycle: CycleInfo; goal: { doc: GoalDoc; save: Save; loaded: boolean } }) {
  const { t } = useT();
  const { doc, save, loaded } = goal;
  const goalDefs: Record<HerGoal, { label: string; hint: string }> = {
    track: { label: t("goals.tracking"), hint: t("goals.trackingHint") },
    ttc: { label: t("goals.ttc"), hint: t("goals.ttcHint") },
    peri: { label: t("goals.peri"), hint: t("goals.periHint") },
  };
  if (!loaded) return null;
  return (
    <Panel>
      <PanelTitle icon={Target} iconColor={palette.lavender500} title={t("goals.title")} />
      <View style={{ marginTop: 12, gap: 8 }} accessibilityRole="radiogroup">
        {GOALS.map((g) => {
          const def = goalDefs[g.id] || g;
          return <OptionCard key={g.id} title={def.label} hint={def.hint} on={doc.goal === g.id} onPress={() => void save((d) => ({ ...d, goal: g.id }))} />;
        })}
      </View>
      {doc.goal === "ttc" ? <TtcPanel doc={doc} save={save} cycle={cycle} /> : null}
      {doc.goal === "peri" ? <PeriPanel doc={doc} save={save} cycle={cycle} /> : null}
    </Panel>
  );
}

function TtcPanel({ doc, save, cycle }: { doc: GoalDoc; save: Save; cycle: CycleInfo }) {
  const { t, fmtDate } = useT();
  const today = dayKey();
  const tNum = dayNum(today);
  const plan = planFertility({ phase: cycle.phase, profile: cycle.profile, logs: cycle.logs, cycleHistory: cycle.cycleHistory, today: tNum });
  const advice = ttcAdvice(doc, today, cycle.irregular);
  const months = monthsTrying(doc.ttc_since, today);
  const marked = doc.intimacy.includes(today);
  const [pickMonth, setPickMonth] = useState(false);
  const w = plan.nextWindow ? { start: dayToIso(plan.nextWindow.start), end: dayToIso(plan.nextWindow.end), ovulation: dayToIso(plan.nextWindow.peak) } : null;
  const kind = plan.kindOf(tNum).kind;
  const state = plan.late ? "late" : kind === "peak" ? "peak" : kind === "fertile" ? "fertile" : w && w.start > today ? "before" : "wait";
  const inWindow = w ? doc.intimacy.filter((d) => d >= w.start && d <= w.end).length : 0;
  const daysToStart = plan.nextWindow ? plan.nextWindow.start - tNum : 0;
  const short = (d: string) => fmtDate(d, { day: "numeric", month: "short" });

  const headline =
    state === "late"
      ? t("goals.periodLateAdvice")
      : state === "peak"
        ? t("goals.mostFertileDay")
        : state === "fertile"
          ? t("goals.inFertileWindow")
          : state === "before" && daysToStart <= 7
            ? t("goals.fertileStartsIn", { days: String(daysToStart) })
            : t("goals.waitingForPeriod", { date: short(dayToIso(plan.testFrom ?? tNum)) });

  return (
    <View style={{ marginTop: 20, gap: 16 }}>
      <InfoBox bg={state === "peak" || state === "fertile" ? TW.emerald[50] : palette.lavender50} style={{ padding: 16 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Plant size={20} color={TW.emerald[600]} weight="duotone" />
          <View style={{ flex: 1, gap: 4 }}>
            <AppText style={atom.strong}>{headline}</AppText>
            {w ? <AppText style={atom.soft}>{t("goals.fertileDaysSpan", { start: short(w.start), end: short(w.end), ovulation: short(w.ovulation) })}</AppText> : null}
            {plan.spread > 7 ? <AppText style={[atom.soft, { color: TW.amber[700] }]}>{t("goals.cyclesVaryRough", { days: String(plan.spread) })}</AppText> : null}
          </View>
        </View>
      </InfoBox>

      <View style={atom.wrap}>
        <ToggleChip
          on={marked}
          label={marked ? t("goals.notedForToday") : t("goals.weTriedToday")}
          onPress={() => void save((d) => ({ ...d, intimacy: marked ? d.intimacy.filter((x) => x !== today) : [...d.intimacy, today].slice(-120) }))}
        />
        <AppText style={atom.small}>{inWindow > 0 ? t("goals.daysNotedInWindow", { count: String(inWindow) }) : t("goals.optionalPrivate")}</AppText>
      </View>

      <View style={{ gap: 6 }}>
        <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{t("goals.tryingSince")}</AppText>
        <Pressable onPress={() => setPickMonth(true)} accessibilityRole="button" style={{ borderRadius: 12, borderWidth: 1, borderColor: "rgba(42,21,47,0.12)", backgroundColor: "rgba(251,246,243,0.6)", paddingHorizontal: 12, minHeight: 44, justifyContent: "center" }}>
          <AppText style={{ fontSize: 16, color: doc.ttc_since ? palette.plum900 : "rgba(42,21,47,0.4)" }}>
            {doc.ttc_since ? fmtDate(`${doc.ttc_since}-01`, { month: "long", year: "numeric" }) : "Choose month"}
          </AppText>
        </Pressable>
        {pickMonth ? (
          <DateTimePicker
            value={doc.ttc_since ? new Date(`${doc.ttc_since}-01T12:00:00`) : new Date()}
            mode="date"
            maximumDate={new Date()}
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={(e, d) => {
              if (Platform.OS === "android") setPickMonth(false);
              if (e.type === "set" && d) {
                void save((p) => ({ ...p, ttc_since: dayKey(d).slice(0, 7) }));
                if (Platform.OS !== "android") setPickMonth(false);
              } else if (e.type === "dismissed") setPickMonth(false);
            }}
          />
        ) : null}
        {months !== null ? <AppText style={atom.small}>{t("goals.monthsCount", { count: String(months) })}</AppText> : null}
      </View>

      <View style={{ gap: 6 }}>
        <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{t("goals.aboutYou")}</AppText>
        <View style={atom.wrap}>
          <ToggleChip on={Boolean(doc.over35)} label={t("goals.over35")} onPress={() => void save((d) => ({ ...d, over35: !d.over35 }))} />
          <ToggleChip on={Boolean(doc.folic)} label={t("goals.takingFolic")} onPress={() => void save((d) => ({ ...d, folic: !d.folic }))} />
        </View>
      </View>

      <View style={{ gap: 6 }}>
        {!doc.folic ? (
          <AppText style={atom.soft}>
            <AppText style={atom.strong}>{t("goals.folicAcidPrompt")} </AppText>
            {t("goals.folicAcidDesc")}
          </AppText>
        ) : null}
        {advice.seeDoctor ? (
          <InfoBox bg={TW.amber[50]}>
            <AppText style={{ fontSize: 14, lineHeight: 20, color: TW.amber[800] }}>{advice.text}</AppText>
          </InfoBox>
        ) : (
          <AppText style={atom.soft}>{t("goals.ttcGeneralAdvice")}</AppText>
        )}
        <AppText style={atom.soft}>{t("goals.ttcPreconceptionChecks")}</AppText>
      </View>
    </View>
  );
}

function PeriPanel({ doc, save, cycle }: { doc: GoalDoc; save: Save; cycle: CycleInfo }) {
  const { t } = useT();
  const today = dayKey();
  const saved = doc.peri.find((d) => d.date === today);
  const [day, setDay] = useState<PeriDay>(saved || { date: today, flashes: 0, sweats: false, sleep: false, mood: false, dryness: false, joints: false });
  const latest = useRef(day);
  const store = (change: (p: PeriDay) => Partial<PeriDay>) => {
    const next = { ...latest.current, ...change(latest.current) };
    latest.current = next;
    setDay(next);
    void save((d) => ({ ...d, peri: [...d.peri.filter((x) => x.date !== today), next].slice(-120) }));
  };
  const sum = periSummary(doc.peri, today);
  const daysSince = dayNum(today) - cycle.phase.lastStart;
  const flag = periRedFlags(daysSince);
  const signLabels: Record<string, string> = {
    sweats: t("goals.nightSweats"),
    sleep: t("goals.poorSleep"),
    mood: t("goals.lowMood"),
    dryness: t("goals.vaginalDryness"),
    joints: t("goals.jointAches"),
  };

  return (
    <View style={{ marginTop: 20, gap: 16 }}>
      {flag ? (
        <InfoBox bg={TW.amber[50]} style={{ padding: 14 }}>
          <AppText accessibilityRole="alert" style={{ fontSize: 14, lineHeight: 20, color: TW.amber[800] }}>{flag}</AppText>
        </InfoBox>
      ) : null}
      <View style={{ gap: 8 }}>
        <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{t("common.today")}</AppText>
        <Stepper icon={Thermometer} label={t("goals.hotFlashes")} value={day.flashes} min={0} max={30} onChange={(n) => store(() => ({ flashes: n }))} />
        <View style={atom.wrap}>
          {PERI_SIGNS.map((sg) => (
            <ToggleChip key={sg.key} on={Boolean(day[sg.key])} label={signLabels[sg.key] || sg.label} onPress={() => store((p) => ({ [sg.key]: !p[sg.key] }) as Partial<PeriDay>)} />
          ))}
        </View>
      </View>
      {sum.logged > 0 ? (
        <AppText style={atom.soft}>
          Last 30 days ({sum.logged} logged): about <AppText style={atom.strong}>{sum.flashesPerDay}</AppText> {t("goals.hotFlashes").toLowerCase()} a day
          {sum.counts
            .filter((c) => c.days > 0)
            .map((c) => `, ${(signLabels[c.key] || c.label).toLowerCase()} on ${c.days} day${c.days === 1 ? "" : "s"}`)
            .join("")}
          .
        </AppText>
      ) : null}
      <View style={{ gap: 6 }}>
        <AppText style={atom.soft}>{t("goals.periAdvice1")}</AppText>
        <AppText style={atom.soft}>{t("goals.periAdvice2")}</AppText>
        <AppText style={atom.soft}>{t("goals.periAdvice3")}</AppText>
      </View>
    </View>
  );
}
