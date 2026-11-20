"use client";

import { useMemo } from "react";
import { CalendarDots } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { detectPeriodStarts, recentCycleLengths, todayNum, type PhaseInfo } from "@/lib/cyclePhase";
import { nextPeriod } from "@/lib/ml/cycleForecast";
import { useLanguage } from "@/context/LanguageContext";
import { getLanguage } from "@/lib/languages";

const DAY = 86_400_000;
const fmt = (day: number) => new Date(day * DAY).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

const CONF = {
  high: { text: "Narrow range", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { text: "Medium range", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { text: "Wide range: log more periods", cls: "bg-slate-100 text-slate-600 border-slate-200" },
} as const;

/** Next period as a likely day and an 80% range, from her own cycles. */
export default function NextPeriodCard({ phase, profile, logs, cycleHistory, className = "" }: {
  phase: PhaseInfo; profile: any; logs: any[]; cycleHistory: any[]; className?: string;
}) {
  const { language, t } = useLanguage();
  const langMeta = getLanguage(language);
  const locale = langMeta.bcp47 || "en-IN";
  const fmt = (day: number) => new Date(day * DAY).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });

  const f = useMemo(() => {
    const today = todayNum();
    const starts = detectPeriodStarts(logs, profile?.last_period_start || profile?.lastPeriodStart, (cycleHistory || []).map((h: any) => h?.start))
      .filter(s => s <= today);
    const lengths = recentCycleLengths(starts, cycleHistory || []);
    const prior = Number(profile?.cycle_length_avg || profile?.cycle_length) || undefined;
    return nextPeriod(phase.lastStart, lengths, prior);
  }, [phase.lastStart, profile, logs, cycleHistory]);

  const today = todayNum();
  const confCls = f.confidence === "high" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : f.confidence === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-100 text-slate-600 border-slate-200";
  const confText = f.confidence === "high" ? t("cycle.confidenceHigh") : f.confidence === "medium" ? t("cycle.confidenceMedium") : t("cycle.confidenceLow");
  const inWindow = today >= f.earliestDay && today <= f.latestDay;
  const past = today > f.latestDay;

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="next-period-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDots weight="duotone" className="h-5 w-5 text-blush-500" aria-hidden="true" />
          <h3 id="next-period-title" className="text-xl font-semibold tracking-tight text-plum-900">{t("cycle.nextPeriodIn")}</h3>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${confCls}`}>{confText}</span>
      </div>

      {phase.bleedingDay ? (
        <p className="mt-3 text-base text-plum-900">{t("cycle.bleedingNow", { likely: fmt(f.likelyDay) })}</p>
      ) : past ? (
        <p className="mt-3 text-base text-plum-900">{t("cycle.periodLateRange", { earliest: fmt(f.earliestDay), latest: fmt(f.latestDay) })}</p>
      ) : (
        <p className="mt-3 text-base text-plum-900">
          {t("cycle.mostLikelyWindow", { likely: fmt(f.likelyDay), earliest: fmt(f.earliestDay), latest: fmt(f.latestDay) })}
          {inWindow && t("cycle.windowPadHint")}
        </p>
      )}

      <div className="mt-4 rounded-2xl bg-lavender-50 p-3 text-xs text-plum-900">
        {t("cycle.basedOnCycles", { count: f.used || 3, mean: Math.round(f.mean), sd: f.sd })}
      </div>
      <p className="mt-3 text-[11px] text-ink-faint">{t("cycle.calendarDisclaimer")}</p>
    </section>
  );
}
