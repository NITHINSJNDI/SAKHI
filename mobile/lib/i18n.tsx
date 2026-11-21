/**
 * Translations for the app, built on the web's dictionaries (lib/shared/translations,
 * 8 languages, ~920 strings each). Improvements over the web's plain key lookup:
 *
 * - Plurals: a key can have `_one` / `_other` (and `_zero`, `_two`, `_few`, `_many`)
 *   variants, chosen with Intl.PluralRules for the language; `{count}` is filled in.
 * - Locale-aware numbers and dates (`fmtNumber`, `fmtDate`) using the language's
 *   BCP-47 tag, so Hindi gets Devanagari month names, Bengali digits stay native, etc.
 * - First launch follows the phone's language (expo-localization) when Sakhi supports it.
 * - The choice persists on the phone and syncs to the account (/api/preferences),
 *   so web and mobile stay in the same language.
 * - Missing keys are reported once in development instead of silently showing English.
 * - `tValue` translates values that come from the API ("Heavy", "Back pain") using
 *   the same vocabulary aliases as the web.
 */
import { getLocales } from "expo-localization";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiFetch } from "./api";
import { getString, setString } from "./storage";
import { getTranslation, SUPPORTED_LANGUAGES, type SupportedLanguage, type SupportedLanguageMeta } from "./shared/translations";
import { en } from "./shared/translations/en";

type Params = Record<string, string | number>;

const PREF_KEY = "sakhi_preferred_language";

const VOCAB_ALIASES: Record<string, string> = {
  cramp: "cramps", cramps: "cramps", acne: "acne", fatigue: "fatigue", fatigued: "fatigue", tired: "fatigue",
  bloat: "bloating", bloating: "bloating", backpain: "backPain", "back pain": "backPain", headache: "headache",
  hairgrowth: "hairGrowth", "hair growth": "hairGrowth", hairloss: "hairLoss", "hair loss": "hairLoss",
  nausea: "nausea", swelling: "swelling", heartburn: "heartburn", braxtonhicks: "braxtonHicks",
  "braxton hicks": "braxtonHicks", dizziness: "dizziness", pelvicpain: "pelvicPain", "pelvic pain": "pelvicPain",
  vaginaldryness: "vaginalDryness", "vaginal dryness": "vaginalDryness", jointaches: "jointAches",
  "joint aches": "jointAches", hotflashes: "hotFlashes", "hot flashes": "hotFlashes", nightsweats: "nightSweats",
  "night sweats": "nightSweats", poorsleep: "poorSleep", "poor sleep": "poorSleep", moodswings: "moodSwings",
  "mood swings": "moodSwings", calm: "calm", happy: "happy", energetic: "energetic", anxious: "anxious",
  irritable: "irritable", sad: "sad", lowmood: "lowMood", "low mood": "lowMood", none: "none",
  "none recorded": "noneRecorded", "none reported": "noneRecorded", spotting: "spotting", light: "light",
  medium: "medium", moderate: "medium", heavy: "heavy", "very heavy": "veryHeavy", veryheavy: "veryHeavy",
  pcos: "pcos", endometriosis: "endometriosis", thyroid: "thyroid", anaemia: "anaemia", anemia: "anaemia",
  gestationaldiabetes: "gestationalDiabetes", "gestational diabetes": "gestationalDiabetes",
  hypertension: "hypertension", "high blood pressure": "hypertension", regular: "regular", irregular: "irregular",
  sometimes: "sometimes", low: "low", high: "high", "ovulation peak day": "ovulationPeakDay",
  "fertile window open": "fertileWindowOpen", "menstrual phase": "menstrualPhase",
  "follicular phase": "follicularPhase", "luteal phase": "lutealPhase",
  "estimated ovulation": "estimatedOvulation", "fertile window": "fertileWindow",
};

export const normalizeLanguage = (raw?: string | null): SupportedLanguage => {
  const clean = String(raw || "").trim().toLowerCase().split("-")[0];
  return (SUPPORTED_LANGUAGES.some((l) => l.code === clean) ? clean : "en") as SupportedLanguage;
};

const has = (dict: unknown, path: string) => {
  let cur: unknown = dict;
  for (const part of path.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) cur = (cur as Record<string, unknown>)[part];
    else return false;
  }
  return typeof cur === "string";
};

const reported = new Set<string>();

export interface I18n {
  language: SupportedLanguage;
  meta: SupportedLanguageMeta;
  languages: SupportedLanguageMeta[];
  setLanguage: (code: SupportedLanguage) => Promise<void>;
  /** t("cycle.title"), t("x", "Fallback"), t("x", { name }), t("days", { count: 3 }) */
  t: (path: string, fallbackOrParams?: string | Params, params?: Params) => string;
  tValue: (val?: string | null) => string;
  fmtNumber: (n: number, opts?: Intl.NumberFormatOptions) => string;
  fmtDate: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function LanguageProvider({ children, accountLanguage }: { children: ReactNode; accountLanguage?: string | null }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");

  // Saved choice > account preference > phone language > English
  useEffect(() => {
    void (async () => {
      const saved = await getString(PREF_KEY);
      if (saved) return setLanguageState(normalizeLanguage(saved));
      if (accountLanguage) return setLanguageState(normalizeLanguage(accountLanguage));
      const device = getLocales()[0]?.languageCode;
      setLanguageState(normalizeLanguage(device));
    })();
  }, [accountLanguage]);

  const meta = useMemo(
    () => SUPPORTED_LANGUAGES.find((l) => l.code === language) ?? SUPPORTED_LANGUAGES[0],
    [language],
  );

  const setLanguage = useCallback(async (code: SupportedLanguage) => {
    setLanguageState(code);
    await setString(PREF_KEY, code);
    // Keep web and mobile in the same language; ignore failures (signed out / offline)
    apiFetch("/api/preferences", { method: "PATCH", body: JSON.stringify({ language: code }) }).catch(() => {});
  }, []);

  const t = useCallback(
    (path: string, fallbackOrParams?: string | Params, params?: Params) => {
      const p = typeof fallbackOrParams === "object" ? fallbackOrParams : params;
      const fallback = typeof fallbackOrParams === "string" ? fallbackOrParams : undefined;

      // Plural variants: path_one / path_other / ...
      let key = path;
      if (p && typeof p.count === "number") {
        const cat = new Intl.PluralRules(meta.bcp47).select(p.count);
        if (has(en, `${path}_${cat}`)) key = `${path}_${cat}`;
        else if (has(en, `${path}_other`)) key = `${path}_other`;
      }

      if (__DEV__ && !has(en, key) && !fallback && !reported.has(key)) {
        reported.add(key);
        console.warn(`[i18n] missing key: ${key}`);
      }
      const withCount = p && typeof p.count === "number" ? { ...p, count: new Intl.NumberFormat(meta.bcp47).format(p.count) } : p;
      return getTranslation(language, key, fallback ?? withCount, fallback ? withCount : undefined);
    },
    [language, meta.bcp47],
  );

  const tValue = useCallback(
    (val?: string | null) => {
      if (!val || typeof val !== "string") return "";
      const clean = val.trim().toLowerCase();
      const k = VOCAB_ALIASES[clean] || VOCAB_ALIASES[clean.replace(/[-_]/g, " ")];
      return k ? getTranslation(language, `vocab.${k}`, val) : val;
    },
    [language],
  );

  const fmtNumber = useCallback(
    (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(meta.bcp47, opts).format(n),
    [meta.bcp47],
  );
  const fmtDate = useCallback(
    (d: Date | string | number, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => {
      const date = d instanceof Date ? d : new Date(typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00` : d);
      return Number.isNaN(date.getTime()) ? String(d) : date.toLocaleDateString(meta.bcp47, opts);
    },
    [meta.bcp47],
  );

  const value = useMemo<I18n>(
    () => ({ language, meta, languages: SUPPORTED_LANGUAGES, setLanguage, t, tValue, fmtNumber, fmtDate }),
    [language, meta, setLanguage, t, tValue, fmtNumber, fmtDate],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18n {
  const v = useContext(I18nContext);
  if (!v) throw new Error("useT must be used inside LanguageProvider");
  return v;
}
