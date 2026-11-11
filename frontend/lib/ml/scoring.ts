/**
 * TypeScript mirror of ai-health-app/ml-service/main.py.
 *
 * The Next.js predict routes call the FastAPI service first and fall back to
 * these functions when it is unreachable, so risk scores never disappear during
 * a demo or an outage. Both read the same trained coefficients from
 * risk_models.json (written by train_models.py). Keep the logic in sync with
 * main.py; ai-health-app/ml-service/scripts/check_parity.py compares them.
 */
import registry from './risk_models.json';

const MGDL_PER_MMOL = 18.016;
const LEVELS = ['Low', 'Moderate', 'High'] as const;
type Level = (typeof LEVELS)[number];

type LogisticModel = (typeof registry.models)['maternal_risk'];

const atLeast = (level: Level, floor: Level): Level =>
  LEVELS.indexOf(level) >= LEVELS.indexOf(floor) ? level : floor;

const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;

function scoreLogistic(model: LogisticModel, values: (number | null | undefined)[]) {
  let z = model.intercept;
  const explanation = values.map((raw, i) => {
    const provided = raw !== null && raw !== undefined && !Number.isNaN(raw);
    const x = provided ? Number(raw) : model.medians[i];
    const contribution = (model.coef[i] * (x - model.mean[i])) / model.scale[i];
    z += contribution;
    return {
      feature: model.features[i],
      label: model.labels[i],
      value: round(x, 2),
      unit: model.units[i],
      provided,
      impact: round(contribution),
    };
  });
  explanation.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  return { p: 1 / (1 + Math.exp(-z)), explanation };
}

function riskLevelFor(model: LogisticModel, p: number): Level {
  if (p >= model.metrics.high_cutoff.threshold) return 'High';
  if (p >= model.metrics.screening_cutoff.threshold) return 'Moderate';
  return 'Low';
}

function modelCard(model: LogisticModel) {
  return {
    name: model.name,
    dataset: model.dataset,
    n: model.n_unique_used,
    roc_auc: model.metrics.roc_auc,
    sensitivity_at_screening: model.metrics.screening_cutoff.sensitivity,
    limitations: model.limitations,
  };
}

export function predictPreeclampsia(req: {
  systolic?: number; diastolic?: number; hypertension_history?: number | boolean;
  blood_sugar?: number | null; age?: number | null; heart_rate?: number | null; symptoms?: string[];
}) {
  const model = registry.models.maternal_risk;
  const systolic = Number(req.systolic ?? 120);
  const diastolic = Number(req.diastolic ?? 80);
  const history = Boolean(req.hypertension_history);
  const bsMmol = req.blood_sugar != null ? Number(req.blood_sugar) / MGDL_PER_MMOL : null;
  const { p, explanation } = scoreLogistic(model, [systolic, diastolic, bsMmol, req.age, req.heart_rate]);
  let level = riskLevelFor(model, p);

  const flags: string[] = [];
  const danger = new Set(['severe headache', 'headache', 'vision changes', 'blurred vision', 'swelling', 'upper abdominal pain']);
  const hasDanger = (req.symptoms || []).some(s => danger.has(String(s).toLowerCase()));
  if (systolic >= 160 || diastolic >= 110) {
    flags.push('Severe-range BP (>=160/110): seek care today');
    level = 'High';
  } else if (systolic >= 140 || diastolic >= 90) {
    flags.push('BP >=140/90: hypertension in pregnancy');
    level = 'High';
  } else if (systolic >= 130 || diastolic >= 80) {
    flags.push('BP 130-139/80-89: elevated, recheck within a week');
    level = atLeast(level, 'Moderate');
  }
  if (history) {
    flags.push('History of high blood pressure');
    level = atLeast(level, 'Moderate');
  }
  if (hasDanger && (systolic >= 130 || diastolic >= 80)) {
    flags.push('Raised BP with headache/vision/swelling symptoms');
    level = 'High';
  }

  return {
    status: 'success',
    risk_level: level,
    is_high_risk: level === 'High' ? 1 : 0,
    probability: round(p),
    factors: { systolic, diastolic, hypertension_history: history },
    explanation,
    clinical_flags: flags,
    model: modelCard(model),
  };
}

export function predictGdm(req: {
  blood_sugar?: number; diabetes_history?: number | boolean; bmi?: number | null;
  age?: number | null; previous_pregnancies?: number | null;
}) {
  const model = registry.models.diabetes_risk as unknown as LogisticModel;
  const bloodSugar = Number(req.blood_sugar ?? 85);
  const { p, explanation } = scoreLogistic(model, [bloodSugar, req.bmi, req.age, req.previous_pregnancies]);
  let level = riskLevelFor(model, p);

  const flags: string[] = [];
  if (bloodSugar >= 200) {
    flags.push('Glucose >=200 mg/dL: possible overt diabetes, see a doctor promptly');
    level = 'High';
  } else if (bloodSugar >= 140) {
    flags.push('Glucose >=140 mg/dL (DIPSI GDM threshold)');
    level = 'High';
  }
  if (req.diabetes_history) {
    flags.push('Personal or family history of diabetes');
    level = atLeast(level, 'Moderate');
  }

  return {
    status: 'success',
    risk_level: level,
    is_high_risk: level === 'High' ? 1 : 0,
    probability: round(p),
    factors: { blood_sugar: bloodSugar, diabetes_history: Boolean(req.diabetes_history) },
    explanation,
    clinical_flags: flags,
    model: modelCard(model),
  };
}

export function predictPcos(req: {
  cycle_regularity?: number; acne_severity?: number; cycle_length?: number | null;
  missed_periods?: number; hair_growth?: boolean; skin_darkening?: boolean;
  weight_gain?: boolean; bmi?: number | null;
}) {
  const ovulatory: string[] = [];
  const androgen: string[] = [];
  const supportive: string[] = [];
  const acne = Number(req.acne_severity ?? 0);
  if (Number(req.cycle_regularity ?? 1) === 0) ovulatory.push('Irregular cycles');
  if (req.cycle_length && req.cycle_length > 35) ovulatory.push(`Cycle length ${req.cycle_length} days (>35)`);
  if ((req.missed_periods ?? 0) >= 1) ovulatory.push(`${req.missed_periods} missed period(s)`);
  if (req.hair_growth) androgen.push('New coarse hair growth (hirsutism)');
  if (acne >= 6) androgen.push(`Moderate-severe acne (${acne}/10)`);
  if (req.skin_darkening) supportive.push('Skin darkening (insulin-resistance sign)');
  if (req.weight_gain) supportive.push('Rapid weight gain');
  if (req.bmi != null && req.bmi >= 25) supportive.push(`BMI ${Number(req.bmi).toFixed(1)} (>=25)`);

  const criteriaMet = Number(ovulatory.length > 0) + Number(androgen.length > 0);
  const p = Math.min(0.95, [0.06, 0.28, 0.7][criteriaMet] + 0.06 * supportive.length);
  return {
    status: 'success',
    has_pcos: criteriaMet === 2 ? 1 : 0,
    probability_pcos: round(p),
    risk_level: criteriaMet === 2 ? 'High' : criteriaMet === 1 || supportive.length >= 2 ? 'Moderate' : 'Low',
    criteria_met: criteriaMet,
    explanation: { ovulatory_dysfunction: ovulatory, hyperandrogenism: androgen, supportive_signs: supportive },
    clinical_flags: [...ovulatory, ...androgen, ...supportive],
    next_step: criteriaMet
      ? 'A pelvic ultrasound and hormone panel (testosterone, LH/FSH) are needed to diagnose PCOS.'
      : 'No PCOS criteria met from logged symptoms.',
    method: registry.rule_based.pcos,
  };
}

export function predictThyroid(req: {
  fatigue_severity?: number; heavy_or_prolonged_flow?: number | boolean; cycle_regularity?: number;
  light_or_short_flow?: boolean; weight_gain?: boolean; weight_loss?: boolean; hair_loss?: boolean;
  cold_intolerance?: boolean; palpitations_or_anxiety?: boolean;
}) {
  const hypo: string[] = [];
  const hyper: string[] = [];
  const fatigue = Number(req.fatigue_severity ?? 3);
  if (fatigue >= 6) hypo.push(`Significant fatigue (${fatigue}/10)`);
  if (req.heavy_or_prolonged_flow) hypo.push('Heavy or prolonged periods');
  if (req.weight_gain) hypo.push('Unexplained weight gain');
  if (req.cold_intolerance) hypo.push('Feeling cold');
  if (req.hair_loss) hypo.push('Hair thinning');
  if (req.light_or_short_flow) hyper.push('Very light or short periods');
  if (req.weight_loss) hyper.push('Unexplained weight loss');
  if (req.palpitations_or_anxiety) hyper.push('Palpitations / anxiety');
  if (Number(req.cycle_regularity ?? 1) === 0) (hyper.length ? hyper : hypo).push('Irregular cycles');

  const signs = Math.max(hypo.length, hyper.length);
  return {
    status: 'success',
    has_thyroid_risk: signs >= 3 ? 1 : 0,
    probability_thyroid: round(Math.min(0.85, 0.05 + 0.15 * signs)),
    risk_level: signs >= 3 ? 'High' : signs === 2 ? 'Moderate' : 'Low',
    pattern: hypo.length >= hyper.length ? 'hypothyroid' : 'hyperthyroid',
    explanation: { hypothyroid_signs: hypo, hyperthyroid_signs: hyper },
    clinical_flags: [...hypo, ...hyper],
    next_step: signs >= 2 ? 'A TSH blood test confirms or rules out thyroid disease.' : 'No action needed.',
    method: registry.rule_based.thyroid,
  };
}

export function predictCycle(req: { last_period_date: string; cycle_length_avg?: number; cycle_lengths?: number[] }) {
  const last = new Date(`${req.last_period_date}T00:00:00Z`);
  if (isNaN(last.getTime())) throw new Error('Invalid date format. Expected YYYY-MM-DD.');
  const todayStr = new Date().toISOString().split('T')[0];
  const today = new Date(`${todayStr}T00:00:00Z`);
  const DAY = 86400000;
  const lengths = (req.cycle_lengths || []).filter(n => n >= 10 && n <= 120);
  const avg = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : Number(req.cycle_length_avg ?? 28);
  const variation = lengths.length >= 2 ? Math.max(...lengths) - Math.min(...lengths) : null;

  const flags: string[] = [];
  if (avg < 21) flags.push('Cycles shorter than 21 days (polymenorrhea)');
  if (avg > 35) flags.push('Cycles longer than 35 days (oligomenorrhea)');
  if (variation !== null && variation > 9) flags.push(`Cycle length varies by ${variation} days (>9 days is irregular)`);
  const isRegular = flags.length === 0 ? 1 : 0;

  const daysSince = Math.round((today.getTime() - last.getTime()) / DAY);
  const cycle = Math.max(1, Math.round(avg));
  const cyclesPassed = Math.max(0, Math.floor(daysSince / cycle));
  const next = new Date(last.getTime() + cycle * (cyclesPassed + 1) * DAY);
  const ovulation = new Date(next.getTime() - 14 * DAY);
  const iso = (d: Date) => d.toISOString().split('T')[0];

  return {
    status: 'success',
    days_since_last_period: daysSince,
    is_regular: isRegular,
    probability_regular: isRegular ? 0.9 : 0.25,
    days_until_next_period: Math.max(0, Math.round((next.getTime() - today.getTime()) / DAY)),
    next_period_date: iso(next),
    fertile_window: [iso(new Date(ovulation.getTime() - 5 * DAY)), iso(ovulation)],
    average_cycle_length: round(avg, 1),
    cycles_used: lengths.length,
    clinical_flags: flags,
    method: registry.rule_based.cycle,
  };
}

export const modelInfo = () => ({
  version: registry.version,
  models: Object.fromEntries(
    Object.entries(registry.models).map(([k, m]) => [
      k,
      { ...modelCard(m as LogisticModel), metrics: (m as LogisticModel).metrics, dataset_url: (m as LogisticModel).dataset_url },
    ])
  ),
  rule_based: registry.rule_based,
});
