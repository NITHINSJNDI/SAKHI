import { CaretRight, type Icon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { radii, spacing, useAppTheme } from "@/theme";

import { PressableScale } from "./PressableScale";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: Icon;
  /** Tint for the icon tile. */
  tint?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  /** Draw a hairline under the row (for grouped lists). */
  divider?: boolean;
}

/** Settings-style row: icon tile, title + subtitle, chevron. 64pt tall. */
export function ListRow({ title, subtitle, icon: IconCmp, tint, onPress, trailing, divider }: ListRowProps) {
  const theme = useAppTheme();
  const c = tint ?? theme.accent;

  const body = (
    <View style={[styles.row, divider ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border } : null]}>
      {IconCmp ? (
        <View style={[styles.tile, { backgroundColor: `${c}1F` }]}>
          <IconCmp size={20} color={c} weight="duotone" />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" tone="soft" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing ?? (onPress ? <CaretRight size={16} color={theme.textFaint} weight="bold" /> : null)}
    </View>
  );

  if (!onPress) return body;
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} scaleTo={0.98}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.sm,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radii.soft - 4,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
});
