/**
 * Canonical 23 Indian Languages Matrix for SAKHI
 * (All 22 Constitutionally Scheduled Languages of India + English)
 * 
 * Maps official ISO 639 codes, BCP-47 speech tags, native script names,
 * text directionality (LTR/RTL), and Gemini AI voice capability tiers.
 */

export interface LanguageInfo {
  code: string;              // ISO-639-1 / 639-3 (e.g. 'ta', 'hi', 'en', 'ur')
  bcp47: string;             // Standard BCP-47 locale tag (e.g. 'ta-IN', 'hi-IN')
  name: string;              // English name
  nativeName: string;        // Native script name
  script: string;            // Script family name
  direction: 'ltr' | 'rtl';  // Text direction
  voiceTier: 'live' | 'assisted'; // 'live' = direct Gemini Live audio / high fidelity; 'assisted' = Gemini text + regional voice
  tierDescription: string;   // Human-readable capability
}

export const INDIAN_LANGUAGES: LanguageInfo[] = [
  {
    code: 'en',
    bcp47: 'en-IN',
    name: 'English',
    nativeName: 'English (India)',
    script: 'Latin',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'hi',
    bcp47: 'hi-IN',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'ta',
    bcp47: 'ta-IN',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'te',
    bcp47: 'te-IN',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'bn',
    bcp47: 'bn-IN',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'mr',
    bcp47: 'mr-IN',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'gu',
    bcp47: 'gu-IN',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'kn',
    bcp47: 'kn-IN',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'ml',
    bcp47: 'ml-IN',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'pa',
    bcp47: 'pa-IN',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
    direction: 'ltr',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'ur',
    bcp47: 'ur-IN',
    name: 'Urdu',
    nativeName: 'اردو',
    script: 'Perso-Arabic',
    direction: 'rtl',
    voiceTier: 'live',
    tierDescription: 'Gemini Live Real-Time Voice',
  },
  {
    code: 'as',
    bcp47: 'as-IN',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    script: 'Assamese (Bengali)',
    direction: 'ltr',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'or',
    bcp47: 'or-IN',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    script: 'Odia',
    direction: 'ltr',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'sa',
    bcp47: 'sa-IN',
    name: 'Sanskrit',
    nativeName: 'संस्कृतम्',
    script: 'Devanagari',
    direction: 'ltr',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'ne',
    bcp47: 'ne-NP',
    name: 'Nepali',
    nativeName: 'नेपाली',
    script: 'Devanagari',
    direction: 'ltr',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'kok',
    bcp47: 'kok-IN',
    name: 'Konkani',
    nativeName: 'कोंकणी',
    script: 'Devanagari',
    direction: 'ltr',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'mai',
    bcp47: 'mai-IN',
    name: 'Maithili',
    nativeName: 'मैथिली',
    script: 'Devanagari',
    direction: 'ltr',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'doi',
    bcp47: 'doi-IN',
    name: 'Dogri',
    nativeName: 'डोगरी',
    script: 'Devanagari',
    direction: 'ltr',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'ks',
    bcp47: 'ks-IN',
    name: 'Kashmiri',
    nativeName: 'کٲشُر / कॉशुर',
    script: 'Perso-Arabic / Devanagari',
    direction: 'rtl',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'sd',
    bcp47: 'sd-IN',
    name: 'Sindhi',
    nativeName: 'سنڌي / सिन्धी',
    script: 'Perso-Arabic / Devanagari',
    direction: 'rtl',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'mni',
    bcp47: 'mni-IN',
    name: 'Manipuri (Meitei)',
    nativeName: 'মৈতৈলোন্ / ꯃꯤꯇꯩꯂꯣꯟ',
    script: 'Bengali / Meetei Mayek',
    direction: 'ltr',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'brx',
    bcp47: 'brx-IN',
    name: 'Bodo',
    nativeName: 'बड़ो',
    script: 'Devanagari',
    direction: 'ltr',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
  {
    code: 'sat',
    bcp47: 'sat-IN',
    name: 'Santali',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',
    script: 'Ol Chiki',
    direction: 'ltr',
    voiceTier: 'assisted',
    tierDescription: 'Gemini AI Multilingual + Voice Assisted',
  },
];

export const LANGUAGE_CODES = INDIAN_LANGUAGES.map(l => l.code);
export type SupportedLangCode = typeof LANGUAGE_CODES[number];

const LANG_MAP = new Map<string, LanguageInfo>();
INDIAN_LANGUAGES.forEach(lang => {
  LANG_MAP.set(lang.code.toLowerCase(), lang);
  LANG_MAP.set(lang.bcp47.toLowerCase(), lang);
});

export function getLanguage(codeOrBcp47?: string | null): LanguageInfo {
  if (!codeOrBcp47) return INDIAN_LANGUAGES[0]; // English fallback
  const clean = String(codeOrBcp47).trim().toLowerCase();
  return LANG_MAP.get(clean) || LANG_MAP.get(clean.slice(0, 2)) || INDIAN_LANGUAGES[0];
}

export function isRTL(codeOrBcp47?: string | null): boolean {
  return getLanguage(codeOrBcp47).direction === 'rtl';
}

/**
 * Unicode-based script auto-detector for Indian languages.
 * Detects script from typed or transcribed text to allow natural code-switching.
 */
export function detectLanguageFromScript(text: string): SupportedLangCode | null {
  if (!text || typeof text !== 'string') return null;

  // Perso-Arabic (Urdu, Kashmiri, Sindhi in Arabic script)
  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
    return 'ur';
  }
  // Tamil
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  // Telugu
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  // Kannada
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  // Malayalam
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  // Bengali / Assamese
  if (/[\u0980-\u09FF]/.test(text)) {
    // Specific Assamese characters: ৰ (ra), ৱ (wa)
    if (/[\u09F0\u09F1]/.test(text)) return 'as';
    return 'bn';
  }
  // Gujarati
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
  // Gurmukhi (Punjabi)
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
  // Odia
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or';
  // Ol Chiki (Santali)
  if (/[\u1C50-\u1C7F]/.test(text)) return 'sat';
  // Meetei Mayek (Manipuri)
  if (/[\uABC0-\uABFF]/.test(text)) return 'mni';
  // Devanagari (Hindi, Marathi, Sanskrit, Nepali, Konkani, Maithili, Bodo, Dogri)
  if (/[\u0900-\u097F]/.test(text)) {
    // Specific Marathi letter ळ (\u0933)
    if (/\u0933/.test(text)) return 'mr';
    return 'hi';
  }

  return null;
}

