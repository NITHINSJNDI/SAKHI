"use client";

import { useState } from "react";
import { ChartLineUp, Trash } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { useLanguage } from "@/context/LanguageContext";
import { dayKey } from "@/hooks/useUserDoc";
import type { PP } from "@/components/Postpartum";
import { effectiveAgeStart } from "@/lib/postpartum";
import { BAND_TEXT, checkGrowth, linesAt, monthsOld, plausibleWeight, type Band, type Sex } from "@/lib/babyGrowth";

const BAND_CLS: Record<Band, string> = {
  green: "bg-emerald-50 text-emerald-800",
  yellow: "bg-amber-50 text-amber-900",
  red: "bg-rose-50 text-rose-800",
  high: "bg-lavender-50 text-plum-900",
};
const NOTE_CLS = { info: "text-ink-soft", watch: "text-amber-800", doctor: "text-rose-700 font-medium" } as const;
const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Baby's weight on the WHO lines, coloured like the MCP card growth chart. */
export default function BabyGrowthCard({ pp, dueDate, className = "" }: { pp: PP; dueDate?: string | null; className?: string }) {
  const { t } = useLanguage();
  const { doc, save } = pp;
  const today = dayKey();
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!doc.birth_date) return null;
  const birth = doc.birth_date;
  const age = effectiveAgeStart(birth, dueDate);
  const entries = [...(doc.growth || [])].sort((a, b) => a.date.localeCompare(b.date));
  // Growth bands use corrected age for a baby born early; the checks use real dates
  const check = checkGrowth(doc.sex, birth, entries, today);
  const last = entries[entries.length - 1];
  // Before the due date a preterm baby is judged on preterm charts by the doctor, not the WHO term lines
  const beforeDue = Boolean(age.corrected && last && last.date < age.from);
  const band = doc.sex && last && !beforeDue ? checkGrowth(doc.sex, age.from, entries, today).band : null;

  const add = () => {
    const w = Number(kg.replace(",", "."));
    if (!plausibleWeight(w)) return setError("Enter baby's weight in kg, like 4.6.");
    if (!date || date < birth || date > today) return setError("Pick a date between the birth and today.");
    setError(null);
    save(d => ({ ...d, growth: [...(d.growth || []).filter(e => e.date !== date), { date, weight: Math.round(w * 100) / 100 }].sort((a, b) => a.date.localeCompare(b.date)).slice(-60) }));
    setKg("");
  };
  const remove = (d: string) => save(x => ({ ...x, growth: (x.growth || []).filter(e => e.date !== d) }));

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="growth-title">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <ChartLineUp weight="duotone" className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          <h3 id="growth-title" className="text-xl font-semibold tracking-tight text-plum-900">{doc.baby_name ? `${doc.baby_name}'s growth` : t("mom.growthTitle")}</h3>
        </div>
        <span className="text-xs text-ink-soft">WHO growth standards, as on the MCP card</span>
      </div>
      <p className="text-xs text-ink-soft mb-4">
        Weigh baby once a month (free at the Anganwadi) and add it here. A line that keeps rising is what matters most.
        {age.corrected && ` Born ${age.weeksEarly} weeks early, so Sakhi uses the age from the due date.`}
      </p>

      {!doc.sex ? (
        <fieldset className="mb-4 rounded-2xl bg-lavender-50/70 p-4">
          <legend className="sr-only">Baby is a girl or a boy</legend>
          <p className="mb-2 text-sm text-plum-900">Girls and boys have different growth lines. Is your baby a…</p>
          <div className="flex gap-2">
            {(["girl", "boy"] as Sex[]).map(s => (
              <button key={s} type="button" onClick={() => save(d => ({ ...d, sex: s }))}
                className="rounded-full border border-plum-900/12 bg-white px-4 py-2 text-sm font-medium text-plum-900 hover:bg-lavender-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
                {s === "girl" ? "Girl" : "Boy"}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <GrowthChart sex={doc.sex} from={age.from} entries={entries} today={today} />
      )}

      {band && last && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${BAND_CLS[band]}`} role={band === "red" || band === "yellow" ? "alert" : undefined}>
          <p className="font-semibold">{last.weight} kg on {fmt(last.date)}: {BAND_TEXT[band].label}</p>
          <p className="mt-0.5">{BAND_TEXT[band].advice}</p>
        </div>
      )}
      {beforeDue && (
        <p className="mt-4 rounded-2xl bg-lavender-50 px-4 py-3 text-sm text-plum-900">
          Until the due date, the doctor checks an early baby's weight on special preterm charts. Sakhi starts the WHO chart from the due date.
        </p>
      )}
      {check.notes.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {check.notes.map(n => <li key={n.text} className={NOTE_CLS[n.level]}>{n.text}</li>)}
        </ul>
      )}

      <form onSubmit={e => { e.preventDefault(); add(); }} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-sm text-plum-900">
          <span className="mb-1 block font-medium">Date weighed</span>
          <input type="date" value={date} min={birth} max={today} onChange={e => setDate(e.target.value)}
            className="rounded-xl border border-plum-900/12 bg-cream/60 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500" />
        </label>
        <label className="text-sm text-plum-900">
          <span className="mb-1 block font-medium">Weight (kg)</span>
          <input inputMode="decimal" value={kg} onChange={e => setKg(e.target.value)} placeholder="e.g. 4.6"
            className="w-28 rounded-xl border border-plum-900/12 bg-cream/60 px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500" />
        </label>
        <button type="submit" className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-cream hover:bg-plum-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">{t("mom.addWeight")}</button>
        {error && <p role="alert" className="w-full text-sm text-rose-700">{error}</p>}
      </form>

      {entries.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-ink-soft hover:text-plum-900">All weighings ({entries.length})</summary>
          <ul className="mt-2 divide-y divide-plum-900/[0.06]">
            {[...entries].reverse().map(e => (
              <li key={e.date} className="flex items-center gap-3 py-1.5">
                <span className="flex-1 text-plum-900">{fmt(e.date)}{e.date === birth ? " (birth)" : ""}</span>
                <span className="tabular-nums font-medium text-plum-900">{e.weight} kg</span>
                <button type="button" onClick={() => remove(e.date)} aria-label={`Remove the ${fmt(e.date)} weight`} className="rounded-full p-1.5 text-plum-900/45 hover:bg-rose-50 hover:text-rose-600 cursor-pointer">
                  <Trash className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/** Coloured zones (red / yellow / green) with baby's line drawn over them. */
function GrowthChart({ sex, from, entries, today }: { sex: Sex; from: string; entries: { date: string; weight: number }[]; today: string }) {
  const nowM = monthsOld(from, today);
  const xMax = Math.min(24, Math.max(6, Math.ceil(nowM) + 2));
  const yMin = Math.max(0, Math.floor(linesAt(sex, 0).sd3neg - 1));
  const yMax = Math.ceil(Math.max(linesAt(sex, xMax).sd2 + 0.5, ...entries.map(e => e.weight + 0.5)));
  const W = 600, H = 300, L = 36, R = 12, T = 12, B = 30;
  const x = (m: number) => L + (m / xMax) * (W - L - R);
  const y = (kg: number) => T + (1 - (kg - yMin) / (yMax - yMin)) * (H - T - B);
  const steps = Array.from({ length: xMax * 4 + 1 }, (_, i) => i / 4);
  const lineOf = (k: "sd3neg" | "sd2neg" | "median" | "sd2") => steps.map(m => `${x(m)},${y(linesAt(sex, m)[k])}`).join(" ");
  const area = (lower: (m: number) => number, upper: (m: number) => number) =>
    [...steps.map(m => `${x(m)},${y(upper(m))}`), ...[...steps].reverse().map(m => `${x(m)},${y(lower(m))}`)].join(" ");
  const pts = entries.filter(e => e.date >= from).map(e => ({ ...e, m: monthsOld(from, e.date) })).filter(p => p.m <= xMax);
  const yTicks = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i).filter(v => (yMax - yMin > 10 ? v % 2 === 0 : true));
  const xTicks = Array.from({ length: xMax + 1 }, (_, i) => i).filter(m => (xMax > 12 ? m % 3 === 0 : true));
  const last = pts[pts.length - 1];

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
        aria-label={last ? `Growth chart: latest weight ${last.weight} kg at ${last.m.toFixed(1)} months` : "Growth chart with no weights yet"}>
        <polygon points={area(() => yMin, m => linesAt(sex, m).sd3neg)} className="fill-rose-200/70" />
        <polygon points={area(m => linesAt(sex, m).sd3neg, m => linesAt(sex, m).sd2neg)} className="fill-amber-200/70" />
        <polygon points={area(m => linesAt(sex, m).sd2neg, m => linesAt(sex, m).sd2)} className="fill-emerald-100" />
        <polyline points={lineOf("median")} fill="none" className="stroke-emerald-600/60" strokeWidth={1.5} strokeDasharray="5 4" />
        {yTicks.map(v => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="stroke-plum-900/[0.07]" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" className="fill-plum-900/50 text-[11px]">{v}</text>
          </g>
        ))}
        {xTicks.map(m => (
          <text key={m} x={x(m)} y={H - 10} textAnchor="middle" className="fill-plum-900/50 text-[11px]">{m === 0 ? "Birth" : `${m}m`}</text>
        ))}
        <line x1={x(Math.min(nowM, xMax))} x2={x(Math.min(nowM, xMax))} y1={T} y2={H - B} className="stroke-plum-900/25" strokeDasharray="2 3" />
        {pts.length > 1 && <polyline points={pts.map(p => `${x(p.m)},${y(p.weight)}`).join(" ")} fill="none" className="stroke-plum-900" strokeWidth={2.5} strokeLinejoin="round" />}
        {pts.map(p => (
          <circle key={p.date} cx={x(p.m)} cy={y(p.weight)} r={5} className="fill-white stroke-plum-900" strokeWidth={2.5}>
            <title>{`${p.weight} kg on ${fmt(p.date)}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-100" aria-hidden="true" />Normal</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-200" aria-hidden="true" />Underweight</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-200" aria-hidden="true" />Severely underweight</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-emerald-600/60" aria-hidden="true" />Average</span>
        <span>kg by age in months</span>
      </figcaption>
    </figure>
  );
}
