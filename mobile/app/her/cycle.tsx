import FertilityCalendar from "@/components/her/FertilityCalendar";
import { CycleLengthChart, FlowIntensityChart, PeriodDurationChart } from "@/components/her/HerCharts";
import NextPeriodCard from "@/components/her/NextPeriodCard";
import { ChartPanel, ModeScroll } from "@/components/shared/ModeScroll";
import { useHer } from "@/lib/herData";
import { HerTop } from "@/lib/herUi";
import { useT } from "@/lib/i18n";

export default function HerCycle() {
  const h = useHer();
  const { t } = useT();
  return (
    <ModeScroll header={<HerTop />} loading={h.loading} refreshing={h.refreshing} onRefresh={() => void h.refresh()}>
      <ChartPanel title={h.goal.doc.goal === "ttc" ? t("cycle.fertilityCalendar") : t("cycle.cycleCalendar")}>
        <FertilityCalendar phase={h.phase} profile={h.profile} logs={h.logs} cycleHistory={h.cycleHistory} tried={h.goal.doc.intimacy} trying={h.goal.doc.goal === "ttc"} />
      </ChartPanel>
      <NextPeriodCard phase={h.phase} profile={h.profile} logs={h.logs} cycleHistory={h.cycleHistory} />
      <ChartPanel title={t("cycle.cycleLengthTrend")}>
        <CycleLengthChart data={h.cycleHistory} />
      </ChartPanel>
      <ChartPanel title={t("cycle.periodDurationTrend")}>
        <PeriodDurationChart data={h.cycleHistory} />
      </ChartPanel>
      <ChartPanel title={t("cycle.flowIntensity")}>
        <FlowIntensityChart data={h.logs} />
      </ChartPanel>
    </ModeScroll>
  );
}
