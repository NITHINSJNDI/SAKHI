"use client";

import { signOut } from "next-auth/react";

/** Remove every Sakhi key from browser storage (names, check-in markers, modes). */
export function clearSakhiBrowserState() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith("sakhi")).forEach(k => localStorage.removeItem(k));
  } catch { /* storage blocked */ }
  try {
    for (const c of document.cookie.split(";")) {
      const name = c.split("=")[0].trim();
      if (name.startsWith("sakhi_")) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    }
  } catch { /* ignore */ }
  try { sessionStorage.setItem("sakhi-intro-played", "true"); } catch { /* ignore */ }
}

/**
 * Sign out properly: server clears Sakhi cookies (and a guest's data when asked),
 * the browser forgets cached names and modes, then NextAuth ends the session.
 */
export async function sakhiSignOut(opts: { signedIn: boolean; eraseGuest?: boolean }) {
  try {
    await fetch("/api/sign-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eraseGuest: Boolean(opts.eraseGuest) }),
    });
  } catch { /* still sign out locally */ }
  clearSakhiBrowserState();
  if (opts.signedIn) {
    await signOut({ callbackUrl: "/", redirect: true });
  } else {
    window.location.href = "/";
  }
}
