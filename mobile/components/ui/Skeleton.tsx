import { useEffect } from "react";
import { View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { radii, spacing, useAppTheme } from "@/theme";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Soft pulsing placeholder block. Static when the user prefers reduced motion. */
export function Skeleton({ width = "100%", height = 16, radius = 10, style }: SkeletonProps) {
  const theme = useAppTheme();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.55);

  useEffect(() => {
    if (reduced) return;
    opacity.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [opacity, reduced]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: theme.surfaceMuted }, animated, style]}
    />
  );
}

/** Ready-made skeleton for a hero card followed by a couple of rows. */
export function ScreenSkeleton() {
  return (
    <View style={{ gap: spacing.lg }}>
      <Skeleton width="55%" height={28} />
      <Skeleton height={44} radius={radii.pill} />
      <Skeleton height={260} radius={radii.card} />
      <Skeleton width="40%" height={20} />
      <Skeleton height={72} radius={radii.soft} />
      <Skeleton height={72} radius={radii.soft} />
    </View>
  );
}
