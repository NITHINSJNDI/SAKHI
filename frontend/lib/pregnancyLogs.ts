/**
 * Merge a pregnancy vitals entry into the day's existing log without wiping
 * fields that were logged earlier (shared by the check-in form and the chat).
 */
export function mergePregnancyLog(existingLogs: any[], data: any) {
  const logs = Array.isArray(existingLogs) ? existingLogs.slice() : [];
  const dateToSave = String(data.log_date || new Date().toISOString().split('T')[0]).split('T')[0];
  const index = logs.findIndex((l: any) => String(l?.log_date || '').split('T')[0] === dateToSave);
  const today = index >= 0 ? logs[index] : {};
  const num = (v: any, fallback: any) => (v !== undefined && v !== null && v !== '' && !isNaN(Number(v)) ? Number(v) : fallback);

  const incoming: string[] = Array.isArray(data.symptoms) ? data.symptoms : data.symptoms ? [data.symptoms] : [];
  const merged = Array.from(new Set([
    ...(today.symptoms || []).filter((s: string) => s && s !== 'None'),
    ...incoming.filter((s: string) => s && s !== 'None'),
  ]));

  const entry = {
    ...today,
    log_date: dateToSave,
    weight: num(data.weight, today.weight ?? (logs.length > 0 ? logs[logs.length - 1].weight ?? null : null)),
    blood_pressure_systolic: num(data.blood_pressure_systolic, today.blood_pressure_systolic ?? null),
    blood_pressure_diastolic: num(data.blood_pressure_diastolic, today.blood_pressure_diastolic ?? null),
    blood_sugar: num(data.blood_sugar, today.blood_sugar ?? null),
    baby_movement: num(data.baby_movement, today.baby_movement ?? null),
    mood: data.mood || today.mood || 'Calm',
    sleep_hours: num(data.sleep_hours, today.sleep_hours ?? 8),
    symptoms: merged.length > 0 ? merged : ['None'],
  };

  if (index >= 0) logs[index] = entry;
  else logs.push(entry);
  logs.sort((a: any, b: any) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
  return { entry, logs };
}
