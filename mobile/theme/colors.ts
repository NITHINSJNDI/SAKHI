/**
 * SAKHI palette ported from frontend/app/globals.css.
 * The web app avoids pure black and pure white, so the mobile theme does too.
 */
export const palette = {
  cream: "#FBF6F3",
  creamDeep: "#F6ECE9",
  mist: "#F4EEF9",

  lavender50: "#F6F0FC",
  lavender100: "#ECE0F7",
  lavender200: "#D9C2EE",
  lavender300: "#C3A3E4",
  lavender400: "#A982D6",
  lavender500: "#8F63C2",
  lavender600: "#764AA3",

  blush50: "#FDF3F5",
  blush100: "#FBE5EA",
  blush200: "#F6C6D2",
  blush300: "#EE9FB1",
  blush400: "#E2758D",
  blush500: "#D14D6D",

  plum700: "#4A2A52",
  plum800: "#3A1F43",
  plum900: "#2A152F",

  ink: "#3A1F43",
  inkSoft: "#6B4A72",
  inkFaint: "#9A82A0",

  whiteWarm: "#FFFCFA",

  // Tailwind pink / violet / status shades the web components use
  pink50: "#FDF2F8",
  pink100: "#FCE7F3",
  pink200: "#FBCFE8",
  pink300: "#F9A8D4",
  pink400: "#F472B6",
  pink500: "#EC4899",
  pink600: "#DB2777",
  pink700: "#BE185D",
  violet100: "#EDE9FE",
  violet500: "#8B5CF6",
  violet700: "#6D28D9",
  rose500: "#F43F5E",
  emerald50: "#ECFDF5",
  emerald500: "#10B981",
  emerald700: "#047857",
  amber50: "#FFFBEB",
  amber500: "#F59E0B",
  amber700: "#B45309",
  red50: "#FEF2F2",
  red500: "#EF4444",
  red700: "#B91C1C",
  sky500: "#0EA5E9",
  indigo500: "#6366F1",
} as const;

export type AppTheme = {
  mode: "light" | "dark";
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;
  text: string;
  textSoft: string;
  textFaint: string;
  primary: string;
  primaryPressed: string;
  primaryContrast: string;
  accent: string;
  accentSoft: string;
  stage: string;
  stageText: string;
  stageTextSoft: string;
  successBg: string;
  successBorder: string;
  successText: string;
  errorBg: string;
  errorBorder: string;
  errorText: string;
  shadow: string;
};

export const lightTheme: AppTheme = {
  mode: "light",
  background: palette.cream,
  backgroundAlt: palette.creamDeep,
  surface: "#FEFCFB", // opaque: translucent fills + Android elevation draw a grey frame
  surfaceRaised: "#FFFFFF",
  surfaceMuted: "rgba(42, 21, 47, 0.05)",
  border: "rgba(251, 207, 232, 0.9)",
  borderStrong: palette.pink300,
  text: palette.plum900,
  textSoft: "rgba(42, 21, 47, 0.68)",
  textFaint: "rgba(42, 21, 47, 0.45)",
  primary: palette.plum900,
  primaryPressed: palette.plum800,
  primaryContrast: "#FFFFFF",
  accent: palette.pink600,
  accentSoft: palette.pink50,
  stage: palette.plum900,
  stageText: palette.cream,
  stageTextSoft: "rgba(251, 246, 243, 0.76)",
  successBg: palette.emerald50,
  successBorder: "#A7F3D0",
  successText: palette.emerald700,
  errorBg: palette.red50,
  errorBorder: "#FECACA",
  errorText: palette.red700,
  shadow: "rgba(244, 114, 182, 0.16)",
};

export const darkTheme: AppTheme = {
  mode: "dark",
  background: "#1D0F22",
  backgroundAlt: "#26152C",
  surface: palette.plum800,
  surfaceRaised: palette.plum700,
  surfaceMuted: "#321C39",
  border: "rgba(217, 194, 238, 0.18)",
  borderStrong: "rgba(217, 194, 238, 0.34)",
  text: palette.cream,
  textSoft: palette.lavender200,
  textFaint: "rgba(217, 194, 238, 0.62)",
  primary: palette.lavender300,
  primaryPressed: palette.lavender400,
  primaryContrast: palette.plum900,
  accent: palette.blush300,
  accentSoft: "rgba(238, 159, 177, 0.16)",
  stage: "#160B1A",
  stageText: palette.cream,
  stageTextSoft: "rgba(251, 246, 243, 0.72)",
  successBg: "#173524",
  successBorder: "#3F7A55",
  successText: "#D8F5E1",
  errorBg: "#3B1D2A",
  errorBorder: palette.blush400,
  errorText: palette.blush100,
  shadow: "rgba(0, 0, 0, 0.4)",
};
