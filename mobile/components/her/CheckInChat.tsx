/**
 * Port of frontend/components/DailyCheckInChat.tsx (shown inside SakhiAvatar on
 * Today when no log exists yet): five short questions that adapt to where she
 * is in her cycle, then one log is saved.
 */
import { CheckCircle, Minus, Plus, Sparkle } from "phosphor-react-native";
import { useMemo, useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { Panel, PanelTitle, ink } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import type { Phase, PhaseInfo } from "@/lib/shared/cyclePhase";
import { successHaptic } from "@/lib/haptics";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

 
type Step = "flow" | "pain" | "mood" | "sleep" | "symptoms";
const STEPS: Step[] = ["flow", "pain", "mood", "sleep", "symptoms"];
const NO_BLEED = new Set(["None", "No", "Not yet", "Stopped"]);
const isBleeding = (flow: string | null) => Boolean(flow) && !NO_BLEED.has(flow!) && flow !== "Spotting";

const SYMPTOMS_BY_PHASE: Record<Phase, string[]> = {
  menstrual: ["Back Pain", "Fatigue", "Headache", "Bloating", "Nausea", "Dizziness"],
  follicular: ["Acne", "Headache", "Fatigue", "Discharge Changes"],
  ovulatory: ["Ovulation Pain", "Discharge Changes", "Breast Tenderness", "Bloating", "Headache"],
  luteal: ["Bloating", "Breast Tenderness", "Cravings", "Acne", "Headache", "Fatigue"],
};
const ALL_SYMPTOMS = ["Fatigue", "Headache", "Bloating", "Acne", "Back Pain", "Nausea", "Breast Tenderness", "Cravings", "Ovulation Pain", "Discharge Changes", "Dizziness", "Hair Growth", "Hair Loss"];
const SYM_KEY: Record<string, string> = {
  Fatigue: "symFatigue", Headache: "symHeadache", Bloating: "symBloating", Acne: "symAcne", "Back Pain": "symBackPain", Nausea: "symNausea",
  "Breast Tenderness": "symBreastTenderness", Cravings: "symCravings", "Ovulation Pain": "symOvulationPain", "Discharge Changes": "symDischargeChanges",
  Dizziness: "symDizziness", "Hair Growth": "symHairGrowth", "Hair Loss": "symHairLoss", None: "symNone",
};
const FLOW_KEY: Record<string, string> = { No: "optNo", Spotting: "optSpotting", Light: "optLight", Moderate: "optModerate", Heavy: "optHeavy", "Very Heavy": "optVeryHeavy", Stopped: "optStopped", "Not yet": "optNotYet" };

export default function CheckInChat({ phase: info, name, onComplete }: { phase: PhaseInfo; name: string; onComplete: (data: any) => void }) {
  const { t } = useT();
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [flow, setFlow] = useState<string | null>(null);
  const [pain, setPain] = useState<number | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [sleep, setSleep] = useState(7.5);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [showAll, setShowAll] = useState(false);
  const phase = info.phase;
  const step = STEPS[stepIdx];
  const next = () => setTimeout(() => setStepIdx((i) => i + 1), 250);
  const flowLabel = (k: string) => t(`checkin.${FLOW_KEY[k]}`, k);

  const flowQ = useMemo(() => {
    const flows = ["Spotting", "Light", "Moderate", "Heavy", "Very Heavy"];
    if (info.bleedingDay) return { text: t("checkin.flowPeriodQ", { day: info.bleedingDay }), options: ["Stopped", ...flows] };
    if (info.late) {
      const d = info.daysLate;
      return { text: t("checkin.flowDueQ", { days: d === 1 ? t("common.yesterday") : `${d} ${t("common.days")}` }), options: ["Not yet", ...flows] };
    }
    if (phase === "menstrual" || info.daysUntilPeriod <= 2) return { text: t("checkin.flowNearQ"), options: ["Not yet", ...flows] };
    return { text: t("checkin.flowDefaultQ"), options: ["No", "Spotting", "Light", "Moderate", "Heavy"] };
  }, [info, phase, t]);

  const bleeding = isBleeding(flow);
  const painHint = phase === "ovulatory" ? t("checkin.painHintOvulatory") : phase === "luteal" && info.daysUntilPeriod <= 5 ? t("checkin.painHintLuteal") : null;
  const PAIN = [
    { label: t("checkin.painNone"), value: 0 },
    { label: t("checkin.painMild"), value: 2 },
    { label: t("checkin.painModerate"), value: 5 },
    { label: t("checkin.painStrong"), value: 8 },
  ];
  const MOODS = [
    { label: t("checkin.moodCalm"), val: "Calm" },
    { label: t("checkin.moodEnergetic"), val: "Energetic" },
    { label: t("checkin.moodHappy"), val: "Happy" },
    { label: t("checkin.moodFatigued"), val: "Fatigued" },
    { label: t("checkin.moodAnxious"), val: "Anxious" },
    { label: t("checkin.moodIrritable"), val: "Irritable" },
    { label: t("checkin.moodSad"), val: "Sad" },
  ];
  const symptomList = showAll ? ALL_SYMPTOMS : SYMPTOMS_BY_PHASE[phase];

  const toggleSymptom = (sym: string) => {
    if (sym === "None") return setSymptoms(["None"]);
    setSymptoms((prev) => {
      const rest = prev.filter((s) => s !== "None");
      return rest.includes(sym) ? rest.filter((s) => s !== sym) : [...rest, sym];
    });
  };

  const submit = () => {
    setDone(true);
    successHaptic();
    const flowValue = !flow || NO_BLEED.has(flow) ? "None" : flow;
    const syms = symptoms.filter((s) => s !== "None");
    if ((pain ?? 0) > 0 && !syms.includes("Cramps") && (bleeding || (pain ?? 0) >= 5)) syms.push("Cramps");
    setTimeout(
      () =>
        onComplete({
          onPeriod: bleeding ? "Yes" : "No",
          flowIntensity: flowValue,
          crampsSeverity: pain ?? 0,
          symptoms: syms.length ? syms : ["None"],
          mood: mood || "Calm",
          sleepHours: sleep,
          weight: null,
        }),
      1200,
    );
  };

  const flowMsg = flow ? (NO_BLEED.has(flow) ? (flow === "Stopped" ? t("checkin.flowStoppedMsg") : t("checkin.flowNoBleedMsg")) : `${t("checkin.flowPrefix")} ${flowLabel(flow)}`) : "";

  return (
    <Panel style={{ borderColor: "rgba(251,207,232,0.8)" }}>
      <PanelTitle eyebrow={t("checkin.eyebrow", "Daily check-in")} title={t("checkin.title", "How are you today?")} icon={Sparkle} iconColor={palette.pink500} />
      <View style={{ marginTop: 14, gap: 4 }}>
        <Bot>{`${t("checkin.greeting", { name })} ${flowQ.text}`}</Bot>
        {step === "flow" && !done ? (
          <Chips>
            {flowQ.options.map((o) => (
              <ChipBtn key={o} label={flowLabel(o)} on={flow === o} onPress={() => { setFlow(o); next(); }} />
            ))}
          </Chips>
        ) : flow ? <Me>{flowMsg}</Me> : null}

        {stepIdx >= 1 ? (
          <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 4 }}>
            <Bot hint={!bleeding ? painHint : null}>{bleeding ? t("checkin.painBleedingQ") : t("checkin.painNonBleedingQ")}</Bot>
            {step === "pain" && !done ? (
              bleeding ? (
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: "row", gap: 3 }} accessibilityLabel="Cramp strength, 0 to 10">
                    {Array.from({ length: 11 }, (_, n) => {
                      const on = (pain ?? -1) >= n && n > 0;
                      const sel = pain === n;
                      return (
                        <PressableScale key={n} onPress={() => setPain(n)} scaleTo={0.9} accessibilityLabel={`${n} out of 10`} accessibilityState={{ selected: sel }}
                          style={{ flex: 1, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: sel ? palette.pink500 : on ? palette.pink200 : "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: sel ? palette.pink500 : ink[10] }}>
                          <AppText style={{ fontSize: 12, fontWeight: "600", color: sel ? "#fff" : palette.plum900 }}>{n}</AppText>
                        </PressableScale>
                      );
                    })}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <AppText style={{ fontSize: 11, color: ink[60] }}>{t("checkin.painZero")}</AppText>
                    <AppText style={{ fontSize: 11, color: ink[60] }}>{t("checkin.painTen")}</AppText>
                  </View>
                  <NextBtn label={t("common.next")} onPress={() => { if (pain === null) setPain(0); setStepIdx((i) => i + 1); }} />
                </View>
              ) : (
                <Chips>
                  {PAIN.map((c) => (
                    <ChipBtn key={c.label} label={c.label} on={pain === c.value} onPress={() => { setPain(c.value); next(); }} />
                  ))}
                </Chips>
              )
            ) : pain !== null ? <Me>{pain === 0 ? t("checkin.painNoPain") : `${t("checkin.painPrefix")} ${pain}/10`}</Me> : null}
          </Animated.View>
        ) : null}

        {stepIdx >= 2 ? (
          <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 4 }}>
            <Bot>{t("checkin.moodQ")}</Bot>
            {step === "mood" && !done ? (
              <Chips>
                {MOODS.map((o) => (
                  <ChipBtn key={o.val} label={o.label} on={mood === o.val} onPress={() => { setMood(o.val); next(); }} />
                ))}
              </Chips>
            ) : mood ? <Me>{`${t("checkin.moodPrefix")} ${MOODS.find((m) => m.val === mood)?.label || mood}`}</Me> : null}
          </Animated.View>
        ) : null}

        {stepIdx >= 3 ? (
          <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 4 }}>
            <Bot>{t("checkin.sleepQ")}</Bot>
            {step === "sleep" && !done ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 6, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: ink[10] }}>
                  <RoundStep label="Less sleep" onPress={() => setSleep((h) => Math.max(3, h - 0.5))}><Minus size={16} color={palette.plum900} weight="bold" /></RoundStep>
                  <AppText style={{ fontSize: 18, fontWeight: "600", color: palette.plum900 }} accessibilityLiveRegion="polite">{t("checkin.sleepHrs", { hours: sleep })}</AppText>
                  <RoundStep label="More sleep" onPress={() => setSleep((h) => Math.min(12, h + 0.5))}><Plus size={16} color={palette.plum900} weight="bold" /></RoundStep>
                </View>
                <NextBtn label={t("common.next")} onPress={() => setStepIdx((i) => i + 1)} />
              </View>
            ) : <Me>{`${t("checkin.sleepPrefix")} ${t("checkin.sleepHrs", { hours: sleep })}`}</Me>}
          </Animated.View>
        ) : null}

        {stepIdx >= 4 && !done ? (
          <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 6 }}>
            <Bot>{t("checkin.symptomsQ")}</Bot>
            <Chips>
              {[...symptomList, "None"].map((s) => (
                <ChipBtn key={s} label={t(`checkin.${SYM_KEY[s]}`, s)} on={symptoms.includes(s)} pink onPress={() => toggleSymptom(s)} />
              ))}
            </Chips>
            {!showAll ? (
              <PressableScale onPress={() => setShowAll(true)} style={{ alignSelf: "flex-end", minHeight: 36, justifyContent: "center" }}>
                <AppText style={{ fontSize: 12, color: ink[60], textDecorationLine: "underline" }}>{t("checkin.moreSymptoms")}</AppText>
              </PressableScale>
            ) : null}
            <PressableScale onPress={submit} style={{ alignSelf: "flex-end", flexDirection: "row", gap: 6, alignItems: "center", minHeight: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: palette.plum900 }}>
              <CheckCircle size={16} color="#fff" weight="bold" />
              <AppText style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>{t("checkin.completeCheckIn")}</AppText>
            </PressableScale>
          </Animated.View>
        ) : null}

        {done ? (
          <Animated.View entering={ZoomIn.duration(240)} style={{ flexDirection: "row", gap: 8, alignItems: "center", alignSelf: "flex-start", maxWidth: "92%", padding: 12, borderRadius: 16, borderTopLeftRadius: 4, backgroundColor: TW.emerald[50], borderWidth: 1, borderColor: TW.emerald[200] }}>
            <Sparkle size={16} color={TW.emerald[500]} weight="fill" />
            <AppText style={{ flexShrink: 1, fontSize: 14, color: TW.emerald[900] }}>{bleeding && !info.bleedingDay ? t("checkin.loggedNewCycle") : t("checkin.loggedThanks")}</AppText>
          </Animated.View>
        ) : null}
      </View>
    </Panel>
  );
}

function Bot({ children, hint }: { children: string; hint?: string | null }) {
  return (
    <View style={{ alignSelf: "flex-start", maxWidth: "92%", padding: 12, borderRadius: 16, borderTopLeftRadius: 4, backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: ink[7], marginBottom: 4 }}>
      <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>{children}</AppText>
      {hint ? <AppText style={{ marginTop: 4, fontSize: 12, color: ink[55] }}>{hint}</AppText> : null}
    </View>
  );
}
function Me({ children }: { children: string }) {
  return (
    <View style={{ alignSelf: "flex-end", maxWidth: "85%", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderTopRightRadius: 4, backgroundColor: palette.pink100, marginBottom: 6 }}>
      <AppText style={{ fontSize: 13, fontWeight: "500", color: TW.pink[900] }}>{children}</AppText>
    </View>
  );
}
function Chips({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", marginBottom: 6 }}>{children}</View>;
}
function ChipBtn({ label, on, onPress, pink }: { label: string; on: boolean; onPress: () => void; pink?: boolean }) {
  const bg = on ? (pink ? palette.pink500 : palette.plum900) : "rgba(255,255,255,0.75)";
  return (
    <PressableScale onPress={onPress} scaleTo={0.95} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", backgroundColor: bg, borderWidth: 1, borderColor: on ? bg : ink[10] }}>
      <AppText style={{ fontSize: 13, fontWeight: "500", color: on ? "#fff" : palette.plum900 }}>{label}</AppText>
    </PressableScale>
  );
}
function NextBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={{ alignSelf: "flex-end", minHeight: 40, paddingHorizontal: 18, borderRadius: 20, justifyContent: "center", backgroundColor: palette.plum900 }}>
      <AppText style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>{label}</AppText>
    </PressableScale>
  );
}
function RoundStep({ children, label, onPress }: { children: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} scaleTo={0.9} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: ink[10] }}>
      {children}
    </PressableScale>
  );
}
