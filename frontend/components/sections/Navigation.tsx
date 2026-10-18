"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/kokonut";
import { useSession, signIn, signOut } from "next-auth/react";

/**
 * Navigation — single line at desktop, height capped under 80px.
 * Frosted glass pill that condenses on scroll.
 */
export function Navigation() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const reduce = useReducedMotion();
  const { data: session, status } = useSession();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // Prefetch target routes in background for instant navigation
    router.prefetch("/her-mode");
    router.prefetch("/pregnancy-mode");
    router.prefetch("/onboarding");

    return () => window.removeEventListener("scroll", onScroll);
  }, [router]);

  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    const resolveName = () => {
      if (status !== "authenticated" || !session?.user?.email) {
        setUserName("");
        return;
      }

      const email = session.user.email.replace(/[^a-zA-Z0-9]/g, "_");

      // 1. Check cookies for this specific user
      if (typeof document !== "undefined") {
        const cookies = document.cookie.split(";");
        const herCookie = cookies.find((c) => c.trim().startsWith(`sakhi_her_profile_${email}=`));
        const pregCookie = cookies.find((c) => c.trim().startsWith(`sakhi_preg_profile_${email}=`));

        if (pregCookie) {
          try {
            const parsed = JSON.parse(decodeURIComponent(pregCookie.split("=")[1] || "{}"));
            if (parsed.preferred_name && parsed.preferred_name.trim()) {
              setUserName(parsed.preferred_name.trim());
              return;
            }
          } catch (e) {}
        }

        if (herCookie) {
          try {
            const parsed = JSON.parse(decodeURIComponent(herCookie.split("=")[1] || "{}"));
            if (parsed.preferred_name && parsed.preferred_name.trim()) {
              setUserName(parsed.preferred_name.trim());
              return;
            }
          } catch (e) {}
        }
      }

      // 2. Check localStorage
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("sakhi_preferred_name");
        if (stored && stored.trim() && stored.trim() !== "Mama" && stored.trim() !== "friend") {
          setUserName(stored.trim());
          return;
        }
      }

      // 3. Fallback to Google account name
      if (session.user.name) {
        setUserName(session.user.name.split(" ")[0]);
      } else {
        setUserName("there");
      }
    };

    resolveName();

    const handleNameUpdate = (e: any) => {
      if (e?.detail?.name) {
        setUserName(e.detail.name);
      } else {
        resolveName();
      }
    };

    window.addEventListener("sakhi-name-updated", handleNameUpdate);
    window.addEventListener("sakhi_name_updated", handleNameUpdate);
    window.addEventListener("storage", resolveName);
    return () => {
      window.removeEventListener("sakhi-name-updated", handleNameUpdate);
      window.removeEventListener("sakhi_name_updated", handleNameUpdate);
      window.removeEventListener("storage", resolveName);
    };
  }, [session]);

  const goToMode = () => {
    try {
      if (status !== "authenticated" || !session?.user?.email) {
        signIn("google", { callbackUrl: "/onboarding" });
        return;
      }

      const email = session.user.email.replace(/[^a-zA-Z0-9]/g, "_");
      const cookies = typeof document !== "undefined" ? document.cookie.split(";") : [];
      const hasMom = cookies.some((c) => c.trim().startsWith(`sakhi_preg_profile_${email}=`));
      const hasHer = cookies.some((c) => c.trim().startsWith(`sakhi_her_profile_${email}=`));

      const activeMode =
        (typeof window !== "undefined" ? localStorage.getItem("sakhi_active_mode") : null) ||
        cookies.find((c) => c.trim().startsWith("sakhi_active_mode="))?.split("=")[1]?.trim();

      if (activeMode === "pregnancy" && hasMom) {
        router.push("/pregnancy-mode");
        return;
      }
      if (activeMode === "her" && hasHer) {
        router.push("/her-mode");
        return;
      }

      if (hasMom && !hasHer) {
        router.push("/pregnancy-mode");
        return;
      }
      if (hasHer && !hasMom) {
        router.push("/her-mode");
        return;
      }
      if (hasMom) {
        router.push("/pregnancy-mode");
        return;
      }
      if (hasHer) {
        router.push("/her-mode");
        return;
      }

      router.push("/onboarding");
    } catch (e) {
      router.push("/onboarding");
    }
  };

  const handleSignOut = async () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("sakhi-intro-played", "true");
        localStorage.removeItem("sakhi_active_mode");
        localStorage.removeItem("sakhi_preferred_name");
        localStorage.removeItem("sakhi_last_checkin");
        localStorage.removeItem("sakhi_last_checkin_mom");
        document.cookie = "sakhi_active_mode=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "sakhi_preferred_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
      await signOut({ callbackUrl: "/", redirect: true });
    } catch (e) {
      console.error(e);
      window.location.href = "/";
    }
  };

  const links = [
    { label: "Main", href: "#hero" },
    { label: "Cycle", href: "#cycle" },
    { label: "Mind", href: "#mind" },
    { label: "Care", href: "#care" },
    { label: "Privacy", href: "#privacy" },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (href === "#hero" || href === "#main") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const elem = document.querySelector(href);
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.header
      initial={reduce ? false : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav
        className={`flex w-full max-w-5xl items-center justify-between gap-4 rounded-full px-5 py-2.5 transition-all duration-500 ease-[var(--ease-soft)]
          ${scrolled ? "glass-strong" : "bg-white/30 border border-white/40 backdrop-blur-sm"}`}
        style={{ height: "60px" }}
      >
        {/* Center links — hidden on small screens to keep one line */}
        <div className="hidden items-center gap-7 md:flex pl-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={(e) => handleNavClick(e, l.href)}
              className="text-sm font-medium text-ink-soft transition-colors hover:text-plum-900 cursor-pointer"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Auth status & CTA */}
        <div className="flex items-center gap-4">
          {status === "authenticated" ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/95 border border-pink-300/50 shadow-[0_2px_8px_rgba(244,114,182,0.15)] shrink-0 flex items-center justify-center">
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={userName || "User profile"}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-pink-200 to-purple-200 text-[#2D1B36] font-semibold text-xs">
                    {(userName || session?.user?.name || "U").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <span className="hidden text-xs font-medium text-plum-900 sm:inline">
                Hi, {userName || (session?.user?.name ? session.user.name.split(" ")[0] : "there")}
              </span>
              <Button
                variant="primary"
                onClick={goToMode}
                className="px-4 py-1.5 text-xs font-medium"
                glow
              >
                Mode
              </Button>
              <button
                onClick={handleSignOut}
                className="text-xs font-medium text-ink-soft hover:text-plum-900 transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
              className="px-5 py-2 text-sm"
              glow
            >
              Sign In
            </Button>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
