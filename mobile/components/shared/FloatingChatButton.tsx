import { useRouter } from "expo-router";
import { Sparkle } from "phosphor-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { selectHaptic } from "@/lib/haptics";
import { palette, radii } from "@/theme";

export interface FloatingChatButtonProps {
  mode?: "her" | "pregnancy";
}

/**
 * Floating Action Button (FAB) in the bottom-right corner to open Sakhi AI Chat.
 * Floats comfortably above the bottom navigation tab bar.
 */
export function FloatingChatButton({ mode = "her" }: FloatingChatButtonProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    selectHaptic();
    router.push({ pathname: "/chat", params: { mode } });
  };

  const bottomOffset = Math.max(insets.bottom, 12) + 68;

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: bottomOffset }]}>
      <PressableScale
        onPress={handlePress}
        scaleTo={0.93}
        accessibilityRole="button"
        accessibilityLabel="Ask Sakhi chat"
        accessibilityHint="Opens private AI conversation with Sakhi"
        style={styles.fab}
      >
        <View style={styles.iconBubble}>
          <Sparkle size={18} color={palette.cream} weight="fill" />
        </View>
        <AppText style={styles.label}>Ask Sakhi</AppText>
        <View style={styles.pulseDot} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    right: 18,
    zIndex: 99,
  },
  fab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.plum900,
    borderRadius: radii.pill,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 16,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "rgba(251, 207, 232, 0.45)",
    shadowColor: "#2A152F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  iconBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.cream,
    letterSpacing: -0.2,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.pink400,
    marginLeft: 2,
  },
});
