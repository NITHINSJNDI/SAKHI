"use client";

import { useMemo, useRef, useState } from "react";
import { dayNum, dayToIso, type PhaseInfo } from "@/lib/cyclePhase";
import { planFertility } from "@/lib/fertility";
import { Target, Plant, Thermometer, Check } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { useLanguage } from "@/context/LanguageContext";
import { dayKey } from "@/hooks/useUserDoc";
import {
  PERI_SIGNS, monthsTrying, periRedFlags, periSummary, ttcAdvice,
  type GoalDoc, type HerGoal, type PeriDay,
} from "@/lib/herGoal";

interface CycleInfo { phase: PhaseInfo; profile: any; logs: any[]; cycleHistory: any[]; irregular: boolean }

const GOALS: { id: HerGoal; label: string; hint: string }[] = [
  { id: "track", label: "Just tracking", hint: "Periods, symptoms and patterns" },
  { id: "ttc", label: "Trying for a baby", hint: "Fertile days and when to see a doctor" },
  { id: "peri", label: "Nearing menopause", hint: "Hot flashes, sleep and changes in your 40s" },
];
const chip = (on: boolean) =>
  `rounded-full border px-3.5 py-2 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${on ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/12 bg-white text-plum-900 hover:bg-lavender-50"}`;
const getLocale = (lang: string) => {
  const map: Record<string, string> = {
    en: "en-IN", ta: "ta-IN", hi: "hi-IN", te: "te-IN",
    ml: "ml-IN", kn: "kn-IN", bn: "bn-IN", mr: "mr-IN"
  };
  return map[lang] || "en-IN";
};
const shortDate = (d: string, lang = "en") => new Date(d + "T00:00:00").toLocaleDateString(getLocale(lang), { day: "numeric", month: "short" });

/** Her goal: just tracking, trying to conceive, or perimenopause. */
export default function GoalCard({ cycle, goal, className = "" }: {
  cycle: CycleInfo;
  /** shared with the page, so the calendar and test card follow her choice at once */
  goal: { doc: GoalDoc; save: Save; loaded: boolean };
  className?: string;
}) {
  const { t } = useLanguage();
  const { doc, save, loaded } = goal;

  const goalDefs: Record<HerGoal, { label: string; hint: string }> = {
    track: { label: t("goals.tracking"), hint: t("goals.trackingHint") },
    ttc: { label: t("goals.ttc"), hint: t("goals.ttcHint") },
    peri: { label: t("goals.peri"), hint: t("goals.periHint") },
  };

  if (!loaded) return null;
  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="goal-title">
      <div className="flex items-center gap-2 mb-1">
        <Target weight="duotone" className="h-5 w-5 text-lavender-500" aria-hidden="true" />
        <h3 id="goal-title" className="text-xl font-semibold tracking-tight text-plum-900">{t("goals.title")}</h3>
      </div>
      <div role="radiogroup" aria-label="Your goal" className="mt-3 grid gap-2 sm:grid-cols-3">
        {GOALS.map(g => {
          const on = doc.goal === g.id;
          const def = goalDefs[g.id] || g;
          return (
            <button key={g.id} type="button" role="radio" aria-checked={on} onClick={() => save(d => ({ ...d, goal: g.id }))}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${on ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/10 bg-white/80 text-plum-900 hover:bg-lavender-50"}`}>
              <span className="block text-sm font-semibold">{def.label}</span>
              <span className={`block text-xs ${on ? "text-cream/75" : "text-ink-soft"}`}>{def.hint}</span>
            </button>
          );
        })}
      </div>
      {doc.goal === "ttc" && <TtcPanel doc={doc} save={save} cycle={cycle} />}
      {doc.goal === "peri" && <PeriPanel doc={doc} save={save} cycle={cycle} />}
    </section>
  );
}

type Save = (next: GoalDoc | ((p: GoalDoc) => GoalDoc)) => Promise<boolean>;

function TtcPanel({ doc, save, cycle }: { doc: GoalDoc; save: Save; cycle: CycleInfo }) {
  const { t, language } = useLanguage();
  const today = dayKey();
  const tNum = dayNum(today);
  // Same plan as the calendar on the Cycle tab, from her own logged periods
  const plan = useMemo(() => planFertility({ phase: cycle.phase, profile: cycle.profile, logs: cycle.logs, cycleHistory: cycle.cycleHistory, today: tNum }), [cycle, tNum]);
  const advice = ttcAdvice(doc, today, cycle.irregular);
  const months = monthsTrying(doc.ttc_since, today);
  const marked = doc.intimacy.includes(today);
  const w = plan.nextWindow ? { start: dayToIso(plan.nextWindow.start), end: dayToIso(plan.nextWindow.end), ovulation: dayToIso(plan.nextWindow.peak) } : null;
  const kind = plan.kindOf(tNum).kind;
  const state = plan.late ? "late" : kind === "peak" ? "peak" : kind === "fertile" ? "fertile" : w && w.start > today ? "before" : "wait";
  const inWindow = w ? doc.intimacy.filter(d => d >= w.start && d <= w.end).length : 0;
  const daysToStart = plan.nextWindow ? plan.nextWindow.start - tNum : 0;

  const headline = state === "late" ? t("goals.periodLateAdvice")
    : state === "peak" ? t("goals.mostFertileDay")
    : state === "fertile" ? t("goals.inFertileWindow")
    : state === "before" && daysToStart <= 7 ? t("goals.fertileStartsIn", { days: String(daysToStart) })
    : t("goals.waitingForPeriod", { date: shortDate(dayToIso(plan.testFrom ?? tNum), language) });

  return (
    <div className="mt-5 space-y-4">
      <div className={`rounded-2xl p-4 ${state === "peak" || state === "fertile" ? "bg-emerald-50" : "bg-lavender-50"}`}>
        <div className="flex items-start gap-3">
          <Plant weight="duotone" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="text-sm text-plum-900">
            <p className="font-semibold">{headline}</p>
            {w && (
              <p className="mt-1 text-ink-soft">
                {t("goals.fertileDaysSpan", {
                  start: shortDate(w.start, language),
                  end: shortDate(w.end, language),
                  ovulation: shortDate(w.ovulation, language)
                })}
              </p>
            )}
            {plan.spread > 7 && <p className="mt-1 text-amber-700">{t("goals.cyclesVaryRough", { days: String(plan.spread) })}</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-pressed={marked} onClick={() => save(d => ({ ...d, intimacy: marked ? d.intimacy.filter(x => x !== today) : [...d.intimacy, today].slice(-120) }))} className={chip(marked)}>
          {marked ? <><Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{t("goals.notedForToday")}</> : t("goals.weTriedToday")}
        </button>
        <span className="text-xs text-ink-soft">{inWindow > 0 ? t("goals.daysNotedInWindow", { count: String(inWindow) }) : t("goals.optionalPrivate")}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-plum-900">
          <span className="mb-1 block font-medium">{t("goals.tryingSince")}</span>
          <input type="month" max={today.slice(0, 7)} value={doc.ttc_since || ""} onChange={e => save(d => ({ ...d, ttc_since: e.target.value || undefined }))}
            className="w-full rounded-xl border border-plum-900/12 bg-cream/60 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500" />
          {months !== null && <span className="mt-1 block text-xs text-ink-soft">{t("goals.monthsCount", { count: String(months) })}</span>}
        </label>
        <fieldset className="text-sm text-plum-900">
          <legend className="mb-1 font-medium">{t("goals.aboutYou")}</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={Boolean(doc.over35)} onClick={() => save(d => ({ ...d, over35: !d.over35 }))} className={chip(Boolean(doc.over35))}>{t("goals.over35")}</button>
            <button type="button" aria-pressed={Boolean(doc.folic)} onClick={() => save(d => ({ ...d, folic: !d.folic }))} className={chip(Boolean(doc.folic))}>{t("goals.takingFolic")}</button>
          </div>
        </fieldset>
      </div>

      <ul className="space-y-1.5 text-sm text-plum-900">
        {!doc.folic && <li><span className="font-semibold">{t("goals.folicAcidPrompt")}</span> <span className="text-ink-soft">{t("goals.folicAcidDesc")}</span></li>}
        <li className={advice.seeDoctor ? "rounded-xl bg-amber-50 px-3 py-2 text-amber-800" : "text-ink-soft"}>{advice.seeDoctor ? advice.text : t("goals.ttcGeneralAdvice")}</li>
        <li className="text-ink-soft">{t("goals.ttcPreconceptionChecks")}</li>
      </ul>
    </div>
  );
}

function PeriPanel({ doc, save, cycle }: { doc: GoalDoc; save: Save; cycle: CycleInfo }) {
  const { t } = useLanguage();
  const today = dayKey();
  const saved = doc.peri.find(d => d.date === today);
  const [day, setDay] = useState<PeriDay>(saved || { date: today, flashes: 0, sweats: false, sleep: false, mood: false, dryness: false, joints: false });
  // Quick taps build on the latest answers, not the last render's
  const latest = useRef(day);
  const store = (change: (p: PeriDay) => Partial<PeriDay>) => {
    const next = { ...latest.current, ...change(latest.current) };
    latest.current = next;
    setDay(next);
    save(d => ({ ...d, peri: [...d.peri.filter(x => x.date !== today), next].slice(-120) }));
  };
  const sum = periSummary(doc.peri, today);
  const daysSince = Math.floor(Date.now() / 86_400_000) - cycle.phase.lastStart;
  const flag = periRedFlags(daysSince);

  const signLabels: Record<string, string> = {
    sweats: t("goals.nightSweats"),
    sleep: t("goals.poorSleep"),
    mood: t("goals.lowMood"),
    dryness: t("goals.vaginalDryness"),
    joints: t("goals.jointAches"),
  };

  return (
    <div className="mt-5 space-y-4">
      {flag && <p role="alert" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{flag}</p>}
      <div>
        <p className="mb-2 text-sm font-medium text-plum-900">{t("common.today")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-plum-900/12 bg-white px-2 py-1">
            <Thermometer className="h-4 w-4 text-blush-500" aria-hidden="true" />
            <span className="text-sm text-plum-900">{t("goals.hotFlashes")}</span>
            <button type="button" aria-label="One fewer hot flash" onClick={() => store(p => ({ flashes: Math.max(0, p.flashes - 1) }))} className="h-7 w-7 rounded-full text-plum-900 hover:bg-lavender-50 cursor-pointer">−</button>
            <span className="w-5 text-center text-sm font-semibold tabular-nums text-plum-900" aria-live="polite">{day.flashes}</span>
            <button type="button" aria-label="One more hot flash" onClick={() => store(p => ({ flashes: Math.min(30, p.flashes + 1) }))} className="h-7 w-7 rounded-full text-plum-900 hover:bg-lavender-50 cursor-pointer">+</button>
          </div>
          {PERI_SIGNS.map(s => (
            <button key={s.key} type="button" aria-pressed={day[s.key]} onClick={() => store(p => ({ [s.key]: !p[s.key] }))} className={chip(day[s.key])}>{signLabels[s.key] || s.label}</button>
          ))}
        </div>
      </div>

      {sum.logged > 0 && (
        <p className="text-sm text-ink-soft">
          Last 30 days ({sum.logged} logged): about <span className="font-semibold text-plum-900">{sum.flashesPerDay}</span> {t("goals.hotFlashes").toLowerCase()} a day
          {sum.counts.filter(c => c.days > 0).map(c => `, ${(signLabels[c.key] || c.label).toLowerCase()} on ${c.days} day${c.days === 1 ? "" : "s"}`).join("")}.
        </p>
      )}

      <ul className="space-y-1.5 text-sm text-ink-soft">
        <li>{t("goals.periAdvice1")}</li>
        <li>{t("goals.periAdvice2")}</li>
        <li>{t("goals.periAdvice3")}</li>
      </ul>
    </div>
  );
}
