import React from "react";
import { WarningCircle, ArrowsClockwise, FolderSimpleStar } from "phosphor-react-native";
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/PrimaryButton";
import { radii, spacing, useAppTheme } from "@/theme";

export interface LoadingStateProps {
  message?: string;
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({ message = "Loading...", style }: LoadingStateProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.center, style]}>
      <ActivityIndicator size="large" color={theme.accent} />
      <AppText variant="body" tone="soft" style={styles.textMargin}>
        {message}
      </AppText>
    </View>
  );
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load your information. Please check your connection and try again.",
  onRetry,
  style,
}: ErrorStateProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: theme.errorBg,
          borderColor: theme.errorBorder,
        },
        style,
      ]}
    >
      <View style={styles.iconCircle}>
        <WarningCircle size={28} color={theme.errorText} weight="duotone" />
      </View>
      <AppText variant="section" style={[styles.title, { color: theme.errorText }]}>
        {title}
      </AppText>
      <AppText variant="body" style={[styles.message, { color: theme.errorText }]}>
        {message}
      </AppText>
      {onRetry ? (
        <PrimaryButton
          label="Try again"
          icon={<ArrowsClockwise size={18} color={theme.primaryContrast} />}
          onPress={onRetry}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: theme.surfaceMuted }]}>
        {icon ?? <FolderSimpleStar size={32} color={theme.accent} weight="duotone" />}
      </View>
      <AppText variant="section" style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" tone="soft" style={styles.message}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: spacing.xxxl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  textMargin: {
    marginTop: spacing.md,
  },
  box: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.sm,
  },
});
