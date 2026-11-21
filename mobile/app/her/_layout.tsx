import { Redirect, Tabs } from "expo-router";
import { ChartLineUp, Drop, Heart, Sun } from "phosphor-react-native";

import ReliefSheet from "@/components/her/ReliefSheet";
import ConsentGate from "@/components/shared/ConsentGate";
import { FloatingChatButton } from "@/components/shared/FloatingChatButton";
import { ModeTabBar } from "@/components/shared/ModeTabBar";
import { useAuth } from "@/lib/auth";
import { HerDataProvider, useHer } from "@/lib/herData";
import { HerUiProvider } from "@/lib/herUi";
import { useT } from "@/lib/i18n";
import { palette } from "@/theme";

const ICONS = { today: Sun, cycle: Drop, insights: ChartLineUp, care: Heart };

function Relief() {
  const { relief, closeRelief } = useHer();
  return <ReliefSheet open={relief.open} initialSeverity={relief.severity} onClose={closeRelief} />;
}

export default function HerLayout() {
  const { status, user } = useAuth();
  const { t } = useT();
  if (status === "loading") return null;
  if (status !== "authenticated") return <Redirect href="/(auth)/login" />;
  if (user && !user.hasHerProfile) return <Redirect href={{ pathname: "/onboarding", params: { mode: "her" } }} />;
  return (
    <HerDataProvider fallbackName={user?.name}>
      <HerUiProvider>
        <Tabs screenOptions={{ headerShown: false, animation: "shift", sceneStyle: { backgroundColor: palette.cream } }} tabBar={(p) => <ModeTabBar {...p} icons={ICONS} />}>
          <Tabs.Screen name="today" options={{ title: t("tabs.today", "Today") }} />
          <Tabs.Screen name="cycle" options={{ title: t("tabs.cycle", "Cycle") }} />
          <Tabs.Screen name="insights" options={{ title: t("tabs.insights", "Insights") }} />
          <Tabs.Screen name="care" options={{ title: t("tabs.care", "Care") }} />
        </Tabs>
        <FloatingChatButton mode="her" />
        <Relief />
        <ConsentGate />
      </HerUiProvider>
    </HerDataProvider>
  );
}
