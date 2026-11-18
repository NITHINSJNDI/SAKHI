/**
 * Baby's weight on the WHO Child Growth Standards (2006), weight-for-age, the
 * same lines as the growth chart on India's MCP card:
 *   green  at or above −2 SD   normal weight for age
 *   yellow −3 to −2 SD         moderately underweight
 *   red    below −3 SD         severely underweight
 * Values are the WHO simplified field tables, rounded to 0.1 kg, by month 0–24.
 */
export type Sex = 'girl' | 'boy';
export interface GrowthEntry { date: string; weight: number }

const M = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 21, 24];
// rows: −3 SD, −2 SD, median, +2 SD
const WHO: Record<Sex, number[][]> = {
  boy: [
    [2.1, 2.9, 3.8, 4.4, 4.9, 5.3, 5.7, 5.9, 6.2, 6.4, 6.6, 6.8, 6.9, 7.4, 7.8, 8.2, 8.6],
    [2.5, 3.4, 4.3, 5.0, 5.6, 6.0, 6.4, 6.7, 6.9, 7.1, 7.4, 7.6, 7.7, 8.3, 8.8, 9.2, 9.7],
    [3.3, 4.5, 5.6, 6.4, 7.0, 7.5, 7.9, 8.3, 8.6, 8.9, 9.2, 9.4, 9.6, 10.3, 10.9, 11.5, 12.2],
    [4.4, 5.8, 7.1, 8.0, 8.7, 9.3, 9.8, 10.3, 10.7, 11.0, 11.4, 11.7, 12.0, 12.8, 13.7, 14.5, 15.3],
  ],
  girl: [
    [2.0, 2.7, 3.4, 4.0, 4.4, 4.8, 5.1, 5.3, 5.6, 5.8, 5.9, 6.1, 6.3, 6.7, 7.2, 7.6, 8.1],
    [2.4, 3.2, 3.9, 4.5, 5.0, 5.4, 5.7, 6.0, 6.3, 6.5, 6.7, 6.9, 7.0, 7.6, 8.1, 8.6, 9.0],
    [3.2, 4.2, 5.1, 5.8, 6.4, 6.9, 7.3, 7.6, 7.9, 8.2, 8.5, 8.7, 8.9, 9.6, 10.2, 10.9, 11.5],
    [4.2, 5.5, 6.6, 7.5, 8.2, 8.8, 9.3, 9.8, 10.2, 10.5, 10.9, 11.2, 11.5, 12.4, 13.2, 14.0, 14.8],
  ],
};

const DAY = 86_400_000;
export const monthsOld = (birth: string, date: string) =>
  Math.max(0, (Date.parse(date + 'T00:00:00Z') - Date.parse(birth + 'T00:00:00Z')) / DAY / 30.4375);

/** −3 SD, −2 SD, median and +2 SD at an age in months (straight line between table points). */
export function linesAt(sex: Sex, months: number): { sd3neg: number; sd2neg: number; median: number; sd2: number } {
  const m = Math.max(0, Math.min(24, months));
  let i = 0;
  while (i < M.length - 2 && M[i + 1] < m) i++;
  const f = (m - M[i]) / (M[i + 1] - M[i]);
  const at = (row: number[]) => Math.round((row[i] + (row[i + 1] - row[i]) * Math.min(1, Math.max(0, f))) * 100) / 100;
  const [a, b, c, d] = WHO[sex];
  return { sd3neg: at(a), sd2neg: at(b), median: at(c), sd2: at(d) };
}

export type Band = 'red' | 'yellow' | 'green' | 'high';
export function bandOf(sex: Sex, months: number, weight: number): Band {
  const l = linesAt(sex, months);
  if (weight < l.sd3neg) return 'red';
  if (weight < l.sd2neg) return 'yellow';
  if (weight > l.sd2) return 'high';
  return 'green';
}

export const BAND_TEXT: Record<Band, { label: string; advice: string }> = {
  green: { label: 'Normal weight for age', advice: 'Keep going: breastfeeding on demand, and from 6 months, family food 3 to 5 times a day.' },
  yellow: { label: 'Underweight (yellow zone)', advice: 'Show this to your ASHA, ANM or doctor this week. Feed more often, and check baby is breastfeeding well.' },
  red: { label: 'Severely underweight (red zone)', advice: 'See a doctor within a day or two. Your nearest health centre can refer you to a Nutrition Rehabilitation Centre if needed.' },
  high: { label: 'Above the usual range', advice: 'Not an emergency. Mention it at the next check-up.' },
};

export interface GrowthCheck { band: Band | null; notes: { level: 'info' | 'watch' | 'doctor'; text: string }[] }

/** Where the latest weight sits, and the warning signs the MCP card asks families to look for. */
export function checkGrowth(sex: Sex | undefined, birth: string, entries: GrowthEntry[], today: string): GrowthCheck {
  const list = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const notes: GrowthCheck['notes'] = [];
  const birthEntry = list.find(e => e.date === birth) || null;
  const last = list[list.length - 1];
  if (!last) return { band: null, notes };
  const ageNow = Math.round((Date.parse(today) - Date.parse(birth)) / DAY);
  const lastAgeDays = Math.round((Date.parse(last.date) - Date.parse(birth)) / DAY);

  if (birthEntry && birthEntry.weight < 2.5) {
    notes.push({ level: ageNow <= 28 ? 'watch' : 'info', text: `Born at ${birthEntry.weight} kg, which is a low birth weight. Keep baby warm with skin-to-skin contact (Kangaroo Mother Care), breastfeed every 2 hours, and keep every check-up.` });
  }
  // Newborns lose up to 10% in the first week and are back to birth weight by about 2 weeks
  if (birthEntry && last !== birthEntry) {
    const change = (last.weight - birthEntry.weight) / birthEntry.weight;
    if (lastAgeDays <= 14 && change < -0.1) notes.push({ level: 'doctor', text: `Baby has lost ${Math.round(-change * 100)}% of birth weight. More than 10% needs a doctor's check for feeding.` });
    else if (lastAgeDays > 14 && lastAgeDays <= 42 && last.weight < birthEntry.weight) notes.push({ level: 'doctor', text: 'Baby is still below birth weight after 2 weeks. Please see a doctor about feeding.' });
  }
  // A flat or falling line between weighings at least 3 weeks apart is a warning sign
  const prev = [...list].reverse().find(e => Date.parse(last.date) - Date.parse(e.date) >= 21 * DAY);
  if (prev && last.weight <= prev.weight && lastAgeDays > 14) {
    notes.push({ level: 'doctor', text: `No weight gain since ${new Date(prev.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. A flat or falling line means baby needs a check-up, even if the weight is in the green.` });
  }
  if (ageNow - lastAgeDays > 35 && ageNow < 730) notes.push({ level: 'info', text: 'Time to weigh baby again. Monthly weighing is free at the Anganwadi centre.' });
  return { band: sex ? bandOf(sex, lastAgeDays / 30.4375, last.weight) : null, notes };
}

/** Valid weights for a baby under 2 (kg). */
export const plausibleWeight = (kg: number) => Number.isFinite(kg) && kg >= 0.5 && kg <= 25;
