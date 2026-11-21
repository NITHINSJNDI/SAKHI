import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { radii, spacing, useAppTheme } from "@/theme";
import type { AuthMode } from "@/types/auth-ui";

export interface AuthTabsProps {
  value: AuthMode;
  onChange: (value: AuthMode) => void;
}

export function AuthTabs({ value, onChange }: AuthTabsProps) {
  const theme = useAppTheme();
  const items: { value: AuthMode; label: string }[] = [
    { value: "signin", label: "Sign in" },
    { value: "signup", label: "Create account" },
  ];

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.container, { backgroundColor: theme.backgroundAlt }]}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(item.value)}
            style={[
              styles.tab,
              { backgroundColor: selected ? theme.surface : "transparent" },
            ]}
          >
            <AppText variant="label" tone={selected ? "default" : "soft"}>
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.pill,
    padding: spacing.xxs,
    flexDirection: "row",
  },
  tab: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
