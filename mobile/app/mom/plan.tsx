import { Alert, View } from "react-native";

import { AppText } from "@/components/AppText";
import BabyGrowthCard from "@/components/mom/BabyGrowthCard";
import HospitalBagCard from "@/components/mom/HospitalBagCard";
import MealsCard from "@/components/mom/MealsCard";
import MilestonesCard from "@/components/mom/MilestonesCard";
import { BabyArrivedCard, PostnatalVisitsCard, VaccineCard } from "@/components/mom/Postpartum";
import { AppointmentTimeline } from "@/components/mom/PregnancyCharts";
import SchemesCard from "@/components/mom/SchemesCard";
import { ModeScroll } from "@/components/shared/ModeScroll";
import { PressableScale } from "@/components/ui";
import { Panel, PanelTitle, ink } from "@/components/web/Panel";
import { useMom } from "@/lib/momData";
import { MomTop } from "@/lib/momUi";
import { stageFor } from "@/lib/shared/meals";

export default function MomPlan() {
  const m = useMom();
  const { born, pp, weeks, profile, ppStage } = m;
  const resetMonth = () =>
    Alert.alert("Reset this month?", "Clear appointments and start fresh for this month.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", style: "destructive", onPress: () => void m.resetAppointments() },
    ]);

  return (
    <ModeScroll header={<MomTop />} loading={m.loading} refreshing={m.refreshing} onRefresh={() => void m.refresh()}>
      {born ? (
        <>
          <BabyGrowthCard pp={pp} dueDate={profile?.expected_due_date} />
          <MilestonesCard pp={pp} dueDate={profile?.expected_due_date} />
          <VaccineCard pp={pp} />
          <PostnatalVisitsCard pp={pp} />
        </>
      ) : (
        <Panel>
          <PanelTitle
            title="Appointments"
            subtitle={`${new Date().toLocaleString("default", { month: "long", year: "numeric" })} Schedule • Resets monthly`}
            right={
              m.appointments.length ? (
                <PressableScale onPress={resetMonth} style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 8 }}>
                  <AppText style={{ fontSize: 12, fontWeight: "500", color: ink[60] }}>Reset Month</AppText>
                </PressableScale>
              ) : undefined
            }
          />
          <View style={{ marginTop: 12 }}>
            <AppointmentTimeline appointments={m.appointments} onToggle={(i) => void m.toggleAppointment(i)} />
          </View>
        </Panel>
      )}
      <MealsCard stage={stageFor(born ? null : weeks, ppStage === "recovery" || ppStage === "infant")} />
      {!born && weeks >= 28 ? <HospitalBagCard weeks={weeks} /> : null}
      {!born && pp.loaded && weeks >= 22 ? <BabyArrivedCard pp={pp} compact /> : null}
      <SchemesCard />
    </ModeScroll>
  );
}
