"use client";

import { useState } from "react";
import { Flower } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { useLanguage } from "@/context/LanguageContext";
import type { PhaseInfo } from "@/lib/cyclePhase";

const SIGNS = [
  { key: "hair_growth", label: "Extra hair on face, chest or belly" },
  { key: "pimples", label: "Pimples or acne that keep coming back" },
  { key: "skin_darkening", label: "Dark, velvety skin on the neck or underarms" },
  { key: "hair_loss", label: "Hair thinning on the head" },
  { key: "weight_gain", label: "Weight gain that is hard to explain" },
] as const;
type SignKey = (typeof SIGNS)[number]["key"];

const LEVEL = {
  High: { text: "Worth seeing a doctor", cls: "bg-rose-100 text-rose-700" },
  Moderate: { text: "Keep an eye", cls: "bg-amber-100 text-amber-800" },
  Low: { text: "Low chance", cls: "bg-emerald-100 text-emerald-800" },
} as const;

/**
 * PCOS symptom check: her cycle pattern comes from her logs, she answers five
 * yes/no questions, and the symptom model (trained on 541 women in Kerala)
 * gives a screening result. Never a diagnosis.
 */
export default function PcosCheckCard({ phase, profile, className = "" }: { phase: PhaseInfo; profile: any; className?: string }) {
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<Record<SignKey, boolean>>({ hair_growth: false, pimples: false, skin_darkening: false, hair_loss: false, weight_gain: false });
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const irregular = (phase.variability ?? 0) > 9 || phase.cycleLength > 35 || phase.cycleLength < 21
    || profile?.cycle_regularity === "No" || profile?.cycle_regularity === "Irregular";
  const age = Number(profile?.age) || null;
  const bmi = Number(profile?.bmi) || null;

  const signLabels: Record<SignKey, string> = {
    hair_growth: t("pcos.facialHair"),
    pimples: t("pcos.acne"),
    skin_darkening: t("pcos.moodSwings"),
    hair_loss: t("pcos.hairThinning"),
    weight_gain: t("pcos.weightGain"),
  };

  const check = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/predict/pcos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_regularity: irregular ? 0 : 1,
          cycle_length: phase.learned ? Math.round(phase.cycleLength) : null,
          period_days: phase.usualPeriodLength,
          acne_severity: answers.pimples ? 5 : 0,
          hair_growth: answers.hair_growth, skin_darkening: answers.skin_darkening,
          hair_loss: answers.hair_loss, weight_gain: answers.weight_gain,
          ...(age ? { age } : {}), ...(bmi ? { bmi } : {}),
        }),
      });
      setResult(res.ok ? await res.json() : { error: true });
    } catch {
      setResult({ error: true });
    } finally {
      setBusy(false);
    }
  };

  const level = result?.risk_level as keyof typeof LEVEL | undefined;
  const drivers: any[] = (result?.ml?.explanation || []).filter((e: any) => e.impact > 0.15).slice(0, 3);

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="pcos-title">
      <div className="flex items-center gap-2">
        <Flower weight="duotone" className="h-5 w-5 text-blush-500" aria-hidden="true" />
        <h3 id="pcos-title" className="text-xl font-semibold tracking-tight text-plum-900">{t("pcos.title")}</h3>
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        {irregular ? t("pcos.fromLogsIrregular") : t("pcos.fromLogsRegular")}, {t("pcos.periodsLastAbout", { days: phase.usualPeriodLength })}
      </p>
      <div className="mt-3 space-y-2">
        {SIGNS.map(s => (
          <label key={s.key} className="flex items-center gap-3 rounded-xl border border-plum-900/[0.07] bg-white/75 px-3 py-2 text-sm text-plum-900 cursor-pointer">
            <input type="checkbox" checked={answers[s.key]} onChange={e => { setAnswers(a => ({ ...a, [s.key]: e.target.checked })); setResult(null); }} />
            {signLabels[s.key] || s.label}
          </label>
        ))}
      </div>
      <button type="button" onClick={check} disabled={busy} className="mt-4 rounded-full bg-plum-900 px-4 py-2 text-sm font-medium text-cream hover:bg-plum-900/90 disabled:opacity-60 cursor-pointer">
        {busy ? t("pcos.checking") : t("pcos.checkButton")}
      </button>

      {result?.error && <p className="mt-3 text-sm text-rose-700">Couldn&apos;t check right now. Please try again.</p>}
      {level && LEVEL[level] && (
        <div className="mt-4 rounded-2xl bg-lavender-50 p-4">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${LEVEL[level].cls}`}>{LEVEL[level].text}</span>
          {drivers.length > 0 && <p className="mt-2 text-sm text-plum-900">Mostly because of: {drivers.map(d => d.label.toLowerCase()).join(", ")}.</p>}
          <p className="mt-2 text-sm text-plum-900">
            {level === "Low"
              ? t("pcos.negative")
              : t("pcos.positive")}
          </p>
        </div>
      )}
      <p className="mt-3 text-[11px] text-ink-faint">
        {t("pcos.disclaimer")}
      </p>
    </section>
  );
}
