import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { AUTH_COPY } from "@/lib/auth-copy";
import { radii, spacing, useAppTheme } from "@/theme";
import type { DemoMode } from "@/types/auth-ui";

export interface DemoPanelProps {
  onSelect: (mode: DemoMode) => void;
  disabled?: boolean;
}

export function DemoPanel({ onSelect, disabled = false }: DemoPanelProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.panel, { backgroundColor: theme.backgroundAlt }]}>
      <AppText variant="label">{AUTH_COPY.exploreSampleData}</AppText>
      <AppText variant="caption" tone="soft">
        {AUTH_COPY.exploreSampleDesc}
      </AppText>
      <View style={styles.grid}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onSelect("her")}
          style={[styles.item, { backgroundColor: theme.surface, opacity: disabled ? 0.5 : 1 }]}
        >
          <AppText variant="label">{AUTH_COPY.demoHer}</AppText>
          <AppText variant="caption" tone="soft">
            {AUTH_COPY.demoHerCycles}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onSelect("pregnancy")}
          style={[styles.item, { backgroundColor: theme.surface, opacity: disabled ? 0.5 : 1 }]}
        >
          <AppText variant="label">{AUTH_COPY.demoMom}</AppText>
          <AppText variant="caption" tone="soft">
            {AUTH_COPY.demoMomWeeks}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  grid: {
    marginTop: spacing.xs,
    flexDirection: "row",
    gap: spacing.sm,
  },
  item: {
    flex: 1,
    borderRadius: radii.soft,
    padding: spacing.sm,
    gap: 2,
  },
});
