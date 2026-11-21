/** Port of frontend/components/her/NextPeriodCard.tsx: next period as a likely day and an 80% range. */
import { CalendarDots } from "phosphor-react-native";
import { useMemo } from "react";
import { View } from "react-native";

import { AppText } from "@/components/AppText";
import { ink, Panel, PanelTitle } from "@/components/web/Panel";
import { useT } from "@/lib/i18n";
import { detectPeriodStarts, recentCycleLengths, todayNum, type PhaseInfo } from "@/lib/shared/cyclePhase";
import { nextPeriod } from "@/lib/shared/ml/cycleForecast";
import { TW } from "@/lib/tw";
import { palette } from "@/theme";

 
const DAY = 86_400_000;

export default function NextPeriodCard({ phase, profile, logs, cycleHistory }: { phase: PhaseInfo; profile: any; logs: any[]; cycleHistory: any[] }) {
  const { meta, t } = useT();
  const fmt = (day: number) => new Date(day * DAY).toLocaleDateString(meta.bcp47 || "en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

  const f = useMemo(() => {
    const today = todayNum();
    const starts = detectPeriodStarts(logs, profile?.last_period_start || profile?.lastPeriodStart, (cycleHistory || []).map((h: any) => h?.start)).filter((x) => x <= today);
    const lengths = recentCycleLengths(starts, cycleHistory || []);
    const prior = Number(profile?.cycle_length_avg || profile?.cycle_length) || undefined;
    return nextPeriod(phase.lastStart, lengths, prior);
  }, [phase.lastStart, profile, logs, cycleHistory]);

  const today = todayNum();
  const conf =
    f.confidence === "high"
      ? { bg: TW.emerald[50], fg: TW.emerald[700], border: TW.emerald[200], text: t("cycle.confidenceHigh") }
      : f.confidence === "medium"
        ? { bg: TW.amber[50], fg: TW.amber[700], border: TW.amber[200], text: t("cycle.confidenceMedium") }
        : { bg: TW.slate[100], fg: TW.slate[600], border: TW.slate[200], text: t("cycle.confidenceLow") };
  const inWindow = today >= f.earliestDay && today <= f.latestDay;
  const past = today > f.latestDay;

  return (
    <Panel>
      <PanelTitle
        icon={CalendarDots}
        iconColor={palette.blush500}
        title={t("cycle.nextPeriodIn")}
        right={
          <View style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: conf.bg, borderColor: conf.border }}>
            <AppText style={{ fontSize: 12, fontWeight: "600", color: conf.fg }}>{conf.text}</AppText>
          </View>
        }
      />
      <AppText style={{ marginTop: 12, fontSize: 16, lineHeight: 23, color: palette.plum900 }}>
        {phase.bleedingDay
          ? t("cycle.bleedingNow", { likely: fmt(f.likelyDay) })
          : past
            ? t("cycle.periodLateRange", { earliest: fmt(f.earliestDay), latest: fmt(f.latestDay) })
            : `${t("cycle.mostLikelyWindow", { likely: fmt(f.likelyDay), earliest: fmt(f.earliestDay), latest: fmt(f.latestDay) })}${inWindow ? t("cycle.windowPadHint") : ""}`}
      </AppText>
      <View style={{ marginTop: 16, borderRadius: 16, backgroundColor: palette.lavender50, padding: 12 }}>
        <AppText style={{ fontSize: 12, lineHeight: 17, color: palette.plum900 }}>
          {t("cycle.basedOnCycles", { count: f.used || 3, mean: Math.round(f.mean), sd: f.sd })}
        </AppText>
      </View>
      <AppText style={{ marginTop: 12, fontSize: 11, color: ink[45] }}>{t("cycle.calendarDisclaimer")}</AppText>
    </Panel>
  );
}
