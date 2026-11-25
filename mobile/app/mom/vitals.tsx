import { Drop, Heartbeat } from "phosphor-react-native";

import { BabyMovementChart, BloodPressureChart, BloodSugarChart, MoodTrackerChart, PregnancySleepGraph } from "@/components/mom/PregnancyCharts";
import { ChartPanel, ModeScroll } from "@/components/shared/ModeScroll";
import WeightTracker from "@/components/shared/WeightTracker";
import { Panel, PanelTitle } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { useMom } from "@/lib/momData";
import { MomTop } from "@/lib/momUi";
import { TW } from "@/lib/tw";
import { View } from "react-native";

export default function MomVitals() {
  const { t } = useT();
  const m = useMom();
  const { born, logs, weeks } = m;
  return (
    <ModeScroll header={<MomTop />} loading={m.loading} refreshing={m.refreshing} onRefresh={() => void m.refresh()}>
      <Panel>
        <PanelTitle title={t("pregnancy.bloodPressure")} icon={Heartbeat} iconColor={TW.red[400]} subtitle={born ? "BP can still rise in the first 6 weeks after birth. Check it if you get a headache or blurred vision." : t("pregnancy.maternalVitals")} />
        <View style={{ marginTop: 14 }}>
          <BloodPressureChart data={logs} />
        </View>
      </Panel>
      <Panel>
        <PanelTitle title={t("pregnancy.fastingGlucose")} icon={Drop} iconColor={TW.amber[500]} subtitle={born ? "If you had diabetes in pregnancy, get a sugar test 6 to 12 weeks after birth." : t("pregnancy.maternalVitals")} />
        <View style={{ marginTop: 14 }}>
          <BloodSugarChart data={logs} />
        </View>
      </Panel>
      <ChartPanel title={t("charts.weightTrend")}>{born ? <WeightTracker mode="her" logs={logs} /> : <WeightTracker mode="pregnancy" logs={logs} weeks={weeks} />}</ChartPanel>
      {!born ? (
        <ChartPanel title={t("pregnancy.kickCount")}>
          <BabyMovementChart data={logs} />
        </ChartPanel>
      ) : null}
      <ChartPanel title={t("charts.moodTracker")}>
        <MoodTrackerChart data={logs} />
      </ChartPanel>
      <ChartPanel title={t("charts.sleepGraph")}>
        <PregnancySleepGraph data={logs} />
      </ChartPanel>
    </ModeScroll>
  );
}
