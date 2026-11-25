/**
 * Shell for every mode tab: cream background, safe top inset, pull-to-refresh,
 * and the web's stacked panels with a 16pt gutter.
 *
 * The one scroll-linked moment: a soft mode-tinted wash sits behind the header
 * and drifts away as she scrolls, while a cream band fades in under the status
 * bar so cards never slide beneath the clock.
 */
import { LinearGradient } from "expo-linear-gradient";
import { useScrollToTop, useSegments } from "expo-router";
import { Children, isValidElement, useEffect, useRef, type ReactNode } from "react";
import { RefreshControl, StyleSheet, View, type ScrollViewInstance } from "react-native";
import Animated, { Extrapolation, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { fabCollapsed } from "@/components/shared/FloatingChatButton";
import { Skeleton } from "@/components/ui";
import { Panel } from "@/components/web/Panel";
import { selectHaptic } from "@/lib/haptics";
import { palette } from "@/theme";

const WASH = { her: [palette.lavender100, palette.cream], mom: [palette.blush100, palette.cream] } as const;

export function ModeScroll({ header, children, refreshing, onRefresh, loading }: { header: ReactNode; children: ReactNode; refreshing?: boolean; onRefresh?: () => void; loading?: boolean }) {
  const insets = useSafeAreaInsets();
  const mode = useSegments()[0] === "mom" ? "mom" : "her";
  // Tapping the active tab again scrolls back to the top
  const ref = useRef<ScrollViewInstance>(null);
  useScrollToTop(ref as any);

  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    const next = e.contentOffset.y;
    const dy = next - y.value;
    // Collapse the chat button heading down, reopen heading up or near the top
    if (next < 40 || dy < -6) fabCollapsed.value = 0;
    else if (dy > 6) fabCollapsed.value = 1;
    y.value = next;
  });
  // Each tab opens with the full chat button
  useEffect(() => {
    fabCollapsed.value = 0;
  }, []);
  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, 280], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(y.value, [0, 280], [0, -110], Extrapolation.CLAMP) }],
  }));
  const bandStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [8, 56], [0, 1], Extrapolation.CLAMP) }));

  return (
    <View style={{ flex: 1, backgroundColor: palette.cream }}>
      <Animated.View pointerEvents="none" style={[styles.wash, washStyle]}>
        <LinearGradient colors={WASH[mode]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.ScrollView
        ref={ref as any}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom, 16) + 80,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={() => { selectHaptic(); onRefresh(); }} tintColor={palette.pink500} colors={[palette.pink500]} /> : undefined}
      >
        {header}
        {loading ? (
          <View style={{ gap: 16 }}>
            <Skeleton height={190} radius={24} />
            <Skeleton height={120} radius={24} />
            <Skeleton height={160} radius={24} />
          </View>
        ) : (
          // Cards rise in one after another; capped so long tabs don't wait (Reanimated honours Reduce Motion)
          Children.toArray(children).map((child, i) => (
            <Animated.View key={isValidElement(child) ? child.key : i} entering={FadeInDown.duration(360).delay(Math.min(i, 6) * 55).springify().damping(18)}>
              {child}
            </Animated.View>
          ))
        )}
      </Animated.ScrollView>
      <Animated.View pointerEvents="none" style={[styles.band, { height: insets.top }, bandStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wash: { position: "absolute", top: 0, left: 0, right: 0, height: 360 },
  band: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: "rgba(251,246,243,0.97)", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(42,21,47,0.08)" },
});

/** Port of the web's ChartCard: a panel with a plain title. */
export function ChartPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel>
      <AppText style={{ fontSize: 18, fontWeight: "600", letterSpacing: -0.3, color: palette.plum900, marginBottom: 14 }} accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </Panel>
  );
}
