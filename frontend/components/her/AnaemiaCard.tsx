"use client";

import { useEffect, useMemo, useState } from "react";
import { Drop } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { anaemiaWatch, IRON_FOODS, type AnaemiaLevel } from "@/lib/anaemia";
import type { LabResult } from "@/lib/labs";
import { useLanguage } from "@/context/LanguageContext";
import { useUserDoc } from "@/hooks/useUserDoc";
import { EMPTY_TABLETS, type TabletsDoc } from "@/lib/tablets";
import { EMPTY_HYGIENE, pbacByPeriod, type HygieneDoc } from "@/lib/hygiene";

const BADGE: Record<AnaemiaLevel, { text: string; cls: string }> = {
  clear: { text: "Looks fine", cls: "bg-emerald-100 text-emerald-800" },
  watch: { text: "Keep an eye", cls: "bg-amber-100 text-amber-800" },
  check: { text: "Worth a blood test", cls: "bg-rose-100 text-rose-700" },
  low: { text: "Low iron", cls: "bg-rose-600 text-white" },
};

/** Iron check from her flow, tiredness and lab results. */
export default function AnaemiaCard({ logs, className = "" }: { logs: any[]; className?: string }) {
  const { t } = useLanguage();
  const [labs, setLabs] = useState<LabResult[]>([]);
  const { doc: tablets } = useUserDoc<TabletsDoc>("tablets", EMPTY_TABLETS);
  const { doc: hygiene } = useUserDoc<HygieneDoc>("hygiene", EMPTY_HYGIENE);

  useEffect(() => {
    const load = () => fetch("/api/lab-report", { cache: "no-store" }).then(r => r.json()).then(j => setLabs(j.results || [])).catch(() => {});
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const takingIron = tablets.list.some(t => /iron|ifa|ferrous/i.test(t.name));
  // Highest blood-loss score among her last 3 logged periods (pads with at least 5 entries)
  const pbac = useMemo(() => {
    const scored = pbacByPeriod(hygiene.pads).slice(-3).filter(p => p.items >= 5);
    return scored.length ? Math.max(...scored.map(p => p.score)) : null;
  }, [hygiene.pads]);
  const w = useMemo(() => anaemiaWatch(logs, labs, takingIron, pbac), [logs, labs, takingIron, pbac]);
  const badgeCls = w.level === "clear" ? "bg-emerald-100 text-emerald-800" : w.level === "watch" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700";
  const badgeText = w.level === "clear" ? t("anaemia.looksFine") : w.level === "watch" ? t("anaemia.watch") : t("anaemia.seeDoctor");

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="iron-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Drop weight="duotone" className="h-5 w-5 text-blush-500" aria-hidden="true" />
          <h3 id="iron-title" className="text-xl font-semibold tracking-tight text-plum-900">{t("anaemia.title")}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeCls}`}>{badgeText}</span>
      </div>
      <p className="mt-3 text-base font-medium text-plum-900">{w.level === "clear" && logs.length < 2 ? t("anaemia.notEnoughData") : w.headline}</p>
      {w.reasons.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-ink-soft">
          {w.reasons.map(r => <li key={r} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blush-400" />{r}</li>)}
        </ul>
      )}
      <p className="mt-3 rounded-2xl bg-lavender-50 p-3 text-sm text-plum-900">{logs.length < 2 ? t("anaemia.logFlowPrompt") : w.next}</p>
      {w.level !== "clear" && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-plum-900/65 mb-2">Iron-rich food to add</p>
          <div className="flex flex-wrap gap-1.5">
            {IRON_FOODS.map(f => <span key={f} className="rounded-full bg-white/80 border border-plum-900/[0.07] px-2.5 py-1 text-xs text-plum-900">{f}</span>)}
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">Skip tea or coffee for an hour around meals: it blocks iron.</p>
        </div>
      )}
      <p className="mt-3 text-[11px] text-ink-faint">{t("anaemia.disclaimer")}</p>
    </section>
  );
}
