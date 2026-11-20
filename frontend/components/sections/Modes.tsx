"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CalendarDots,
  ChatCircleText,
  FirstAidKit,
  Scales,
  FileText,
  Baby,
  Footprints,
  Heartbeat,
  Timer,
  CalendarCheck,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Reveal } from "@/components/Reveal";
import { useLanguage } from "@/context/LanguageContext";

type Feature = { icon: Icon; title: string; body: string };
type ModeKey = "her" | "mom";
const ORDER: ModeKey[] = ["her", "mom"];

export function Modes() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<ModeKey>("her");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const modesData: Record<ModeKey, { label: string; note: string; features: Feature[] }> = {
    her: {
      label: t("landing.herMode"),
      note: t("landing.herModeNote"),
      features: [
        { icon: CalendarDots, title: t("landing.herFeature1Title"), body: t("landing.herFeature1Body") },
        { icon: ChatCircleText, title: t("landing.herFeature2Title"), body: t("landing.herFeature2Body") },
        { icon: FirstAidKit, title: t("landing.herFeature3Title"), body: t("landing.herFeature3Body") },
        { icon: Scales, title: t("landing.herFeature4Title"), body: t("landing.herFeature4Body") },
        { icon: FileText, title: t("landing.herFeature5Title"), body: t("landing.herFeature5Body") },
      ],
    },
    mom: {
      label: t("landing.momMode"),
      note: t("landing.momModeNote"),
      features: [
        { icon: Baby, title: t("landing.momFeature1Title"), body: t("landing.momFeature1Body") },
        { icon: Footprints, title: t("landing.momFeature2Title"), body: t("landing.momFeature2Body") },
        { icon: Heartbeat, title: t("landing.momFeature3Title"), body: t("landing.momFeature3Body") },
        { icon: Scales, title: t("landing.momFeature4Title"), body: t("landing.momFeature4Body") },
        { icon: Timer, title: t("landing.momFeature5Title"), body: t("landing.momFeature5Body") },
        { icon: CalendarCheck, title: t("landing.momFeature6Title"), body: t("landing.momFeature6Body") },
      ],
    },
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : ORDER.length - 1)) % ORDER.length;
    setMode(ORDER[next]);
    tabs.current[next]?.focus();
  };

  const current = modesData[mode];

  return (
    <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal>
          <h2 className="max-w-xl text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-plum-900 sm:text-[2.7rem]">
            {t("landing.modesTitle1")}{" "}
            <span className="display-serif font-normal text-lavender-600">{t("landing.modesTitle2")}</span>
          </h2>
          <p className="mt-4 max-w-lg text-pretty leading-relaxed text-ink-soft">
            {t("landing.modesDesc")}
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div role="tablist" aria-label="Sakhi modes" className="inline-flex rounded-full border border-plum-700/10 bg-white/60 p-1.5 backdrop-blur">
            {ORDER.map((key, i) => {
              const selected = key === mode;
              return (
                <button
                  key={key}
                  ref={(el) => { tabs.current[i] = el; }}
                  role="tab"
                  id={`mode-tab-${key}`}
                  aria-selected={selected}
                  aria-controls={`mode-panel-${key}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setMode(key)}
                  onKeyDown={(e) => onKey(e, i)}
                  className="relative cursor-pointer rounded-full px-5 py-2.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500"
                >
                  {selected && (
                    <motion.span
                      layoutId="mode-pill"
                      className="absolute inset-0 rounded-full bg-plum-900"
                      transition={{ type: "spring", stiffness: 300, damping: 30, duration: reduce ? 0 : undefined }}
                    />
                  )}
                  <span className={`relative ${selected ? "text-cream" : "text-ink-soft hover:text-plum-900"}`}>
                    {modesData[key].label}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>
      </div>

      <div
        role="tabpanel"
        id={`mode-panel-${mode}`}
        aria-labelledby={`mode-tab-${mode}`}
        className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.15fr]"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode + "-visual"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className={`relative overflow-hidden rounded-[30px] p-6 sm:p-8 ${mode === "her" ? "bg-mist" : "bg-blush-50"}`}
          >
            <p className="text-sm font-medium text-ink-soft">{current.note}</p>
            {mode === "her" ? <CycleStrip /> : <PregnancyGlance />}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={mode + "-list"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: reduce ? 0 : 0.05 }}
            className="divide-y divide-plum-700/10 rounded-[30px] border border-plum-700/10 bg-white/55 px-6 backdrop-blur sm:px-8"
          >
            {current.features.map(({ icon: FeatureIcon, title, body }) => (
              <li key={title} className="flex gap-4 py-5">
                <FeatureIcon size={22} weight="duotone" className="mt-0.5 shrink-0 text-lavender-500" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-plum-900">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{body}</p>
                </div>
              </li>
            ))}
          </motion.ul>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** A month at a glance, including the case most apps ignore: a late period. */
function CycleStrip() {
  const { t } = useLanguage();
  const days = Array.from({ length: 33 }, (_, i) => i + 1);
  const kind = (d: number) =>
    d <= 5 ? "period" : d >= 12 && d <= 16 ? "fertile" : d > 29 ? "late" : "other";
  const style: Record<string, string> = {
    period: "bg-blush-400",
    fertile: "bg-lavender-400",
    other: "bg-lavender-100",
    late: "bg-transparent border border-dashed border-blush-400",
  };
  return (
    <div className="mt-6">
      <p className="text-2xl font-semibold leading-snug text-plum-900 sm:text-3xl">
        {t("landing.periodLate3Days")}
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        {t("landing.periodLateDesc")}
      </p>
      <div className="mt-8 grid grid-cols-[repeat(33,minmax(0,1fr))] gap-[3px]" aria-hidden="true">
        {days.map((d) => (
          <span key={d} className={`h-10 rounded-full ${style[kind(d)]} ${d === 32 ? "ring-2 ring-plum-900 ring-offset-2 ring-offset-mist" : ""}`} />
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blush-400" />{t("cycle.period")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lavender-400" />{t("cycle.fertile")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-dashed border-blush-400" />{t("landing.lateDays")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-plum-900" />{t("common.today")}</span>
      </div>
    </div>
  );
}

function PregnancyGlance() {
  const { t } = useLanguage();
  return (
    <div className="mt-6">
      <p className="text-2xl font-semibold leading-snug text-plum-900 sm:text-3xl">
        {t("landing.week32Coconut")}
      </p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
        {t("landing.week32Desc")}
      </p>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/80 p-4">
          <p className="text-xs text-ink-soft">{t("landing.kicksToday")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-plum-900">10 <span className="text-sm font-normal text-ink-soft">{t("landing.in42Min")}</span></p>
        </div>
        <div className="rounded-2xl bg-white/80 p-4">
          <p className="text-xs text-ink-soft">{t("landing.bloodPressure")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-plum-900">118/76</p>
          <p className="text-xs font-medium text-emerald-700">{t("landing.inHealthyRange")}</p>
        </div>
        <div className="col-span-2 rounded-2xl bg-white/80 p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-ink-soft">{t("landing.weightGained")}</p>
            <p className="text-xs text-ink-soft">{t("landing.healthyRangeWeight")}</p>
          </div>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-plum-900">9.8 kg</p>
          <div className="relative mt-3 h-2.5 rounded-full bg-lavender-100" aria-hidden="true">
            <span className="absolute inset-y-0 left-[30%] right-[22%] rounded-full bg-emerald-200" />
            <span className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-plum-900 shadow" style={{ left: "calc(50% - 8px)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
