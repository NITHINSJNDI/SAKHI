import { GoogleGenAI } from '@google/genai';

interface KeyMetadata {
  key: string;
  disabledUntil: number; // timestamp in ms
  consecutiveFailures: number;
}

// Global state across hot-reloads in development
const globalForGemini = globalThis as unknown as {
  geminiKeyStates?: Map<string, KeyMetadata>;
  geminiCurrentIndex?: number;
};

const keyStates = globalForGemini.geminiKeyStates || new Map<string, KeyMetadata>();
globalForGemini.geminiKeyStates = keyStates;

if (globalForGemini.geminiCurrentIndex === undefined) {
  globalForGemini.geminiCurrentIndex = 0;
}

/**
 * Returns an array of all configured Gemini API keys
 */
export function getGeminiKeyPool(): string[] {
  const keys: string[] = [];

  if (process.env.GEMINI_API_KEYS) {
    keys.push(...process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean));
  }

  for (let i = 1; i <= 20; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k && !keys.includes(k.trim())) keys.push(k.trim());
  }

  if (process.env.GEMINI_API_KEY && !keys.includes(process.env.GEMINI_API_KEY.trim())) {
    keys.unshift(process.env.GEMINI_API_KEY.trim());
  }

  return keys;
}

/**
 * Initializes metadata for all keys in the pool
 */
function ensureKeyStates(pool: string[]) {
  for (const k of pool) {
    if (!keyStates.has(k)) {
      keyStates.set(k, { key: k, disabledUntil: 0, consecutiveFailures: 0 });
    }
  }
}

/**
 * Selects the next available key in the cycle that is not on cooldown.
 */
export function getNextGeminiKey(): { key: string; index: number; poolSize: number } {
  const pool = getGeminiKeyPool();
  if (pool.length === 0) {
    return { key: process.env.GEMINI_API_KEY || '', index: 0, poolSize: 0 };
  }

  ensureKeyStates(pool);
  const now = Date.now();

  // Try to find the next key in the cycle that is not on cooldown
  for (let step = 0; step < pool.length; step++) {
    const idx = (globalForGemini.geminiCurrentIndex! + step) % pool.length;
    const candidate = pool[idx];
    const meta = keyStates.get(candidate);

    if (!meta || meta.disabledUntil <= now) {
      globalForGemini.geminiCurrentIndex = (idx + 1) % pool.length;
      return { key: candidate, index: idx + 1, poolSize: pool.length };
    }
  }

  // If all keys are on cooldown, pick the one that expires soonest
  let bestCandidate = pool[0];
  let soonest = Infinity;
  for (const k of pool) {
    const meta = keyStates.get(k);
    if (meta && meta.disabledUntil < soonest) {
      soonest = meta.disabledUntil;
      bestCandidate = k;
    }
  }

  return { key: bestCandidate, index: pool.indexOf(bestCandidate) + 1, poolSize: pool.length };
}

/**
 * Reports that a key encountered a rate limit or quota exhaustion error.
 * Places the key on cooldown so subsequent calls automatically skip it.
 */
export function reportKeyExhausted(key: string, cooldownSeconds: number = 60) {
  const meta = keyStates.get(key) || { key, disabledUntil: 0, consecutiveFailures: 0 };
  meta.consecutiveFailures += 1;
  // Exponential backoff if repeated failures: 60s, 120s, 240s...
  const backoff = cooldownSeconds * Math.min(10, Math.pow(2, meta.consecutiveFailures - 1));
  meta.disabledUntil = Date.now() + backoff * 1000;
  keyStates.set(key, meta);
  console.warn(`[Gemini Rotator] Key ...${key.slice(-6)} rate-limited! Placed on cooldown for ${backoff}s. Switching to next key.`);
}

/**
 * Reports that a key successfully served a request.
 */
export function reportKeySuccess(key: string) {
  const meta = keyStates.get(key);
  if (meta) {
    meta.consecutiveFailures = 0;
    meta.disabledUntil = 0;
  }
}

/**
 * Helper to check if an error is a rate limit or quota exhaustion
 */
export function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.code;
  const msg = (err.message || '').toLowerCase();
  return (
    status === 429 ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests')
  );
}

/**
 * Executes an AI operation with automatic cycle-switching on limit exhaustion.
 * If Key 1 hits its limit, it automatically switches to Key 2, Key 3, etc.
 */
export async function executeGeminiWithAutoSwitch<T>(
  operation: (client: GoogleGenAI, key: string, attempt: number) => Promise<T>,
  maxAttempts?: number
): Promise<T> {
  const pool = getGeminiKeyPool();
  const totalKeys = Math.max(1, pool.length);
  const attemptsLimit = maxAttempts || totalKeys;
  let lastError: any = null;

  for (let attempt = 1; attempt <= attemptsLimit; attempt++) {
    const { key, index } = getNextGeminiKey();
    const client = new GoogleGenAI({ apiKey: key });

    try {
      const result = await operation(client, key, attempt);
      reportKeySuccess(key);
      return result;
    } catch (err: any) {
      lastError = err;
      if (isRateLimitError(err)) {
        console.warn(`[Gemini Rotator] Key #${index} (...${key.slice(-6)}) hit rate limit on attempt ${attempt}/${attemptsLimit}.`);
        reportKeyExhausted(key, 60);
        // Continue to the next key in the cycle!
        continue;
      } else {
        // If it's a fatal non-rate-limit error (e.g. invalid request structure), don't loop endlessly
        throw err;
      }
    }
  }

  throw lastError;
}
