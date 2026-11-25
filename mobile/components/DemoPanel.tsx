import { Sparkle } from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useT } from "@/lib/i18n";
import { palette, radii, spacing } from "@/theme";
import type { DemoMode } from "@/types/auth-ui";

export interface DemoPanelProps {
  onSelect: (mode: DemoMode) => void;
  disabled?: boolean;
}

export function DemoPanel({ onSelect, disabled = false }: DemoPanelProps) {
  const { t } = useT();
  return (
    <View style={styles.panel}>
      <View style={styles.titleRow}>
        <Sparkle size={15} color={palette.pink500} weight="fill" />
        <AppText variant="label" style={styles.title}>
          {t("auth.exploreSampleData")}
        </AppText>
      </View>
      <AppText variant="caption" tone="soft" style={styles.description}>
        {t("auth.exploreSampleDesc")}
      </AppText>
      <View style={styles.grid}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onSelect("her")}
          style={({ pressed }) => [
            styles.item,
            { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.itemHeader}>
            <View style={[styles.dot, { backgroundColor: palette.pink500 }]} />
            <AppText variant="label" style={styles.itemTitle}>
              {t("auth.demoHer")}
            </AppText>
          </View>
          <AppText variant="caption" tone="soft" style={styles.itemSub}>
            {t("auth.demoHerCycles")}
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => onSelect("pregnancy")}
          style={({ pressed }) => [
            styles.item,
            { opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.itemHeader}>
            <View style={[styles.dot, { backgroundColor: palette.lavender500 }]} />
            <AppText variant="label" style={styles.itemTitle}>
              {t("auth.demoMom")}
            </AppText>
          </View>
          <AppText variant="caption" tone="soft" style={styles.itemSub}>
            {t("auth.demoMomWeeks")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radii.soft,
    backgroundColor: "rgba(246, 236, 233, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.08)",
    padding: spacing.md,
    gap: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.plum900,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(42, 21, 47, 0.65)",
  },
  grid: {
    marginTop: 6,
    flexDirection: "row",
    gap: spacing.sm,
  },
  item: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.08)",
    padding: 10,
    gap: 2,
    shadowColor: "rgba(42, 21, 47, 0.04)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.plum900,
  },
  itemSub: {
    fontSize: 11,
    lineHeight: 14,
    color: "rgba(42, 21, 47, 0.60)",
  },
});
