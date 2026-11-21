import { Lock } from "phosphor-react-native";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { BrandHeader } from "@/components/BrandHeader";
import { AUTH_COPY } from "@/lib/auth-copy";
import { spacing, useAppTheme } from "@/theme";

export interface AuthShellProps {
  children: ReactNode;
}

/**
 * Ported from AuthScreen's plum sanctuary stage.
 * Web-only PetalWind, blurred bloom layers, and Framer Motion are intentionally
 * replaced with native views and Reanimated. See mobile/TODO.md.
 */
export function AuthShell({ children }: AuthShellProps) {
  const theme = useAppTheme();

  return (
    <SafeAreaView edges={["top"]} style={[styles.safe, { backgroundColor: theme.stage }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          style={[styles.flex, { backgroundColor: theme.background }]}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.stage, { backgroundColor: theme.stage }]}>
            <View
              pointerEvents="none"
              style={[styles.bloomTop, { backgroundColor: "rgba(169,130,214,0.18)" }]}
            />
            <View
              pointerEvents="none"
              style={[styles.bloomBottom, { backgroundColor: "rgba(226,117,141,0.14)" }]}
            />
            <BrandHeader />
          </View>

          <View style={[styles.formArea, { backgroundColor: theme.background }]}>
            {children}
            <View style={styles.privacy}>
              <Lock size={15} color={theme.textFaint} weight="duotone" />
              <AppText variant="caption" tone="faint" style={styles.privacyText}>
                {AUTH_COPY.privacy}
              </AppText>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  stage: {
    overflow: "hidden",
    paddingBottom: spacing.xl,
  },
  bloomTop: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -110,
    right: -80,
  },
  bloomBottom: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    bottom: -140,
    left: -100,
  },
  formArea: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.xl,
    gap: spacing.xl,
  },
  privacy: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: spacing.xs,
    paddingTop: spacing.xs,
  },
  privacyText: {
    flexShrink: 1,
    textAlign: "center",
  },
});
