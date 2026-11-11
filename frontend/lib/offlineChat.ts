/**
 * Offline Sakhi: used when no Gemini key is configured or every key fails.
 *
 * It extracts the same structured data the Gemini tools would (cramps, flow,
 * sleep, mood, symptoms, BP, sugar, kicks, weight, week) with rules, saves it
 * through the same tools, and answers with a short caring template, including
 * danger-sign escalation. So logging and the dashboards keep working in a demo
 * even without network access to the LLM.
 */
import { Owner, readDoc, writeDoc } from '@/lib/store';
import { pickRelief, recordShown, reliefText, type ReliefFeedback } from '@/lib/reliefTips';
import { runHerTool, runPregnancyTool } from '@/lib/sakhiTools';

const has = (text: string, ...words: string[]) => words.some(w => new RegExp(`\\b${w}`, 'i').test(text));
const numAfter = (text: string, pattern: RegExp) => {
  const m = text.match(pattern);
  return m ? Number(m[1]) : undefined;
};

function moodOf(t: string): string | undefined {
  if (has(t, 'anxious', 'anxiety', 'worried', 'nervous', 'stress')) return 'Anxious';
  if (has(t, 'sad', 'low', 'down', 'cry', 'depress')) return 'Sad';
  if (has(t, 'irritat', 'angry', 'annoyed', 'cranky')) return 'Irritable';
  if (has(t, 'tired', 'exhausted', 'fatigue', 'drained')) return 'Fatigued';
  if (has(t, 'happy', 'great', 'good', 'wonderful')) return 'Happy';
  if (has(t, 'calm', 'relaxed', 'okay', 'fine')) return 'Calm';
  if (has(t, 'energetic', 'energized')) return 'Energetic';
  return undefined;
}

function sleepOf(t: string): number | undefined {
  const v = numAfter(t, /(?:slept|sleep|sleeping)[^\d]{0,20}(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hours)?/i)
    ?? numAfter(t, /(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hours)\s*(?:of\s*)?sleep/i);
  return v !== undefined && v >= 0 && v <= 16 ? v : undefined;
}

const SYMPTOMS_HER: [string[], string][] = [
  [['acne', 'pimple', 'breakout'], 'Acne'], [['cramp'], 'Cramps'], [['headache', 'migraine'], 'Headache'],
  [['bloat'], 'Bloating'], [['tired', 'fatigue', 'exhausted'], 'Fatigue'], [['nausea', 'nauseous'], 'Nausea'],
  [['back pain', 'backache'], 'Back Pain'], [['pelvic'], 'Pelvic Pain'], [['hair growth', 'facial hair'], 'Hair Growth'],
  [['hair loss', 'hair fall', 'hair thinning'], 'Hair Loss'], [['weight gain', 'gained weight'], 'Weight Gain'],
  [['breast tender', 'sore breast'], 'Breast Tenderness'],
];

const SYMPTOMS_PREG: [string[], string][] = [
  [['swell', 'swollen'], 'Swelling'], [['headache'], 'Headache'], [['heartburn', 'acidity'], 'Heartburn'],
  [['back pain', 'backache'], 'Back Pain'], [['nausea', 'vomit', 'morning sickness'], 'Nausea'],
  [['braxton', 'tightening'], 'Braxton Hicks'], [['tired', 'fatigue', 'exhausted'], 'Fatigue'],
  [['dizzy', 'dizziness', 'lightheaded'], 'Dizziness'], [['blurr', 'vision'], 'Blurred Vision'],
];

const symptomsOf = (t: string, table: [string[], string][]) =>
  table.filter(([words]) => words.some(w => t.toLowerCase().includes(w))).map(([, label]) => label);

// ------------------------------------------------------------------ Her Mode

export async function offlineHerReply(message: string, owner: Owner, name: string) {
  const t = message;
  const entry: Record<string, any> = {};

  const painScore = numAfter(t, /(\d{1,2})\s*(?:\/|out of)\s*10/i);
  if (painScore !== undefined && painScore <= 10) entry.cramps_severity = painScore;
  else if (has(t, 'cramp', 'pain')) {
    entry.cramps_severity = has(t, 'unbearable', 'terrible', 'severe', 'worst') ? 8
      : has(t, 'bad', 'strong', 'painful') ? 6 : has(t, 'mild', 'slight', 'little') ? 3 : 5;
  }

  if (has(t, 'very heavy', 'soaking')) entry.flow_intensity = 'Very Heavy';
  else if (has(t, 'heavy')) entry.flow_intensity = 'Heavy';
  else if (has(t, 'spotting')) entry.flow_intensity = 'Spotting';
  else if (has(t, 'light flow', 'light bleeding', 'light period')) entry.flow_intensity = 'Light';
  else if (has(t, 'moderate', 'normal flow', 'medium flow')) entry.flow_intensity = 'Moderate';

  const sleep = sleepOf(t);
  if (sleep !== undefined) entry.sleep_hours = sleep;
  const mood = moodOf(t);
  if (mood) entry.mood = mood;
  const symptoms = symptomsOf(t, SYMPTOMS_HER);
  if (symptoms.length) entry.symptoms = symptoms;

  let chartData: any = null;
  if (Object.keys(entry).length > 0) {
    chartData = (await runHerTool('log_health_entry', entry, owner))?.chartData ?? null;
  }
  if (has(t, 'period started', 'got my period', 'period came', 'started bleeding', 'day 1')) {
    const today = new Date().toISOString().split('T')[0];
    chartData = (await runHerTool('update_period_info', { last_period_date: today }, owner))?.chartData ?? chartData;
  }

  const who = name || 'friend';
  let reply: string;
  if (has(t, 'faint', 'passed out', 'soaking', 'unbearable') || (entry.cramps_severity ?? 0) >= 9) {
    reply = `${who}, what you're describing can be serious. Please get in-person medical care now, or call your local emergency number if you feel faint or are soaking a pad every hour.`;
  } else if (Object.keys(entry).length > 0) {
    const bits: string[] = [];
    if (entry.cramps_severity !== undefined) bits.push(`cramps at ${entry.cramps_severity}/10`);
    if (entry.flow_intensity) bits.push(`${entry.flow_intensity.toLowerCase()} flow`);
    if (entry.sleep_hours !== undefined) bits.push(`${entry.sleep_hours} hours of sleep`);
    if (entry.mood) bits.push(`feeling ${entry.mood.toLowerCase()}`);
    // Cramps already appear with their severity above
    const otherSymptoms = entry.cramps_severity !== undefined ? symptoms.filter(s => s !== 'Cramps') : symptoms;
    if (otherSymptoms.length) bits.push(otherSymptoms.join(', ').toLowerCase());
    let tip: string;
    if ((entry.cramps_severity ?? 0) >= 5 || has(t, 'cramp', 'period pain')) {
      // Rotating relief steps, favouring what helped her before
      const fb = await readDoc<ReliefFeedback | null>('relief_feedback', null, owner);
      const tips = pickRelief(fb, 3, entry.cramps_severity ?? 5);
      await writeDoc('relief_feedback', recordShown(fb, tips.map(x => x.id)), owner);
      tip = ` I'm sorry it hurts. A few things that can ease it right now:\n${reliefText(tips)}\nIf pain regularly stops your day or these rarely help, please see a doctor.`;
    } else tip = (entry.sleep_hours ?? 8) < 6 ? ' Try to rest a little earlier tonight; sleep makes a real difference to how your cycle feels.'
      : ' Keep checking in so I can spot patterns for you.';
    reply = `Thank you for telling me, ${who}. I've got it: ${bits.join(', ')}.${tip}`;
  } else {
    reply = `I'm here with you, ${who}. Tell me how you're feeling today, for example your cramps out of 10, your flow, your mood, or how many hours you slept.`;
  }
  return { reply, chartData };
}

// ------------------------------------------------------------------ Mom Mode

export async function offlinePregnancyReply(message: string, owner: Owner, name: string) {
  const t = message;
  const vitals: Record<string, any> = {};

  const bp = t.match(/(\d{2,3})\s*\/\s*(\d{2,3})/);
  if (bp) {
    const [s, d] = [Number(bp[1]), Number(bp[2])];
    if (s >= 70 && s <= 250 && d >= 40 && d <= 160) {
      vitals.blood_pressure_systolic = s;
      vitals.blood_pressure_diastolic = d;
    }
  }
  const sugar = numAfter(t, /(?:sugar|glucose)[^\d]{0,20}(\d{2,3})/i);
  if (sugar !== undefined && sugar >= 40 && sugar <= 500) vitals.blood_sugar = sugar;
  const kicks = numAfter(t, /(\d{1,3})\s*(?:kicks|movements|moves)/i);
  if (kicks !== undefined) vitals.baby_movement = kicks;
  const weight = numAfter(t, /(\d{2,3}(?:\.\d)?)\s*kg/i);
  if (weight !== undefined && weight >= 30 && weight <= 200) vitals.weight = weight;
  const sleep = sleepOf(t);
  if (sleep !== undefined) vitals.sleep_hours = sleep;
  const mood = moodOf(t);
  if (mood) vitals.mood = mood;
  const symptoms = symptomsOf(t, SYMPTOMS_PREG);
  if (symptoms.length) vitals.symptoms = symptoms;

  let chartData: any = null;
  if (Object.keys(vitals).length > 0) {
    chartData = (await runPregnancyTool('log_pregnancy_vital_entry', vitals, owner))?.chartData ?? null;
  }
  // "week 20" or "20 weeks pregnant/along" (not "2 weeks ago")
  const week = numAfter(t, /\bweek\s*(\d{1,2})\b/i) ?? numAfter(t, /(\d{1,2})\s*weeks?\s*(?:pregnant|along)/i);
  if (week !== undefined && week >= 1 && week <= 42) {
    chartData = (await runPregnancyTool('update_pregnancy_progress', { weeks_pregnant: week }, owner))?.chartData ?? chartData;
  }

  const who = name || 'Mama';
  const sys = vitals.blood_pressure_systolic ?? 0;
  const dia = vitals.blood_pressure_diastolic ?? 0;
  const dangerSymptom = has(t, 'bleeding', 'blood', 'not moving', 'no movement', "hasn't moved", 'stopped moving', 'severe pain', 'fluid', 'water broke', 'convulsion', 'fit')
    || symptoms.includes('Blurred Vision');
  let reply: string;
  if (sys >= 160 || dia >= 110 || dangerSymptom) {
    reply = `${who}, this needs urgent attention. Please go to the hospital or call emergency services now. Bleeding, severe pain, vision changes, very high blood pressure, or your baby not moving should always be checked right away.`;
  } else if (sys >= 140 || dia >= 90) {
    reply = `${who}, a reading of ${sys}/${dia} is high for pregnancy. Please rest, recheck in 15 minutes, and contact your doctor today, sooner if you get a headache, swelling or blurred vision.`;
  } else if (Object.keys(vitals).length > 0) {
    const bits: string[] = [];
    if (sys) bits.push(`blood pressure ${sys}/${dia}`);
    if (vitals.blood_sugar !== undefined) bits.push(`sugar ${vitals.blood_sugar} mg/dL`);
    if (vitals.baby_movement !== undefined) bits.push(`${vitals.baby_movement} kicks`);
    if (vitals.weight !== undefined) bits.push(`${vitals.weight} kg`);
    if (vitals.sleep_hours !== undefined) bits.push(`${vitals.sleep_hours} hours of sleep`);
    if (symptoms.length) bits.push(symptoms.join(', ').toLowerCase());
    if (mood) bits.push(`feeling ${mood.toLowerCase()}`);
    const tip = vitals.blood_sugar >= 140
      ? ' That sugar reading is on the higher side, so please mention it to your doctor; a glucose test can clarify it.'
      : vitals.baby_movement !== undefined && vitals.baby_movement < 10
      ? ' If you feel fewer than 10 movements in 2 hours after 28 weeks, lie on your left side and count again, and call your doctor if it stays low.'
      : ' You are doing beautifully. Keep sipping water and resting when you can.';
    reply = `Thank you, ${who}. I've noted ${bits.join(', ')}.${tip}`;
  } else if (week !== undefined) {
    reply = `Week ${week}, how lovely, ${who}! I've updated your pregnancy progress.`;
  } else {
    reply = `I'm right here, ${who}. You can tell me your blood pressure (like 118/76), sugar, baby's kicks, sleep or how you're feeling.`;
  }
  return { reply, chartData };
}
