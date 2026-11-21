import { Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";
import { useMode } from "@/lib/mode";

/**
 * App entry: the native splash stays up while the saved session is checked,
 * then the user goes straight to the dashboard or to sign-in. No landing page.
 */
export default function IndexScreen() {
  const { status, user } = useAuth();
  const { mode } = useMode();

  useEffect(() => {
    if (status !== "loading") void SplashScreen.hideAsync();
  }, [status]);

  if (status === "loading" || (status === "authenticated" && mode === null)) return null;

  const hasProfile = Boolean(user?.hasHerProfile || user?.hasMomProfile);
  const target =
    status === "authenticated"
      ? hasProfile
        ? mode === "pregnancy"
          ? "/mom/today"
          : "/her/today"
        : "/onboarding"
      : "/(auth)/login";

  return <Redirect href={target} />;
}
