/**
 * Port of frontend/components/PregnancyDailyCheckIn.tsx: baby movement, BP,
 * sugar, mood, sleep and symptoms as a short chat. One difference from the
 * web: "did not measure" saves no reading instead of a made-up normal one, so
 * the risk check never scores numbers she didn't enter.
 */
import { CheckCircle, Sparkle } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { AppText } from "@/components/AppText";
import { useT } from "@/lib/i18n";
import { PressableScale } from "@/components/ui";
import { Panel, PanelTitle, ink } from "@/components/web/Panel";
import { successHaptic } from "@/lib/haptics";
import { TW } from "@/lib/tw";
import { dayKey } from "@/lib/useUserDoc";
import { palette } from "@/theme";

 
const MOVEMENT = ["Active & Kicking (5+ kicks)", "Normal Movement", "Gentle Flutters", "Less than usual", "Not felt yet / Early week"];
const BP = ["Normal (< 120/80 mmHg) ✅", "Slightly High (120-139) ⚠️", "High (≥ 140/90 mmHg) 🚨", "Did not measure today ⏱️"];
const SUGAR = ["Normal (< 95 mg/dL) ✅", "Slightly Elevated (95-125) ⚠️", "High (> 125 mg/dL) 🚨", "Did not test today ⏱️"];
const MOODS = ["Happy 😊", "Calm 😌", "Tired / Fatigued 🥱", "Anxious 😟", "Nauseous 🤢"];
const SLEEP = [5, 6, 7, 8, 9];
const SYMPTOMS = ["Nausea / Morning Sickness", "Swelling in Feet / Hands", "Lower Back Pain", "Heartburn / Acidity", "Severe Headache ⚠️", "Vision Changes ⚠️", "None"];

export default function MomCheckIn({ name, onComplete }: { name: string; onComplete: (data: any) => void }) {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [movement, setMovement] = useState<string | null>(null);
  const [bp, setBp] = useState<string | null>(null);
  const [sugar, setSugar] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [sleep, setSleep] = useState(8);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const go = (n: number) => setTimeout(() => setStep(n), 250);

  const toggle = (sym: string) => {
    if (sym === "None") return setSymptoms(["None"]);
    setSymptoms((prev) => {
      const next = prev.filter((s) => s !== "None");
      return next.includes(sym) ? next.filter((s) => s !== sym) : [...next, sym];
    });
  };

  const submit = () => {
    setStep(99);
    successHaptic();
    let sys: number | null = 118, dia: number | null = 76;
    if (bp?.includes("Slightly High")) [sys, dia] = [132, 86];
    else if (bp?.includes("High (≥ 140/90")) [sys, dia] = [146, 94];
    else if (!bp || bp.startsWith("Did not")) [sys, dia] = [null, null];
    let bs: number | null = 88;
    if (sugar?.includes("Slightly Elevated")) bs = 106;
    else if (sugar?.includes("High (> 125")) bs = 138;
    else if (!sugar || sugar.startsWith("Did not")) bs = null;
    const high = movement?.includes("Active");
    const low = movement?.includes("Less than usual");
    const notYet = movement?.startsWith("Not felt");
    const kicks = notYet ? null : { morning: low ? 1 : high ? 5 : 3, afternoon: low ? 1 : high ? 6 : 4, night: low ? 1 : high ? 5 : 3 };
    const emergency = symptoms.includes("Severe Headache ⚠️") || symptoms.includes("Vision Changes ⚠️") || Boolean(bp?.includes("High (≥ 140/90"));
    setTimeout(
      () =>
        onComplete({
          log_date: dayKey(),
          blood_pressure_systolic: sys,
          blood_pressure_diastolic: dia,
          blood_sugar: bs,
          baby_movement: kicks,
          mood: mood || "Calm",
          sleep_hours: sleep,
          symptoms: symptoms.length ? symptoms : ["None"],
          isEmergency: emergency,
        }),
      1500,
    );
  };

  return (
    <Panel style={{ borderColor: "rgba(221,214,254,0.9)" }}>
      <PanelTitle title={t("pregnancy.howAreYouToday")} icon={Sparkle} iconColor={palette.lavender500} />
      {step === 99 ? (
        <Animated.View entering={ZoomIn.duration(240)} style={{ alignItems: "center", paddingVertical: 20, gap: 6 }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: palette.pink100, alignItems: "center", justifyContent: "center" }}>
            <Sparkle size={24} color={palette.pink500} weight="duotone" />
          </View>
          <AppText style={{ fontSize: 15, fontWeight: "500", color: palette.plum900 }}>Thank you, {name}! 🌸</AppText>
          <AppText style={{ fontSize: 13, color: ink[60] }}>{t("pregnancy.logsUpdated")}</AppText>
        </Animated.View>
      ) : (
        <View style={{ marginTop: 14, gap: 4 }}>
          <Bot>{`Hi ${name} 👋! 🍼 Let's do your daily check-in. How active was your baby's movement today?`}</Bot>
          {step === 0 ? <Chips options={MOVEMENT} value={movement} onPick={(o) => { setMovement(o); go(1); }} /> : movement ? <Me>{`Baby Movement: ${movement}`}</Me> : null}

          {step >= 1 ? (
            <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 4 }}>
              <Bot>Did you measure your Blood Pressure today? 🩺 (Helps screen for Preeclampsia)</Bot>
              {step === 1 ? <Chips options={BP} value={bp} onPick={(o) => { setBp(o); go(2); }} /> : bp ? <Me>{`BP: ${bp}`}</Me> : null}
            </Animated.View>
          ) : null}

          {step >= 2 ? (
            <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 4 }}>
              <Bot>How are your Blood Sugar levels today? 🩸 (Monitors Gestational Diabetes)</Bot>
              {step === 2 ? <Chips options={SUGAR} value={sugar} onPick={(o) => { setSugar(o); go(3); }} /> : sugar ? <Me>{`Sugar: ${sugar}`}</Me> : null}
            </Animated.View>
          ) : null}

          {step >= 3 ? (
            <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 4 }}>
              <Bot>How is your mood and emotional wellness today? 🌸</Bot>
              {step === 3 ? <Chips options={MOODS} value={MOODS.find((m) => m.split(" ")[0] === mood) ?? null} onPick={(o) => { setMood(o.split(" ")[0]); go(4); }} /> : mood ? <Me>{`Mood: ${mood}`}</Me> : null}
            </Animated.View>
          ) : null}

          {step >= 4 ? (
            <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 4 }}>
              <Bot>How many hours of restful sleep did you get last night? 🌙</Bot>
              {step === 4 ? (
                <Chips options={SLEEP.map((h) => `${h} ${h === 9 ? "+ hrs" : "hrs"}`)} value={`${sleep} ${sleep === 9 ? "+ hrs" : "hrs"}`} onPick={(o) => { setSleep(parseInt(o, 10)); go(5); }} />
              ) : (
                <Me>{`Sleep: ${sleep} hours`}</Me>
              )}
            </Animated.View>
          ) : null}

          {step >= 5 ? (
            <Animated.View entering={FadeInDown.duration(260)} style={{ gap: 6 }}>
              <Bot>{t("pregnancy.anySymptomsToday")}</Bot>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
                {SYMPTOMS.map((s) => {
                  const on = symptoms.includes(s);
                  const warn = s.includes("⚠️");
                  const bg = on ? (warn ? TW.red[500] : palette.plum900) : "rgba(255,255,255,0.75)";
                  return (
                    <PressableScale key={s} onPress={() => toggle(s)} scaleTo={0.95} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", backgroundColor: bg, borderWidth: 1, borderColor: on ? bg : ink[10] }}>
                      <AppText style={{ fontSize: 13, fontWeight: "500", color: on ? "#fff" : palette.plum900 }}>{s}</AppText>
                    </PressableScale>
                  );
                })}
              </View>
              <PressableScale onPress={submit} style={{ alignSelf: "flex-end", marginTop: 6, flexDirection: "row", gap: 6, alignItems: "center", minHeight: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: palette.plum900 }}>
                <CheckCircle size={16} color="#fff" weight="bold" />
                <AppText style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>{t("pregnancy.completeCheckIn")}</AppText>
              </PressableScale>
            </Animated.View>
          ) : null}
        </View>
      )}
    </Panel>
  );
}

function Bot({ children }: { children: string }) {
  return (
    <View style={{ alignSelf: "flex-start", maxWidth: "92%", padding: 12, borderRadius: 16, borderTopLeftRadius: 4, backgroundColor: "rgba(255,255,255,0.85)", borderWidth: 1, borderColor: ink[7], marginBottom: 4 }}>
      <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>{children}</AppText>
    </View>
  );
}
function Me({ children }: { children: string }) {
  return (
    <View style={{ alignSelf: "flex-end", maxWidth: "85%", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderTopRightRadius: 4, backgroundColor: palette.lavender100, marginBottom: 6 }}>
      <AppText style={{ fontSize: 13, fontWeight: "500", color: palette.plum900 }}>{children}</AppText>
    </View>
  );
}
function Chips({ options, value, onPick }: { options: string[]; value: string | null; onPick: (o: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "flex-end", marginBottom: 6 }}>
      {options.map((o) => {
        const on = value === o;
        return (
          <PressableScale key={o} onPress={() => onPick(o)} scaleTo={0.95} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: "center", backgroundColor: on ? palette.plum900 : "rgba(255,255,255,0.75)", borderWidth: 1, borderColor: on ? palette.plum900 : ink[10] }}>
            <AppText style={{ fontSize: 13, fontWeight: "500", color: on ? "#fff" : palette.plum900 }}>{o}</AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}
