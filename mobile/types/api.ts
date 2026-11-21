export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  language?: string;
}

export interface ApiUser {
  id: number | string;
  uuid?: string;
  email: string;
  name: string | null;
  fullName?: string | null;
  phone?: string | null;
}

export interface RegisterResponse {
  ok: true;
  user: ApiUser;
}

/** Shape returned by frontend/app/api/me/route.ts. */
export interface MeResponse {
  authenticated: boolean;
  userId: number | string | null;
  userUuid: string | null;
  email: string | null;
  name: string;
  hasHerProfile: boolean;
  hasMomProfile: boolean;
  consent: unknown;
  preferences: UserPreferences | null;
  storage: string;
}

export interface ApiErrorPayload {
  error?: string;
  [key: string]: unknown;
}

// -------------------------------------------------------------
// Onboarding & Profile Models
// -------------------------------------------------------------

export interface HerProfile {
  preferred_name: string;
  last_period_start: string;
  last_period_end?: string;
  cycle_length_avg: number;
  cycle_length?: number;
  period_duration: number;
  cycle_regularity: string;
  primary_goal?: string;
  diagnosed_conditions?: string[];
  is_pregnancy_mode?: boolean;
}

export interface MomProfile {
  preferred_name: string;
  weeks_pregnant: number;
  due_date?: string;
  expected_due_date?: string;
  conception_date?: string;
  pregnancy_experience?: string;
  maternal_conditions?: string[];
  primary_goal?: string;
  risk_level?: string;
  baby_size_fruit?: string;
  is_pregnancy_mode?: boolean;
}

export interface OnboardingHerPayload {
  preferredName?: string;
  lastPeriodStart?: string;
  lastPeriodEnd?: string;
  periodDuration?: number;
  cycleLengthAvg?: number;
  cycleRegularity?: string;
  diagnosedConditions?: string[];
}

export interface UpdateProfileRequest {
  mode: "her" | "pregnancy" | "restart";
  resetData?: boolean;
  profile?: Partial<HerProfile> | Partial<MomProfile>;
}

// -------------------------------------------------------------
// Dashboard Data
// -------------------------------------------------------------

export interface DashboardCycleHistoryItem {
  month: string;
  cycleLength: number;
  periodDuration: number;
  start?: string;
}

export interface DashboardDataResponse {
  profile: HerProfile | null;
  onboarded: boolean;
  logs: DailyLogEntry[];
  cycleHistory: DashboardCycleHistoryItem[];
  mode: "live" | "preview";
  storage: string;
}

// -------------------------------------------------------------
// Her Mode Daily Log & Pain Log
// -------------------------------------------------------------

export interface PainEvent {
  at: string;
  level: number;
  source: string;
  where?: string[];
}

export interface DailyLogEntry {
  log_date: string;
  flow_intensity: "None" | "Spotting" | "Light" | "Medium" | "Heavy" | string;
  cramps_severity?: number;
  symptoms?: string[];
  mood?: string;
  sleep_hours?: number;
  on_period?: boolean;
  weight?: number;
  water_consumed?: number;
  exercised?: boolean;
  warning_signs?: string[];
  notes?: string;
  pain_reports?: PainEvent[];
}

export interface DailyLogRequest {
  logDate?: string;
  log_date?: string;
  onPeriod?: boolean;
  on_period?: boolean;
  flowIntensity?: string;
  flow_intensity?: string;
  crampsSeverity?: number;
  cramps_severity?: number;
  symptoms?: string[];
  mood?: string;
  sleepHours?: number;
  sleep_hours?: number;
  weight?: number;
  waterConsumed?: number;
  exercised?: boolean;
  warningSigns?: string[];
  notes?: string;
}

export interface DailyLogResponse {
  success: boolean;
  log: DailyLogEntry;
  cycleUpdate?: unknown;
}

export interface PeriodStartRequest {
  date: string;
  correction?: boolean;
}

export interface PeriodStartResponse {
  success: boolean;
  samePeriod?: boolean;
  periodDay?: number | null;
  chartData?: unknown;
}

export interface PainLogRequest {
  level: number;
  where?: string[];
  date?: string;
}

export interface PainLogResponse {
  success: boolean;
  log: DailyLogEntry;
}

// -------------------------------------------------------------
// Cycle Logs (PostgreSQL backend)
// -------------------------------------------------------------

export interface CycleLogEntry {
  id: number;
  user_id: number;
  start_date: string;
  end_date: string | null;
  cycle_length: number | null;
  period_length: number | null;
  flow_intensity: string | null;
  cramp_severity: number | null;
  bloating_severity: number | null;
  headache_severity: number | null;
  fatigue_severity: number | null;
  acne_severity: number | null;
  stress_level: number | null;
  sleep_hours: number | null;
  exercise_frequency: string | null;
  diet: string | null;
  created_at?: string;
}

export interface CycleLogCreateRequest {
  startDate: string;
  endDate?: string;
  flowIntensity?: string;
  crampSeverity?: number;
  bloatingSeverity?: number;
  headacheSeverity?: number;
  fatigueSeverity?: number;
  acneSeverity?: number;
  stressLevel?: number;
  sleepHours?: number;
  exerciseFrequency?: string;
  diet?: string;
}

// -------------------------------------------------------------
// Predictions (/api/predict)
// -------------------------------------------------------------

export interface CyclePredictionRequest {
  last_period_date: string;
  cycle_length_avg?: number;
  cycle_lengths?: number[];
}

export interface CyclePredictionResponse {
  status: string;
  days_since_last_period: number;
  is_regular: number;
  probability_regular: number;
  days_until_next_period: number;
  next_period_date: string;
  fertile_window: [string, string];
  average_cycle_length: number;
  cycles_used: number;
  clinical_flags: string[];
  engine?: string;
}

export interface PcosPredictionRequest {
  cycle_regularity?: number;
  acne_severity?: number;
  cycle_length?: number | null;
  missed_periods?: number;
  hair_growth?: boolean;
  skin_darkening?: boolean;
  weight_gain?: boolean;
  bmi?: number | null;
  hair_loss?: boolean;
  period_days?: number | null;
  age?: number | null;
}

export interface PcosPredictionResponse {
  status: string;
  risk_level: "Low" | "Moderate" | "High";
  probability: number;
  criteria_met?: {
    ovulatory_dysfunction: boolean;
    androgen_excess: boolean;
  };
  clinical_flags: string[];
  engine?: string;
}

// -------------------------------------------------------------
// Pregnancy Mode Data
// -------------------------------------------------------------

export interface PregnancyLogEntry {
  log_date: string;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  blood_sugar?: number | null;
  baby_kicks_count?: number | null;
  sleep_hours?: number | null;
  mood?: string | null;
  symptoms?: string[];
  weight_kg?: number | null;
  notes?: string | null;
}

export interface PregnancyLogRequest {
  log_date: string;
  blood_pressure_systolic?: number | null;
  blood_pressure_diastolic?: number | null;
  blood_sugar?: number | null;
  baby_kicks_count?: number | null;
  sleep_hours?: number | null;
  mood?: string | null;
  symptoms?: string[];
  weight_kg?: number | null;
  notes?: string | null;
}

export interface PregnancyAppointment {
  name: string;
  date: string;
  completed: boolean;
}

export interface PregnancyAppointmentsRequest {
  action?: "toggle" | "add" | "reset";
  index?: number;
  appointment?: { name: string; date?: string; completed?: boolean };
  appointments?: PregnancyAppointment[];
}

export interface PregnancyDataResponse {
  profile: MomProfile;
  onboarded: boolean;
  logs: PregnancyLogEntry[];
  nutrition: unknown;
  appointments: PregnancyAppointment[];
  storage: string;
}

// -------------------------------------------------------------
// Weight Log (/api/weight)
// -------------------------------------------------------------

export interface WeightEntry {
  date: string;
  kg: number;
}

export interface WeightDoc {
  entries: WeightEntry[];
  heightCm?: number;
  preKg?: number;
}

export interface WeightRequest {
  kg?: number;
  date?: string;
  heightCm?: number | null;
  preKg?: number | null;
}

// -------------------------------------------------------------
// User Profile (/api/profile)
// -------------------------------------------------------------

export interface UserProfileResponse {
  id: number;
  uuid: string;
  email: string;
  name: string | null;
  full_name: string | null;
  phone_number: string | null;
  image: string | null;
  age: number | null;
  bmi: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileUpdateRequest {
  age?: number | null;
  bmi?: number | null;
  fullName?: string | null;
  name?: string | null;
  phoneNumber?: string | null;
}

// -------------------------------------------------------------
// User Preferences (/api/preferences)
// -------------------------------------------------------------

export interface UserPreferences {
  language: string;
  bcp47: string;
  voiceName?: string;
  voiceEnabled: boolean;
  voiceMode: "live" | "assisted" | "text";
  direction: "ltr" | "rtl";
  updatedAt: string;
}

export interface PreferencesPatchRequest {
  language?: string;
  voiceName?: string;
  voiceEnabled?: boolean;
  voiceMode?: "live" | "assisted" | "text";
}


// -------------------------------------------------------------
// Phase 3: Ask Sakhi Chat (/api/ask-sakhi, /api/chat-history)
// -------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "model";
  text: string;
  engine?: string;
  at?: string;
}

export interface AskSakhiRequest {
  message: string;
  prompt?: string;
  userName?: string;
  lang?: string;
  history?: Array<{ role: string; text: string }>;
}

export interface AskSakhiResponse {
  reply?: string;
  chartUpdates?: unknown[];
  updatedChartData?: unknown;
  engine?: string;
  notice?: string;
  offline?: boolean;
  error?: string;
}

export interface ChatHistoryResponse {
  messages: Array<{
    role: "user" | "assistant" | "model";
    text: string;
    engine?: string;
    at?: string;
  }>;
  stored: boolean;
}

// -------------------------------------------------------------
// Phase 3: Triage & Relief (/api/triage, /api/relief)
// -------------------------------------------------------------

export interface TriageSymptomInput {
  flowIntensity?: string;
  periodLength?: number;
  cycleLength?: number;
  missedPeriodsStreak?: number;
  crampSeverity: number;
  headacheSeverity: number;
  headacheWithVisionChanges?: boolean;
  bloatingSeverity: number;
  feverC?: number;
  faintingOrDizziness?: boolean;
  soakingPadHourly?: boolean;
  severeAbdominalPain?: boolean;
  tirednessSevere?: boolean;
  acneSeverity?: number;
  hairGrowthNew?: boolean;
  skinDarkening?: boolean;
  weightGainRapid?: boolean;
  isCurrentlyBleeding?: boolean;
  daysSincePeriodStart?: number;
  nausea?: boolean;
  fatigueSeverity?: number;
  anxietyOrStress?: boolean;
  moodSwings?: boolean;
  cycleDelayed?: boolean;
}

export interface TriageResult {
  urgency: "EMERGENCY" | "SEE_DOCTOR" | "MONITOR" | "NORMAL";
  reasons: string[];
  suspectedProfiles: string[];
  advice: string;
}

export interface WellnessAdviceItem {
  category: string;
  title: string;
  advice: string;
  actionableSteps?: string[];
}

export interface TriageResponse {
  success: boolean;
  triageResult: TriageResult;
  wellnessAdvice?: WellnessAdviceItem[];
  error?: string;
}

export interface ReliefTip {
  id: string;
  group: string;
  title: string;
  steps: string[];
  seconds?: number;
  why?: string;
}

export interface ReliefResponse {
  severity: number;
  tips: ReliefTip[];
  favourites: ReliefTip[];
  redFlags: string[];
  seeDoctor: string;
  urgent: boolean;
}

// -------------------------------------------------------------
// Phase 3: Lab Reports (/api/lab-report, /api/lab-report/read)
// -------------------------------------------------------------

export interface LabResultRecord {
  date: string;
  key: string;
  value: number | string;
  source: "photo" | "manual";
  measured_by?: "lab" | "doctor" | "home" | "self";
}

export interface LabReportsResponse {
  results: LabResultRecord[];
}

export interface LabReadResponse {
  values?: Array<{ key: string; value: number | string }>;
  reportDate?: string | null;
  reader?: string;
  fallback?: boolean;
  error?: string;
}

// -------------------------------------------------------------
// Phase 3: Doctor Summary (/api/doctor-summary)
// -------------------------------------------------------------

export interface DoctorSummaryBase {
  generatedAt: string;
  period: { days: number; from: string | null; to: string | null };
  labs: Array<{
    key: string;
    label: string;
    value: string;
    date: string;
    status: "ok" | "mild" | "attention" | "urgent";
    note: string;
  }>;
  tablets: {
    rows: Array<{
      name: string;
      schedule: string;
      onTime: number;
      late: number;
      missed: number;
    }>;
    takenRate: number | null;
    days: number;
  } | null;
  flags: string[];
  questions: string[];
}

export interface DoctorSummaryHer extends DoctorSummaryBase {
  kind: "her";
  patient: {
    name: string;
    diagnosedConditions: string[];
    goal: string | null;
  };
  cycle: {
    lastPeriodStart: string | null;
    reportedCycleLength: number | null;
    reportedPeriodDuration: number | null;
    regularity: string | null;
    history: Array<{
      month?: string;
      start?: string;
      cycleLength?: number;
      periodDuration?: number;
    }>;
    prediction?: {
      average_cycle_length?: number;
      next_period_date?: string;
      is_regular?: number;
      clinical_flags?: string[];
    } | null;
  };
  stats: {
    checkIns: number;
    avgCramps: number | null;
    maxCramps: number | null;
    severeCrampDays: number;
    heavyDays: number;
    bloodLoss: Array<{ start: string; score: number }>;
    avgSleep: number | null;
    flow: Array<{ label: string; count: number }>;
    symptoms: Array<{ label: string; count: number }>;
    moods: Array<{ label: string; count: number }>;
  };
  screens: {
    pcos?: {
      risk_level?: string;
      criteria_met?: number;
      next_step?: string;
      clinical_flags?: string[];
      model?: { name: string; dataset: string; n: number; roc_auc: number };
      method?: string;
      not_scored?: boolean;
      reason?: string;
    } | null;
    thyroid?: {
      risk_level?: string;
      next_step?: string;
      clinical_flags?: string[];
      model?: { name: string; dataset: string; n: number; roc_auc: number };
      method?: string;
      not_scored?: boolean;
      reason?: string;
    } | null;
  };
  pcosPattern?: {
    rows: Array<{
      label: string;
      periodStarted: boolean;
      cycleLength: number | null;
      bleedDays: number;
      acneDays: number;
      hairGrowthDays: number;
      hairLossDays: number;
      weight: number | null;
      checkIns: number;
    }>;
    longestGap: number | null;
  } | null;
  recentLogs?: any[];
}

export interface DoctorSummaryPregnancy extends DoctorSummaryBase {
  kind: "pregnancy";
  patient: {
    name: string;
    weeksPregnant: number | null;
    dueDate: string | null;
    experience: string | null;
    conditions: string[];
  };
  vitals: {
    bp: Array<{ date: string; systolic: number; diastolic: number }>;
    sugar: Array<{ date: string; value: number }>;
    weights: Array<{ date: string; value: number }>;
    weightChange: number | null;
    avgKicks: number | null;
    minKicks: number | null;
  };
  stats: {
    checkIns: number;
    symptoms: Array<{ label: string; count: number }>;
  };
  screens: {
    preeclampsia?: {
      risk_level?: string;
      clinical_flags?: string[];
      model?: { name: string; dataset: string; n: number; roc_auc: number };
      method?: string;
      not_scored?: boolean;
      reason?: string;
    } | null;
    gdm?: {
      risk_level?: string;
      clinical_flags?: string[];
      model?: { name: string; dataset: string; n: number; roc_auc: number };
      method?: string;
      not_scored?: boolean;
      reason?: string;
    } | null;
  };
  nutrition?: any;
  appointments: Array<{ name: string; date: string; completed?: boolean }>;
  postnatal?: {
    birthDate: string;
    babyName: string | null;
    sex: string | null;
    delivery: string | null;
    age: string;
    daysSinceBirth: number;
    corrected: string | null;
    birthWeight: number | null;
    latestWeight: { date: string; weight: number; band?: string | null } | null;
    vaccines: {
      done: number;
      total: number;
      next: { name: string; date: string; overdue: boolean } | null;
    };
    recoveryChecks: number;
    flags: string[];
  } | null;
}

export type DoctorSummaryResponse = DoctorSummaryHer | DoctorSummaryPregnancy;

// -------------------------------------------------------------
// Phase 3: Consent (/api/consent) & Data Management
// -------------------------------------------------------------

export interface ConsentRecord {
  accepted: boolean;
  version: number;
  aiProcessing: boolean;
  privateMode: boolean;
  at?: string;
}

export interface ConsentResponse {
  consent: ConsentRecord | null;
  required: boolean;
  version: number;
}

export interface ExportDataResponse {
  exportedAt: string;
  format: string;
  storage: string;
  account: unknown;
  documents: unknown;
  cycleLogs: unknown[];
  triageLogs: unknown[];
}
