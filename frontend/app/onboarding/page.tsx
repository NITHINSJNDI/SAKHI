"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import UnifiedOnboardingChat from "@/components/UnifiedOnboardingChat";
import { Heartbeat } from "@phosphor-icons/react";
import { Card } from "@/components/kokonut";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profileLoading, setProfileLoading] = useState(true);

  // Check if they already have a profile cookie
  useEffect(() => {
    if (status === "authenticated") {
      const checkProfile = () => {
        try {
          const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
          const isSwitch = urlParams?.get('switch') === 'true';
          if (isSwitch) {
            setProfileLoading(false);
            return;
          }

          const email = session?.user?.email ? session.user.email.replace(/[^a-zA-Z0-9]/g, '_') : '';
          if (!email) {
            setProfileLoading(false);
            return;
          }

          const cookies = document.cookie.split(";");
          const hasMomProfile = cookies.some(c => c.trim().startsWith(`sakhi_preg_profile_${email}=`));
          const hasHerProfile = cookies.some(c => c.trim().startsWith(`sakhi_her_profile_${email}=`));
          const activeMode = localStorage.getItem("sakhi_active_mode") || (document.cookie.split(";").find(c => c.trim().startsWith("sakhi_active_mode="))?.split("=")[1]?.trim());

          if (activeMode === "pregnancy" && hasMomProfile) {
            router.push("/pregnancy-mode");
            return;
          }
          if (activeMode === "her" && hasHerProfile) {
            router.push("/her-mode");
            return;
          }
          if (hasMomProfile) {
            router.push("/pregnancy-mode");
          } else if (hasHerProfile) {
            router.push("/her-mode");
          } else {
            setProfileLoading(false);
          }
        } catch (e) {
          setProfileLoading(false);
        }
      };
      
      checkProfile();
    }
  }, [status]);

  if (status === "loading" || (status === "authenticated" && profileLoading)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-lavender-500 border-t-transparent" />
          <p className="text-sm font-medium text-plum-800">Checking profile...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12 bg-cream">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="breathe absolute -top-20 left-[10%] h-80 w-80 rounded-full bg-lavender-200/40 blur-3xl" />
          <div className="breathe absolute bottom-10 right-[10%] h-80 w-80 rounded-full bg-blush-200/40 blur-3xl" style={{ animationDelay: "3s" }} />
        </div>

        <div className="w-full max-w-md bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_20px_50px_rgba(74,42,82,0.08)] rounded-[2.5rem] p-8 sm:p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-lavender-50 ring-1 ring-lavender-200/60 shadow-sm">
            <Heartbeat size={36} weight="fill" className="text-lavender-500" />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight text-plum-900">
            Welcome to <span className="display-serif italic text-plum-800">Sakhi</span>
          </h2>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">
            Your private companion connecting menstrual cycle, maternal care, and mental wellness.
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-neutral-50 text-plum-900 font-medium py-3.5 px-4 rounded-full border border-plum-900/15 shadow-sm hover:shadow transition-all duration-200 cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <p className="mt-6 text-[11px] text-ink-faint leading-normal">
            Each Google account is assigned its own private Sakhi workspace.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12 bg-cream">
      {/* Breathing Orbs for depth */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="breathe absolute -top-20 left-[10%] h-80 w-80 rounded-full bg-lavender-200/40 blur-3xl" />
        <div className="breathe absolute bottom-10 right-[10%] h-80 w-80 rounded-full bg-blush-200/40 blur-3xl" style={{ animationDelay: "3s" }} />
      </div>

      <div className="w-full max-w-2xl text-center mb-8">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white ring-1 ring-lavender-200/50 shadow-sm">
          <Heartbeat size={36} weight="fill" className="text-lavender-500" />
        </div>
        <h2 className="text-[2rem] font-semibold leading-tight tracking-tight text-plum-950">
          Welcome to <span className="display-serif text-plum-800 italic">Sakhi</span>
        </h2>
        <p className="mt-3 text-sm text-ink-soft">Let's set up your personalized health companion.</p>
      </div>

      <div className="w-full max-w-2xl px-2">
        <UnifiedOnboardingChat />
      </div>
    </section>
  );
}
