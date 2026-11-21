import type { Icon } from "phosphor-react-native";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/AppText";
import { radii, spacing, useAppTheme } from "@/theme";

import { PressableScale } from "./PressableScale";

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "md" | "lg";
  icon?: Icon;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** shadcn-style Button. Heights: md 44pt, lg 52pt (both clear the 44pt touch minimum). */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  icon: IconCmp,
  iconPosition = "left",
  loading,
  disabled,
  full,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useAppTheme();

  const bg =
    variant === "primary"
      ? theme.primary
      : variant === "secondary"
        ? theme.surfaceMuted
        : variant === "destructive"
          ? theme.errorBg
          : "transparent";
  const fg =
    variant === "primary"
      ? theme.primaryContrast
      : variant === "destructive"
        ? theme.errorText
        : variant === "ghost"
          ? theme.accent
          : theme.text;

  const iconEl = IconCmp ? <IconCmp size={18} color={fg} weight="bold" /> : null;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      scaleTo={0.97}
      style={[
        styles.base,
        { height: size === "lg" ? 52 : 44, backgroundColor: bg },
        variant === "destructive" ? { borderWidth: 1, borderColor: theme.errorBorder } : null,
        full ? styles.full : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <View style={styles.row}>
          {iconPosition === "left" ? iconEl : null}
          <AppText variant="bodyStrong" style={{ color: fg }}>
            {label}
          </AppText>
          {iconPosition === "right" ? iconEl : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  full: { alignSelf: "stretch" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
