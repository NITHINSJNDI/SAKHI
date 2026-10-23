import { GoogleGenAI } from '@google/genai';

interface KeyMetadata {
  key: string;
  disabledUntil: number; // timestamp in ms
  consecutiveFailures: number;
  totalSuccesses: number;
}

// Global state across hot-reloads in Next.js development
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
 * Returns a deduplicated array of all configured Gemini API keys from environment variables.
 * Supports:
 * - GEMINI_API_KEYS (comma-separated list)
 * - GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... GEMINI_API_KEY_20
 * - GEMINI_API_KEY (primary fallback)
 */
export function getGeminiKeyPool(): string[] {
  const keys: string[] = [];

  // 1. Check comma-separated GEMINI_API_KEYS
  if (process.env.GEMINI_API_KEYS) {
    const split = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean);
    for (const k of split) {
      if (!keys.includes(k)) keys.push(k);
    }
  }

  // 2. Check numbered keys GEMINI_API_KEY_1 to GEMINI_API_KEY_20
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k && !keys.includes(k.trim())) {
      keys.push(k.trim());
    }
  }

  // 3. Check legacy single GEMINI_API_KEY
  if (process.env.GEMINI_API_KEY) {
    const primary = process.env.GEMINI_API_KEY.trim();
    if (primary && !keys.includes(primary)) {
      keys.unshift(primary);
    }
  }

  return keys;
}

/**
 * Ensures key metadata entries exist
 */
function ensureKeyStates(pool: string[]) {
  for (const k of pool) {
    if (!keyStates.has(k)) {
      keyStates.set(k, { key: k, disabledUntil: 0, consecutiveFailures: 0, totalSuccesses: 0 });
    }
  }
}

/**
 * Selects the next available key in the rotation that is not currently on cooldown.
 * If all keys are on cooldown, gracefully selects the one whose cooldown expires soonest.
 */
export function getNextGeminiKey(): { key: string; index: number; poolSize: number } {
  const pool = getGeminiKeyPool();
  if (pool.length === 0) {
    return { key: process.env.GEMINI_API_KEY || '', index: 0, poolSize: 0 };
  }

  ensureKeyStates(pool);
  const now = Date.now();

  // Try to find the next key in the rotation that is active & not on cooldown
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
 * Places a key on cooldown when it encounters rate limiting, quota exhaustion, or API errors.
 * Implements exponential backoff for repeat offenders.
 */
export function reportKeyExhausted(key: string, cooldownSeconds: number = 60) {
  const meta = keyStates.get(key) || { key, disabledUntil: 0, consecutiveFailures: 0, totalSuccesses: 0 };
  meta.consecutiveFailures += 1;
  const backoff = cooldownSeconds * Math.min(10, Math.pow(2, meta.consecutiveFailures - 1));
  meta.disabledUntil = Date.now() + backoff * 1000;
  keyStates.set(key, meta);
  console.warn(`[Gemini Auto-Switch] Key ...${key.slice(-6)} placed on cooldown for ${backoff}s (failures: ${meta.consecutiveFailures}). Rotating to next key.`);
}

/**
 * Records successful execution with a key, resetting failure counters.
 */
export function reportKeySuccess(key: string) {
  const meta = keyStates.get(key);
  if (meta) {
    meta.consecutiveFailures = 0;
    meta.disabledUntil = 0;
    meta.totalSuccesses += 1;
  }
}

/**
 * Comprehensive check for Gemini quota, rate limit, or server capacity errors.
 */
export function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.statusCode || err.code || err?.error?.code;
  const errorStatus = String(err?.error?.status || '').toUpperCase();
  const msg = (err.message || JSON.stringify(err) || '').toLowerCase();

  return (
    status === 429 ||
    status === 403 ||
    status === 503 ||
    errorStatus === 'RESOURCE_EXHAUSTED' ||
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('rate_limit') ||
    msg.includes('too many requests') ||
    msg.includes('exceeded your current quota') ||
    msg.includes('overloaded') ||
    msg.includes('capacity') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('permission_denied')
  );
}

/**
 * Executes an AI operation with automatic failover across all keys in the pool.
 * If one key limit is over or encounters a quota error, it automatically switches
 * to the next key without failing the user's request.
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
      const isQuota = isRateLimitError(err);
      
      console.warn(
        `[Gemini Auto-Switch] Key #${index} (...${key.slice(-6)}) ${
          isQuota ? 'rate limit / quota reached' : 'encountered error'
        }: ${err?.message || err}. Attempt ${attempt}/${attemptsLimit}.`
      );

      // Place the failing key on cooldown
      reportKeyExhausted(key, isQuota ? 60 : 30);

      // If there are more keys/attempts available, try the next key immediately!
      if (attempt < attemptsLimit) {
        console.log(`[Gemini Auto-Switch] Seamlessly switching to next key in pool (attempt ${attempt + 1})...`);
        continue;
      }
    }
  }

  throw lastError;
}

/**
 * Diagnostic helper to inspect pool health and rotation status.
 */
export function getPoolDiagnosticInfo() {
  const pool = getGeminiKeyPool();
  const now = Date.now();
  return {
    totalKeys: pool.length,
    activeKeys: pool.filter(k => {
      const meta = keyStates.get(k);
      return !meta || meta.disabledUntil <= now;
    }).length,
    cooldownKeys: pool.filter(k => {
      const meta = keyStates.get(k);
      return meta && meta.disabledUntil > now;
    }).length,
    keys: pool.map((k, i) => {
      const meta = keyStates.get(k);
      const isCooling = Boolean(meta && meta.disabledUntil > now);
      return {
        index: i + 1,
        masked: `...${k.slice(-6)}`,
        status: isCooling ? 'COOLDOWN' : 'ACTIVE',
        cooldownRemainingSeconds: isCooling ? Math.max(0, Math.round((meta!.disabledUntil - now) / 1000)) : 0,
        failures: meta?.consecutiveFailures || 0,
        successes: meta?.totalSuccesses || 0
      };
    })
  };
}
