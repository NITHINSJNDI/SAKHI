import { useRouter } from "expo-router";
import { ChatCircleDots, Sparkle } from "phosphor-react-native";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import ContractionTimer from "@/components/mom/ContractionTimer";
import MomCheckIn from "@/components/mom/MomCheckIn";
import { LatestVitalsCard, WeekCard } from "@/components/mom/MomPanels";
import { BabyArrivedCard, BabyHeader, BackToHerCard, NewbornCard, RecoveryCard } from "@/components/mom/Postpartum";
import { ModeScroll } from "@/components/shared/ModeScroll";
import TabletsCard from "@/components/shared/TabletsCard";
import { PressableScale } from "@/components/ui";
import { Panel, PanelTitle, ink } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { useMom } from "@/lib/momData";
import { MomTop } from "@/lib/momUi";
import { palette } from "@/theme";

export default function MomToday() {
  const m = useMom();
  const { t } = useT();
  const router = useRouter();
  const { born, ppStage, weeks, pp } = m;

  return (
    <ModeScroll header={<MomTop />} loading={m.loading} refreshing={m.refreshing} onRefresh={() => void m.refresh()}>
      {m.checkInDue ? <MomCheckIn name={m.displayName} onComplete={(d) => void m.completeCheckIn(d)} /> : null}
      {born ? (
        <>
          <BabyHeader pp={pp} />
          {ppStage === "recovery" || ppStage === "infant" ? <NewbornCard pp={pp} /> : null}
          {ppStage === "recovery" ? <RecoveryCard pp={pp} /> : null}
          {ppStage !== "recovery" ? <BackToHerCard pp={pp} name={m.displayName} /> : null}
        </>
      ) : (
        <WeekCard weeks={weeks} daysToGo={m.daysToGo} />
      )}
      {!born && pp.loaded && (weeks >= 36 || (m.daysToGo !== null && m.daysToGo <= 21)) ? <BabyArrivedCard pp={pp} compact /> : null}
      <LatestVitalsCard logs={m.logs} afterBirth={born} onOpenVitals={() => router.navigate("/mom/vitals")} />
      {!m.checkInDue ? (
        <PressableScale onPress={() => router.push({ pathname: "/chat", params: { mode: "pregnancy", name: m.displayName, afterBirth: born ? "1" : "0", baby: pp.doc.baby_name || "" } })} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={t("chat.askSakhi", "Ask Sakhi")}>
          <Panel style={{ flexDirection: "row", alignItems: "center", gap: 14, borderColor: "rgba(221,214,254,0.9)" }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: palette.lavender100, alignItems: "center", justifyContent: "center" }}>
              <Sparkle size={26} color={palette.lavender600} weight="duotone" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 17, fontWeight: "600", color: palette.plum900 }}>{t("chat.emptyGreeting", { name: m.displayName })}</AppText>
              <AppText style={{ marginTop: 2, fontSize: 13, lineHeight: 18, color: ink[60] }}>{born ? "Ask about feeds, sleep, your recovery or anything that worries you." : t("chat.askMomMobile", "Ask about your pregnancy, your baby or how you feel today.")}</AppText>
            </View>
            <ChatCircleDots size={24} color={palette.lavender600} weight="fill" />
          </Panel>
        </PressableScale>
      ) : null}
      {!born && weeks >= 28 ? (
        <Panel>
          <PanelTitle title={t("mom.contractionTitle")} subtitle={t("pregnancy.contractionHint")} />
          <View style={{ marginTop: 14 }}>
            <ContractionTimer weeks={weeks} />
          </View>
        </Panel>
      ) : null}
      <TabletsCard mode="pregnancy" weeks={weeks} />
    </ModeScroll>
  );
}
