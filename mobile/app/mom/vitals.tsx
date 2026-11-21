import { Drop, Heartbeat } from "phosphor-react-native";

import { BabyMovementChart, BloodPressureChart, BloodSugarChart, MoodTrackerChart, PregnancySleepGraph } from "@/components/mom/PregnancyCharts";
import { ChartPanel, ModeScroll } from "@/components/shared/ModeScroll";
import WeightTracker from "@/components/shared/WeightTracker";
import { Panel, PanelTitle } from "@/components/web/Panel";
import { useMom } from "@/lib/momData";
import { MomTop } from "@/lib/momUi";
import { TW } from "@/lib/tw";
import { View } from "react-native";

export default function MomVitals() {
  const m = useMom();
  const { born, logs, weeks } = m;
  return (
    <ModeScroll header={<MomTop />} loading={m.loading} refreshing={m.refreshing} onRefresh={() => void m.refresh()}>
      <Panel>
        <PanelTitle title="Blood Pressure" icon={Heartbeat} iconColor={TW.red[400]} subtitle={born ? "BP can still rise in the first 6 weeks after birth. Check it if you get a headache or blurred vision." : "Monitoring for Preeclampsia Risk"} />
        <View style={{ marginTop: 14 }}>
          <BloodPressureChart data={logs} />
        </View>
      </Panel>
      <Panel>
        <PanelTitle title="Fasting Blood Sugar" icon={Drop} iconColor={TW.amber[500]} subtitle={born ? "If you had diabetes in pregnancy, get a sugar test 6 to 12 weeks after birth." : "Monitoring for Gestational Diabetes"} />
        <View style={{ marginTop: 14 }}>
          <BloodSugarChart data={logs} />
        </View>
      </Panel>
      <ChartPanel title="Weight">{born ? <WeightTracker mode="her" logs={logs} /> : <WeightTracker mode="pregnancy" logs={logs} weeks={weeks} />}</ChartPanel>
      {!born ? (
        <ChartPanel title="Fetal Movement Count">
          <BabyMovementChart data={logs} />
        </ChartPanel>
      ) : null}
      <ChartPanel title="Mood Tracker">
        <MoodTrackerChart data={logs} />
      </ChartPanel>
      <ChartPanel title="Sleep Graph">
        <PregnancySleepGraph data={logs} />
      </ChartPanel>
    </ModeScroll>
  );
}
