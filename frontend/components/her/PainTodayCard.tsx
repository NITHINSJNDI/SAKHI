"use client";

import { useMemo, useState } from "react";
import { Lightning, Trash, Heartbeat } from "@phosphor-icons/react";
import { panelCard } from "@/components/her/HerPanels";
import { PAIN_WHERE, painEvents, worstPain, type PainEvent } from "@/lib/painLog";
import { useLanguage } from "@/context/LanguageContext";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// 0 none, 1-3 mild, 4-6 moderate, 7-10 severe
const band = (n: number) => (n === 0 ? "None" : n <= 3 ? "Mild" : n <= 6 ? "Moderate" : "Severe");
const tone = (n: number) =>
  n === 0 ? "bg-emerald-100 text-emerald-800 border-emerald-200"
  : n <= 3 ? "bg-lime-100 text-lime-900 border-lime-200"
  : n <= 6 ? "bg-amber-100 text-amber-900 border-amber-200"
  : "bg-rose-100 text-rose-800 border-rose-200";
const barTone = (n: number) => (n === 0 ? "bg-emerald-400" : n <= 3 ? "bg-lime-400" : n <= 6 ? "bg-amber-400" : "bg-rose-500");

interface Props {
  logs: any[];
  /** called with the saved day log so the page updates its charts */
  onSaved: (log: any) => void;
  onOpenRelief?: () => void;
  className?: string;
}

/** Pain can change through the day: log it as often as it changes. */
export default function PainTodayCard({ logs, onSaved, onOpenRelief, className = "" }: Props) {
  const { t } = useLanguage();
  const today = todayKey();
  const entry = useMemo(() => logs.find(l => String(l?.log_date || "").startsWith(today)), [logs, today]);
  const events: PainEvent[] = useMemo(() => painEvents(entry), [entry]);
  const worst = entry ? worstPain(entry) : 0;

  const [level, setLevel] = useState<number | null>(null);
  const [where, setWhere] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (level === null || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/pain-log", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, where, date: today }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      onSaved(data.log);
      setLevel(null); setWhere([]);
    } catch {
      setError("Couldn't save that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (at: string) => {
    try {
      const res = await fetch("/api/pain-log", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ at, date: today }),
      });
      const data = await res.json();
      if (res.ok) onSaved(data.log);
    } catch { /* stays as is */ }
  };

  const rising = events.length >= 2 && events[events.length - 1].level >= events[events.length - 2].level + 3;

  return (
    <section className={`${panelCard} ${className}`} aria-labelledby="pain-today-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="pain-today-title" className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-plum-900">
            <Lightning size={20} weight="duotone" className="text-rose-500" aria-hidden="true" /> {t("relief.painRightNow", "Pain right now")}
          </h3>
          <p className="mt-1 text-sm text-plum-900/65">{t("relief.painCanChange", "Pain can change through the day. Log it whenever it does.")}</p>
        </div>
        {events.length > 0 && (
          <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${tone(worst)}`}>
            {t("relief.worstToday", "Worst today")}: {worst}/10
          </span>
        )}
      </div>

      <div className="mt-4" role="radiogroup" aria-label="Pain level from 0 to 10">
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={level === n}
              aria-label={`${n} out of 10, ${band(n)}`}
              onClick={() => setLevel(n)}
              className={`h-10 rounded-xl border text-sm font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${
                level === n ? "border-plum-900 bg-plum-900 text-cream" : `${tone(n)} hover:brightness-95`
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-plum-900/55">
          <span>{t("checkin.painNone", "No pain")}</span><span>{t("checkin.painModerate", "Moderate")}</span><span>{t("relief.worst", "Worst")}</span>
        </div>
      </div>

      {level !== null && level > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-plum-900/70">Where? (optional)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {PAIN_WHERE.map(w => {
              const on = where.includes(w);
              return (
                <button
                  key={w}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setWhere(on ? where.filter(x => x !== w) : [...where, w])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 ${
                    on ? "border-plum-900 bg-plum-900 text-cream" : "border-plum-900/15 bg-white text-plum-900 hover:bg-lavender-50"
                  }`}
                >
                  {w}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={level === null || busy}
          aria-busy={busy}
          className="rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-plum-800 disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
        >
          {busy ? "Saving…" : level === null ? "Pick a number" : `Log ${level}/10 at ${timeOf(new Date().toISOString())}`}
        </button>
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      </div>

      {events.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-medium text-plum-900/70">Today</p>
          <ol className="mt-2 flex flex-col gap-2">
            {events.map(e => (
              <li key={e.at} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs tabular-nums text-plum-900/70">{timeOf(e.at)}</span>
                <div className="h-2.5 flex-1 rounded-full bg-plum-900/[0.07] overflow-hidden" aria-hidden="true">
                  <div className={`h-full rounded-full ${barTone(e.level)}`} style={{ width: `${Math.max(e.level * 10, 4)}%` }} />
                </div>
                <span className="w-24 shrink-0 text-xs text-plum-900">
                  <b>{e.level}/10</b>{e.where?.length ? ` · ${e.where.join(", ")}` : ""}
                </span>
                {e.source !== "check-in" && (
                  <button
                    type="button"
                    onClick={() => remove(e.at)}
                    aria-label={`Remove the ${timeOf(e.at)} entry`}
                    className="rounded-full p-1 text-plum-900/35 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
                  >
                    <Trash size={14} />
                  </button>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {(worst >= 5 || rising) && (
        <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${worst >= 8 ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-900"}`}>
          <p className="flex items-start gap-2">
            <Heartbeat size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              {rising ? "Your pain has gone up a lot since the last log. " : ""}
              {worst >= 8
                ? "Pain this strong is worth a doctor's check, especially if painkillers don't help or you have fever or very heavy bleeding."
                : "Warmth on your tummy, rest and water can help."}
              {onOpenRelief && (
                <> <button type="button" onClick={onOpenRelief} className="font-semibold underline underline-offset-2 cursor-pointer">Open pain relief</button></>
              )}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
