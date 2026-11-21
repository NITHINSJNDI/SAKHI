import type { Icon } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

import { AppText } from "@/components/AppText";
import { selectHaptic } from "@/lib/haptics";
import { radii, useAppTheme } from "@/theme";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: Icon;
}

export interface SegmentedProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

const SPRING = { damping: 20, stiffness: 260, mass: 0.7 };

/** iOS-style segmented control with a sliding thumb. */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width > 0 ? (width - 8) / options.length : 0;

  const thumb = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withSpring(index * segment, SPRING) }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: theme.surfaceMuted }]}
    >
      {segment > 0 ? (
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: theme.surfaceRaised, shadowColor: theme.shadow },
            thumb,
          ]}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        const IconCmp = o.icon;
        const color = active ? theme.text : theme.textSoft;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) {
                selectHaptic();
                onChange(o.value);
              }
            }}
            style={styles.segment}
          >
            {IconCmp ? <IconCmp size={17} color={color} weight={active ? "fill" : "regular"} /> : null}
            <AppText variant="label" style={{ color, fontWeight: active ? "600" : "500" }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radii.pill,
    padding: 4,
    height: 48,
  },
  thumb: {
    position: "absolute",
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radii.pill,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 40,
  },
});
