import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif/400Regular_Italic";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import DiscreetGuard from "@/components/shared/DiscreetGuard";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n";
import { ModeProvider } from "@/lib/mode";
import { lightTheme } from "@/theme";

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash prevention is best-effort; the app still renders if it fails.
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {

  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    InstrumentSerif_400Regular_Italic,
  });

  // The splash is hidden by app/index.tsx once the session check finishes.
  // Safety net so a slow network never leaves the user stuck on the splash.
  useEffect(() => {
    const t = setTimeout(() => void SplashScreen.hideAsync(), 8000);
    return () => clearTimeout(t);
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppProviders>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: lightTheme.background } }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="onboarding/index" />
                <Stack.Screen name="her" />
                <Stack.Screen name="mom" />
                <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="chat" options={{ animation: "slide_from_bottom" }} />
                <Stack.Screen name="triage" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="lab-report" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="doctor-summary" options={{ animation: "slide_from_right" }} />
                <Stack.Screen name="consent" options={{ animation: "slide_from_right" }} />
              </Stack>
              <DiscreetGuard />
            </AppProviders>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Language (account preference first) and the active mode need the signed-in user. */
function AppProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const prefs = (user as { preferences?: { language?: string } } | null)?.preferences;
  return (
    <LanguageProvider accountLanguage={prefs?.language}>
      <ModeProvider>{children}</ModeProvider>
    </LanguageProvider>
  );
}
