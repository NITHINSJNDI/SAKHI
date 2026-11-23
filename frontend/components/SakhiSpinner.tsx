import React from "react";

export interface SakhiSpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  trackOpacity?: number;
}

const sizeClasses: Record<NonNullable<SakhiSpinnerProps["size"]>, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4 sm:h-5 sm:w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
};

/**
 * Dual-tone circular ring spinner in Sakhi's signature pink theme.
 * Smooth rotating active arc over a soft, translucent circular track.
 */
export function SakhiSpinner({
  size = "md",
  className = "",
  trackOpacity = 0.22,
  ...props
}: SakhiSpinnerProps) {
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const hasCustomSize = /\b(h-|w-)\S+/.test(className);
  const hasCustomColor = /\btext-\S+/.test(className);
  const colorClass = hasCustomColor ? "" : "text-pink-500";
  const finalClass = `animate-spin ${hasCustomSize ? "" : sizeClass} ${colorClass} ${className}`.trim();

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={finalClass}
      aria-label="Loading"
      role="status"
      {...props}
    >
      {/* Background circular track */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth="3"
        style={{ opacity: trackOpacity }}
      />
      {/* Active spinning arc with smooth rounded caps */}
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="59.69"
        strokeDashoffset="41.78"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Full-page or container loading stage with Sakhi's pink theme spinner on cream background.
 */
export function SakhiLoadingScreen({
  label,
  size = "lg",
  className = "",
}: {
  label?: string;
  size?: SakhiSpinnerProps["size"];
  className?: string;
}) {
  return (
    <div
      className={`min-h-[100dvh] bg-cream flex flex-col items-center justify-center gap-3.5 ${className}`}
      role="status"
      aria-live="polite"
    >
      <SakhiSpinner size={size} />
      {label ? (
        <p className="text-sm font-medium text-plum-900/70 tracking-tight animate-pulse">
          {label}
        </p>
      ) : null}
    </div>
  );
}

export default SakhiSpinner;
