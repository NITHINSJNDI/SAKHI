import { Suspense } from "react";
import type { Metadata } from "next";
import AuthScreen from "@/components/auth/AuthScreen";
import { SakhiLoadingScreen } from "@/components/SakhiSpinner";

export const metadata: Metadata = {
  title: "Sign in — Sakhi",
  description: "Sign in to your private Sakhi workspace with email and password or Google.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<SakhiLoadingScreen />}>
      <AuthScreen initialTab="signin" />
    </Suspense>
  );
}

