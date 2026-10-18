"use client";

/**
 * ScrollLogo — persistent settled corner mark.
 *
 * The load-time intro (IntroOverlay) now owns the logo's entrance: it reveals
 * the angel + "SAKHI" at center and glides them into this exact top-left
 * position. Once the intro completes, this static mark remains as the header
 * logo. Coordinates (top-2 / left-6) are intentionally identical to the
 * intro's end frame so the handoff is seamless.
 *
 * Real art: drop `public/angel-bust.png` in; until then it falls back to the
 * existing `logo.png`.
 */

export function ScrollLogo() {
  return (
    <div className="pointer-events-none fixed top-3 left-6 sm:left-8 z-[60] flex items-center">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Sakhi — back to top"
        className="pointer-events-auto group flex items-center border-0 bg-transparent p-0 cursor-pointer transition-transform duration-300 hover:scale-105"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/original-logo.png?v=4"
          alt="Sakhi — Your AI Health Companion"
          className="h-14 sm:h-16 w-auto object-contain mix-blend-multiply"
        />
      </button>
    </div>
  );
}
