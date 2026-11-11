/**
 * Cycle phase engine. Pure functions, safe on client and server.
 *
 * Model: the luteal phase is fairly constant (~14 days), so ovulation is placed
 * ~14 days before the next expected period and the follicular phase absorbs the
 * variation. This is an estimate; confidence drops as cycles get less regular.
 */

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
export type Confidence = 'high' | 'medium' | 'low';

export const PHASES: Phase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];

export const PHASE_META: Record<Phase, { label: string; short: string; color: string; soft: string; ring: string }> = {
  menstrual: { label: 'Menstrual phase', short: 'Menstrual', color: 'text-rose-600', soft: 'bg-rose-50 border-rose-200', ring: '#f43f5e' },
  follicular: { label: 'Follicular phase', short: 'Follicular', color: 'text-emerald-600', soft: 'bg-emerald-50 border-emerald-200', ring: '#10b981' },
  ovulatory: { label: 'Ovulatory phase', short: 'Ovulatory', color: 'text-amber-600', soft: 'bg-amber-50 border-amber-200', ring: '#f59e0b' },
  luteal: { label: 'Luteal phase', short: 'Luteal', color: 'text-violet-600', soft: 'bg-violet-50 border-violet-200', ring: '#8b5cf6' },
};

const DAY = 86_400_000;
const BLEEDING = new Set(['light', 'moderate', 'medium', 'heavy', 'very_heavy', 'very heavy']);

/** Whole-day number for a YYYY-MM-DD (or ISO) string, timezone independent. */
export function dayNum(value: string | Date): number {
  if (value instanceof Date) {
    return Math.floor(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / DAY);
  }
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return Math.floor(Date.UTC(y, m - 1, d) / DAY);
}

export const todayNum = () => dayNum(new Date());

export function isBleedingLog(log: any): boolean {
  if (log?.on_period === true) return true;
  return BLEEDING.has(String(log?.flow_intensity || '').toLowerCase());
}

/** Period start days found in the logs: a bleeding day after 10+ days without bleeding. */
export function detectPeriodStarts(logs: any[], profileStart?: string | null): number[] {
  const bleeding = Array.from(new Set(
    (logs || []).filter(isBleedingLog).map(l => dayNum(l.log_date)).filter(n => !isNaN(n))
  )).sort((a, b) => a - b);

  const starts: number[] = [];
  let prev = -Infinity;
  for (const d of bleeding) {
    if (d - prev > 10) starts.push(d);
    prev = d;
  }
  const p = profileStart ? dayNum(profileStart) : NaN;
  if (!isNaN(p) && !starts.some(s => Math.abs(s - p) <= 10)) starts.push(p);
  return starts.sort((a, b) => a - b);
}

export interface PhaseBounds {
  periodLength: number;
  ovulationDay: number;
  /** inclusive cycle-day ranges */
  ranges: Record<Phase, [number, number]>;
}

export function phaseBounds(cycleLength: number, periodLength: number): PhaseBounds {
  const len = Math.max(18, Math.min(60, Math.round(cycleLength) || 28));
  const per = Math.max(2, Math.min(10, Math.round(periodLength) || 5));
  const ovulationDay = Math.max(per + 2, len - 14);
  const ovStart = Math.max(per + 1, ovulationDay - 1);
  const ovEnd = Math.min(len, ovulationDay + 1);
  return {
    periodLength: per,
    ovulationDay,
    ranges: {
      menstrual: [1, per],
      follicular: [per + 1, ovStart - 1],
      ovulatory: [ovStart, ovEnd],
      luteal: [ovEnd + 1, len],
    },
  };
}

export function phaseOnCycleDay(cycleDay: number, cycleLength: number, periodLength: number): Phase {
  const { ranges } = phaseBounds(cycleLength, periodLength);
  if (cycleDay <= ranges.menstrual[1]) return 'menstrual';
  if (cycleDay < ranges.ovulatory[0]) return 'follicular';
  if (cycleDay <= ranges.ovulatory[1]) return 'ovulatory';
  return 'luteal';
}

export interface PhaseInfo {
  phase: Phase;
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
  ovulationDay: number;
  nextPhase: Phase;
  daysToNextPhase: number;
  daysUntilPeriod: number;
  late: boolean;
  daysLate: number;
  confidence: Confidence;
  confidenceReason: string;
  /** spread between shortest and longest recent cycle, in days */
  variability: number | null;
  lastStart: number;
  /** today's log shows bleeding while the estimate says otherwise */
  bleedingMismatch: boolean;
}

/** Recent cycle lengths: from detected starts, then the stored cycle history. */
export function recentCycleLengths(starts: number[], cycleHistory: any[]): number[] {
  const fromStarts: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const len = starts[i] - starts[i - 1];
    if (len >= 15 && len <= 90) fromStarts.push(len);
  }
  const fromHistory = (cycleHistory || [])
    .map(h => Number(h?.cycleLength ?? h?.cycle_length))
    .filter(n => n >= 15 && n <= 90);
  const lengths = fromStarts.length >= 2 ? fromStarts : fromHistory.length ? fromHistory : fromStarts;
  return lengths.slice(-6);
}

export function computePhase(input: {
  profile: any;
  logs: any[];
  cycleHistory?: any[];
  today?: number;
}): PhaseInfo {
  const { profile, logs } = input;
  const today = input.today ?? todayNum();
  const starts = detectPeriodStarts(logs, profile?.last_period_start || profile?.lastPeriodStart);
  const pastStarts = starts.filter(s => s <= today);
  const lastStart = pastStarts.length ? pastStarts[pastStarts.length - 1] : today - 13;

  const lengths = recentCycleLengths(pastStarts, input.cycleHistory || []);
  const profileLen = Number(profile?.cycle_length_avg || profile?.cycle_length) || 28;
  const cycleLength = lengths.length
    ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length)
    : profileLen;
  const periodLength = Number(profile?.period_duration) || 5;
  const bounds = phaseBounds(cycleLength, periodLength);
  const len = Math.max(18, Math.min(60, cycleLength));

  const cycleDay = today - lastStart + 1;
  const late = cycleDay > len;
  const daysLate = late ? cycleDay - len : 0;
  const phase = late ? 'luteal' : phaseOnCycleDay(cycleDay, len, bounds.periodLength);

  const order: Phase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];
  let nextPhase: Phase = order[(order.indexOf(phase) + 1) % 4];
  // Very short cycles can leave the follicular window empty
  if (nextPhase === 'follicular' && bounds.ranges.follicular[1] < bounds.ranges.follicular[0]) nextPhase = 'ovulatory';
  const daysToNextPhase = late ? 0 : Math.max(1, bounds.ranges[phase][1] - cycleDay + 1);
  const daysUntilPeriod = late ? 0 : len - cycleDay + 1;

  const variability = lengths.length >= 2 ? Math.max(...lengths) - Math.min(...lengths) : null;
  let confidence: Confidence;
  let confidenceReason: string;
  if (variability === null) {
    const irregular = ['no', 'irregular'].includes(String(profile?.cycle_regularity || '').toLowerCase());
    confidence = irregular ? 'low' : 'medium';
    confidenceReason = irregular
      ? 'Based on your setup answers. Log a few periods so Sakhi can learn your rhythm.'
      : 'Based on your average cycle. It gets sharper as you log more periods.';
  } else if (variability <= 4) {
    confidence = 'high';
    confidenceReason = `Your recent cycles vary by only ${variability} day${variability === 1 ? '' : 's'}.`;
  } else if (variability <= 8) {
    confidence = 'medium';
    confidenceReason = `Your recent cycles vary by ${variability} days, so phase dates may shift a little.`;
  } else {
    confidence = 'low';
    confidenceReason = `Your recent cycles vary by ${variability} days, so ovulation and luteal dates are rough guesses. Go by how you feel.`;
  }
  if (late) {
    confidence = 'low';
    confidenceReason = 'Your period is later than expected, so the current phase is uncertain.';
  }

  const todayLog = (logs || []).find(l => dayNum(l.log_date) === today);
  const bleedingMismatch = Boolean(todayLog && isBleedingLog(todayLog) && phase !== 'menstrual');

  return {
    phase,
    cycleDay,
    cycleLength: len,
    periodLength: bounds.periodLength,
    ovulationDay: bounds.ovulationDay,
    nextPhase,
    daysToNextPhase,
    daysUntilPeriod,
    late,
    daysLate,
    confidence,
    confidenceReason,
    variability,
    lastStart,
    bleedingMismatch,
  };
}

/** Phase for any past day, using the period starts around it. */
export function phaseForDay(day: number, starts: number[], fallbackLength: number, periodLength: number): Phase | null {
  let idx = -1;
  for (let i = 0; i < starts.length; i++) if (starts[i] <= day) idx = i;
  if (idx === -1) return null;
  const start = starts[idx];
  const len = idx + 1 < starts.length ? starts[idx + 1] - start : fallbackLength;
  const cd = day - start + 1;
  if (cd > len + 7) return null; // too far past the expected period to say
  return phaseOnCycleDay(Math.min(cd, len), len, periodLength);
}

export const dayToIso = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
