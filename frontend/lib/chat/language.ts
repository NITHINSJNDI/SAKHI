/**
 * Multilingual Language Processor for Sakhi AI
 * Supports all 22 constitutionally scheduled languages of India + English.
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
 * Resolves the language Sakhi will use for generating her response.
 * Priority:
 * 1. Script detected in the user's typed message (e.g., if she writes in தமிழ் script, reply in Tamil).
 * 2. Explicit language code provided in request body / query.
 * 3. User's saved language preference from database / settings.
 * 4. Default: 'en' (English).
 */
export function replyLang(setting: unknown, message: string = ''): ReplyLang {
  // 1. Check for distinctive script in user message
  const detected = detectLanguageFromScript(message);
  if (detected) return detected;

  // 2. Check setting code or BCP-47 tag
  const clean = String(setting || '').trim().toLowerCase();
  if (clean) {
    const matched = getLanguage(clean);
    return matched.code;
  }

  return 'en';
}

/**
 * Generates dynamic, culturally attuned system prompt instructions for Gemini.
 */
export function languageRule(langCode: ReplyLang): string {
  const lang: LanguageInfo = getLanguage(langCode);

  if (lang.code === 'en') {
    return `
LANGUAGE:
- Reply in warm, accessible Indian English with conversational empathy. Common Indian terms (ASHA worker, didi, maa) and standard maternal/cycle health vocabulary are encouraged.
- Keep numbers as digits (120/80, 28 days). Emergency 112 and Tele-MANAS 14416 stay as digits.`;
  }

  const directionRule = lang.direction === 'rtl' 
    ? `- Note: ${lang.name} (${lang.nativeName}) is written in ${lang.script} script (Right-to-Left). Format sentences appropriately.`
    : `- Write in ${lang.script} script.`;

  return `
LANGUAGE & CULTURAL ATTUNEMENT:
- You MUST reply naturally, warmly, and fluently in ${lang.name} (${lang.nativeName}).
${directionRule}
- Use simple, compassionate everyday words that a rural or urban Indian woman can relate to and understand effortlessly.
- If the user uses mixed language or regional code-switching (e.g. ${lang.name} combined with English, such as Hinglish or Tanglish), comprehend it without friction and respond back in conversational ${lang.name}.
- Keep common healthcare loanwords natural and accessible (BP, Sugar, Scan, Ultrasound, Iron, Folic Acid, Tablet, Injection, Doctor, Hospital, Clinic, Hemoglobin, BMI).
- Keep all numerical values, measurements, dates, and phone numbers as standard digits (e.g., 120/80 mmHg, 28 days, 5 mg, emergency 112, Tele-MANAS 14416).
- Never translate personal names, emails, clinic names, or user IDs.
- Do NOT unnecessarily switch to English in the middle of a sentence unless referencing medical loanwords.
- CRITICAL ARCHITECTURAL RULE: Function calls and tool arguments (such as log_health_entry or schedule_pregnancy_appointment) MUST remain in standard English to preserve database schema integrity. Only the user-facing text reply is in ${lang.name}.`;
}

export { INDIAN_LANGUAGES, getLanguage };
