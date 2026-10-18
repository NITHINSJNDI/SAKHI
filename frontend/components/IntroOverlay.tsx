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

const STAGE1 = 0.9; // s — vortex in + reveal
const HOLD = 0.2; // s — hold revealed state
const TRANSITION = 0.6; // s — shrink + glide to corner
const EXIT = 0.25; // s — overlay fade out

const PETAL_COUNT = 80;
const VORTEX_EYE = 70; // px — petals settle into a ring near center

type Petal = {
  angle: number;
  radius: number;
  angVel: number;
  radialVel: number;
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

const PARTICLES = [
  { top: "22%", left: "38%", size: 8, color: "bg-lavender-300", dur: 4 },
  { top: "30%", left: "60%", size: 6, color: "bg-blush-300", dur: 5 },
  { top: "55%", left: "44%", size: 10, color: "bg-lavender-200", dur: 6 },
  { top: "62%", left: "58%", size: 5, color: "bg-blush-200", dur: 4.5 },
  { top: "40%", left: "50%", size: 7, color: "bg-lavender-300", dur: 5.5 },
  { top: "48%", left: "34%", size: 6, color: "bg-blush-300", dur: 5 },
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
  const groupScale = useMotionValue(4.5);
  const innerTx = useMotionValue("-50%");
  const innerTy = useMotionValue("-50%");

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
      petals.push({
        angle: Math.random() * Math.PI * 2,
        radius: (0.55 + Math.random() * 0.7) * maxR,
        angVel: (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 0.8),
        radialVel: (70 + Math.random() * 130) * depth,
        size: (7 + Math.random() * 13) * depth,
        rotation: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 0.04,
        hue: Math.random() > 0.45 ? 0 : 1,
        alpha: 0,
        depth,
      });
    }

    const drawPetal = (p: Petal) => {
      const colors = PALETTE[p.hue];
      const c = colors[Math.floor(p.depth * (colors.length - 1))];
      const x = cx + Math.cos(p.angle) * p.radius;
      const y = cy + Math.sin(p.angle) * p.radius;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p.rotation);
      const s = p.size;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.shadowColor = c;
      ctx.shadowBlur = 8 * p.depth;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.bezierCurveTo(s * 0.7, -s * 0.5, s * 0.6, s * 0.7, 0, s);
      ctx.bezierCurveTo(-s * 0.6, s * 0.7, -s * 0.7, -s * 0.5, 0, -s);
      ctx.closePath();
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
      grad.addColorStop(0, c);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const stage = stageRef.current;
      for (const p of petals) {
        p.angle += p.angVel * dt;
        if (stage === 1) {
          p.radius -= p.radialVel * dt;
          if (p.radius < VORTEX_EYE) p.radius = VORTEX_EYE;
          p.alpha += dt * 1.6;
          if (p.alpha > 1) p.alpha = 1;
          p.alpha *= 0.55 + p.depth * 0.45;
        } else {
          p.radius += p.radialVel * 2.4 * dt;
          p.alpha -= dt * 1.1;
        }
        p.rotation += p.rotVel + p.angVel * 0.02;
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
      if (doneRef.current) return;
      doneRef.current = true;
      animate(overlayOpacity, 0, {
        duration: EXIT,
        ease: "easeInOut",
        onComplete: () => onCompleteRef.current(),
      });
    };

    const finish = finishRef.current;

    const t1 = setTimeout(() => {
      stageRef.current = 2;
      const ease = [0.22, 1, 0.36, 1] as const;
      animate(groupX, 24, { duration: TRANSITION, ease });
      animate(groupY, 12, { duration: TRANSITION, ease });
      animate(groupScale, 1, { duration: TRANSITION, ease });
      animate(innerTx, "0%", { duration: TRANSITION, ease });
      animate(innerTy, "0%", { duration: TRANSITION, ease });
    }, (STAGE1 + HOLD) * 1000);

    const t2 = setTimeout(finish, (STAGE1 + HOLD + TRANSITION) * 1000);

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
      onClick={() => finishRef.current?.()}
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
          animate={{ y: [0, -14, 0], opacity: [0.25, 0.7, 0.25] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Angel + SAKHI group (center -> corner) */}
      <motion.div
        className="fixed left-0 top-0"
        style={{ x: groupX, y: groupY, scale: groupScale, transformOrigin: "left top" }}
      >
        <motion.div
          className="flex items-center gap-2"
          style={{ x: innerTx, y: innerTy }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: STAGE1, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* glow behind the figure */}
          <span
            aria-hidden
            className="breathe absolute left-1/2 top-1/2 -z-10 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-lavender-300/50 to-blush-300/50 blur-2xl mix-blend-multiply"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/original-logo.png?v=4"
            alt="Sakhi — Your AI Health Companion"
            className="h-14 sm:h-16 w-auto object-contain mix-blend-multiply"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
