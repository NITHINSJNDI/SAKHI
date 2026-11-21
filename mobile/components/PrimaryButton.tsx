import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppText } from "@/components/AppText";
import { palette, radii, spacing, useAppTheme } from "@/theme";

type ButtonVariant = "primary" | "secondary" | "ghost" | "onStage";

export interface PrimaryButtonProps extends Omit<PressableProps, "children" | "style"> {
  label: string;
  loading?: boolean;
  icon?: React.ReactNode;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
}

export function PrimaryButton({
  label,
  loading = false,
  icon,
  variant = "primary",
  disabled,
  style,
  ...pressableProps
}: PrimaryButtonProps) {
  const theme = useAppTheme();
  const isDisabled = Boolean(disabled || loading);

  const backgroundColor =
    variant === "primary"
      ? theme.primary
      : variant === "secondary"
        ? theme.surface
        : variant === "onStage"
          ? palette.cream
          : "transparent";
  const borderColor =
    variant === "secondary" ? theme.border : variant === "primary" ? theme.primary : "transparent";
  const textColor =
    variant === "primary"
      ? theme.primaryContrast
      : variant === "onStage"
        ? palette.plum900
        : theme.text;

  return (
    <Pressable
      {...pressableProps}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          opacity: isDisabled ? 0.52 : 1,
          transform: [{ scale: pressed ? 0.992 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        icon
      )}
      <AppText variant="label" style={{ color: textColor }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
});
