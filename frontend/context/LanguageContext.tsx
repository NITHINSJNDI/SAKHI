"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  SUPPORTED_LANGUAGES,
  getTranslation,
  type SupportedLanguage,
  type SupportedLanguageMeta,
} from "@/lib/translations";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: string) => Promise<void>;
  t: (
    path: string,
    fallbackOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>
  ) => string;
  languages: SupportedLanguageMeta[];
  currentMeta: SupportedLanguageMeta;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const PREF_KEY = "sakhi_preferred_language";
const VOICE_KEY = "sakhi_voice_lang";

const normalizeCode = (raw?: string | null): SupportedLanguage => {
  if (!raw) return "en";
  const clean = raw.trim().toLowerCase().split("-")[0];
  const valid: SupportedLanguage[] = ["en", "ta", "hi", "te", "ml", "kn", "bn", "mr"];
  return (valid.includes(clean as any) ? clean : "en") as SupportedLanguage;
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [mounted, setMounted] = useState(false);

  // Sync state on client mount
  useEffect(() => {
    setMounted(true);
    let initial: SupportedLanguage = "en";

    // 1. Try local storage
    try {
      const stored = localStorage.getItem(PREF_KEY) || localStorage.getItem(VOICE_KEY);
      if (stored) {
        initial = normalizeCode(stored);
      }
    } catch {
      // ignore
    }

    setLanguageState(initial);

    // 2. Fetch authenticated user preference from DB
    fetch("/api/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.preferences?.language) {
          const dbLang = normalizeCode(data.preferences.language);
          setLanguageState(dbLang);
          try {
            localStorage.setItem(PREF_KEY, dbLang);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Update HTML tag whenever language changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      const meta = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
      document.documentElement.lang = meta.code;
      document.documentElement.dir = meta.direction;
    }
  }, [language]);

  const setLanguage = useCallback(async (newLang: string) => {
    const code = normalizeCode(newLang);
    setLanguageState(code);

    const meta = SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];

    // 1. Local storage & cookie
    try {
      localStorage.setItem(PREF_KEY, code);
      localStorage.setItem(VOICE_KEY, meta.bcp47);
      if (typeof document !== "undefined") {
        document.cookie = `sakhi_preferred_language=${code}; path=/; max-age=31536000`;
        document.documentElement.lang = meta.code;
        document.documentElement.dir = meta.direction;
      }
    } catch {}

    // 2. Broadcast custom event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("sakhi-language-changed", {
          detail: {
            language: code,
            bcp47: meta.bcp47,
            name: meta.name,
            nativeName: meta.nativeName,
            direction: meta.direction,
          },
        })
      );
    }

    // 3. Persist to DB for authenticated users
    try {
      await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: code }),
      });
    } catch {
      // ignore network errors
    }
  }, []);

  // Listen to external language events (e.g. from speech or other components)
  useEffect(() => {
    const onExternalChange = (e: any) => {
      if (e?.detail?.language) {
        const next = normalizeCode(e.detail.language);
        if (next !== language) {
          setLanguageState(next);
        }
      }
    };
    window.addEventListener("sakhi-language-changed", onExternalChange);
    return () => window.removeEventListener("sakhi-language-changed", onExternalChange);
  }, [language]);

  const t = useCallback(
    (
      path: string,
      fallbackOrParams?: string | Record<string, string | number>,
      params?: Record<string, string | number>
    ) => {
      return getTranslation(language, path, fallbackOrParams, params);
    },
    [language]
  );

  const currentMeta = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      languages: SUPPORTED_LANGUAGES,
      currentMeta,
      isRTL: currentMeta.direction === "rtl",
    }),
    [language, setLanguage, t, currentMeta]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if called outside provider (e.g. in test or isolated tree)
    return {
      language: "en" as SupportedLanguage,
      setLanguage: async () => {},
      t: (
        path: string,
        fallbackOrParams?: string | Record<string, string | number>,
        params?: Record<string, string | number>
      ) => getTranslation("en", path, fallbackOrParams, params),
      languages: SUPPORTED_LANGUAGES,
      currentMeta: SUPPORTED_LANGUAGES[0],
      isRTL: false,
    };
  }
  return context;
}
