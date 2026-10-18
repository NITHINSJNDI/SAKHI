import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** adds frosted-glass treatment */
  glass?: boolean;
}

/**
 * Kokonut Card — soft radius (26px), tinted shadow on the plum hue,
 * optional glassmorphism. One radius system across the page.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ glass = false, className = "", children, ...rest }, ref) => {
    const surface = glass
      ? "glass"
      : "bg-white/60 border border-pink-200/70 shadow-[0_24px_60px_-24px_rgba(244,114,182,0.18)]";
    return (
      <div
        ref={ref}
        className={`rounded-[26px] ${surface} ${className}`}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
