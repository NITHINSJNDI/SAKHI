"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { SmoothScroll } from "@/components/SmoothScroll";
import DiscreetGuard from "@/components/DiscreetGuard";
import OutboxSync from "@/components/OutboxSync";
import { LanguageProvider } from "@/context/LanguageContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <SmoothScroll />
        {children}
        <DiscreetGuard />
        <OutboxSync />
      </LanguageProvider>
    </SessionProvider>
  );
}
