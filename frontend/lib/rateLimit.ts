/**
 * Small in-memory sliding-window rate limiter. Protects the Gemini key pool and
 * write endpoints from abuse. Per server instance (good enough for a single
 * Node process; on serverless it still caps bursts per warm instance).
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    // Drop stale keys so memory stays bounded
    for (const [k, v] of buckets) if (!v.some(t => now - t < windowMs)) buckets.delete(k);
  }
  return { ok: true, retryAfter: 0 };
}

export function clientKey(req: Request, ownerKey: string) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
  return `${ownerKey}|${ip}`;
}
