"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useMotionValue, animate } from "motion/react";

/**
 * IntroOverlay — full-screen load-time intro (Stages 1 & 2).
 *
 * Stage 1: a petal vortex swirls inward from the screen edges, revealing a
 *          central angel placeholder + "SAKHI" wordmark from the eye of the
 *          storm, with drifting light particles.
 * Stage 2: the angel + text shrink and glide into the top-left corner (the
 *          exact coordinates of ScrollLogo), the vortex sweeps away, and the
 *          overlay fades out. onComplete() then lets the page reveal content.
 *
 * Real art: the central/hero figure is /angel-fullbody.png (falls back to
 * /logo.png). The settled corner mark is handled by ScrollLogo (/angel-bust.png).
 *
 * The parent (page.tsx) gates this behind sessionStorage + reduced-motion, so
 * it only mounts when the intro should actually play.
 */

// One clock, in seconds. Dismiss lands at ~2.3s; the failsafe in app/page.tsx (3.4s)
// is only a backstop and must stay comfortably above this total.
const ENTER = 1.0; // logo + aura arrive
const HOLD = 0.35; // settled beat
const TRANSITION = 0.7; // glide to the corner dock
const EXIT = 0.35; // overlay dissolve (starts while the glide lands, so the hand-off overlaps)
const DISSOLVE_AT = 0.85; // fraction of TRANSITION at which the dissolve begins

const EASE_OUT = [0.16, 1, 0.3, 1] as const; // expo-out: fast arrival, long soft settle
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const; // symmetric glide

const PETAL_COUNT = 72;
const VORTEX_EYE = 52; // px — petals cradle the central emblem

type Petal = {
  angle: number;
  radius: number;
  angVel: number;
  radialVel: number; // target inward speed, px/s
  vel: number; // current radial speed, eased toward the target
  size: number;
  rotation: number;
  rotVel: number;
  hue: 0 | 1;
  alpha: number;
  depth: number;
};

const PALETTE = [
  ["#ece0f7", "#d9c2ee", "#c3a3e4", "#a982d6"], // lavender
  ["#fbe5ea", "#f6c6d2", "#ee9fb1", "#e2758d"], // pink
];

// Pre-rendered offscreen sprite cache for 60fps petal rendering without canvas gradient allocations per frame
let spriteCache: HTMLCanvasElement[] | null = null;
const SPRITE_SIZE = 32;

function getPetalSprites(): HTMLCanvasElement[] {
  if (spriteCache) return spriteCache;
  if (typeof document === "undefined") return [];

  spriteCache = [];
  const tints = [
    { inner: "rgba(236, 224, 247, 0.95)", mid: "rgba(195, 163, 228, 0.8)", outer: "rgba(169, 130, 214, 0)" },
    { inner: "rgba(251, 229, 234, 0.95)", mid: "rgba(238, 159, 177, 0.8)", outer: "rgba(226, 117, 141, 0)" },
  ];

  for (const t of tints) {
    const c = document.createElement("canvas");
    c.width = SPRITE_SIZE * 2;
    c.height = SPRITE_SIZE * 2;
    const ctx = c.getContext("2d");
    if (ctx) {
      const cx = SPRITE_SIZE;
      const cy = SPRITE_SIZE;
      ctx.beginPath();
      ctx.moveTo(cx, cy - SPRITE_SIZE * 0.8);
      ctx.bezierCurveTo(
        cx + SPRITE_SIZE * 0.6,
        cy - SPRITE_SIZE * 0.4,
        cx + SPRITE_SIZE * 0.5,
        cy + SPRITE_SIZE * 0.6,
        cx,
        cy + SPRITE_SIZE * 0.8
      );
      ctx.bezierCurveTo(
        cx - SPRITE_SIZE * 0.5,
        cy + SPRITE_SIZE * 0.6,
        cx - SPRITE_SIZE * 0.6,
        cy - SPRITE_SIZE * 0.4,
        cx,
        cy - SPRITE_SIZE * 0.8
      );
      ctx.closePath();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, SPRITE_SIZE);
      grad.addColorStop(0, t.inner);
      grad.addColorStop(0.5, t.mid);
      grad.addColorStop(1, t.outer);
      ctx.fillStyle = grad;
      ctx.fill();
    }
    spriteCache.push(c);
  }
  return spriteCache;
}

const PARTICLES = [
  { top: "20%", left: "36%", size: 8, color: "bg-lavender-300", delay: 0.2 },
  { top: "28%", left: "62%", size: 6, color: "bg-blush-300", delay: 0.4 },
  { top: "58%", left: "42%", size: 10, color: "bg-lavender-200", delay: 0.3 },
  { top: "65%", left: "59%", size: 6, color: "bg-blush-200", delay: 0.5 },
  { top: "38%", left: "52%", size: 7, color: "bg-lavender-300", delay: 0.25 },
  { top: "46%", left: "32%", size: 5, color: "bg-blush-300", delay: 0.45 },
];

export function IntroOverlay({ onComplete }: { onComplete: () => void }) {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<1 | 2>(1);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // Group transform (center -> top-left corner) + overlay opacity.
  const overlayOpacity = useMotionValue(1);
  const groupX = useMotionValue(
    typeof window !== "undefined" ? window.innerWidth / 2 : 0
  );
  const groupY = useMotionValue(
    typeof window !== "undefined" ? window.innerHeight / 2 : 0
  );
  const groupScale = useMotionValue(3.4);
  const innerTx = useMotionValue("-50%");
  const innerTy = useMotionValue("-50%");
  const taglineOpacity = useMotionValue(0);

  // Logo entrance: a short rise + gentle scale-up, no tilt or overshoot
  const logoY = useMotionValue(16);
  const logoScale = useMotionValue(0.92);
  const logoOpacity = useMotionValue(0);
  const auraScale = useMotionValue(0.6);
  const auraOpacity = useMotionValue(0);

  // ---- Vortex canvas ----
  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = window.innerWidth;
    let h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(w, h) / 2;

    const petals: Petal[] = [];
    for (let i = 0; i < PETAL_COUNT; i++) {
      const depth = 0.4 + Math.random() * 0.6;
      // Speeds scale with screen size so the swirl reaches the eye on any display.
      const radialVel = maxR * (0.22 + Math.random() * 0.28) * (0.6 + depth * 0.4);
      petals.push({
        angle: Math.random() * Math.PI * 2,
        radius: (0.45 + Math.random() * 0.5) * maxR,
        angVel: (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.8),
        radialVel,
        vel: radialVel * 0.35, // eases up to speed instead of starting at full tilt
        size: (7 + Math.random() * 13) * depth,
        rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 0.04,
        hue: Math.random() > 0.45 ? 0 : 1,
        alpha: 0,
        depth,
      });
    }

    const sprites = getPetalSprites();

    // One setTransform per petal (no save/restore) keeps 60fps on modest GPUs.
    const drawPetal = (p: Petal) => {
      const sprite = sprites[p.hue];
      if (!sprite) return;
      const s = ((p.size * 2) / (SPRITE_SIZE * 2)) * dpr;
      const cos = Math.cos(p.rotation) * s;
      const sin = Math.sin(p.rotation) * s;
      ctx.setTransform(
        cos,
        sin,
        -sin,
        cos,
        (cx + Math.cos(p.angle) * p.radius) * dpr,
        (cy + Math.sin(p.angle) * p.radius) * dpr
      );
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.drawImage(sprite, -SPRITE_SIZE, -SPRITE_SIZE);
    };

    let raf = 0;
    const start = performance.now();
    let last = start;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const introRamp = Math.min(1, (now - start) / 600); // petals fade in, never pop
      const dispersing = stageRef.current === 2;
      // Frame-rate-independent smoothing factors.
      const kVel = 1 - Math.exp(-dt * 4);
      const kAlpha = 1 - Math.exp(-dt * (dispersing ? 5 : 8));

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of petals) {
        // Direction changes ease through zero instead of snapping.
        const targetVel = dispersing ? -p.radialVel * 1.8 : p.radialVel;
        p.vel += (targetVel - p.vel) * kVel;
        p.radius -= p.vel * dt;
        p.angle += p.angVel * dt;
        p.rotation += (p.rotVel * 60 + p.angVel * 1.2) * dt;

        // Petals that reach the eye are recycled to the rim instead of piling up.
        if (!dispersing && p.radius < VORTEX_EYE) {
          p.radius = maxR * (0.9 + Math.random() * 0.4);
          p.alpha = 0;
        }

        const eyeFade = Math.min(1, Math.max(0, (p.radius - VORTEX_EYE) / (VORTEX_EYE * 2)));
        const targetAlpha = dispersing ? 0 : (0.45 + p.depth * 0.45) * eyeFade * introRamp;
        p.alpha += (targetAlpha - p.alpha) * kAlpha;

        if (p.alpha > 0.01 && p.radius < maxR * 1.4) drawPetal(p);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("resize", resize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduce]);

  // ---- Timeline: reveal (JSX) + transition/completion (timers) ----
  useEffect(() => {
    if (reduce) {
      onCompleteRef.current();
      return;
    }

    finishRef.current = () => {
      if (doneRef.current) {
        onCompleteRef.current();
        return;
      }
      doneRef.current = true;
      try {
        animate(overlayOpacity, 0, {
          duration: EXIT,
          ease: "easeInOut",
          onComplete: () => onCompleteRef.current(),
        });
      } catch {
        onCompleteRef.current();
      }
      // Guaranteed dismiss fallback: never rely solely on animation frame callback
      setTimeout(() => {
        onCompleteRef.current();
      }, (EXIT + 0.1) * 1000);
    };

    const finish = finishRef.current;

    // ── Entrance (0 → ENTER): everything arrives on the same expo-out curve ──
    const enter = { duration: ENTER, ease: EASE_OUT };
    animate(logoOpacity, 1, { duration: 0.6, ease: "easeOut" });
    animate(logoY, 0, enter);
    animate(logoScale, 1, enter);
    animate(auraOpacity, 1, { ...enter, delay: 0.1 });
    animate(auraScale, 1, { ...enter, delay: 0.1 });
    animate(taglineOpacity, 1, { duration: 0.5, ease: "easeOut", delay: 0.4 });

    // ── Dock (ENTER + HOLD → +TRANSITION): one symmetric glide to the corner ──
    const t1 = setTimeout(() => {
      stageRef.current = 2; // petals disperse (velocity eases through zero)
      const glide = { duration: TRANSITION, ease: EASE_IN_OUT };
      animate(taglineOpacity, 0, { duration: 0.25, ease: "easeIn" });
      animate(auraOpacity, 0, { duration: TRANSITION * 0.8, ease: "easeInOut" });
      // Dock coordinates: aligns precisely with ScrollLogo (top-3, left-6 on mobile, left-8 on sm+)
      const targetX = typeof window !== "undefined" && window.innerWidth >= 640 ? 32 : 24;
      const targetY = 12;
      animate(groupX, targetX, glide);
      animate(groupY, targetY, glide);
      animate(groupScale, 1, glide);
      animate(innerTx, "0%", glide);
      animate(innerTy, "0%", glide);
    }, (ENTER + HOLD) * 1000);

    // The backdrop dissolves while the glide is landing, so the hand-off overlaps.
    const t2 = setTimeout(finish, (ENTER + HOLD + TRANSITION * DISSOLVE_AT) * 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  if (reduce) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden bg-cream cursor-pointer"
      style={{ opacity: overlayOpacity }}
      aria-hidden="true"
      onClick={() => onCompleteRef.current()}
      title="Click anywhere to skip intro"
    >
      {/* Petal vortex */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Drifting light particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`pointer-events-none absolute rounded-full ${p.color} blur-[2px]`}
          style={{ top: p.top, left: p.left, width: p.size, height: p.size }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0.6, 0.3], y: [0, -8, -16] }}
          transition={{ duration: ENTER + HOLD, delay: p.delay, ease: "easeOut" }}
        />
      ))}

      {/* Angel + SAKHI group (center -> corner) */}
      <motion.div
        className="fixed left-0 top-0 will-change-transform"
        style={{ x: groupX, y: groupY, scale: groupScale, transformOrigin: "left top" }}
      >
        <motion.div
          className="relative flex flex-col items-center gap-2"
          style={{ x: innerTx, y: innerTy }}
        >
          {/* Soft luminous aura behind the logo. No CSS animation here: the `breathe`
              keyframes overrode these motion values and made the aura pop. */}
          <motion.span
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-lavender-300/60 via-blush-200/50 to-pink-300/40 blur-3xl will-change-transform"
            style={{ opacity: auraOpacity, scale: auraScale }}
          />
          <motion.span
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 blur-xl will-change-transform"
            style={{ opacity: auraOpacity, scale: auraScale }}
          />

          {/* Logo: short rise + gentle scale-up */}
          <motion.div
            className="will-change-transform"
            style={{
              y: logoY,
              scale: logoScale,
              opacity: logoOpacity,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/original-logo.png?v=4"
              alt="Sakhi — Your AI Health Companion"
              className="h-14 sm:h-16 w-auto object-contain mix-blend-multiply drop-shadow-sm select-none"
              draggable={false}
            />
          </motion.div>

          {/* Subtle poetic whisper that emerges at center and gently departs before corner dock */}
          <motion.p
            aria-hidden
            className="display-serif pointer-events-none mt-0.5 text-[15px] leading-none text-plum/75"
            style={{ opacity: taglineOpacity }}
          >
            Your AI health companion
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
