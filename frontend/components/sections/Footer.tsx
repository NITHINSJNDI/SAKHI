"use client";

import { motion, useReducedMotion } from "motion/react";
import { ShieldCheck, EyeSlash, Lock } from "@phosphor-icons/react";
import { Reveal } from "@/components/Reveal";
import { Badge, MagneticButton } from "@/components/kokonut";
import { ArrowRight } from "@phosphor-icons/react";

/**
 * Footer — minimalist, with the signature Privacy First / Disguise Mode badge.
 * Ends on a calm closing CTA before the legal line.
 */
export function Footer() {
  const reduce = useReducedMotion();

  return (
    <footer id="privacy" className="relative px-6 pt-24 pb-12">
      <div className="mx-auto max-w-6xl">
        {/* Closing CTA band */}
        <Reveal>
          <div className="relative overflow-hidden rounded-[34px] bg-plum-900 px-7 py-14 text-center sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-20 left-1/4 h-60 w-60 rounded-full bg-lavender-500/25 blur-3xl breathe"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-16 right-1/4 h-60 w-60 rounded-full bg-blush-400/20 blur-3xl breathe"
              style={{ animationDelay: "2.5s" }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-xl text-balance text-3xl leading-[1.15] tracking-tight text-cream sm:text-4xl">
                Your body has been telling you things.
                <br />
                <span className="display-serif text-lavender-200">Start listening.</span>
              </h2>

            </div>
          </div>
        </Reveal>

        {/* Privacy badge row */}
        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <Badge variant="plum">
                <ShieldCheck size={13} weight="bold" />
                Privacy First
              </Badge>
              <Badge variant="outline">
                <EyeSlash size={13} weight="bold" />
                Disguise Mode
              </Badge>
              <Badge variant="outline">
                <Lock size={13} weight="bold" />
                On-device encryption
              </Badge>
            </div>
            <p className="max-w-xs text-center text-[11px] leading-relaxed text-ink-soft sm:text-right">
              Disguise Mode hides Sakhi behind an innocent-looking app icon and
              name. Your data never leaves your phone unless you choose to share.
            </p>
          </div>
        </Reveal>

        {/* Legal line */}
        <Reveal delay={0.16}>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-plum-700/10 pt-8 sm:flex-row">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-lavender-400 to-blush-400 text-xs font-bold text-white">
                S
              </span>
              <span className="text-sm font-semibold text-plum-900">Sakhi</span>
            </div>
            <p className="text-[11px] text-ink-faint">
              Made with care, for the women of Bharat. © {new Date().getFullYear()} Sakhi Health.
            </p>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
