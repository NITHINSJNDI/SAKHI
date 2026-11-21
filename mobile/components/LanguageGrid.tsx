import { Check } from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";
import { palette, radii, spacing } from "@/theme";

export interface LanguageGridProps {
  value: string;
  onChange: (code: string) => void;
}

export function LanguageGrid({ value, onChange }: LanguageGridProps) {
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
              selected ? styles.itemSelected : styles.itemUnselected,
            ]}
          >
            <View style={styles.itemTop}>
              <AppText
                variant="label"
                style={[
                  styles.nativeName,
                  { color: selected ? palette.cream : palette.plum900 },
                ]}
              >
                {language.nativeName}
              </AppText>
              {selected ? (
                <View style={styles.checkBadge}>
                  <Check size={13} color={palette.plum900} weight="bold" />
                </View>
              ) : null}
            </View>
            <AppText
              variant="caption"
              style={{
                color: selected ? "rgba(251, 246, 243, 0.85)" : "rgba(42, 21, 47, 0.60)",
                fontSize: 12,
              }}
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
    justifyContent: "space-between",
    rowGap: spacing.sm,
  },
  item: {
    width: "48.2%",
    minHeight: 74,
    borderRadius: radii.soft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: "center",
    gap: 3,
  },
  itemSelected: {
    backgroundColor: palette.plum900,
    borderWidth: 1.5,
    borderColor: palette.plum900,
    shadowColor: "rgba(42, 21, 47, 0.2)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 3,
  },
  itemUnselected: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(42, 21, 47, 0.08)",
    shadowColor: "rgba(42, 21, 47, 0.05)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  nativeName: {
    fontSize: 15,
    fontWeight: "700",
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.cream,
    alignItems: "center",
    justifyContent: "center",
  },
});
