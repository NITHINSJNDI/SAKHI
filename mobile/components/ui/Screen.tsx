import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { layout, spacing, useAppTheme } from "@/theme";

export interface ScreenProps {
  children: ReactNode;
  /** Large title at the top of the scroll content (iOS large-title style). */
  title?: string;
  subtitle?: string;
  /** Right side of the title row, e.g. an icon button. */
  headerRight?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pinned to the bottom, above the tab bar (primary CTA in the thumb zone). */
  footer?: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Every screen's shell: safe area, keyboard avoidance, pull-to-refresh, large title. */
export function Screen({
  children,
  title,
  subtitle,
  headerRight,
  refreshing = false,
  onRefresh,
  footer,
  scroll = true,
  contentStyle,
}: ScreenProps) {
  const theme = useAppTheme();

  const header =
    title || headerRight ? (
      <View style={styles.header}>
        <View style={styles.headerText}>
          {subtitle ? (
            <AppText variant="label" tone="soft">
              {subtitle}
            </AppText>
          ) : null}
          {title ? (
            <AppText variant="title" accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
        </View>
        {headerRight}
      </View>
    ) : null;

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} colors={[theme.accent]} />
        ) : undefined
      }
    >
      {header}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, contentStyle]}>
      {header}
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        {body}
        {footer ? (
          <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
    width: "100%",
    maxWidth: layout.maxContentWidth,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  headerText: { flex: 1, gap: 2 },
  footer: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
