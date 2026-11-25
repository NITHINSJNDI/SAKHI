import { X } from "phosphor-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { tapHaptic } from "@/lib/haptics";
import { useT } from "@/lib/i18n";
import { palette } from "@/theme";

import { ink } from "./Panel";

/**
 * Bottom sheet (the web's modal / dialog on phones): the page dims, the sheet
 * springs up, and it closes by tapping outside, the close button, or dragging
 * the handle down. Scrolls when tall.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const y = useSharedValue(height);
  const dim = useSharedValue(0);

  // Mount as soon as it opens (state adjusted during render, not in an effect)
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    if (open) {
      dim.set(withTiming(1, { duration: 220 }));
      y.set(withSpring(0, { damping: 26, stiffness: 260, mass: 0.9 }));
    } else {
      dim.set(withTiming(0, { duration: 180 }));
      y.set(withTiming(height, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
        if (done) runOnJS(setMounted)(false);
      }));
    }
  }, [open, mounted, height, dim, y]);

  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 900) {
        runOnJS(tapHaptic)();
        runOnJS(onClose)();
      } else y.set(withSpring(0, { damping: 24, stiffness: 280 }));
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.get() }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <Animated.View style={[s.backdrop, dimStyle]}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t("common.close")} accessibilityRole="button" />
          </Animated.View>
          <Animated.View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }, sheetStyle]} accessibilityViewIsModal>
            <GestureDetector gesture={drag}>
              <View>
                <View style={s.grabber} />
                <View style={s.head}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <AppText style={s.title} accessibilityRole="header">
                      {title}
                    </AppText>
                    {subtitle ? <AppText style={{ fontSize: 14, lineHeight: 20, color: ink[60] }}>{subtitle}</AppText> : null}
                  </View>
                  <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("common.close")} style={s.close}>
                    <X size={18} color={ink[70]} weight="bold" />
                  </Pressable>
                </View>
              </View>
            </GestureDetector>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
            {footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(42,21,47,0.42)" },
  sheet: { marginTop: "auto", maxHeight: "92%", backgroundColor: palette.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: "#2A152F", shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 12 },
  grabber: { alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(42,21,47,0.18)", marginTop: 10 },
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "600", letterSpacing: -0.3, color: palette.plum900 },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(42,21,47,0.06)" },
});
