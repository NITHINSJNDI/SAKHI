import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { radii, useAppTheme } from "@/theme";

export interface BadgeProps {
  label: string;
  /** Dot + text colour. Defaults to the theme accent. */
  color?: string;
  dot?: boolean;
}

/** Small status pill: tinted background from the colour, sentence-case label. */
export function Badge({ label, color, dot = true }: BadgeProps) {
  const theme = useAppTheme();
  const c = color ?? theme.accent;
  return (
    <View style={[styles.badge, { backgroundColor: `${c}22` }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: c }]} /> : null}
      <AppText variant="caption" style={[styles.text, { color: c }]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontWeight: "600" },
});
