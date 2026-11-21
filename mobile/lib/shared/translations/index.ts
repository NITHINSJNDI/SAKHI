import { en, type TranslationSchema } from "./en";
import { ta } from "./ta";
import { hi } from "./hi";
import { te } from "./te";
import { ml } from "./ml";
import { kn } from "./kn";
import { bn } from "./bn";
import { mr } from "./mr";

export type SupportedLanguage = "en" | "ta" | "hi" | "te" | "ml" | "kn" | "bn" | "mr";

export interface SupportedLanguageMeta {
  code: SupportedLanguage;
  bcp47: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
}

export const SUPPORTED_LANGUAGES: SupportedLanguageMeta[] = [
  { code: "en", bcp47: "en-IN", name: "English", nativeName: "English", direction: "ltr" },
  { code: "ta", bcp47: "ta-IN", name: "Tamil", nativeName: "தமிழ்", direction: "ltr" },
  { code: "hi", bcp47: "hi-IN", name: "Hindi", nativeName: "हिन्दी", direction: "ltr" },
  { code: "te", bcp47: "te-IN", name: "Telugu", nativeName: "తెలుగు", direction: "ltr" },
  { code: "ml", bcp47: "ml-IN", name: "Malayalam", nativeName: "മലയാളം", direction: "ltr" },
  { code: "kn", bcp47: "kn-IN", name: "Kannada", nativeName: "ಕನ್ನಡ", direction: "ltr" },
  { code: "bn", bcp47: "bn-IN", name: "Bengali", nativeName: "বাংলা", direction: "ltr" },
  { code: "mr", bcp47: "mr-IN", name: "Marathi", nativeName: "मराठी", direction: "ltr" },
];

export const DICTIONARIES: Record<SupportedLanguage, TranslationSchema> = {
  en,
  ta,
  hi,
  te,
  ml,
  kn,
  bn,
  mr,
};

/**
 * Resolves a nested key (e.g. 'cycle.menstrualPhase') for the given language.
 * Falls back to English if missing, and replaces any {param} variables.
 */
export function getTranslation(
  lang: string,
  path: string,
  fallbackOrParams?: string | Record<string, string | number>,
  params?: Record<string, string | number>
): string {
  let fallback: string | undefined;
  let p = params;
  if (typeof fallbackOrParams === "object" && fallbackOrParams !== null) {
    p = fallbackOrParams;
    fallback = undefined;
  } else {
    fallback = fallbackOrParams;
  }

  const code = (lang in DICTIONARIES ? lang : "en") as SupportedLanguage;
  const dict = DICTIONARIES[code];
  const parts = path.split(".");

  let cur: any = dict;
  for (const part of parts) {
    if (cur && typeof cur === "object" && part in cur) {
      cur = cur[part];
    } else {
      cur = undefined;
      break;
    }
  }

  // Fallback to English if not found
  if (typeof cur !== "string" && code !== "en") {
    let enCur: any = DICTIONARIES.en;
    for (const part of parts) {
      if (enCur && typeof enCur === "object" && part in enCur) {
        enCur = enCur[part];
      } else {
        enCur = undefined;
        break;
      }
    }
    if (typeof enCur === "string") {
      cur = enCur;
    }
  }

  let result = typeof cur === "string" ? cur : fallback || path;

  // Replace variable placeholders like {count}
  if (p && typeof result === "string") {
    for (const [k, v] of Object.entries(p)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }

  return result;
}
