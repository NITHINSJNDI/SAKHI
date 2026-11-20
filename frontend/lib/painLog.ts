/**
 * Pain through the day. A day's log keeps every pain report with its time
 * ("0 at 8 am, 7 at 2 pm"), and the day's cramps_severity is the worst of them,
 * so charts, the anaemia check and the doctor summary keep working unchanged.
 */

export type PainSource = 'check-in' | 'quick' | 'chat';
export const PAIN_WHERE = ['Tummy', 'Lower back', 'Legs', 'Head', 'Breasts'] as const;

export interface PainEvent {
  at: string;          // ISO time
  level: number;       // 0-10
  where?: string[];
  source: PainSource;
}

const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)));

export function painEvents(entry: any): PainEvent[] {
  const list = Array.isArray(entry?.pain_events) ? entry.pain_events : [];
  return list
    .filter((e: any) => e && Number.isFinite(Number(e.level)) && !isNaN(new Date(e.at).getTime()))
    .map((e: any) => ({ ...e, level: clamp(Number(e.level)) }))
    .sort((a: PainEvent, b: PainEvent) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

/** The day's score: the worst pain reported, or the old single value for days logged before this existed. */
export function worstPain(entry: any): number {
  const events = painEvents(entry);
  if (events.length) return Math.max(...events.map(e => e.level));
  return clamp(Number(entry?.cramps_severity) || 0);
}

/** A copy of the day's log with one more pain report, and cramps_severity updated. */
export function addPainEvent(entry: any, level: number, source: PainSource, opts: { at?: string; where?: string[] } = {}) {
  const event: PainEvent = {
    at: opts.at || new Date().toISOString(),
    level: clamp(level),
    source,
    ...(opts.where?.length ? { where: opts.where.slice(0, 5).map(String) } : {}),
  };
  // A day logged before pain_events existed keeps its old value as the first report
  const before = painEvents(entry);
  const seed = !before.length && Number(entry?.cramps_severity) > 0 && entry?.log_date
    ? [{ at: entry.log_date, level: clamp(Number(entry.cramps_severity)), source: 'check-in' as const }]
    : [];
  const pain_events = [...seed, ...before, event].slice(-48);
  return { ...entry, pain_events, cramps_severity: Math.max(...pain_events.map(e => e.level)) };
}

export function removePainEvent(entry: any, at: string) {
  const pain_events = painEvents(entry).filter(e => e.at !== at);
  return { ...entry, pain_events, cramps_severity: pain_events.length ? Math.max(...pain_events.map(e => e.level)) : 0 };
}
