"use client";

import { Check, Footprints } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { dayKey } from "@/hooks/useUserDoc";
import type { PP } from "@/components/Postpartum";
import { effectiveAgeStart } from "@/lib/postpartum";
import { monthsOld } from "@/lib/babyGrowth";
import { AREA_LABEL, milestoneView, type MilestoneView } from "@/lib/milestones";

const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const ageText = (m: number) => (m < 1 ? "the first month" : m < 2 ? "about 6 weeks" : `about ${Math.round(m)} months`);

/** What baby can do, what's coming next, and which ones are worth a check-up. */
export default function MilestonesCard({ pp, dueDate, className = "" }: { pp: PP; dueDate?: string | null; className?: string }) {
  const { doc, save } = pp;
  if (!doc.birth_date) return null;
  const today = dayKey();
  const age = effectiveAgeStart(doc.birth_date, dueDate);
  const months = monthsOld(age.from, today);
  const view = milestoneView(months, doc.milestones || {});
  const late = view.filter(v => v.state === "late");
  const current = view.filter(v => v.state === "now" || v.state === "soon");
  const done = view.filter(v => v.state === "done");
  const baby = doc.baby_name || "baby";

  const mark = (id: string, on: boolean) => save(d => {
    const next = { ...(d.milestones || {}) };
    if (on) next[id] = today; else delete next[id];
    return { ...d, milestones: next };
  });

  const Row = ({ m }: { m: MilestoneView }) => (
    <li className="flex items-start gap-3 rounded-2xl border border-plum-900/[0.07] bg-white/80 px-3 py-2.5">
      <button type="button" role="checkbox" aria-checked={Boolean(m.done)} onClick={() => mark(m.id, !m.done)}
        aria-label={`${m.text}${m.done ? ", done" : ""}`}
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${m.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-plum-900/25 bg-white hover:bg-lavender-50"}`}>
        {m.done && <Check weight="bold" className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
      <span className="min-w-0 flex-1 text-sm">
        <span className={m.done ? "text-ink-soft" : "text-plum-900"}>{m.text}</span>
        <span className="block text-[11px] text-ink-faint">
          {AREA_LABEL[m.area]} · {m.done ? `since ${fmt(m.done)}` : `most babies by ${ageText(m.typical)}`}
        </span>
      </span>
    </li>
  );

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="milestones-title">
      <div className="flex items-center gap-2 mb-1">
        <Footprints weight="duotone" className="h-5 w-5 text-lavender-500" aria-hidden="true" />
        <h3 id="milestones-title" className="text-xl font-semibold tracking-tight text-plum-900">What {baby} can do</h3>
      </div>
      <p className="text-xs text-ink-soft mb-4">
        Tick each one the first time you see it. Every baby goes at their own pace.
        {age.corrected && " Sakhi counts age from the due date because baby was born early."}
      </p>

      {late.length > 0 && (
        <div className="mb-4 rounded-2xl bg-amber-50 p-4" role="note">
          <p className="text-sm font-semibold text-amber-900">Worth asking your doctor about</p>
          <p className="mt-0.5 mb-3 text-sm text-amber-900/90">
            Most babies do these by now. It may be nothing, but checking early helps: ask your doctor, or the RBSK team about the free District Early Intervention Centre.
          </p>
          <ul className="space-y-2">{late.map(m => <Row key={m.id} m={m} />)}</ul>
        </div>
      )}

      {current.length > 0 ? (
        <>
          <p className="mb-2 text-sm font-medium text-plum-900">Now and coming up</p>
          <ul className="space-y-2">{current.map(m => <Row key={m.id} m={m} />)}</ul>
        </>
      ) : late.length === 0 && (
        <p className="text-sm text-ink-soft">Nothing new to look for right now.</p>
      )}

      {done.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-ink-soft hover:text-plum-900">Done ({done.length})</summary>
          <ul className="mt-2 space-y-2">{done.map(m => <Row key={m.id} m={m} />)}</ul>
        </details>
      )}

      <p className="mt-4 text-xs text-ink-faint">See a doctor soon, at any age, if baby stops doing something they could do before, doesn&apos;t respond to sounds, or one side of the body seems weaker than the other.</p>
    </section>
  );
}
