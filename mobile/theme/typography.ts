import type { TextStyle } from "react-native";

/**
 * Loaded with expo-font in app/_layout.tsx.
 * Geist maps to the web sans stack; Instrument Serif maps to the editorial serif accent.
 */
export const fonts = {
  regular: "Geist_400Regular",
  medium: "Geist_500Medium",
  semibold: "Geist_600SemiBold",
  serifItalic: "InstrumentSerif_400Regular_Italic",
} as const;

export const typography = {
  display: {
    fontFamily: fonts.regular,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  hero: {
    fontFamily: fonts.medium,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  serif: {
    fontFamily: fonts.serifItalic,
    fontSize: 27,
    lineHeight: 33,
    letterSpacing: -0.4,
    fontStyle: "italic",
  },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
