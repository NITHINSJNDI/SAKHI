export interface SakhiLanguage {
  code: string;
  name: string;
  nativeName: string;
}

/** Strictly supported 8-language matrix, mirrored from frontend/lib/languages.ts. */
export const SUPPORTED_LANGUAGES: SakhiLanguage[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা" },
  { code: "mr", name: "Marathi", nativeName: "मराठी" },
];

export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0];
