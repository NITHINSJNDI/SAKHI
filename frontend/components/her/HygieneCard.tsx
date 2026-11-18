"use client";

import { useEffect, useMemo, useState } from "react";
import { Drop, Timer, Package, Trash, MapPin, Warning, Lightbulb, CaretDown, Minus, Plus } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { mapsSearch } from "@/components/NearbyHelpCard";
import { useUserDoc } from "@/hooks/useUserDoc";
import { todayNum } from "@/lib/cyclePhase";
import {
  EMPTY_HYGIENE, LOW_COST, PRODUCTS, PRODUCT_ORDER, WARNING_SIGNS,
  addChange, changeState, changesToday, hoursSinceChange, mythForDay, supplyCheck,
  type ChangeState, type HygieneDoc, type Product, type SupplyLevel,
} from "@/lib/hygiene";

const CHANGE_CHIP: Record<ChangeState, { text: string; cls: string }> = {
  fresh: { text: "All good", cls: "bg-emerald-100 text-emerald-800" },
  soon: { text: "Change soon", cls: "bg-amber-100 text-amber-800" },
  due: { text: "Time to change", cls: "bg-rose-100 text-rose-700" },
  overdue: { text: "Overdue", cls: "bg-rose-600 text-white" },
  unknown: { text: "", cls: "" },
};

const SUPPLY_CLS: Record<SupplyLevel, string> = {
  ok: "bg-emerald-50 text-emerald-900",
  low: "bg-amber-50 text-amber-900",
  out: "bg-rose-50 text-rose-800",
  untracked: "bg-lavender-50 text-plum-900",
  reusable: "bg-lavender-50 text-plum-900",
};

const pill = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${on ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/15 bg-white text-plum-900 hover:bg-lavender-50"}`;

const fmtHours = (h: number) => {
  const m = Math.round(h * 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`;
};

export interface HygieneCycle {
  bleeding: boolean;
  daysUntilPeriod: number;
  periodLength: number;
  heavyFlow: boolean;
}

/** Period care: product guidance, change timer, supplies, disposal, low-cost access and myths. */
export default function HygieneCard({ cycle, compact = false, className = "" }: { cycle: HygieneCycle; compact?: boolean; className?: string }) {
  const { doc, save } = useUserDoc<HygieneDoc>("hygiene", EMPTY_HYGIENE);
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState<"care" | "access" | "signs" | null>(null);

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(id); }, []);

  const guide = doc.product ? PRODUCTS[doc.product] : null;
  const hours = hoursSinceChange(doc.changes, now);
  const state = changeState(doc.product, hours);
  const todayCount = changesToday(doc.changes, now);
  const supply = useMemo(
    () => supplyCheck(doc, cycle.periodLength, cycle.heavyFlow, cycle.daysUntilPeriod, cycle.bleeding),
    [doc, cycle.periodLength, cycle.heavyFlow, cycle.daysUntilPeriod, cycle.bleeding],
  );
  const myth = mythForDay(todayNum());

  const setProduct = (p: Product) => save(prev => ({ ...prev, product: p }));
  const markChanged = () => {
    const at = new Date();
    setNow(at);
    return save(prev => {
      const used = prev.product && PRODUCTS[prev.product].disposable && typeof prev.stock === "number" ? Math.max(0, prev.stock - 1) : prev.stock;
      return { ...prev, changes: addChange(prev.changes, at), stock: used };
    });
  };
  const setStock = (n: number | null) => save(prev => ({ ...prev, stock: n === null ? null : Math.max(0, Math.min(200, n)) }));

  const toggle = (k: "care" | "access" | "signs") => setOpen(o => (o === k ? null : k));

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="hygiene-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Drop weight="duotone" className="h-5 w-5 text-blush-500" aria-hidden="true" />
          <h3 id="hygiene-title" className="text-xl font-semibold tracking-tight text-plum-900">Period care</h3>
        </div>
        {cycle.bleeding
          ? <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">On your period</span>
          : cycle.daysUntilPeriod <= 5 && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Period in {cycle.daysUntilPeriod} day{cycle.daysUntilPeriod === 1 ? "" : "s"}</span>}
      </div>

      {/* What she uses */}
      <p className="mt-4 text-xs font-semibold text-plum-900/65">What do you use?</p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Period product">
        {PRODUCT_ORDER.map(p => (
          <button key={p} type="button" aria-pressed={doc.product === p} onClick={() => setProduct(p)} className={pill(doc.product === p)}>
            {PRODUCTS[p].label}
          </button>
        ))}
      </div>

      <div className={`mt-4 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        {/* Change timer */}
        <div className="rounded-2xl border border-plum-900/[0.07] bg-white/75 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-plum-900"><Timer weight="duotone" className="h-4 w-4" aria-hidden="true" />Change timer</span>
            {state !== "unknown" && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${CHANGE_CHIP[state].cls}`}>{CHANGE_CHIP[state].text}</span>}
          </div>
          {guide ? (
            <>
              <p className="mt-2 text-sm text-ink-soft">
                {hours === null ? "Tap when you change, and Sakhi will tell you when the next one is due." : `Last changed ${fmtHours(hours)} ago.`}
                {" "}<span className="text-plum-900">{guide.label}: {guide.window}.</span>
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button type="button" onClick={markChanged} className="rounded-full bg-plum-900 px-4 py-2 text-sm font-medium text-cream hover:bg-plum-900/90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500">
                  I changed just now
                </button>
                {todayCount > 0 && <span className="text-xs text-ink-faint">{todayCount} change{todayCount === 1 ? "" : "s"} today</span>}
              </div>
              {cycle.bleeding && todayCount >= 8 && guide.disposable && (
                <p className="mt-2 text-xs text-rose-700">That is a lot of changes for one day. If you are soaking a pad every hour, see a doctor.</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">Choose what you use above to get a change timer and care tips.</p>
          )}
        </div>

        {/* Supplies */}
        <div className="rounded-2xl border border-plum-900/[0.07] bg-white/75 p-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-plum-900"><Package weight="duotone" className="h-4 w-4" aria-hidden="true" />Supplies</span>
          <p className={`mt-2 rounded-xl p-2.5 text-sm ${SUPPLY_CLS[supply.level]}`}>{supply.message}</p>
          {(!doc.product || PRODUCTS[doc.product].disposable) && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-ink-soft">At home:</span>
              <button type="button" aria-label="One less" onClick={() => setStock((doc.stock ?? 0) - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-plum-900/15 bg-white cursor-pointer hover:bg-lavender-50"><Minus className="h-3.5 w-3.5" /></button>
              <input
                type="number" inputMode="numeric" min={0} max={200} aria-label="Pads or tampons at home"
                value={doc.stock ?? ""} placeholder="?"
                onChange={e => setStock(e.target.value === "" ? null : Number(e.target.value))}
                className="w-16 rounded-xl border border-plum-900/15 bg-white px-2 py-1.5 text-center text-sm text-plum-900"
              />
              <button type="button" aria-label="One more" onClick={() => setStock((doc.stock ?? 0) + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-plum-900/15 bg-white cursor-pointer hover:bg-lavender-50"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          )}
        </div>
      </div>

      {/* Myth of the day */}
      <div className="mt-3 flex gap-3 rounded-2xl bg-lavender-50 p-4">
        <Lightbulb weight="duotone" className="mt-0.5 h-5 w-5 shrink-0 text-plum-900" aria-hidden="true" />
        <p className="text-sm text-plum-900"><span className="line-through decoration-plum-900/40 text-ink-soft">{myth.myth}</span><br /><span className="font-medium">Fact:</span> {myth.fact}</p>
      </div>

      {/* Expandable sections */}
      <div className="mt-3 divide-y divide-plum-900/[0.07] rounded-2xl border border-plum-900/[0.07] bg-white/60">
        {guide && (
          <Section id="care" icon={<Trash weight="duotone" className="h-4 w-4" />} title={`Caring for your ${guide.label.toLowerCase()} and disposal`} open={open === "care"} onToggle={() => toggle("care")}>
            <ul className="space-y-1.5 text-sm text-ink-soft">
              {guide.care.map(c => <li key={c} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blush-400" />{c}</li>)}
            </ul>
            <p className="mt-2 rounded-xl bg-lavender-50 p-2.5 text-sm text-plum-900"><span className="font-medium">Disposal:</span> {guide.disposal}</p>
          </Section>
        )}
        <Section id="access" icon={<MapPin weight="duotone" className="h-4 w-4" />} title="Low-cost and free pads" open={open === "access"} onToggle={() => toggle("access")}>
          <ul className="space-y-2.5">
            {LOW_COST.map(o => (
              <li key={o.title} className="text-sm">
                <p className="font-medium text-plum-900">{o.title}</p>
                <p className="text-ink-soft">{o.detail}</p>
                {o.mapsQuery && <a href={mapsSearch(o.mapsQuery)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-plum-900 underline underline-offset-2">Find nearest on Google Maps</a>}
              </li>
            ))}
          </ul>
        </Section>
        <Section id="signs" icon={<Warning weight="duotone" className="h-4 w-4" />} title="When to see a doctor" open={open === "signs"} onToggle={() => toggle("signs")}>
          <ul className="space-y-1.5 text-sm">
            {WARNING_SIGNS.map(s => (
              <li key={s.text} className={`flex gap-2 ${s.urgent ? "text-rose-700 font-medium" : "text-ink-soft"}`}>
                <span aria-hidden="true" className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${s.urgent ? "bg-rose-600" : "bg-blush-400"}`} />{s.text}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-faint">Emergency: call 112 or 108.</p>
        </Section>
      </div>
      <p className="mt-3 text-[11px] text-ink-faint">General hygiene guidance. Prices and free schemes vary by state; confirm with your ASHA worker or health centre.</p>
    </section>
  );
}

function Section({ id, icon, title, open, onToggle, children }: { id: string; icon: React.ReactNode; title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={`hyg-${id}`} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-plum-900 cursor-pointer hover:bg-lavender-50/60 rounded-2xl">
        <span className="flex items-center gap-2">{icon}{title}</span>
        <CaretDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <div id={`hyg-${id}`} className="px-4 pb-4">{children}</div>}
    </div>
  );
}
