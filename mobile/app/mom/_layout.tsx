import { Redirect, Tabs } from "expo-router";
import { Baby, CalendarCheck, Heart, Heartbeat, Sun } from "phosphor-react-native";

import ConsentGate from "@/components/shared/ConsentGate";
import { FloatingChatButton } from "@/components/shared/FloatingChatButton";
import { ModeTabBar } from "@/components/shared/ModeTabBar";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { MomDataProvider, useMom } from "@/lib/momData";
import { MomUiProvider } from "@/lib/momUi";
import { palette } from "@/theme";

function MomTabs() {
  const { t } = useT();
  const { born } = useMom();
  // After the birth the Plan tab becomes the baby's tab
  const icons = { today: Sun, vitals: Heartbeat, plan: born ? Baby : CalendarCheck, care: Heart };
  return (
    <Tabs screenOptions={{ headerShown: false, animation: "shift", sceneStyle: { backgroundColor: palette.cream } }} tabBar={(p) => <ModeTabBar {...p} icons={icons} accent="violet" />}>
      <Tabs.Screen name="today" options={{ title: t("tabs.today", "Today") }} />
      <Tabs.Screen name="vitals" options={{ title: t("tabs.vitals", "Vitals") }} />
      <Tabs.Screen name="plan" options={{ title: born ? t("mom.newbornTitle", "Baby") : t("tabs.plan", "Plan") }} />
      <Tabs.Screen name="care" options={{ title: t("tabs.care", "Care") }} />
    </Tabs>
  );
}

export default function MomLayout() {
  const { status, user } = useAuth();
  if (status === "loading") return null;
  if (status !== "authenticated") return <Redirect href="/(auth)/login" />;
  if (user && !user.hasMomProfile) return <Redirect href={{ pathname: "/onboarding", params: { mode: "pregnancy" } }} />;
  return (
    <MomDataProvider fallbackName={user?.name}>
      <MomUiProvider>
        <MomTabs />
        <FloatingChatButton mode="pregnancy" />
        <ConsentGate />
      </MomUiProvider>
    </MomDataProvider>
  );
}
