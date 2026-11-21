import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { palette, spacing } from "@/theme";

export function BrandHeader() {
  return (
    <View style={styles.container}>
      <View style={[styles.logoBubble, { backgroundColor: palette.cream }]}>
        <Image
          source={require("@/assets/images/sakhi-icon.png")}
          contentFit="contain"
          style={styles.logo}
          accessibilityLabel="Sakhi"
        />
      </View>
      <View style={styles.wordmark}>
        <AppText variant="section" tone="stage">
          Sakhi
        </AppText>
        <AppText variant="caption" tone="stageSoft">
          {"Private women's health companion"}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  logoBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 4,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  wordmark: {
    gap: 1,
  },
});
