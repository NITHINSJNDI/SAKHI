/** Port of frontend/components/MoodCheckCard.tsx: two-weekly PHQ-4 + safety question, Tele-MANAS when it matters. */
import { Heart, Phone } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { atom, PillButton } from "@/components/web/Atoms";
import { Panel, PanelTitle } from "@/components/web/Panel";
import { emitEmergency } from "@/lib/events";
import { selectHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { call } from "@/lib/links";
import { ANSWERS, bandOf, EMPTY_MOOD, MOOD_QUESTIONS, moodDue, moodMessage, scoreMood, type MoodDoc } from "@/lib/shared/mood";
import { TW } from "@/lib/tw";
import { dayKey, useUserDoc } from "@/lib/useUserDoc";
import { palette } from "@/theme";

const BAR: Record<string, string> = { ok: TW.emerald[400], mild: TW.amber[300], moderate: "#FB923C", severe: TW.rose[500] };
const shortDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function MoodCheckCard({ pregnant }: { pregnant: boolean }) {
  const { t } = useT();
  const { doc, save, loaded } = useUserDoc<MoodDoc>("mood_checks", EMPTY_MOOD);
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>(MOOD_QUESTIONS.map(() => null));
  const today = dayKey();
  const { last, due, daysUntil } = moodDue(doc, today);
  const result = last ? moodMessage(last, pregnant) : null;
  const history = [...doc.checks].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);

  const submit = () => {
    if (answers.some((a) => a === null)) return;
    const check = scoreMood(answers as number[], today);
    void save((d) => ({ checks: [...d.checks.filter((c) => c.date !== today), check].sort((a, b) => a.date.localeCompare(b.date)).slice(-26) }));
    setOpen(false);
    setAnswers(MOOD_QUESTIONS.map(() => null));
    if (check.harm) emitEmergency("self-harm");
  };

  return (
    <Panel>
      <PanelTitle icon={Heart} iconColor={palette.blush500} title={t("moodCheck.title")} />
      {loaded && !open ? (
        <PillButton
          label={due ? (last ? t("moodCheck.timeForCheckIn") : t("moodCheck.take1MinCheck")) : t("moodCheck.checkInAgain")}
          variant={due ? "primary" : "secondary"}
          onPress={() => setOpen(true)}
          style={{ marginTop: 12 }}
        />
      ) : null}

      {open ? (
        <View style={{ marginTop: 12, gap: 16 }}>
          <AppText style={atom.soft}>Over the last 2 weeks, how often have you been bothered by…</AppText>
          {MOOD_QUESTIONS.map((q, i) => (
            <View key={q.id} style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={q.text}>
              <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{q.text}</AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {ANSWERS.map((label, v) => {
                  const on = answers[i] === v;
                  return (
                    <PressableScale
                      key={label}
                      haptic={false}
                      scaleTo={0.96}
                      onPress={() => {
                        selectHaptic();
                        setAnswers((a) => a.map((x, j) => (j === i ? v : x)));
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={{ flexBasis: "47%", flexGrow: 1, borderRadius: 12, borderWidth: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, backgroundColor: on ? palette.plum900 : "#fff", borderColor: on ? palette.plum900 : "rgba(42,21,47,0.12)" }}
                    >
                      <AppText style={{ fontSize: 12, fontWeight: "500", textAlign: "center", color: on ? palette.cream : palette.plum900 }}>{label}</AppText>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <PillButton label="See how I'm doing" onPress={submit} disabled={answers.some((a) => a === null)} />
            <PillButton label="Not now" variant="ghost" onPress={() => setOpen(false)} />
          </View>
          <AppText style={atom.faint}>Your answers stay private to you. This is a short screening, not a diagnosis.</AppText>
        </View>
      ) : result && last ? (
        <View style={{ marginTop: 12 }}>
          <AppText style={{ fontSize: 16, fontWeight: "500", color: palette.plum900 }}>{result.title}</AppText>
          <AppText style={[atom.soft, { marginTop: 4 }]}>{result.body}</AppText>
          {result.urgent || last.harm || ["moderate", "severe"].includes(bandOf(last.total)) ? (
            <View style={[atom.wrap, { marginTop: 12 }]}>
              <PillButton label="Call Tele-MANAS 14416" icon={Phone} onPress={() => void call("14416")} />
              {last.harm ? <PillButton label="Call 112" variant="rose" onPress={() => void call("112")} /> : null}
            </View>
          ) : null}
          {history.length > 1 ? (
            <View style={{ marginTop: 16 }}>
              <AppText style={[atom.small, { marginBottom: 8 }]}>Your last check-ins (shorter bar is better)</AppText>
              <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 72 }} accessibilityLabel="Mood check history">
                {history.map((c) => (
                  <View key={c.date} style={{ flex: 1, alignItems: "center", gap: 4 }} accessible accessibilityLabel={`${shortDate(c.date)}: score ${c.total} of 12`}>
                    <View style={{ width: "100%", maxWidth: 32, borderTopLeftRadius: 6, borderTopRightRadius: 6, height: Math.max(8, (c.total / 12) * 48), backgroundColor: BAR[bandOf(c.total)] }} />
                    <AppText style={{ fontSize: 10, color: "rgba(42,21,47,0.45)" }}>{shortDate(c.date)}</AppText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {!due ? (
            <AppText style={[atom.faint, { marginTop: 12 }]}>
              Next check-in in {daysUntil} {daysUntil === 1 ? "day" : "days"}.
            </AppText>
          ) : null}
        </View>
      ) : (
        <AppText style={[atom.soft, { marginTop: 12 }]}>{t("moodCheck.description")}</AppText>
      )}
    </Panel>
  );
}
