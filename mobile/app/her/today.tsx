import { useRouter } from "expo-router";
import { ChatCircleDots, Sparkle } from "phosphor-react-native";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import CheckInChat from "@/components/her/CheckInChat";
import GoalCard from "@/components/her/GoalCard";
import { PainNowCard, PhaseCard, PmsForecastCard, TodayTipsCard } from "@/components/her/HerPanels";
import HygieneCard from "@/components/her/HygieneCard";
import PainTodayCard from "@/components/her/PainTodayCard";
import PregnancyTestCard from "@/components/her/PregnancyTestCard";
import { ModeScroll } from "@/components/shared/ModeScroll";
import { PressableScale } from "@/components/ui";
import { Panel, ink } from "@/components/web/Panel";
import { useHer } from "@/lib/herData";
import { HerTop } from "@/lib/herUi";
import { useT } from "@/lib/i18n";
import { palette } from "@/theme";

export default function HerToday() {
  const h = useHer();
  const { t } = useT();
  const router = useRouter();
  const { phase, ctx, goal, profile } = h;
  const irregular =
    profile?.cycle_regularity === "No" || profile?.cycle_regularity === "Irregular" || JSON.stringify(profile?.diagnosed_conditions || "").toLowerCase().includes("pcos");
  const showPregTest = phase.late || (goal.doc.goal === "ttc" && phase.cycleDay >= phase.cycleLength + 1);

  return (
    <ModeScroll header={<HerTop />} loading={h.loading} refreshing={h.refreshing} onRefresh={() => void h.refresh()}>
      {showPregTest ? <PregnancyTestCard lastStart={phase.lastStart} daysLate={phase.daysLate} name={h.displayName} /> : null}
      {h.checkInDue ? <CheckInChat phase={phase} name={h.displayName} onComplete={(d) => void h.completeCheckIn(d)} /> : null}
      <PhaseCard info={phase} onPeriodStarted={(d) => void h.markPeriodStarted(d)} saving={h.savingPeriod} />
      <PainNowCard onOpen={() => h.openRelief(ctx.pain && ctx.pain > 0 ? ctx.pain : null)} todayPain={ctx.pain || 0} />
      {!h.checkInDue ? (
        <PressableScale
          onPress={() => router.push({ pathname: "/chat", params: { mode: "her", name: h.displayName, phase: phase.phase, bleeding: phase.bleedingDay ? "1" : "0", late: phase.late ? "1" : "0", daysLate: String(phase.daysLate) } })}
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={t("chat.askSakhi", "Ask Sakhi")}
        >
          <Panel style={{ flexDirection: "row", alignItems: "center", gap: 14, borderColor: "rgba(251,207,232,0.9)" }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: palette.pink100, alignItems: "center", justifyContent: "center" }}>
              <Sparkle size={26} color={palette.pink500} weight="duotone" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 17, fontWeight: "600", color: palette.plum900 }}>{t("chat.emptyGreeting", { name: h.displayName })}</AppText>
              <AppText style={{ marginTop: 2, fontSize: 13, lineHeight: 18, color: ink[60] }}>{t("chat.askHerMobile", "Ask about your cycle, cramps or anything on your mind.")}</AppText>
            </View>
            <ChatCircleDots size={24} color={palette.pink500} weight="fill" />
          </Panel>
        </PressableScale>
      ) : null}
      <TodayTipsCard tips={h.tips} adapted={Boolean(ctx.lowEnergy || ctx.poorSleep || (ctx.pain ?? 0) >= 5)} />
      {h.periodNear ? <HygieneCard cycle={h.hygieneCycle} /> : null}
      <PainTodayCard logs={h.logs} onSaved={h.savePainLog} onOpenRelief={() => h.openRelief()} />
      <PmsForecastCard forecast={h.forecast} />
      <GoalCard goal={goal} cycle={{ phase, profile, logs: h.logs, cycleHistory: h.cycleHistory, irregular }} />
    </ModeScroll>
  );
}
