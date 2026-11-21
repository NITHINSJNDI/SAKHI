/**
 * Date helpers that use the phone's LOCAL calendar day.
 * Never use `toISOString().split("T")[0]` for a calendar date: it gives the
 * UTC day, which is yesterday in India before 5:30 am.
 */
export function localIso(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** A date the API returns (`2026-11-21` or a timestamp like `2026-11-20T18:30:00.000Z`) as a local YYYY-MM-DD. */
export function apiDateToLocal(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value.split("T")[0] : localIso(parsed);
}
