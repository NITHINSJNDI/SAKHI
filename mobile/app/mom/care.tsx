import { View } from "react-native";

import ContractionTimer from "@/components/mom/ContractionTimer";
import { DoctorSummaryLink, RiskCard } from "@/components/mom/MomPanels";
import { FamilyContactsCard } from "@/components/shared/FamilyAlert";
import LabResultsCard from "@/components/shared/LabResultsCard";
import { ModeScroll } from "@/components/shared/ModeScroll";
import MoodCheckCard from "@/components/shared/MoodCheckCard";
import NearbyHelpCard from "@/components/shared/NearbyHelpCard";
import { Panel, PanelTitle } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { useMom } from "@/lib/momData";
import { MomTop } from "@/lib/momUi";

export default function MomCare() {
  const m = useMom();
  const { t } = useT();
  const { born, weeks } = m;
  return (
    <ModeScroll header={<MomTop />} loading={m.loading} refreshing={m.refreshing} onRefresh={() => void m.refresh()}>
      <MoodCheckCard pregnant={!born} />
      <FamilyContactsCard />
      <NearbyHelpCard mode="pregnancy" />
      <LabResultsCard mode="pregnancy" pregnant={!born} />
      {!born && weeks < 28 ? (
        <Panel>
          <PanelTitle title={t("mom.contractionTitle", "Contraction timer")} subtitle="Tap when a contraction starts and again when it ends. Sakhi tracks how long and how far apart they are." />
          <View style={{ marginTop: 14 }}>
            <ContractionTimer weeks={weeks} />
          </View>
        </Panel>
      ) : null}
      {!born ? <RiskCard profile={m.profile} logs={m.logs} ml={m.ml} weeks={weeks} /> : null}
      <DoctorSummaryLink />
    </ModeScroll>
  );
}
