/**
 * Builds the one-page doctor-visit brief from a user's stored data.
 * Everything here is descriptive statistics plus the same risk screens the
 * dashboards show, so a clinician sees the pattern without reading raw logs.
 */
import { Owner, readDoc } from '@/lib/store';
import { runPrediction } from '@/lib/ml/client';

const DAY = 86400000;
const iso = (d: Date) => d.toISOString().split('T')[0];
const dayOf = (v: any) => String(v || '').split('T')[0];
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

function countBy(values: string[]) {
  const counts: Record<string, number> = {};
  for (const v of values) if (v && v !== 'None') counts[v] = (counts[v] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}

function windowOf(logs: any[], days: number) {
  const since = Date.now() - days * DAY;
  return logs.filter(l => {
    const t = new Date(l?.log_date).getTime();
    return !isNaN(t) && t >= since;
  });
}

export async function buildHerSummary(owner: Owner, days = 90) {
  const [profile, allLogs, history] = await Promise.all([
    readDoc<any>('her_profile', null, owner),
    readDoc<any[]>('daily_logs', [], owner),
    readDoc<any[]>('cycle_history', [], owner),
  ]);
  const logs = windowOf(Array.isArray(allLogs) ? allLogs : [], days)
    .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

  const cramps = logs.map(l => Number(l.cramps_severity)).filter(n => !isNaN(n) && n > 0);
  const sleep = logs.map(l => Number(l.sleep_hours)).filter(n => !isNaN(n) && n > 0);
  const flows = logs.map(l => String(l.flow_intensity || 'None'));
  const symptoms = countBy(logs.flatMap(l => (Array.isArray(l.symptoms) ? l.symptoms : [])));
  const moods = countBy(logs.map(l => String(l.mood || '')));
  const heavyDays = flows.filter(f => /heavy/i.test(f)).length;
  const severeCrampDays = cramps.filter(c => c >= 7).length;

  const cycleLengths = (Array.isArray(history) ? history : [])
    .map((h: any) => Number(h.cycleLength)).filter(n => n >= 10 && n <= 120);
  const regularity = profile?.cycle_regularity === 'No' || profile?.cycle_regularity === 'Irregular' ? 0 : 1;
  const has = (word: string) => logs.some(l => (l.symptoms || []).some((s: string) => String(s).toLowerCase().includes(word)));

  const [cycle, pcos, thyroid] = await Promise.all([
    profile?.last_period_start
      ? runPrediction('cycle', {
          last_period_date: dayOf(profile.last_period_start),
          cycle_length_avg: Number(profile.cycle_length || profile.cycle_length_avg) || 28,
          ...(cycleLengths.length ? { cycle_lengths: cycleLengths } : {}),
        }).catch(() => null)
      : null,
    runPrediction('pcos', {
      cycle_regularity: regularity,
      cycle_length: Number(profile?.cycle_length) || undefined,
      acne_severity: has('acne') ? 6 : 0,
      hair_growth: has('hair growth'),
      skin_darkening: has('skin darkening'),
      weight_gain: has('weight gain'),
    }).catch(() => null),
    runPrediction('thyroid', {
      fatigue_severity: has('fatigue') ? 7 : 2,
      heavy_or_prolonged_flow: heavyDays > 0 || Number(profile?.period_duration) > 7 ? 1 : 0,
      cycle_regularity: regularity,
      weight_gain: has('weight gain'),
      hair_loss: has('hair loss'),
    }).catch(() => null),
  ]);

  const flags: string[] = [];
  if (severeCrampDays > 0) flags.push(`${severeCrampDays} day(s) with cramps rated 7/10 or higher`);
  if (heavyDays > 0) flags.push(`${heavyDays} day(s) of heavy flow`);
  for (const f of [...(cycle?.clinical_flags || []), ...(pcos?.clinical_flags || []), ...(thyroid?.clinical_flags || [])]) {
    if (!flags.includes(f)) flags.push(f);
  }

  const questions: string[] = [];
  if (severeCrampDays > 0) questions.push('My cramps are often 7/10 or worse. Could this be endometriosis or another cause, and what can help?');
  if (pcos?.criteria_met >= 1) questions.push('I have signs that can be linked to PCOS. Should I have an ultrasound or hormone tests?');
  if ((thyroid?.risk_level === 'Moderate') || (thyroid?.risk_level === 'High')) questions.push('Should I get a TSH (thyroid) blood test?');
  if (heavyDays > 2) questions.push('My periods are heavy. Should I be checked for anaemia (haemoglobin / ferritin)?');
  if (cycle && cycle.is_regular === 0) questions.push('My cycles are irregular. What could be causing this?');
  if (questions.length === 0) questions.push('Is there anything in this pattern you would like me to keep tracking?');

  return {
    kind: 'her' as const,
    generatedAt: new Date().toISOString(),
    period: { days, from: logs[0] ? dayOf(logs[0].log_date) : null, to: logs.length ? dayOf(logs[logs.length - 1].log_date) : null },
    patient: {
      name: profile?.preferred_name || owner.name || 'Patient',
      diagnosedConditions: profile?.diagnosed_conditions || [],
      goal: profile?.primary_goal || null,
    },
    cycle: {
      lastPeriodStart: profile?.last_period_start ? dayOf(profile.last_period_start) : null,
      reportedCycleLength: Number(profile?.cycle_length || profile?.cycle_length_avg) || null,
      reportedPeriodDuration: Number(profile?.period_duration) || null,
      regularity: profile?.cycle_regularity || null,
      history: Array.isArray(history) ? history : [],
      prediction: cycle,
    },
    stats: {
      checkIns: logs.length,
      avgCramps: r1(mean(cramps)),
      maxCramps: cramps.length ? Math.max(...cramps) : null,
      severeCrampDays,
      heavyDays,
      avgSleep: r1(mean(sleep)),
      flow: countBy(flows),
      symptoms,
      moods,
    },
    screens: { pcos, thyroid },
    flags,
    questions,
    recentLogs: logs.slice(-14),
  };
}

export async function buildPregnancySummary(owner: Owner, days = 90) {
  const [profile, allLogs, appointments, nutrition] = await Promise.all([
    readDoc<any>('preg_profile', null, owner),
    readDoc<any[]>('pregnancy_logs', [], owner),
    readDoc<any[]>('pregnancy_appointments', [], owner),
    readDoc<any>('pregnancy_nutrition', null, owner),
  ]);
  const logs = windowOf(Array.isArray(allLogs) ? allLogs : [], days)
    .sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());

  const bp = logs
    .filter(l => l.blood_pressure_systolic && l.blood_pressure_diastolic)
    .map(l => ({ date: dayOf(l.log_date), systolic: Number(l.blood_pressure_systolic), diastolic: Number(l.blood_pressure_diastolic) }));
  const sugar = logs.filter(l => Number(l.blood_sugar) > 0).map(l => ({ date: dayOf(l.log_date), value: Number(l.blood_sugar) }));
  const kicks = logs.map(l => Number(l.baby_movement)).filter(n => !isNaN(n) && n > 0);
  const weights = logs.filter(l => Number(l.weight) > 0).map(l => ({ date: dayOf(l.log_date), value: Number(l.weight) }));
  const symptoms = countBy(logs.flatMap(l => (Array.isArray(l.symptoms) ? l.symptoms : [])));

  const conditions: string[] = profile?.maternal_conditions || [];
  const hypertensionHistory = conditions.some(c => /pressure|hypertension/i.test(c));
  const diabetesHistory = conditions.some(c => /diabetes|sugar/i.test(c));
  const latestBp = bp[bp.length - 1];
  const latestSugar = sugar[sugar.length - 1];

  const [preeclampsia, gdm] = await Promise.all([
    runPrediction('preeclampsia', {
      systolic: latestBp?.systolic ?? 120,
      diastolic: latestBp?.diastolic ?? 80,
      hypertension_history: hypertensionHistory ? 1 : 0,
      ...(latestSugar ? { blood_sugar: latestSugar.value } : {}),
      symptoms: logs.slice(-3).flatMap(l => l.symptoms || []),
    }).catch(() => null),
    runPrediction('gdm', {
      blood_sugar: latestSugar?.value ?? 85,
      diabetes_history: diabetesHistory ? 1 : 0,
    }).catch(() => null),
  ]);

  const highBp = bp.filter(b => b.systolic >= 140 || b.diastolic >= 90);
  const highSugar = sugar.filter(s => s.value >= 140);
  const flags: string[] = [];
  if (highBp.length) flags.push(`${highBp.length} BP reading(s) at or above 140/90 (highest ${Math.max(...highBp.map(b => b.systolic))}/${Math.max(...highBp.map(b => b.diastolic))})`);
  if (highSugar.length) flags.push(`${highSugar.length} glucose reading(s) at or above 140 mg/dL`);
  if (kicks.length && Math.min(...kicks) < 10 && Number(profile?.weeks_pregnant) >= 28) flags.push('Some days with fewer than 10 recorded movements');
  for (const s of ['Swelling', 'Headache', 'Blurred Vision', 'Dizziness']) {
    const hit = symptoms.find(x => x.label === s);
    if (hit) flags.push(`${s} reported on ${hit.count} day(s)`);
  }
  for (const f of [...(preeclampsia?.clinical_flags || []), ...(gdm?.clinical_flags || [])]) if (!flags.includes(f)) flags.push(f);

  const questions: string[] = [];
  if (highBp.length || preeclampsia?.risk_level !== 'Low') questions.push('Do my blood pressure readings need closer monitoring or a urine protein test?');
  if (highSugar.length || gdm?.risk_level !== 'Low') questions.push('When should I do my glucose tolerance test (OGTT)?');
  if (flags.some(f => /movements/.test(f))) questions.push("What should I do if my baby's movements feel reduced?");
  questions.push('Which scans and blood tests are due before my next visit?');

  return {
    kind: 'pregnancy' as const,
    generatedAt: new Date().toISOString(),
    period: { days, from: logs[0] ? dayOf(logs[0].log_date) : null, to: logs.length ? dayOf(logs[logs.length - 1].log_date) : null },
    patient: {
      name: profile?.preferred_name || owner.name || 'Patient',
      weeksPregnant: Number(profile?.weeks_pregnant) || null,
      dueDate: profile?.expected_due_date ? dayOf(profile.expected_due_date) : null,
      experience: profile?.pregnancy_experience || null,
      conditions,
    },
    vitals: {
      bp,
      sugar,
      weights,
      weightChange: weights.length >= 2 ? r1(weights[weights.length - 1].value - weights[0].value) : null,
      avgKicks: r1(mean(kicks)),
      minKicks: kicks.length ? Math.min(...kicks) : null,
    },
    stats: { checkIns: logs.length, symptoms },
    screens: { preeclampsia, gdm },
    nutrition,
    appointments: Array.isArray(appointments) ? appointments : [],
    flags,
    questions,
  };
}

export const todayIso = () => iso(new Date());
