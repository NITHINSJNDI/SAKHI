/**
 * Bottom tab bar matching the web's phone nav (DashboardTabs): frosted white,
 * pink hairline, active tab with a filled icon. One soft pill glides between
 * tabs on a spring so the selection travels instead of blinking.
 */
import type { BottomTabBarProps } from "expo-router/build/layouts/Tabs";
import type { Icon } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { selectHaptic } from "@/lib/haptics";
import { palette } from "@/theme";

export function ModeTabBar({ state, descriptors, emitter, navigateToTab, icons, accent = "pink" }: BottomTabBarProps & { icons: Record<string, Icon>; accent?: "pink" | "violet" }) {
  const insets = useSafeAreaInsets();
  const activeColor = accent === "violet" ? "#6D28D9" : "#BE185D";
  const [width, setWidth] = useState(0);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.94)", borderTopWidth: 1, borderTopColor: palette.pink100, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6 }}>
      {width ? <GlidePill index={state.index} tabWidth={width / state.routes.length} color={activeColor} /> : null}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label = typeof options.title === "string" ? options.title : route.name;
        const I = icons[route.name];
        return (
          <PressableScale
            key={route.key}
            haptic={false}
            scaleTo={0.92}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                selectHaptic();
                navigateToTab(route.key);
              }
            }}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 52, gap: 2 }}
          >
            {I ? <TabIcon I={I} focused={focused} color={activeColor} /> : null}
            <AppText style={{ fontSize: 11, fontWeight: focused ? "600" : "500", color: focused ? activeColor : "rgba(42,21,47,0.55)" }}>{label}</AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const PILL_W = 60;

function GlidePill({ index, tabWidth, color }: { index: number; tabWidth: number; color: string }) {
  const reduce = useReducedMotion();
  const x = index * tabWidth + (tabWidth - PILL_W) / 2;
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: reduce ? x : withSpring(x, { damping: 20, stiffness: 240, mass: 0.8 }) }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 8, left: 0, width: PILL_W, height: 30, borderRadius: 15, backgroundColor: `${color}17` }, style]} />;
}

/** Active icon lifts a touch as the pill arrives. */
function TabIcon({ I, focused, color }: { I: Icon; focused: boolean; color: string }) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: withSpring(focused ? -1 : 0, { damping: 14 }) }, { scale: withSpring(focused ? 1.08 : 1, { damping: 14, stiffness: 260 }) }] }));
  return (
    <Animated.View style={style}>
      <I size={22} color={focused ? color : "rgba(42,21,47,0.5)"} weight={focused ? "fill" : "regular"} />
    </Animated.View>
  );
}
