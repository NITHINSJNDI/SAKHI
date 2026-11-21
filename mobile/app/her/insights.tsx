import { MoodCycleChart, PainTrendChart, SleepHoursChart, SymptomFrequencyChart } from "@/components/her/HerCharts";
import { PhaseInsightsCard } from "@/components/her/HerPanels";
import { ChartPanel, ModeScroll } from "@/components/shared/ModeScroll";
import WeightTracker from "@/components/shared/WeightTracker";
import { useHer } from "@/lib/herData";
import { HerTop } from "@/lib/herUi";
import { useT } from "@/lib/i18n";

export default function HerInsights() {
  const h = useHer();
  const { t } = useT();
  return (
    <ModeScroll header={<HerTop />} loading={h.loading} refreshing={h.refreshing} onRefresh={() => void h.refresh()}>
      <PhaseInsightsCard stats={h.stats} highlights={h.highlights} />
      <ChartPanel title={t("cycle.commonSymptoms")}>
        <SymptomFrequencyChart data={h.logs} />
      </ChartPanel>
      <ChartPanel title={t("cycle.moodAcrossCycle")}>
        <MoodCycleChart data={h.logs} />
      </ChartPanel>
      <ChartPanel title={t("cycle.painTrend")}>
        <PainTrendChart data={h.logs} />
      </ChartPanel>
      <ChartPanel title={t("cycle.sleepHours")}>
        <SleepHoursChart data={h.logs} />
      </ChartPanel>
      <ChartPanel title={t("cycle.weight")}>
        <WeightTracker mode="her" logs={h.logs} />
      </ChartPanel>
    </ModeScroll>
  );
}
