import { Check } from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { radii, spacing, useAppTheme } from "@/theme";

export interface LanguageGridProps {
  value: string;
  onChange: (code: string) => void;
}

export function LanguageGrid({ value, onChange }: LanguageGridProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.grid}>
      {SUPPORTED_LANGUAGES.map((language) => {
        const selected = language.code === value;
        return (
          <Pressable
            key={language.code}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(language.code)}
            style={[
              styles.item,
              {
                backgroundColor: selected ? theme.primary : theme.surface,
                borderColor: selected ? theme.accent : theme.border,
                borderWidth: selected ? 2 : 1,
              },
            ]}
          >
            <View style={styles.itemTop}>
              <AppText
                variant="section"
                style={{ color: selected ? theme.primaryContrast : theme.text }}
              >
                {language.nativeName}
              </AppText>
              {selected ? <Check size={18} color={theme.primaryContrast} weight="bold" /> : null}
            </View>
            <AppText
              variant="caption"
              style={{ color: selected ? theme.primaryContrast : theme.textSoft }}
            >
              {language.name}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  item: {
    width: "48%",
    minHeight: 76,
    borderRadius: radii.soft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: "center",
    gap: 2,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
});
