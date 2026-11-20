"use client";

import Link from "next/link";
import { ArrowRight, EyeSlash, HandPalm, DownloadSimple, Stethoscope } from "@phosphor-icons/react";
import { Reveal } from "@/components/Reveal";
import { useLanguage } from "@/context/LanguageContext";

/** Privacy promises, the closing invitation, and the legal line. */
export function Footer() {
  const { t } = useLanguage();

  const promises = [
    { icon: HandPalm, title: t("landing.footerPromise1Title"), body: t("landing.footerPromise1Body") },
    { icon: EyeSlash, title: t("landing.footerPromise2Title"), body: t("landing.footerPromise2Body") },
    { icon: DownloadSimple, title: t("landing.footerPromise3Title"), body: t("landing.footerPromise3Body") },
    { icon: Stethoscope, title: t("landing.footerPromise4Title"), body: t("landing.footerPromise4Body") },
  ];

  return (
    <footer className="relative px-5 pt-8 pb-12 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <h2 className="max-w-sm text-balance text-3xl font-semibold leading-[1.1] tracking-tight text-plum-900 sm:text-[2.7rem]">
              {t("landing.footerTitle1")}{" "}
              <span className="display-serif font-normal text-lavender-600">{t("landing.footerTitle2")}</span>
            </h2>
            <p className="mt-4 max-w-sm text-pretty leading-relaxed text-ink-soft">
              {t("landing.footerDesc")}
            </p>
          </Reveal>
          <dl className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {promises.map(({ icon: PromiseIcon, title, body }, i) => (
              <Reveal key={title} delay={0.05 + i * 0.05}>
                <dt className="flex items-center gap-2.5 font-semibold text-plum-900">
                  <PromiseIcon size={20} weight="duotone" className="text-lavender-500" aria-hidden="true" />
                  {title}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</dd>
              </Reveal>
            ))}
          </dl>
        </div>

        <Reveal delay={0.1}>
          <div className="relative mt-24 overflow-hidden rounded-[34px] bg-gradient-to-br from-lavender-100 via-mist to-blush-100 px-6 py-14 text-center sm:px-12 sm:py-20">
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/50 blur-3xl breathe" />
            <h2 className="relative mx-auto max-w-xl text-balance text-3xl font-semibold leading-[1.12] tracking-tight text-plum-900 sm:text-[2.6rem]">
              {t("landing.ctaTitle1")}{" "}
              <span className="display-serif font-normal text-blush-500">{t("landing.ctaTitle2")}</span>
            </h2>
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-plum-900 px-7 py-3.5 text-sm font-semibold text-cream transition-[background-color,transform] duration-150 hover:bg-plum-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 focus-visible:ring-offset-2"
              >
                {t("landing.startFree")}
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-plum-700/20 bg-white/70 px-6 py-3.5 text-sm font-semibold text-plum-900 transition-[background-color,border-color] duration-150 hover:border-plum-700/40 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-500 focus-visible:ring-offset-2"
              >
                {t("landing.alreadyAccount")}
              </Link>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 flex flex-col gap-4 border-t border-plum-700/10 pt-8 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sakhi-round-logo.png" alt="" className="h-7 w-7 rounded-full" />
            <span className="text-sm font-semibold text-plum-900">Sakhi</span>
            <span>{t("landing.madeWithCare")}</span>
          </div>
          <p className="max-w-md sm:text-right">
            {t("landing.disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
