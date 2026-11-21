import { darkTheme, lightTheme, palette, type AppTheme } from "./colors";

export { darkTheme, lightTheme, palette };
export type { AppTheme };
export { layout, radii, spacing } from "./spacing";
export { fonts, typography, type TypographyVariant } from "./typography";

/**
 * SAKHI is light-only, like the web app (cream canvas, frosted white cards,
 * pink hairlines, plum ink). darkTheme is kept for a future dark mode.
 */
export function useAppTheme(): AppTheme {
  return lightTheme;
}
