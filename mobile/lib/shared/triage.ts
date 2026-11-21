// GENERATED from frontend/lib/triage.ts by scripts/sync-shared.mjs. Do not edit here.
export interface SymptomInput {
  flowIntensity?: string;          // "spotting" | "light" | "normal" | "heavy" | "very_heavy"
  periodLengthDays?: number;
  cycleLengthDays?: number;
  missedPeriodsStreak?: number;    // consecutive missed cycles

  crampSeverity: number;          // 0-10
  headacheSeverity: number;       // 0-10
  headacheWithVisionChanges?: boolean;
  bloatingSeverity: number;       // 0-10
  feverC?: number;
  faintingOrDizziness?: boolean;
  soakingPadHourly?: boolean;     // soaking pad/tampon hourly for 2+ hours
  severeAbdominalPain?: boolean;
  tirednessSevere?: boolean;

  acneSeverity: number;           // 0-10
  hairGrowthNew?: boolean;
  skinDarkening?: boolean;
  weightGainRapid?: boolean;
}

export interface TriageResult {
  urgency: 'EMERGENCY' | 'SEE_DOCTOR' | 'MONITOR' | 'NORMAL';
  reasons: string[];
  suspectedProfiles: string[];
  advice: string;
}

const RED_FLAG_EMERGENCY_ADVICE = 
  "These symptoms can indicate a medical emergency. Please seek immediate " +
  "in-person care (ER or emergency services) rather than waiting for a routine appointment.";

const SEE_DOCTOR_ADVICE = 
  "This pattern is worth getting checked by a doctor within the next few days -- " +
  "it's not necessarily an emergency, but it shouldn't wait for a routine annual visit.";

const MONITOR_ADVICE = 
  "Keep logging this in the app. If it persists over your next 2-3 cycles or gets worse, " +
  "bring it up with a doctor -- the app's doctor-visit-brief can summarize the pattern for you.";

const NORMAL_ADVICE = "This is within a typical range. No action needed.";

export function triageSymptoms(s: SymptomInput): TriageResult {
  const reasons: string[] = [];
  const suspectedProfiles: string[] = [];

  const flowIntensity = s.flowIntensity || 'normal';
  const missedPeriodsStreak = s.missedPeriodsStreak || 0;

  // =========================================================================
  // 1. INTELLIGENT SYNDROME PROFILING
  // =========================================================================
  const isOligomenorrhea = s.cycleLengthDays !== undefined && s.cycleLengthDays > 35;
  const isPolymenorrhea = s.cycleLengthDays !== undefined && s.cycleLengthDays < 21;
  const isMenorrhagia = s.periodLengthDays !== undefined && s.periodLengthDays > 7;
  const isHypomenorrhea = flowIntensity === 'spotting' || (s.periodLengthDays !== undefined && s.periodLengthDays < 2);

  // PCOS Profile: Irregular cycles + Hyperandrogenism signs
  let hyperandrogenismScore = 0;
  if (s.acneSeverity >= 5) hyperandrogenismScore++;
  if (s.hairGrowthNew) hyperandrogenismScore++;
  if (s.skinDarkening) hyperandrogenismScore++;
  if (s.weightGainRapid) hyperandrogenismScore++;

  if ((isOligomenorrhea || missedPeriodsStreak > 0) && hyperandrogenismScore >= 2) {
    suspectedProfiles.push("PCOS_RISK");
  }

  // Thyroid Profiles
  // Hypothyroidism: heavy/prolonged periods + extreme tiredness
  if ((isMenorrhagia || ['heavy', 'very_heavy'].includes(flowIntensity)) && s.tirednessSevere) {
    suspectedProfiles.push("HYPOTHYROID_RISK");
  }
  // Hyperthyroidism: scanty/short bleeding + polymenorrhea
  if (isHypomenorrhea && isPolymenorrhea) {
    suspectedProfiles.push("HYPERTHYROID_RISK");
  }

  // =========================================================================
  // 2. URGENCY TRIAGE RULES
  // =========================================================================

  // --- EMERGENCY tier ---
  if (s.soakingPadHourly) {
    reasons.push("Soaking through a pad/tampon every hour for 2+ hours (possible hemorrhage)");
  }
  if (s.faintingOrDizziness) {
    reasons.push("Fainting or dizziness alongside menstrual symptoms");
  }
  if (s.severeAbdominalPain && s.crampSeverity >= 8) {
    reasons.push("Severe, sudden abdominal pain (possible ovarian torsion / rupture)");
  }
  if (s.feverC !== undefined && s.feverC >= 39.0) {
    reasons.push(`High fever (${s.feverC}°C) during menstruation (possible infection / TSS)`);
  }
  if (s.headacheWithVisionChanges && s.headacheSeverity >= 8) {
    reasons.push("Severe headache with vision changes (possible neurological emergency)");
  }

  if (reasons.length > 0) {
    return {
      urgency: 'EMERGENCY',
      reasons,
      suspectedProfiles,
      advice: RED_FLAG_EMERGENCY_ADVICE
    };
  }

  // --- SEE_DOCTOR tier ---
  if (flowIntensity === 'very_heavy') {
    reasons.push("Very heavy flow reported");
  }
  if (isMenorrhagia) {
    reasons.push(`Period lasting ${s.periodLengthDays} days (>7 day threshold)`);
  }
  if (isOligomenorrhea) {
    reasons.push(`Cycle lasting ${s.cycleLengthDays} days (>35 day threshold for Oligomenorrhea)`);
  }
  if (isPolymenorrhea) {
    reasons.push(`Cycle lasting ${s.cycleLengthDays} days (<21 day threshold for Polymenorrhea)`);
  }
  if (s.crampSeverity >= 8) {
    reasons.push(`Severe cramp severity ${s.crampSeverity}/10 impacting daily life`);
  }
  if (s.headacheSeverity >= 7) {
    reasons.push(`Headache severity ${s.headacheSeverity}/10`);
  }
  if (missedPeriodsStreak >= 3) {
    reasons.push(`${missedPeriodsStreak} consecutive missed periods`);
  }
  if (s.feverC !== undefined && s.feverC >= 38.0 && s.feverC < 39.0) {
    reasons.push(`Fever (${s.feverC}°C)`);
  }

  if (reasons.length > 0) {
    let advice = SEE_DOCTOR_ADVICE;
    if (suspectedProfiles.length > 0) {
      advice += " Suggesting you consult a doctor regarding potential risk for: " + suspectedProfiles.join(", ");
    }
    return {
      urgency: 'SEE_DOCTOR',
      reasons,
      suspectedProfiles,
      advice
    };
  }

  // --- MONITOR tier ---
  if (flowIntensity === 'heavy') {
    reasons.push("Heavier than usual flow");
  }
  if (s.crampSeverity >= 4 && s.crampSeverity < 8) {
    reasons.push(`Moderate cramps (${s.crampSeverity}/10)`);
  }
  if (s.headacheSeverity >= 4 && s.headacheSeverity <= 6) {
    reasons.push(`Moderate headache (${s.headacheSeverity}/10)`);
  }
  if (s.bloatingSeverity >= 6) {
    reasons.push(`Notable bloating (${s.bloatingSeverity}/10)`);
  }
  if (missedPeriodsStreak === 1 || missedPeriodsStreak === 2) {
    reasons.push(`${missedPeriodsStreak} missed period(s)`);
  }
  if (suspectedProfiles.includes("PCOS_RISK")) {
    reasons.push("Reported multiple hyperandrogenism signs (acne, hair growth, etc.)");
  }

  if (reasons.length > 0) {
    let advice = MONITOR_ADVICE;
    if (suspectedProfiles.length > 0) {
      advice += " Additionally, monitor signs related to: " + suspectedProfiles.join(", ");
    }
    return {
      urgency: 'MONITOR',
      reasons,
      suspectedProfiles,
      advice
    };
  }

  return {
    urgency: 'NORMAL',
    reasons: ["No symptoms outside typical range"],
    suspectedProfiles,
    advice: NORMAL_ADVICE
  };
}
