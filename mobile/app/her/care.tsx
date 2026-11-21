import { useRouter } from "expo-router";

import AnaemiaCard from "@/components/her/AnaemiaCard";
import { CareLinksCard, PatternsCard } from "@/components/her/HerPanels";
import HygieneCard from "@/components/her/HygieneCard";
import PainTodayCard from "@/components/her/PainTodayCard";
import PcosCheckCard from "@/components/her/PcosCheckCard";
import { FamilyContactsCard } from "@/components/shared/FamilyAlert";
import LabResultsCard from "@/components/shared/LabResultsCard";
import { ModeScroll } from "@/components/shared/ModeScroll";
import MoodCheckCard from "@/components/shared/MoodCheckCard";
import NearbyHelpCard from "@/components/shared/NearbyHelpCard";
import TabletsCard from "@/components/shared/TabletsCard";
import { useHer } from "@/lib/herData";
import { HerTop } from "@/lib/herUi";

export default function HerCare() {
  const h = useHer();
  const router = useRouter();
  return (
    <ModeScroll header={<HerTop />} loading={h.loading} refreshing={h.refreshing} onRefresh={() => void h.refresh()}>
      <PatternsCard patterns={h.patterns} logCount={h.logs.length} />
      <CareLinksCard
        onOpenRelief={() => h.openRelief()}
        onOpenSettings={() => router.push({ pathname: "/settings", params: { mode: "her" } })}
        favourites={h.favourites}
      />
      <HygieneCard cycle={h.hygieneCycle} />
      <PainTodayCard logs={h.logs} onSaved={h.savePainLog} onOpenRelief={() => h.openRelief()} />
      <AnaemiaCard logs={h.logs} />
      <PcosCheckCard phase={h.phase} profile={h.profile} />
      <TabletsCard mode="her" />
      <LabResultsCard mode="her" pregnant={false} />
      <MoodCheckCard pregnant={false} />
      <FamilyContactsCard />
      <NearbyHelpCard mode="her" />
    </ModeScroll>
  );
}
