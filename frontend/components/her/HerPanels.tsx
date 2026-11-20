"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Barbell, ForkKnife, Leaf, Lightning, Drop, Info, FirstAidKit, Stethoscope, Sparkle, CalendarCheck,
  CheckCircle, ChartLineUp, FileText, ShieldCheck, CaretRight,
} from "@phosphor-icons/react";
import { PHASES, PHASE_META, phaseBounds, type Phase, type PhaseInfo } from "@/lib/cyclePhase";
import { PHASE_GUIDE, PHASE_TIP_NOTE, type Tip } from "@/lib/phaseTips";
import type { Pattern, PhaseStat } from "@/lib/herInsights";
import { useLanguage } from "@/context/LanguageContext";

/** One card surface for both dashboards: soft white, whisper border, plum-tinted shadow. */
export const panelCard = "bg-white/70 backdrop-blur-md rounded-3xl md:rounded-[2rem] border border-plum-900/[0.07] shadow-[0_12px_32px_-14px_rgb(74_42_82/0.18)] p-5 sm:p-7 relative overflow-hidden min-w-0";

const CONF_LABEL = { high: "High confidence", medium: "Medium confidence", low: "Rough estimate" } as const;
const CONF_CLS = { high: "bg-emerald-50 text-emerald-700 border-emerald-200", medium: "bg-amber-50 text-amber-700 border-amber-200", low: "bg-slate-100 text-slate-600 border-slate-200" } as const;

/** Soft two-tone gradients per phase, kept close to the brand's rose and lavender. */
const RING_GRAD: Record<Phase, [string, string]> = {
  menstrual: ["#fb7f9c", "#e2486e"],
  follicular: ["#7fd8c3", "#2fb393"],
  ovulatory: ["#ffd27a", "#f4a53c"],
  luteal: ["#c9b2f2", "#8f63c2"],
};
const PHASE_WORD: Record<Phase, string> = { menstrual: "Period", follicular: "Follicular", ovulatory: "Ovulation", luteal: "Luteal" };

/**
 * Cycle dial: four gradient arcs (one per phase), days already lived in full
 * colour and days ahead faded, a dot for every day with ovulation marked, and a
 * glowing marker on today. Draws itself in once; still for reduced motion.
 */
function PhaseRing({ info }: { info: PhaseInfo }) {
  const { t } = useLanguage();
  const phaseWord: Record<Phase, string> = {
    menstrual: t("cycle.period"),
    follicular: t("cycle.follicular"),
    ovulatory: t("cycle.ovulation"),
    luteal: t("cycle.luteal"),
  };
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const size = 200, stroke = 15, cx = size / 2, r = cx - stroke / 2 - 6, c = 2 * Math.PI * r;
  const { ranges, ovulationDay } = phaseBounds(info.cycleLength, info.periodLength);
  const len = info.cycleLength;
  const day = Math.min(info.cycleDay, len);
  const gap = 4; // px between phases
  const at = (d: number, radius: number) => {
    const a = ((d - 0.5) / len) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + radius * Math.cos(a), y: cx + radius * Math.sin(a) };
  };
  // Once the period is due, today sits at the top of the dial, where the next period begins
  const dueToday = !info.late && !info.bleedingDay && info.daysUntilPeriod === 0;
  const waiting = info.late || dueToday;
  const marker = at(waiting ? len + 0.5 : day, r);
  const elapsed = (day / len) * c;
  const color = waiting ? RING_GRAD.menstrual[1] : RING_GRAD[info.phase][1];
  const phaseWordTranslated = t(`cycle.${info.phase}`, PHASE_WORD[info.phase]);
  const label = info.late 
    ? `${info.daysLate} ${info.daysLate === 1 ? t("cycle.dayLate", "day late") : t("cycle.daysLate", "days late")}` 
    : dueToday 
    ? t("cycle.dueToday", "Due today") 
    : phaseWordTranslated;
  const ofAboutText = t("cycle.ofAbout", "of about");
  const sub = waiting ? t("cycle.dueOnDay", { day: len + 1 }) : `${ofAboutText} ${len}`;

  const arcs = PHASES.map(p => {
    const [a, b] = ranges[p];
    if (b < a) return null;
    // Round caps stick out stroke/2 at each end, so shorten each arc by a full stroke
    const trim = gap + stroke;
    return { p, dash: Math.max(0.5, ((b - a + 1) / len) * c - trim), offset: -(((a - 1) / len) * c + trim / 2) };
  }).filter(Boolean) as { p: Phase; dash: number; offset: number }[];

  return (
    <div className="shrink-0 mx-auto sm:mx-0 flex flex-col items-center gap-3">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48 sm:w-52 sm:h-52" role="img"
        aria-label={`Cycle day ${info.cycleDay} of about ${len}. ${PHASE_META[info.phase].label}${info.late ? `, ${info.daysLate} days late` : ""}.`}>
        <defs>
          {arcs.map(({ p }) => (
            <linearGradient key={p} id={`${uid}-${p}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={RING_GRAD[p][0]} />
              <stop offset="100%" stopColor={RING_GRAD[p][1]} />
            </linearGradient>
          ))}
          {/* Reveals the days she has already lived through this cycle */}
          <mask id={`${uid}-lived`}>
            <motion.circle cx={cx} cy={cx} r={r} fill="none" stroke="#fff" strokeWidth={stroke + 6}
              strokeDasharray={`${c} ${c}`} transform={`rotate(-90 ${cx} ${cx})`}
              initial={{ strokeDashoffset: reduce ? c - elapsed : c }} animate={{ strokeDashoffset: c - elapsed }}
              transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }} />
          </mask>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={color} floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Faint track */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgb(42 21 47 / 0.05)" strokeWidth={stroke} />
        {/* The whole cycle, faded: days ahead */}
        {arcs.map(({ p, dash, offset }) => (
          <circle key={`ahead-${p}`} cx={cx} cy={cx} r={r} fill="none" stroke={`url(#${uid}-${p})`} strokeOpacity={0.28}
            strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} strokeDashoffset={offset}
            transform={`rotate(-90 ${cx} ${cx})`} />
        ))}
        {/* Days lived, in full colour */}
        <g mask={`url(#${uid}-lived)`}>
          {arcs.map(({ p, dash, offset }) => (
            <circle key={`lived-${p}`} cx={cx} cy={cx} r={r} fill="none" stroke={`url(#${uid}-${p})`}
              strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} strokeDashoffset={offset}
              transform={`rotate(-90 ${cx} ${cx})`} />
          ))}
        </g>

        {/* A dot for every day; ovulation gets a bigger golden one */}
        {Array.from({ length: len }, (_, i) => i + 1).map(d => {
          const pt = at(d, r - stroke / 2 - 7);
          const isOv = d === ovulationDay;
          return (
            <circle key={d} cx={pt.x} cy={pt.y} r={isOv ? 2.6 : d === day ? 2 : 1.1}
              fill={isOv ? RING_GRAD.ovulatory[1] : d <= day ? "rgb(42 21 47 / 0.45)" : "rgb(42 21 47 / 0.16)"} />
          );
        })}

        {/* Today */}
        {!reduce && (
          <circle cx={marker.x} cy={marker.y} r={11} fill={color} opacity={0.25}>
            <animate attributeName="r" values="10;15;10" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite" />
          </circle>
        )}
        <circle cx={marker.x} cy={marker.y} r={9.5} fill="#fff" filter={`url(#${uid}-glow)`} />
        <circle cx={marker.x} cy={marker.y} r={4.5} fill={color} />

        {/* Centre */}
        <text x={cx} y={cx - 22} textAnchor="middle" className="fill-plum-900/55" style={{ fontSize: 11.5, fontWeight: 500 }}>{t("cycle.day")}</text>
        <text x={cx} y={cx + 13} textAnchor="middle" className="fill-plum-900" style={{ fontSize: 44, fontWeight: 650, letterSpacing: "-0.03em" }}>{info.cycleDay}</text>
        <text x={cx} y={cx + 31} textAnchor="middle" className="fill-plum-900/50" style={{ fontSize: 11 }}>{sub}</text>
        <g transform={`translate(${cx} ${cx + 49})`}>
          <rect x={-(label.length * 3.4 + 12)} y={-10} width={label.length * 6.8 + 24} height={19} rx={9.5} fill={color} fillOpacity={0.14} />
          <text x={0} y={3.5} textAnchor="middle" style={{ fontSize: 10.5, fontWeight: 600, fill: color }}>{label}</text>
        </g>
      </svg>

      {/* Phase legend with this cycle's day ranges */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-plum-900/60" aria-label="Phases this cycle">
        {arcs.map(({ p }) => {
          const [a, b] = ranges[p];
          const current = p === info.phase;
          return (
            <li key={p} className={`flex items-center gap-1.5 ${current ? "font-semibold text-plum-900" : ""}`}>
              <span className="h-2 w-2 rounded-full" style={{ background: `linear-gradient(135deg, ${RING_GRAD[p][0]}, ${RING_GRAD[p][1]})` }} aria-hidden="true" />
              {phaseWord[p]} <span className="tabular-nums text-plum-900/45 font-normal">{a === b ? `${t("cycle.day")} ${a}` : `${a}–${b}`}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Plain-language line for unusual cycle situations (long period, early end, late). */
function statusNote(info: PhaseInfo, t: (k: string, p?: any) => string): { text: string; tone: "info" | "watch" } | null {
  if (info.status === "long-period" && info.bleedingDay) {
    const d = info.bleedingDay;
    if (d >= 10) return { tone: "watch", text: t("cycle.statusNoteLongPeriod10", { day: d }) };
    if (d >= 8) return { tone: "watch", text: t("cycle.statusNoteLongPeriod8", { day: d, usual: info.usualPeriodLength }) };
    return { tone: "info", text: t("cycle.statusNoteLongPeriod", { day: d, usual: info.usualPeriodLength }) };
  }
  if (info.status === "period-ended-early") {
    return { tone: "info", text: t("cycle.statusNoteEarlyEnd") };
  }
  if (info.status === "very-late") {
    return { tone: "watch", text: t("cycle.statusNoteVeryLate", { days: info.daysLate }) };
  }
  if (info.status === "late") {
    return { tone: "info", text: info.daysLate >= 7
      ? t("cycle.statusNoteVeryLate", { days: info.daysLate })
      : t("cycle.statusNoteLongPeriod", { day: info.daysLate, usual: info.usualPeriodLength }) };
  }
  return null;
}

const localIso = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function PhaseCard({ info, onPeriodStarted, saving }: { info: PhaseInfo; onPeriodStarted: (date?: string) => void; saving?: boolean }) {
  const { t } = useLanguage();
  const meta = PHASE_META[info.phase];
  const guide = PHASE_GUIDE[info.phase];
  const next = PHASE_META[info.nextPhase];
  const note = statusNote(info, t);
  const [pickDate, setPickDate] = useState(false);
  const [date, setDate] = useState(localIso());

  const phaseLabelMap: Record<Phase, string> = {
    menstrual: t("cycle.menstrualPhase"),
    follicular: t("cycle.follicularPhase"),
    ovulatory: t("cycle.ovulatoryPhase"),
    luteal: t("cycle.lutealPhase"),
  };
  const phaseShortMap: Record<Phase, string> = {
    menstrual: t("cycle.period"),
    follicular: t("cycle.follicular"),
    ovulatory: t("cycle.ovulation"),
    luteal: t("cycle.luteal"),
  };
  const confLabelMap = {
    high: t("cycle.confidenceHigh"),
    medium: t("cycle.confidenceMedium"),
    low: t("cycle.confidenceLow"),
  };
  const hormoneDescMap: Record<Phase, string> = {
    menstrual: t("cycle.hormoneMenstrual"),
    follicular: t("cycle.hormoneFollicular"),
    ovulatory: t("cycle.hormoneOvulatory"),
    luteal: t("cycle.hormoneLuteal"),
  };

  const title = info.status === "very-late" ? t("cycle.waitingForPeriod")
    : info.late ? t("cycle.periodRunningLate")
    : info.status === "long-period" ? `${t("cycle.period")}, ${t("cycle.day")} ${info.bleedingDay}`
    : (phaseLabelMap[info.phase] || meta.label);
  const showStart = info.late || info.phase === "luteal" || info.bleedingMismatch;
  return (
    <section className={`${panelCard} md:col-span-7`} aria-labelledby="phase-title">
      <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
        <PhaseRing info={info} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-plum-900/55">{t("common.today")}</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${CONF_CLS[info.confidence]}`} title={info.confidenceReason}>
              {confLabelMap[info.confidence] || CONF_LABEL[info.confidence]}
            </span>
            {info.learned && <span className="text-[11px] text-plum-900/50">{t("cycle.learnedFromLogs")}</span>}
          </div>
          <h2 id="phase-title" className={`text-3xl font-semibold tracking-tight mt-1 ${meta.color}`}>{title}</h2>
          <p className="text-sm text-plum-900/75 mt-2 leading-relaxed">{hormoneDescMap[info.phase] || `${guide.hormones} ${guide.feel}`}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {info.late ? (
              <span className="px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                {t("cycle.expectedAgo", { count: info.daysLate })}
              </span>
            ) : !info.bleedingDay && info.daysUntilPeriod === 0 ? (
              <span className="px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
                {t("cycle.dueToday")}
              </span>
            ) : info.status === "long-period" ? (
              <span className="px-3 py-1.5 rounded-full bg-white/80 border border-plum-900/10 text-plum-900/75">
                {t("cycle.follicularStartsAfterBleeding")}
              </span>
            ) : (
              <>
                <span className="px-3 py-1.5 rounded-full bg-white/80 border border-plum-900/10 text-plum-900/75">
                  {phaseShortMap[info.nextPhase] || next.short} {t("cycle.ofAbout") || "phase in"} ~{info.daysToNextPhase} {t("common.days")}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
                  {t("cycle.nextPeriodIn")} ~{info.daysUntilPeriod} {t("common.days")}
                </span>
              </>
            )}
          </div>
          {note && (
            <p className={`text-xs mt-3 rounded-xl px-3 py-2 ${note.tone === "watch" ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-white/70 text-plum-900/70 border border-plum-900/10"}`}>{note.text}</p>
          )}
          <p className="text-xs text-plum-900/50 mt-3 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />{info.confidenceReason.includes("average cycle") ? t("cycle.basedOnAverage") : info.confidenceReason}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {showStart && (
              <button onClick={() => onPeriodStarted()} disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-4 py-2 cursor-pointer disabled:opacity-60">
                <Drop weight="fill" className="w-4 h-4" /> {saving ? t("common.saving") : info.bleedingMismatch ? t("cycle.periodStartedToday") : t("cycle.periodStartedToday")}
              </button>
            )}
            {!pickDate ? (
              <button onClick={() => setPickDate(true)} className="text-xs font-medium text-plum-900/60 hover:text-plum-900 underline underline-offset-2 cursor-pointer">
                {t("cycle.startedOnAnotherDay")}
              </button>
            ) : (
              <span className="inline-flex items-center gap-2">
                <label htmlFor="period-start-date" className="sr-only">Period start date</label>
                <input id="period-start-date" type="date" value={date} max={localIso()} onChange={e => setDate(e.target.value)}
                  className="rounded-full border border-plum-900/15 bg-white px-3 py-1.5 text-xs text-plum-900" />
                <button onClick={() => { onPeriodStarted(date); setPickDate(false); }} disabled={saving || !date}
                  className="rounded-full bg-plum-900 text-white text-xs font-medium px-3 py-1.5 cursor-pointer disabled:opacity-60">{t("common.save")}</button>
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const KIND_META = {
  move: { icon: Barbell, label: "Move", cls: "bg-emerald-50 text-emerald-600" },
  nourish: { icon: ForkKnife, label: "Nourish", cls: "bg-amber-50 text-amber-600" },
  mind: { icon: Leaf, label: "Mind", cls: "bg-violet-50 text-violet-600" },
} as const;

export function TodayTipsCard({ tips, adapted }: { tips: Tip[]; adapted: boolean }) {
  const { t } = useLanguage();
  return (
    <section className={`${panelCard} md:col-span-12`} aria-labelledby="tips-title">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-plum-900/55">{t("cycle.forYouToday")}</p>
          <h2 id="tips-title" className="text-xl font-semibold tracking-tight text-plum-900 mt-0.5">{t("cycle.smallThingsFitPhase")}</h2>
        </div>
        {adapted && <span className="text-xs text-plum-900/60 flex items-center gap-1"><Lightning className="w-3.5 h-3.5" />{t("cycle.adjustedFeel")}</span>}
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {tips.map(tip => {
          const k = KIND_META[tip.kind];
          const I = k.icon;
          const kindLabel = tip.kind === "move" ? t("cycle.move") : tip.kind === "nourish" ? t("cycle.nourish") : t("cycle.mind");
          const tipTitle = t(`tips.${tip.id}.title`, tip.title);
          const tipText = t(`tips.${tip.id}.text`, tip.text);
          return (
            <article key={tip.id} className="rounded-2xl bg-white/75 border border-pink-100 p-4">
              <div className="flex items-center gap-2">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${k.cls}`}><I weight="duotone" className="w-4 h-4" /></span>
                <span className="text-xs font-semibold text-plum-900/60">{kindLabel || k.label}</span>
              </div>
              <h3 className="mt-3 font-semibold text-plum-900">{tipTitle}</h3>
              <p className="mt-1 text-sm text-plum-900/70 leading-relaxed">{tipText}</p>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-plum-900/45">{t("cycle.tipsNote")}</p>
    </section>
  );
}

export function PainNowCard({ onOpen, todayPain }: { onOpen: () => void; todayPain: number }) {
  const { t } = useLanguage();
  return (
    <section className={`${panelCard} md:col-span-5 flex flex-col justify-between bg-gradient-to-br from-rose-50/80 to-white/60`}>
      <div>
        <span className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center"><FirstAidKit weight="duotone" className="w-6 h-6" /></span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-plum-900">{t("cycle.crampsOrPainNow")}</h2>
        <p className="mt-1 text-sm text-plum-900/65 leading-relaxed">
          {todayPain >= 5 ? `You logged pain at ${todayPain}/10 today. ` : ""}{t("cycle.crampsDesc")}
        </p>
      </div>
      <button onClick={onOpen} className="mt-5 w-full rounded-full bg-plum-900 hover:bg-plum-900/90 text-white font-medium py-3 cursor-pointer">
        {t("cycle.helpMeFeelBetter")}
      </button>
    </section>
  );
}

export function PmsForecastCard({ forecast }: { forecast: { symptoms: string[]; inDays: number } | null }) {
  const { t } = useLanguage();
  if (!forecast) return null;
  const windowStr = forecast.inDays > 0 
    ? t("cycle.pmsWindowDays", { days: forecast.inDays })
    : t("cycle.pmsWindowNow");
  return (
    <section className={`${panelCard} md:col-span-12 flex items-start gap-4`}>
      <span className="w-10 h-10 shrink-0 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center"><CalendarCheck weight="duotone" className="w-5 h-5" /></span>
      <div>
        <h3 className="font-semibold text-plum-900">{t("cycle.pmsHeadsUp")}</h3>
        <p className="text-sm text-plum-900/70 mt-1">
          {t("cycle.pmsPrep", {
            symptoms: forecast.symptoms.join(", "),
            window: windowStr
          })}
        </p>
      </div>
    </section>
  );
}

export function PhaseInsightsCard({ stats, highlights }: { stats: PhaseStat[]; highlights: string[] }) {
  const { t } = useLanguage();
  const has = stats.some(s => s.days > 0);
  return (
    <section className={`${panelCard} md:col-span-12`} aria-labelledby="insights-title">
      <div className="flex items-center gap-2"><ChartLineUp weight="duotone" className="w-5 h-5 text-violet-500" />
        <h2 id="insights-title" className="text-xl font-semibold tracking-tight text-plum-900">{t("cycle.howYouFeelCycle")}</h2></div>
      {highlights.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {highlights.map(h => <li key={h} className="text-sm text-plum-900/80 flex gap-2"><Sparkle weight="fill" className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />{h}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-plum-900/60">{t("cycle.keepCheckingInInsights")}</p>
      )}
      {has && (
        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(s => {
            const m = PHASE_META[s.phase];
            return (
              <div key={s.phase} className={`rounded-2xl border p-4 ${m.soft}`}>
                <p className={`text-sm font-semibold ${m.color}`}>{m.short}</p>
                <p className="text-[11px] text-plum-900/50">{t("cycle.loggedDays", { count: s.days })}</p>
                <dl className="mt-3 space-y-1 text-xs text-plum-900/75">
                  <div className="flex justify-between gap-2"><dt>{t("cycle.sleep")}</dt><dd className="font-medium">{s.avgSleep ?? "—"}{s.avgSleep ? " h" : ""}</dd></div>
                  <div className="flex justify-between gap-2"><dt>{t("cycle.pain")}</dt><dd className="font-medium">{s.avgPain ?? "—"}{s.avgPain !== null ? "/10" : ""}</dd></div>
                  <div className="flex justify-between gap-2"><dt>{t("cycle.mood")}</dt><dd className="font-medium truncate">{s.topMood ?? "—"}</dd></div>
                </dl>
                {s.topSymptoms.length > 0 && <p className="mt-2 text-[11px] text-plum-900/55 truncate" title={s.topSymptoms.join(", ")}>{s.topSymptoms.join(", ")}</p>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function PatternsCard({ patterns, logCount }: { patterns: Pattern[]; logCount: number }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState<string | null>(patterns[0]?.id ?? null);
  return (
    <section className={`${panelCard} md:col-span-7`} aria-labelledby="patterns-title">
      <div className="flex items-center gap-2"><Stethoscope weight="duotone" className="w-5 h-5 text-pink-500" />
        <h2 id="patterns-title" className="text-xl font-semibold tracking-tight text-plum-900">{t("cycle.worthMentioningDoctor")}</h2></div>
      <p className="text-xs text-plum-900/55 mt-1">{t("cycle.worthMentioningDoctorDesc")}</p>
      {patterns.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 p-4 text-sm text-emerald-800 flex gap-2">
          <CheckCircle weight="fill" className="w-5 h-5 shrink-0" />
          {logCount < 20 ? t("cycle.nothingStandsOutEarly") : t("cycle.nothingStandsOut")}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {patterns.map(p => (
            <li key={p.id} className="rounded-2xl bg-white/75 border border-pink-100">
              <button onClick={() => setOpen(o => (o === p.id ? null : p.id))} className="w-full flex items-center justify-between gap-3 p-4 text-left cursor-pointer" aria-expanded={open === p.id}>
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${p.tone === "watch" ? "bg-amber-400" : "bg-sky-400"}`} />
                  <span className="font-medium text-plum-900 text-sm">{p.title}</span>
                </span>
                <CaretRight className={`w-4 h-4 text-plum-900/40 transition-transform ${open === p.id ? "rotate-90" : ""}`} />
              </button>
              {open === p.id && (
                <div className="px-4 pb-4 -mt-1 text-sm text-plum-900/75 space-y-1.5">
                  <p>{p.detail}</p>
                  <p className="text-xs text-plum-900/50">{p.evidence}</p>
                  <p className="text-plum-900"><span className="font-medium">{t("cycle.youCouldAsk")} </span>{p.ask}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CareLinksCard({ onOpenRelief, onOpenSettings, favourites }: { onOpenRelief: () => void; onOpenSettings: () => void; favourites: string[] }) {
  const { t } = useLanguage();
  return (
    <section className={`${panelCard} md:col-span-5 flex flex-col gap-3`}>
      <button onClick={onOpenRelief} className="flex items-center gap-4 rounded-2xl bg-rose-50/80 border border-rose-100 p-4 text-left hover:bg-rose-50 cursor-pointer">
        <FirstAidKit weight="duotone" className="w-7 h-7 text-rose-500 shrink-0" />
        <span>
          <span className="block font-medium text-plum-900">{t("cycle.painReliefToolkit")}</span>
          <span className="block text-xs text-plum-900/60">{favourites.length ? `${favourites.join(", ")}` : t("cycle.crampsRotatingIdeas")}</span>
        </span>
      </button>
      <a href="/doctor-summary?mode=her" className="flex items-center gap-4 rounded-2xl bg-white/75 border border-pink-100 p-4 hover:bg-white">
        <FileText weight="duotone" className="w-7 h-7 text-plum-900 shrink-0" />
        <span>
          <span className="block font-medium text-plum-900">{t("cycle.doctorVisitSummary")}</span>
          <span className="block text-xs text-plum-900/60">{t("cycle.doctorVisitSummaryDesc")}</span>
        </span>
      </a>
      <button onClick={onOpenSettings} className="flex items-center gap-4 rounded-2xl bg-white/75 border border-pink-100 p-4 text-left hover:bg-white cursor-pointer">
        <ShieldCheck weight="duotone" className="w-7 h-7 text-emerald-600 shrink-0" />
        <span>
          <span className="block font-medium text-plum-900">{t("header.settings")}</span>
          <span className="block text-xs text-plum-900/60">{t("settings.preferredNameHint")}</span>
        </span>
      </button>
    </section>
  );
}
