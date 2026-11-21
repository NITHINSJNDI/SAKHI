/**
 * Port of frontend/components/her/PregnancyTestCard.tsx: the way from Her Mode into
 * Mom Mode, shown when her period is late. A positive test starts Mom Mode with the
 * due date worked out from her last period.
 */
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Baby, TestTube } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { atom, InfoBox, PillButton, ToggleChip } from "@/components/web/Atoms";
import { DateField } from "@/components/web/DateField";
import { Panel, PanelTitle } from "@/components/web/Panel";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useMode } from "@/lib/mode";
import { dayToIso } from "@/lib/shared/cyclePhase";
import { EMPTY_GOAL, type GoalDoc } from "@/lib/shared/herGoal";
import { dueFromLmp, gestation, todayIso } from "@/lib/shared/pregnancyWeeks";
import { TW } from "@/lib/tw";
import { useUserDoc } from "@/lib/useUserDoc";
import { palette } from "@/theme";

export default function PregnancyTestCard({ lastStart, daysLate, name }: { lastStart: number; daysLate: number; name: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { refreshSession } = useAuth();
  const { setMode } = useMode();
  const { t, fmtDate } = useT();
  const { doc, save } = useUserDoc<GoalDoc>("her_goal", EMPTY_GOAL);
  const [answer, setAnswer] = useState<"positive" | "negative" | "notyet" | null>(null);
  const [lmp, setLmp] = useState(dayToIso(lastStart));
  const [firstBaby, setFirstBaby] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayIso();
  const lastNegative = (doc.tests || []).filter((x) => x.result === "negative").pop();
  const due = dueFromLmp(lmp);
  const g = gestation({ expected_due_date: due }, today);
  const lmpOk = lmp <= today && lmp >= dayToIso(lastStart - 120);

  const record = (result: "positive" | "negative") =>
    save((d) => ({ ...d, tests: [...(d.tests || []).filter((x) => x.date !== today), { date: today, result }].slice(-20) }));

  const startMomMode = async () => {
    if (!lmpOk) return setError("Pick the first day of your last period.");
    setBusy(true);
    setError(null);
    void record("positive");
    try {
      await apiFetch("/api/update-profile", {
        method: "POST",
        body: JSON.stringify({
          mode: "pregnancy",
          resetData: true,
          profile: {
            preferred_name: name,
            last_period_start: lmp,
            expected_due_date: due,
            weeks_pregnant: g.weeks,
            pregnancy_experience: firstBaby === false ? "Experienced Mother" : "First-time Mother",
            maternal_conditions: ["None"],
            primary_goal: "Tracking Baby Growth & Fetal Movement",
            started_from: "her_mode",
          },
        }),
      });
    } catch {
      setBusy(false);
      return setError("Couldn't start Mom Mode. Check your connection and try again.");
    }
    await setMode("pregnancy");
    await refreshSession();
    await qc.invalidateQueries();
    router.replace("/mom/today");
  };

  return (
    <Panel>
      <PanelTitle
        icon={TestTube}
        iconColor={palette.lavender500}
        title={daysLate > 0 ? t("pregnancyTest.periodLate").replace("{count}", String(daysLate)) : t("pregnancyTest.couldBePregnant")}
        subtitle={t("pregnancyTest.testReliableDesc")}
      />
      <View style={{ marginTop: 16, gap: 8 }}>
        <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{t("pregnancyTest.didYouTakeTest")}</AppText>
        <View style={atom.wrap}>
          <ToggleChip label={t("pregnancyTest.yesPositive")} on={answer === "positive"} onPress={() => setAnswer("positive")} />
          <ToggleChip
            label={t("pregnancyTest.yesNegative")}
            on={answer === "negative"}
            onPress={() => {
              setAnswer("negative");
              void record("negative");
            }}
          />
          <ToggleChip label={t("pregnancyTest.notYet")} on={answer === "notyet"} onPress={() => setAnswer("notyet")} />
        </View>
      </View>

      {answer === "notyet" ? (
        <InfoBox style={{ marginTop: 16, paddingHorizontal: 16 }}>
          <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>{t("pregnancyTest.takeInMorning")}</AppText>
        </InfoBox>
      ) : null}
      {answer === "negative" ? (
        <InfoBox style={{ marginTop: 16, paddingHorizontal: 16 }}>
          <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>
            {lastNegative && lastNegative.date < today ? t("pregnancyTest.negativeTwice") : t("pregnancyTest.negativeEarly")}
          </AppText>
        </InfoBox>
      ) : null}

      {answer === "positive" ? (
        <View style={{ marginTop: 16, gap: 16, borderRadius: 16, backgroundColor: "rgba(236,253,245,0.7)", padding: 16 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Baby size={24} color={TW.emerald[600]} weight="duotone" />
            <View style={{ flex: 1, gap: 4 }}>
              <AppText style={atom.strong}>{t("pregnancyTest.congratsTitle").replace("{name}", name || "")}</AppText>
              <AppText style={atom.soft}>{t("pregnancyTest.switchMomDesc")}</AppText>
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <DateField label={t("pregnancyTest.firstDayLastPeriod")} value={lmp} max={today} onChange={setLmp} />
            {lmpOk ? (
              <AppText style={atom.small}>
                {g.weeks} {t("pregnancy.weeksPregnant")} · {t("pregnancy.dueAround", { date: fmtDate(due, { day: "numeric", month: "long", year: "numeric" }) })}
              </AppText>
            ) : null}
          </View>
          <View style={{ gap: 6 }}>
            <AppText style={{ fontSize: 14, fontWeight: "500", color: palette.plum900 }}>{t("pregnancyTest.firstPregnancyQ")}</AppText>
            <View style={atom.wrap}>
              <ToggleChip label={t("common.yes")} on={firstBaby === true} onPress={() => setFirstBaby(true)} />
              <ToggleChip label={t("common.no")} on={firstBaby === false} onPress={() => setFirstBaby(false)} />
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>• {t("pregnancyTest.registerAsha")}</AppText>
            <AppText style={{ fontSize: 14, lineHeight: 20, color: palette.plum900 }}>• {t("pregnancyTest.takeFolicDaily")}</AppText>
            <AppText style={{ fontSize: 14, lineHeight: 20, color: TW.rose[700] }}>• {t("pregnancyTest.emergencyHospitalWarning")}</AppText>
          </View>
          {error ? (
            <AppText accessibilityRole="alert" style={{ fontSize: 14, color: TW.rose[700] }}>
              {error}
            </AppText>
          ) : null}
          <PillButton label={busy ? t("pregnancyTest.startingMomMode") : t("pregnancyTest.startMomMode")} onPress={() => void startMomMode()} busy={busy} />
        </View>
      ) : null}
    </Panel>
  );
}
