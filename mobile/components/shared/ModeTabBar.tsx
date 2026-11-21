/**
 * Bottom tab bar matching the web's phone nav (DashboardTabs): frosted white,
 * pink hairline, active tab in plum with a filled icon and a soft pill behind it.
 */
import type { BottomTabBarProps } from "expo-router/build/layouts/Tabs";
import type { Icon } from "phosphor-react-native";
import { View } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { PressableScale } from "@/components/ui";
import { selectHaptic } from "@/lib/haptics";
import { palette } from "@/theme";

export function ModeTabBar({ state, descriptors, emitter, navigateToTab, icons, accent = "pink" }: BottomTabBarProps & { icons: Record<string, Icon>; accent?: "pink" | "violet" }) {
  const insets = useSafeAreaInsets();
  const activeColor = accent === "violet" ? "#6D28D9" : "#BE185D";
  return (
    <View style={{ flexDirection: "row", backgroundColor: "rgba(255,255,255,0.94)", borderTopWidth: 1, borderTopColor: palette.pink100, paddingBottom: Math.max(insets.bottom, 8), paddingTop: 6 }}>
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
            <TabPill focused={focused} color={activeColor} />
            {I ? <I size={22} color={focused ? activeColor : "rgba(42,21,47,0.5)"} weight={focused ? "fill" : "regular"} /> : null}
            <AppText style={{ fontSize: 11, fontWeight: focused ? "600" : "500", color: focused ? activeColor : "rgba(42,21,47,0.55)" }}>{label}</AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

function TabPill({ focused, color }: { focused: boolean; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: withSpring(focused ? 1 : 0, { damping: 20 }),
    transform: [{ scaleX: withSpring(focused ? 1 : 0.6, { damping: 18, stiffness: 220 }) }],
  }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 2, width: 56, height: 30, borderRadius: 15, backgroundColor: `${color}14` }, style]} />;
}
