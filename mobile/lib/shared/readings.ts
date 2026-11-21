// GENERATED from frontend/lib/readings.ts by scripts/sync-shared.mjs. Do not edit here.
/**
 * Where a health reading came from. Most women in India don't own a BP
 * machine or a glucometer, but they do get BP, weight, Hb and urine checked at
 * every antenatal visit (written on the Mother and Child Protection card), at
 * village health days by the ANM, or at home by their ASHA worker.
 * Sakhi accepts all of these, says who measured each reading, and asks for a
 * fresh check when a reading gets old instead of expecting daily home readings.
 */

export type MeasuredBy = 'self' | 'mcp_card' | 'asha' | 'health_centre' | 'lab';

export const MEASURED_BY: { key: MeasuredBy; label: string; short: string }[] = [
  { key: 'mcp_card', label: 'MCP card (antenatal visit)', short: 'MCP card' },
  { key: 'asha', label: 'ASHA / ANM checked it', short: 'ASHA / ANM' },
  { key: 'health_centre', label: 'Health centre / PHC', short: 'health centre' },
  { key: 'lab', label: 'Lab report', short: 'lab' },
  { key: 'self', label: 'My own machine', short: 'own machine' },
];

export const isMeasuredBy = (v: unknown): v is MeasuredBy => MEASURED_BY.some(m => m.key === v);
export const measuredByShort = (v: unknown) => MEASURED_BY.find(m => m.key === v)?.short ?? null;

/** Days since a YYYY-MM-DD reading, using her local calendar day. */
export function daysSince(date: string | null | undefined, today = new Date()): number | null {
  if (!date) return null;
  const d = new Date(`${String(date).slice(0, 10)}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((t.getTime() - d.getTime()) / 86_400_000);
}

/**
 * Antenatal visits are roughly monthly (weekly or fortnightly late in
 * pregnancy), so a BP reading older than this is worth refreshing.
 */
export function bpRefreshDays(weeks: number) {
  if (weeks >= 36) return 7;
  if (weeks >= 28) return 14;
  return 28;
}

export function staleNote(kind: 'bp' | 'sugar', age: number | null, weeks: number): string | null {
  if (age === null) return null;
  const limit = kind === 'bp' ? bpRefreshDays(weeks) : 42;
  if (age <= limit) return null;
  const when = age >= 14 ? `${Math.floor(age / 7)} weeks` : `${age} days`;
  return kind === 'bp'
    ? `This reading is ${when} old. Ask your ASHA worker, the ANM at the village health day, or the PHC for a BP check (it's free), or add it from your MCP card after your next visit.`
    : `This reading is ${when} old. Ask at your next antenatal visit whether a sugar test is due (usually at the first visit and again at 24 to 28 weeks).`;
}
