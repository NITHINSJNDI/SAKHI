"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useSession } from "next-auth/react";
import { PetalWind } from "@/components/PetalWind";
import { Navigation } from "@/components/sections/Navigation";
import { ScrollLogo } from "@/components/ScrollLogo";
import { IntroOverlay } from "@/components/IntroOverlay";
import { Hero } from "@/components/sections/Hero";
import { AhaMoment } from "@/components/sections/AhaMoment";
import { Modes } from "@/components/sections/Modes";
import { TalkToSakhi } from "@/components/sections/TalkToSakhi";
import { Footer } from "@/components/sections/Footer";

const INTRO_KEY = "sakhi-intro-played";

export default function Home() {
  const reduce = useReducedMotion();
  const { status } = useSession();
  // "pending" is the server render and the first client render: the page is covered, so the
  // real page and corner logo never flash before the intro mounts after hydration.
  const [phase, setPhase] = useState<"pending" | "play" | "done">("pending");
  const playIntro = phase === "play";
  const introDone = phase === "done";

  // Play intro ONLY on first entry/open of application; skip when returning via back button
  useEffect(() => {
    try {
      const hasPlayed = sessionStorage.getItem(INTRO_KEY);
      setPhase(hasPlayed === "true" || reduce ? "done" : "play");
    } catch (e) {
      setPhase("done");
    }
  }, [reduce]);

  useEffect(() => {
    // Absolute failsafe: the landing page must ALWAYS be revealed. The intro dismisses itself
    // at ~2.3s (see IntroOverlay timings); this is only a backstop, so keep it well above that.
    const failsafe = setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(INTRO_KEY, "true");
      } catch {}
    }, 3400);
    return () => clearTimeout(failsafe);
  }, []);

  const handleIntroComplete = () => {
    try {
      sessionStorage.setItem(INTRO_KEY, "true");
    } catch (e) {}
    setPhase("done");
  };

  return (
    <>
      {phase === "pending" && (
        <div aria-hidden="true" className="fixed inset-0 z-[100] bg-cream" />
      )}
      {playIntro && <IntroOverlay onComplete={handleIntroComplete} />}

      <ScrollLogo />
      {/* Continuous petal-wind background, fixed behind everything */}
      <PetalWind />

      <Navigation />

      {/* Main content stays in the DOM (for SEO/accessibility) */}
      <main
        id="main"
        className={`relative transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          introDone
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-90"
        }`}
      >
        <section id="hero" aria-label="Introduction">
          <Hero />
        </section>
        <section id="modes" aria-label="Her Mode and Mom Mode" className="scroll-mt-20">
          <Modes />
        </section>
        <section id="insights" aria-label="Cycle and mood insights" className="scroll-mt-20">
          <AhaMoment />
        </section>
        <section id="talk" aria-label="Talk to Sakhi" className="scroll-mt-20">
          <TalkToSakhi />
        </section>
        <section id="privacy" aria-label="Privacy" className="scroll-mt-20">
          <Footer />
        </section>
      </main>
    </>
  );
}
