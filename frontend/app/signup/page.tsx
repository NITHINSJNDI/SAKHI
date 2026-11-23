import { Suspense } from "react";
import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";
import { SakhiLoadingScreen } from "@/components/SakhiSpinner";

export const metadata: Metadata = {
  title: "Create account — Sakhi",
  description: "Create a private Sakhi account for menstrual cycle, pregnancy, and wellness tracking.",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<SakhiLoadingScreen />}>
      <AuthScreen initialTab="signup" />
    </Suspense>
  );
}

