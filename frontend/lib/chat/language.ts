/**
 * Multilingual Language Processor for Sakhi AI
 * Strictly supports the 8 canonical Indian languages.
 */

import {
  INDIAN_LANGUAGES,
  SupportedLangCode,
  detectLanguageFromScript,
  getLanguage,
  LanguageInfo,
} from '@/lib/languages';

export type ReplyLang = SupportedLangCode;

/**
 * Resolves the language Sakhi will use for generating responses.
 * Priority:
 * 1. User's explicitly chosen application language (from settings / request parameter / session).
 * 2. Distinctive script detected in user message (fallback if no setting specified).
 * 3. Default: 'en' (English).
 */
export function replyLang(setting: unknown, message: string = ''): ReplyLang {
  // 1. Explicit application language setting always takes top priority
  const clean = String(setting || '').trim().toLowerCase();
  if (clean) {
    const matched = getLanguage(clean);
    if (matched && matched.code) return matched.code as ReplyLang;
  }

  // 2. Secondary fallback: check distinctive native script in user message
  const detected = detectLanguageFromScript(message);
  if (detected) return detected;

  return 'en';
}

/**
 * Strict system instructions for Gemini enforcing selected language compliance.
 */
export function languageRule(langCode: ReplyLang): string {
  const lang: LanguageInfo = getLanguage(langCode);
  const langDisplay = `${lang.name} (${lang.nativeName})`;

  if (lang.code === 'en') {
    return `
SYSTEM INSTRUCTION - MULTILINGUAL COMPLIANCE:
You are the SAKHI multilingual assistant. The user's selected application language is English. You MUST generate your complete response exclusively in warm, accessible Indian English with conversational empathy. Common Indian terms (ASHA worker, didi, maa) and standard maternal/cycle health vocabulary are encouraged.
- Keep numbers as standard digits (120/80 mmHg, 28 days, emergency 112, Tele-MANAS 14416).
- Function calls and tool declarations MUST remain in standard English schema.`;
  }

  return `
SYSTEM INSTRUCTION - MULTILINGUAL COMPLIANCE:
You are the SAKHI multilingual assistant. The user's selected application language is ${langDisplay}. You MUST generate your complete response exclusively in this language (${lang.name}). Never randomly switch languages. Never respond in English unless English is the selected language. This rule applies to greetings, explanations, medical information, recommendations, questions, summaries, warnings and every other response. Preserve necessary medical terminology with a clear explanation in the selected language.

- You MUST write in ${lang.script} script.
- Never transliterate ${lang.name} into English/Latin letters. Write fully in ${lang.script}.
- If the user writes in English or transliterated script, comprehend their intent but respond back entirely in ${langDisplay}.
- Keep common healthcare loanwords natural and accessible (BP, Sugar, Scan, Ultrasound, Iron, Folic Acid, Tablet, Injection, Doctor, Hospital, Clinic, Hemoglobin, BMI) explained in ${lang.name}.
- Keep all numerical values, measurements, dates, and phone numbers as standard digits (e.g., 120/80 mmHg, 28 days, 5 mg, emergency 112, Tele-MANAS 14416).
- Never translate personal names, emails, clinic names, or user IDs.
- CRITICAL ARCHITECTURAL RULE: Function calls and tool arguments (such as log_health_entry or schedule_pregnancy_appointment) MUST remain in standard English to preserve database schema integrity. Only the user-facing text reply is in ${langDisplay}.`;
}

export { INDIAN_LANGUAGES, getLanguage };
