import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { palette, radii } from "@/theme";
import type { AuthMode } from "@/types/auth-ui";

export interface AuthTabsProps {
  value: AuthMode;
  onChange: (value: AuthMode) => void;
}

export function AuthTabs({ value, onChange }: AuthTabsProps) {
  const items: { value: AuthMode; label: string }[] = [
    { value: "signin", label: "Sign in" },
    { value: "signup", label: "Create account" },
  ];

  return (
    <View
      accessibilityRole="tablist"
      style={styles.container}
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
              selected ? styles.tabSelected : styles.tabUnselected,
            ]}
          >
            <AppText
              variant="label"
              style={[
                styles.tabText,
                { color: selected ? palette.plum900 : "rgba(42, 21, 47, 0.65)" },
              ]}
            >
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
    padding: 4,
    flexDirection: "row",
    backgroundColor: "rgba(246, 236, 233, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.08)",
  },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabSelected: {
    backgroundColor: "#FFFFFF",
    shadowColor: "rgba(42, 21, 47, 0.14)",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  tabUnselected: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontWeight: "600",
    fontSize: 14,
  },
});
