/**
 * Strictly Supported 8 Indian Languages Matrix for SAKHI:
 * 1. English
 * 2. Tamil (தமிழ்)
 * 3. Hindi (हिन्दी)
 * 4. Telugu (తెలుగు)
 * 5. Malayalam (മലയാളം)
 * 6. Kannada (ಕನ್ನಡ)
 * 7. Bengali (বাংলা)
 * 8. Marathi (मराठी)
 */

export interface LanguageInfo {
  code: string;              // ISO-639-1 ('en', 'ta', 'hi', 'te', 'ml', 'kn', 'bn', 'mr')
  bcp47: string;             // Standard BCP-47 locale tag ('en-IN', 'ta-IN', etc.)
  name: string;              // English name
  nativeName: string;        // Native script name
  script: string;            // Script family name
  direction: 'ltr' | 'rtl';  // Text direction (all LTR for these 8)
  voiceTier: 'live' | 'assisted';
  tierDescription: string;
}

export const INDIAN_LANGUAGES: LanguageInfo[] = [
  {
    code: 'en',
    bcp47: 'en-IN',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'English (India)',
  },
  {
    code: 'ta',
    bcp47: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'தமிழ்',
  },
  {
    code: 'hi',
    bcp47: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'हिन्दी',
  },
  {
    code: 'te',
    bcp47: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'తెలుగు',
  },
  {
    code: 'ml',
    bcp47: 'ml-IN',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'മലയാളം',
  },
  {
    code: 'kn',
    bcp47: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'ಕನ್ನಡ',
  },
  {
    code: 'bn',
    bcp47: 'bn-IN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'বাংলা',
  },
  {
    code: 'mr',
    bcp47: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'मराठी',
  },
];

export const LANGUAGE_CODES = INDIAN_LANGUAGES.map(l => l.code);
export type SupportedLangCode = 'en' | 'ta' | 'hi' | 'te' | 'ml' | 'kn' | 'bn' | 'mr';

const LANG_MAP = new Map<string, LanguageInfo>();
INDIAN_LANGUAGES.forEach(lang => {
  LANG_MAP.set(lang.code.toLowerCase(), lang);
  LANG_MAP.set(lang.bcp47.toLowerCase(), lang);
});

export function getLanguage(codeOrBcp47?: string | null): LanguageInfo {
  if (!codeOrBcp47) return INDIAN_LANGUAGES[0]; // English default
  const clean = String(codeOrBcp47).trim().toLowerCase();
  return LANG_MAP.get(clean) || LANG_MAP.get(clean.slice(0, 2)) || INDIAN_LANGUAGES[0];
}

export function isRTL(codeOrBcp47?: string | null): boolean {
  return false; // All 8 supported languages are LTR
}

/**
 * Unicode-based script detector for the 8 supported Indian languages.
 */
export function detectLanguageFromScript(text: string): SupportedLangCode | null {
  if (!text || typeof text !== 'string') return null;

  // Tamil
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  // Telugu
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  // Kannada
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  // Malayalam
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  // Bengali
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  // Devanagari (Hindi, Marathi)
  if (/[\u0900-\u097F]/.test(text)) {
    if (/\u0933/.test(text)) return 'mr'; // Marathi ळ
    return 'hi';
  }

  return null;
}
