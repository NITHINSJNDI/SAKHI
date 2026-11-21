import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radii, spacing, useAppTheme } from "@/theme";

import { PressableScale } from "./PressableScale";

export interface CardProps {
  children: ReactNode;
  /** default: quiet raised surface. inset: recessed, for grouped content. hero: gradient focal card. */
  variant?: "default" | "inset" | "hero";
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** shadcn-style Card: one surface, hairline border, no heavy outlines. */
export function Card({ children, variant = "default", onPress, accessibilityLabel, style, padded = true }: CardProps) {
  const theme = useAppTheme();
  const dark = theme.mode === "dark";

  const base: ViewStyle = {
    borderRadius: radii.card,
    padding: padded ? spacing.lg : 0,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  };

  const surface: ViewStyle =
    variant === "inset"
      ? { backgroundColor: theme.surfaceMuted, borderColor: "transparent" }
      : variant === "hero"
        ? { borderColor: dark ? "rgba(217,194,238,0.22)" : "rgba(58,31,67,0.10)" }
        : {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
            shadowOpacity: dark ? 0 : 1,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 8 },
            elevation: dark ? 0 : 2,
          };

  const content = (
    <>
      {variant === "hero" ? (
        <LinearGradient
          colors={dark ? ["#3E2148", "#2A1530", "#24122A"] : ["#F3E8FB", "#FBEFF3", "#FFFCFA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={[base, surface, style]}
      >
        {content}
      </PressableScale>
    );
  }
  return <View style={[base, surface, style]}>{content}</View>;
}
