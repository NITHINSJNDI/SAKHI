import {
  predictCycle,
  predictGdm,
  predictPcos,
  predictPreeclampsia,
  predictThyroid,
} from './scoring';

const ML_URL = process.env.ML_SERVICE_URL || process.env.NEXT_PUBLIC_ML_BACKEND_URL || 'http://127.0.0.1:8000';
const TIMEOUT_MS = 2500;

const LOCAL = {
  cycle: predictCycle,
  pcos: predictPcos,
  thyroid: predictThyroid,
  preeclampsia: predictPreeclampsia,
  gdm: predictGdm,
} as const;

export type MlTask = keyof typeof LOCAL;

/**
 * Score with the FastAPI ML service, falling back to the identical in-process
 * TypeScript scorer if the service is down, slow, or errors. The response says
 * which engine answered so the UI and logs can show it.
 */
export async function runPrediction(task: MlTask, body: Record<string, any>, opts: { forceLocal?: boolean } = {}) {
  if (opts.forceLocal) {
    return { ...(LOCAL[task] as (b: any) => any)(body), engine: 'local-fallback' };
  }
  try {
    const res = await fetch(`${ML_URL}/predict/${task}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (res.ok) {
      return { ...(await res.json()), engine: 'fastapi' };
    }
    // 4xx means bad input: the local scorer would reject it too, so surface it
    if (res.status >= 400 && res.status < 500) {
      const detail = await res.json().catch(() => ({}));
      throw Object.assign(new Error(`Invalid input: ${JSON.stringify(detail?.detail ?? detail)}`), { status: 400 });
    }
    console.warn(`[ML] FastAPI /predict/${task} returned ${res.status}; using local scorer`);
  } catch (err: any) {
    if (err?.status === 400) throw err;
    console.warn(`[ML] FastAPI unreachable for /predict/${task} (${err?.name || err}); using local scorer`);
  }
  const local = (LOCAL[task] as (b: any) => any)(body);
  return { ...local, engine: 'local-fallback' };
}
