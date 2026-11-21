/**
 * Tailwind colour lookups, so data shared with the web (which stores class names
 * like "text-rose-600" or "bg-rose-50 border-rose-200") renders the same here.
 */
export const TW: Record<string, Record<number, string>> = {
  rose: { 50: "#FFF1F2", 100: "#FFE4E6", 200: "#FECDD3", 300: "#FDA4AF", 400: "#FB7185", 500: "#F43F5E", 600: "#E11D48", 700: "#BE123C", 800: "#9F1239" },
  pink: { 50: "#FDF2F8", 100: "#FCE7F3", 200: "#FBCFE8", 300: "#F9A8D4", 400: "#F472B6", 500: "#EC4899", 600: "#DB2777", 700: "#BE185D" },
  emerald: { 50: "#ECFDF5", 100: "#D1FAE5", 200: "#A7F3D0", 300: "#6EE7B7", 400: "#34D399", 500: "#10B981", 600: "#059669", 700: "#047857", 800: "#065F46" },
  amber: { 50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A", 300: "#FCD34D", 400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309", 800: "#92400E" },
  violet: { 50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE", 300: "#C4B5FD", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9" },
  sky: { 50: "#F0F9FF", 100: "#E0F2FE", 200: "#BAE6FD", 400: "#38BDF8", 500: "#0EA5E9", 600: "#0284C7", 700: "#0369A1" },
  slate: { 50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 400: "#94A3B8", 500: "#64748B", 600: "#475569", 700: "#334155" },
  red: { 50: "#FEF2F2", 100: "#FEE2E2", 200: "#FECACA", 400: "#F87171", 500: "#EF4444", 600: "#DC2626", 700: "#B91C1C", 800: "#991B1B" },
  orange: { 50: "#FFF7ED", 100: "#FFEDD5", 200: "#FED7AA", 500: "#F97316", 600: "#EA580C", 700: "#C2410C" },
  indigo: { 50: "#EEF2FF", 100: "#E0E7FF", 500: "#6366F1", 600: "#4F46E5", 700: "#4338CA" },
  teal: { 50: "#F0FDFA", 100: "#CCFBF1", 500: "#14B8A6", 600: "#0D9488", 700: "#0F766E" },
  blue: { 50: "#EFF6FF", 100: "#DBEAFE", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8" },
  purple: { 50: "#FAF5FF", 100: "#F3E8FF", 500: "#A855F7", 600: "#9333EA", 700: "#7E22CE" },
};

/** "text-rose-600" | "rose-600" -> "#E11D48" (undefined if unknown) */
export function twColor(cls: string): string | undefined {
  const m = /(?:^|\s|-)?([a-z]+)-(\d{2,3})\b/.exec(cls.replace(/^(text|bg|border)-/, ""));
  if (!m) return undefined;
  return TW[m[1]]?.[Number(m[2])];
}

/** Pull a bg-* and border-* colour out of a class list like "bg-rose-50 border-rose-200". */
export function twSoft(classes: string): { bg?: string; border?: string } {
  const bg = /bg-([a-z]+-\d{2,3})/.exec(classes)?.[1];
  const border = /border-([a-z]+-\d{2,3})/.exec(classes)?.[1];
  return { bg: bg ? twColor(bg) : undefined, border: border ? twColor(border) : undefined };
}
