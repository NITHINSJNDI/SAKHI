/**
 * Shell for every mode tab: cream background, safe top inset, pull-to-refresh,
 * and the web's stacked panels with a 16pt gutter.
 */
import { useScrollToTop } from "expo-router";
import { Children, isValidElement, useRef, type ReactNode } from "react";
import { RefreshControl, ScrollView, View, type ScrollViewInstance } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { Skeleton } from "@/components/ui";
import { Panel } from "@/components/web/Panel";
import { selectHaptic } from "@/lib/haptics";
import { palette } from "@/theme";

export function ModeScroll({ header, children, refreshing, onRefresh, loading }: { header: ReactNode; children: ReactNode; refreshing?: boolean; onRefresh?: () => void; loading?: boolean }) {
  const insets = useSafeAreaInsets();
  // Tapping the active tab again scrolls back to the top
  const ref = useRef<ScrollViewInstance>(null);
  useScrollToTop(ref as any);

  return (
    <View style={{ flex: 1, backgroundColor: palette.cream }}>
      <ScrollView
        ref={ref}
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
      </ScrollView>
    </View>
  );
}

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
