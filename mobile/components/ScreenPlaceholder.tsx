import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { radii, spacing, useAppTheme } from "@/theme";

export interface ScreenPlaceholderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  children?: ReactNode;
}

export function ScreenPlaceholder({
  eyebrow,
  title,
  subtitle,
  icon,
  children,
}: ScreenPlaceholderProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <AppText variant="overline" tone="soft">
              {eyebrow}
            </AppText>
            <AppText variant="title">{title}</AppText>
          </View>
          <View style={[styles.iconBubble, { backgroundColor: theme.accentSoft }]}>{icon}</View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={[styles.chip, { backgroundColor: theme.backgroundAlt }]}>
            <AppText variant="caption" tone="soft">
              Phase 1 placeholder
            </AppText>
          </View>
          <AppText variant="body" tone="soft">
            {subtitle}
          </AppText>
        </View>

        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: spacing.screen,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  titleGroup: {
    flex: 1,
    gap: spacing.xxs,
  },
  iconBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
