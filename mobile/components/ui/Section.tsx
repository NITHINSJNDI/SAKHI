import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { spacing } from "@/theme";

import { PressableScale } from "./PressableScale";

export interface SectionProps {
  title: string;
  action?: { label: string; onPress: () => void };
  children: ReactNode;
}

/** A titled group of content with an optional "See all"-style action. */
export function Section({ title, action, children }: SectionProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <AppText variant="section" accessibilityRole="header">
          {title}
        </AppText>
        {action ? (
          <PressableScale onPress={action.onPress} scaleTo={0.94} hitSlop={12} accessibilityRole="button">
            <AppText variant="label" tone="accent">
              {action.label}
            </AppText>
          </PressableScale>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 },
});
