"use client";

import { useMemo, useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { dayNum, dayToIso, type PhaseInfo } from "@/lib/cyclePhase";
import { planFertility, type DayKind } from "@/lib/fertility";
import { useLanguage } from "@/context/LanguageContext";
import { getLanguage } from "@/lib/languages";

const STYLE: Record<Exclude<DayKind, null>, string> = {
  period: "bg-rose-400 text-white",
  "predicted-period": "border border-dashed border-rose-300 bg-rose-50 text-rose-700",
  peak: "bg-emerald-500 text-white",
  fertile: "bg-emerald-100 text-emerald-800",
  "predicted-peak": "border border-dashed border-emerald-500 bg-emerald-100 text-emerald-800",
  "predicted-fertile": "border border-dashed border-emerald-300 bg-emerald-50 text-emerald-700",
  "past-fertile": "bg-emerald-50 text-emerald-700/70",
};

const WEEKDAYS_MAP: Record<string, string[]> = {
  en: ["M", "T", "W", "T", "F", "S", "S"],
  ta: ["தி", "செ", "பு", "வி", "வெ", "ச", "ஞா"],
  hi: ["सो", "मं", "बु", "गु", "शु", "श", "र"],
  te: ["సో", "మం", "బు", "గు", "శు", "శ", "ఆ"],
  ml: ["തി", "ചൊ", "ബു", "വ്യാ", "വെ", "ശ", "ഞാ"],
  kn: ["ಸೋ", "ಮಂ", "ಬು", "ಗು", "ಶು", "ಶ", "ಭಾ"],
  bn: ["সো", "ম", "বু", "বৃ", "শু", "শ", "র"],
  mr: ["सो", "मं", "बु", "गु", "शु", "श", "र"],
};

/** Month calendar of her real periods, fertile windows and the forecast. */
export default function FertilityCalendar({ phase, profile, logs, cycleHistory, tried = [], trying = false }: {
  phase: PhaseInfo; profile: any; logs: any[]; cycleHistory: any[]; tried?: string[]; trying?: boolean;
}) {
  const { language, t } = useLanguage();
  const langMeta = getLanguage(language);
  const locale = langMeta.bcp47 || "en-IN";

  const labelMap: Record<Exclude<DayKind, null>, string> = {
    period: t("cycle.period"),
    "predicted-period": t("cycle.expectedPeriod"),
    peak: t("cycle.mostFertile"),
    fertile: t("cycle.fertile"),
    "predicted-peak": t("cycle.mostFertile"),
    "predicted-fertile": t("cycle.fertile"),
    "past-fertile": t("cycle.fertile"),
  };

  const fmt = (n: number, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
    new Date(dayToIso(n) + "T00:00:00").toLocaleDateString(locale, opts);

  const today = dayNum(new Date());
  const plan = useMemo(() => planFertility({ phase, profile, logs, cycleHistory, today }), [phase, profile, logs, cycleHistory, today]);
  const triedSet = useMemo(() => new Set(tried.map(dayNum)), [tried]);
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const startNum = dayNum(first);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => startNum + i)];

  const w = plan.nextWindow;
  const summary = plan.late
    ? `${t("cycle.periodLateForecast", { count: phase.daysLate })}${trying ? ` ${t("cycle.homePregnancyReliable")}` : ""}`
    : w
      ? w.start <= today
        ? t("cycle.fertileNowUntil", { end: fmt(w.end), peak: fmt(w.peak) })
        : t("cycle.nextFertileDays", { start: fmt(w.start), end: fmt(w.end), peak: fmt(w.peak) })
      : "";
  const basis = plan.cyclesLogged >= 2
    ? t("cycle.basedOnLastCycles", { count: plan.cyclesLogged })
    : t("cycle.basedOnGivenLength");

  const weekdays = WEEKDAYS_MAP[language] || WEEKDAYS_MAP.en;

  return (
    <div className="w-full">
      <div className="mb-4 space-y-1">
        <p className="text-sm font-semibold text-plum-900">{summary}</p>
        <p className="text-xs text-ink-soft">{basis}</p>
        {trying && !plan.late && plan.testFrom !== null && (
          <p className="text-xs text-ink-soft">{t("cycle.reliableFrom", { date: fmt(plan.testFrom) })}</p>
        )}
      </div>

      <div className="mx-auto max-w-md">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setOffset(o => Math.max(-6, o - 1))}
            disabled={offset <= -6}
            aria-label={t("cycle.prevMonth")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-plum-900 hover:bg-lavender-50 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
          >
            <CaretLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="text-sm font-semibold text-plum-900" aria-live="polite">
            {first.toLocaleDateString(locale, { month: "long", year: "numeric" })}
          </p>
          <button
            type="button"
            onClick={() => setOffset(o => Math.min(3, o + 1))}
            disabled={offset >= 3}
            aria-label={t("cycle.nextMonth")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-plum-900 hover:bg-lavender-50 disabled:opacity-30 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
          >
            <CaretRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={t("cycle.cycleCalendar")}>
          {weekdays.map((d, i) => (
            <div key={i} className="pb-1 text-[11px] font-medium text-ink-faint" aria-hidden="true">{d}</div>
          ))}
          {cells.map((n, i) => {
            if (n === null) return <div key={`b${i}`} aria-hidden="true" />;
            const k = plan.kindOf(n);
            const isToday = n === today;
            const didTry = triedSet.has(n);
            const label = `${fmt(n, { day: "numeric", month: "long" })}${k.kind ? `, ${labelMap[k.kind]}` : ""}${didTry ? `, ${t("cycle.tried")}` : ""}${isToday ? `, ${t("common.today")}` : ""}`;
            return (
              <div
                key={n}
                role="gridcell"
                aria-label={label}
                title={label}
                className={`relative flex aspect-square items-center justify-center rounded-xl text-sm tabular-nums ${k.kind ? STYLE[k.kind] : n < today ? "text-plum-900/45" : "text-plum-900"} ${isToday ? "ring-2 ring-plum-900 ring-offset-1 font-semibold" : ""}`}
              >
                {new Date(dayToIso(n) + "T00:00:00").getDate()}
                {didTry && <span className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-blush-500" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-soft">
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-400" aria-hidden="true" />{t("cycle.period")}</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-rose-300 bg-rose-50" aria-hidden="true" />{t("cycle.expectedPeriod")}</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" aria-hidden="true" />{t("cycle.mostFertile")}</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-100" aria-hidden="true" />{t("cycle.fertile")}</li>
        <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-emerald-300 bg-emerald-50" aria-hidden="true" />{t("cycle.forecast")}</li>
        {trying && <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blush-500" aria-hidden="true" />{t("cycle.tried")}</li>}
      </ul>
      <p className="mt-3 text-xs text-ink-faint">{t("cycle.calendarDisclaimer")}</p>
    </div>
  );
}
