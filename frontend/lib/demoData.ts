/**
 * Realistic demo datasets for the hackathon walkthrough.
 *
 * Her Mode: ~3 months of daily check-ins for "Priya" with slightly long,
 * variable cycles (31-38 days), recurring acne, fatigue and strong cramps, so the
 * PCOS screen lights up "Moderate" and the doctor summary has a story to tell.
 *
 * Mom Mode: ~8 weeks of vitals for "Meera" at 32 weeks with blood pressure
 * creeping up into the 130s/80s and one high glucose reading, so the risk cards,
 * explanations and guideline flags all have something real to show.
 *
 * Deterministic (seeded PRNG) so every demo run looks the same.
 */

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const DAY = 86400000;
const iso = (d: Date) => d.toISOString().split('T')[0];
const monthName = (d: Date) => d.toLocaleDateString('en-US', { month: 'short' });

export function buildHerDemo(now = new Date()) {
  const rand = rng(42);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const cycleLengths = [33, 38, 31, 36];
  const periodLength = 6;

  // Walk backwards from the most recent period start
  const starts: Date[] = [];
  let cursor = new Date(now.getTime() - 9 * DAY);
  for (let i = 0; i < cycleLengths.length; i++) {
    starts.unshift(new Date(cursor));
    cursor = new Date(cursor.getTime() - cycleLengths[(cycleLengths.length - 1 - i) % cycleLengths.length] * DAY);
  }
  const firstLog = new Date(now.getTime() - 92 * DAY);

  const logs: any[] = [];
  for (let t = firstLog.getTime(); t <= now.getTime() - DAY; t += DAY) {
    const day = new Date(t);
    if (rand() < 0.18) continue; // realistic: not every day is logged
    const start = [...starts].reverse().find(s => s.getTime() <= t);
    const cycleDay = start ? Math.floor((t - start.getTime()) / DAY) + 1 : 15;
    const onPeriod = cycleDay >= 1 && cycleDay <= periodLength;
    const luteal = cycleDay >= 24;

    const symptoms: string[] = [];
    if (onPeriod && cycleDay <= 3) symptoms.push('Cramps');
    if (rand() < (luteal ? 0.55 : 0.25)) symptoms.push('Acne');
    if (rand() < (onPeriod || luteal ? 0.5 : 0.2)) symptoms.push('Fatigue');
    if (luteal && rand() < 0.45) symptoms.push('Bloating');
    if (onPeriod && rand() < 0.3) symptoms.push('Back Pain');
    if (rand() < 0.08) symptoms.push('Headache');
    if (rand() < 0.06) symptoms.push('Hair Growth');

    const flow = !onPeriod ? 'None'
      : cycleDay === 1 ? 'Moderate' : cycleDay <= 3 ? pick(['Heavy', 'Heavy', 'Moderate']) : cycleDay <= 5 ? 'Light' : 'Spotting';
    const cramps = onPeriod
      ? cycleDay <= 2 ? 6 + Math.floor(rand() * 3) : cycleDay <= 4 ? 3 + Math.floor(rand() * 3) : Math.floor(rand() * 2)
      : luteal ? Math.floor(rand() * 3) : 0;

    logs.push({
      log_date: iso(day),
      flow_intensity: flow,
      cramps_severity: cramps,
      symptoms: symptoms.length ? symptoms : ['None'],
      mood: onPeriod ? pick(['Fatigued', 'Irritable', 'Calm']) : luteal ? pick(['Anxious', 'Irritable', 'Calm', 'Sad']) : pick(['Happy', 'Calm', 'Energetic', 'Happy']),
      sleep_hours: Math.round((luteal || onPeriod ? 6 + rand() * 1.5 : 7 + rand() * 1.5) * 2) / 2,
      on_period: onPeriod,
    });
  }

  const history = starts.slice(0, -1).map((s, i) => ({
    month: monthName(s),
    cycleLength: Math.round((starts[i + 1].getTime() - s.getTime()) / DAY),
    periodDuration: periodLength,
  }));

  const profile = {
    preferred_name: 'Priya',
    last_period_start: iso(starts[starts.length - 1]),
    cycle_length: Math.round(history.reduce((a, h) => a + h.cycleLength, 0) / Math.max(1, history.length)),
    period_duration: periodLength,
    cycle_regularity: 'Irregular',
    diagnosed_conditions: [],
    primary_goal: 'Understand my irregular cycles',
    is_pregnancy_mode: false,
    demo: true,
  };

  return { profile, logs, history };
}

export function buildPregnancyDemo(now = new Date()) {
  const rand = rng(7);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const weeks = 32;
  const due = new Date(now.getTime() + (40 - weeks) * 7 * DAY);
  const logs: any[] = [];
  let weight = 61.5;

  for (let back = 56; back >= 1; back--) {
    if (rand() < 0.2) continue;
    const day = new Date(now.getTime() - back * DAY);
    const progress = 1 - back / 56; // 0 -> 1 over 8 weeks
    weight += 0.06 + rand() * 0.05;
    const systolic = Math.round(112 + progress * 22 + (rand() - 0.5) * 6);
    const diastolic = Math.round(72 + progress * 14 + (rand() - 0.5) * 4);
    const symptoms: string[] = [];
    if (progress > 0.6 && rand() < 0.5) symptoms.push('Swelling');
    if (rand() < 0.3) symptoms.push('Back Pain');
    if (rand() < 0.25) symptoms.push('Heartburn');
    if (progress > 0.8 && rand() < 0.3) symptoms.push('Headache');
    if (rand() < 0.2) symptoms.push('Fatigue');

    logs.push({
      log_date: iso(day),
      weight: Math.round(weight * 10) / 10,
      blood_pressure_systolic: rand() < 0.85 ? systolic : null,
      blood_pressure_diastolic: rand() < 0.85 ? diastolic : null,
      blood_sugar: rand() < 0.45 ? Math.round(88 + rand() * 30 + (back === 9 ? 40 : 0)) : null,
      baby_movement: Math.round(10 + rand() * 8),
      mood: pick(['Happy', 'Calm', 'Calm', 'Fatigued', 'Anxious']),
      sleep_hours: Math.round((6 + rand() * 2.5) * 2) / 2,
      symptoms: symptoms.length ? symptoms : ['None'],
    });
  }
  // Keep BP pairs consistent (both present or both null)
  for (const l of logs) {
    if (l.blood_pressure_systolic === null || l.blood_pressure_diastolic === null) {
      l.blood_pressure_systolic = null;
      l.blood_pressure_diastolic = null;
    }
  }
  // Guarantee one high post-meal glucose reading for the GDM story
  const sugarDay = logs[logs.length - 9] || logs[0];
  if (sugarDay) sugarDay.blood_sugar = 148;

  const profile = {
    preferred_name: 'Meera',
    weeks_pregnant: weeks,
    due_date: due.toISOString(),
    expected_due_date: due.toISOString(),
    pregnancy_experience: 'First-time Mother',
    maternal_conditions: [],
    primary_goal: 'Tracking Baby Growth & Fetal Movement',
    demo: true,
  };

  const appointments = [
    { name: 'Routine ANC visit', date: iso(new Date(now.getTime() - 6 * DAY)), completed: true },
    { name: 'Growth ultrasound', date: iso(new Date(now.getTime() + 5 * DAY)), completed: false },
    { name: 'Blood pressure recheck', date: iso(new Date(now.getTime() + 2 * DAY)), completed: false },
  ];
  const nutrition = { protein: 62, iron: 24, calcium: 900, water: 2.2 };

  return { profile, logs, appointments, nutrition };
}
