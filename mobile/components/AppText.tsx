import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import { fonts, typography, useAppTheme, type TypographyVariant } from "@/theme";

export type AppTextTone =
  | "default"
  | "soft"
  | "faint"
  | "stage"
  | "stageSoft"
  | "accent"
  | "primaryContrast";

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  tone?: AppTextTone;
}

// Custom fonts ignore fontWeight on Android, so pick the Geist file that matches it.
const familyForWeight = (w?: string | number) => {
  const n = Number(w ?? 400);
  if (n >= 600) return fonts.semibold;
  if (n >= 500) return fonts.medium;
  return fonts.regular;
};

export function AppText({ variant = "body", tone = "default", style, ...rest }: AppTextProps) {
  const theme = useAppTheme();

  const color =
    tone === "soft"
      ? theme.textSoft
      : tone === "faint"
        ? theme.textFaint
        : tone === "stage"
          ? theme.stageText
          : tone === "stageSoft"
            ? theme.stageTextSoft
            : tone === "accent"
              ? theme.accent
              : tone === "primaryContrast"
                ? theme.primaryContrast
                : theme.text;

  const flat: TextStyle = StyleSheet.flatten([typography[variant], { color }, style]) ?? {};
  const serif = flat.fontFamily === fonts.serifItalic;
  const fontFamily = serif ? flat.fontFamily : flat.fontWeight ? familyForWeight(flat.fontWeight) : flat.fontFamily;

  return <Text {...rest} style={[flat, { fontFamily, fontWeight: undefined }]} />;
}
