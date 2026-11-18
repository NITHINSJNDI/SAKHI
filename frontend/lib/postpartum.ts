/**
 * After the birth: baby's vaccines (India's Universal Immunisation Programme),
 * feeds and diapers, and the mother's recovery with its warning signs.
 */

export interface Feed { at: string; kind: 'left' | 'right' | 'bottle'; minutes?: number }
export interface Diaper { at: string; kind: 'wet' | 'dirty' }
export interface Recovery {
  date: string;
  bleeding: 'none' | 'light' | 'moderate' | 'heavy' | 'clots';
  fever: boolean;
  pain: number;
  breast: boolean;
  wound: boolean;
  headache: boolean;
  calf: boolean;
  breathless: boolean;
  smell: boolean;
}
export interface PostpartumDoc {
  birth_date?: string;
  baby_name?: string;
  delivery?: 'normal' | 'csection';
  feeds: Feed[];
  diapers: Diaper[];
  recovery: Recovery[];
  vaccines_done: string[];
  /** girl or boy: the WHO growth lines differ */
  sex?: 'girl' | 'boy';
  /** weighings in kg; the first one on the birth date is the birth weight */
  growth: { date: string; weight: number }[];
  /** milestone id → date she first saw it */
  milestones: Record<string, string>;
  /** postnatal / home visits already done */
  visits_done?: string[];
}

/**
 * Check-ups after the birth (MoHFW): ASHA home visits under Home Based Newborn
 * Care on days 3, 7, 14, 21, 28 and 42, the mother's 6-week check-up, then Home
 * Based Young Child care visits at 3, 6, 9, 12 and 15 months.
 */
export const VISITS: { id: string; days: number; title: string; what: string }[] = [
  { id: 'd3', days: 3, title: 'Day 3: ASHA home visit', what: 'Baby weighed and checked for feeding, warmth, cord and jaundice; your bleeding and BP checked.' },
  { id: 'd7', days: 7, title: 'Day 7: ASHA home visit', what: 'Baby should be back near birth weight by now; feeding and cord checked.' },
  { id: 'd14', days: 14, title: 'Day 14: ASHA home visit', what: 'Baby back to birth weight? Breastfeeding and your recovery checked.' },
  { id: 'd21', days: 21, title: 'Day 21: ASHA home visit', what: 'Weight, feeding and danger signs checked.' },
  { id: 'd28', days: 28, title: 'Day 28: ASHA home visit', what: 'Weight and feeding checked; low-weight babies get extra visits.' },
  { id: 'd42', days: 42, title: 'Day 42: your 6-week check-up', what: "At the health centre: your BP, stitches, bleeding, mood and family planning; baby's 6-week vaccines on the same trip." },
  { id: 'm3', days: 91, title: '3 months: ASHA child visit', what: 'Weight on the MCP card, breastfeeding and development.' },
  { id: 'm6', days: 183, title: '6 months: ASHA child visit', what: 'Starting solid food (complementary feeding), weight and iron syrup.' },
  { id: 'm9', days: 274, title: '9 months: ASHA child visit', what: 'Weight, food 3 to 4 times a day, and the 9-month vaccines.' },
  { id: 'm12', days: 365, title: '12 months: ASHA child visit', what: 'Weight, development and family food.' },
  { id: 'm15', days: 456, title: '15 months: ASHA child visit', what: 'Weight, development and the next vaccines.' },
];
export const EMPTY_POSTPARTUM: PostpartumDoc = { feeds: [], diapers: [], recovery: [], vaccines_done: [], growth: [], milestones: {} };

/**
 * Age to use for growth and milestones: for a baby born 3+ weeks early, WHO and
 * IAP count from the due date until age 2 ("corrected age").
 */
export function effectiveAgeStart(birth: string, dueDate?: string | null): { from: string; corrected: boolean; weeksEarly: number } {
  const due = String(dueDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { from: birth, corrected: false, weeksEarly: 0 };
  const early = Math.round((Date.parse(due) - Date.parse(birth)) / DAY);
  // 3 to 16 weeks early is a preterm birth; anything else is likely a stale due date
  if (early < 21 || early > 112) return { from: birth, corrected: false, weeksEarly: 0 };
  return { from: due, corrected: true, weeksEarly: Math.round(early / 7) };
}

/** UIP schedule (MoHFW), by age in weeks from birth. */
export const VACCINES: { id: string; due: string; weeks: number; items: string }[] = [
  { id: 'birth', due: 'At birth', weeks: 0, items: 'BCG, OPV-0, Hepatitis B birth dose' },
  { id: 'w6', due: '6 weeks', weeks: 6, items: 'OPV-1, Pentavalent-1, Rotavirus-1, fIPV-1, PCV-1' },
  { id: 'w10', due: '10 weeks', weeks: 10, items: 'OPV-2, Pentavalent-2, Rotavirus-2' },
  { id: 'w14', due: '14 weeks', weeks: 14, items: 'OPV-3, Pentavalent-3, Rotavirus-3, fIPV-2, PCV-2' },
  { id: 'm9', due: '9 months', weeks: 39, items: 'MR-1, PCV booster, JE-1 (where given), Vitamin A' },
  { id: 'm16', due: '16 to 24 months', weeks: 69, items: 'MR-2, DPT booster-1, OPV booster, JE-2 (where given)' },
];

const DAY = 86_400_000;
export const ageDays = (birth: string, today: string) => Math.max(0, Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(birth + 'T00:00:00Z')) / DAY));

export function babyAge(birth: string, today: string) {
  const d = ageDays(birth, today);
  if (d < 14) return `${d} day${d === 1 ? '' : 's'} old`;
  if (d < 90) return `${Math.floor(d / 7)} weeks old`;
  return `${Math.floor(d / 30.4)} months old`;
}

export const dueDate = (birth: string, weeks: number) => new Date(Date.parse(birth + 'T00:00:00Z') + weeks * 7 * DAY).toISOString().slice(0, 10);

/** The next vaccine visit not yet marked done, and whether it's overdue. */
export function nextVaccine(doc: PostpartumDoc, today: string) {
  if (!doc.birth_date) return null;
  const v = VACCINES.find(x => !doc.vaccines_done.includes(x.id));
  if (!v) return null;
  const date = dueDate(doc.birth_date, v.weeks);
  return { ...v, date, overdue: date < today, daysAway: Math.round((Date.parse(date) - Date.parse(today)) / DAY) };
}

/** Today's feeds and diapers, and time since the last feed. */
export function babyToday(doc: PostpartumDoc, now: Date) {
  const day = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const local = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10); };
  const feeds = doc.feeds.filter(f => local(f.at) === day);
  const wet = doc.diapers.filter(d => local(d.at) === day && d.kind === 'wet').length;
  const dirty = doc.diapers.filter(d => local(d.at) === day && d.kind === 'dirty').length;
  const last = [...doc.feeds].sort((a, b) => a.at.localeCompare(b.at)).pop();
  const sinceMin = last ? Math.round((now.getTime() - new Date(last.at).getTime()) / 60_000) : null;
  const lastSide = [...doc.feeds].filter(f => f.kind !== 'bottle').sort((a, b) => a.at.localeCompare(b.at)).pop()?.kind;
  return { feeds: feeds.length, wet, dirty, sinceMin, nextSide: lastSide === 'left' ? 'right' : lastSide === 'right' ? 'left' : null, lastFeed: last || null };
}

export interface RecoveryCheck { level: 'ok' | 'doctor' | 'emergency'; reasons: string[]; alertReason: string | null }

/** Warning signs after birth (WHO / MoHFW postnatal danger signs). */
export function checkRecovery(r: Recovery, delivery?: string): RecoveryCheck {
  const urgent: string[] = [];
  const soon: string[] = [];
  if (r.bleeding === 'heavy' || r.bleeding === 'clots') urgent.push(r.bleeding === 'clots' ? 'Bleeding with large clots' : 'Heavy bleeding (a pad soaked in an hour)');
  if (r.headache) urgent.push('Severe headache or blurred vision (can be high BP after birth)');
  if (r.breathless) urgent.push('Chest pain or trouble breathing');
  if (r.calf) urgent.push('Pain or swelling in one leg (possible clot)');
  if (r.fever) soon.push('Fever');
  if (r.smell) soon.push('Bad-smelling discharge');
  if (r.breast) soon.push('A hard, red or painful area in the breast');
  if (r.wound) soon.push(delivery === 'csection' ? 'Stitches red, swollen or leaking' : 'Stitches very painful or leaking');
  if (r.pain >= 7) soon.push(`Pain ${r.pain}/10`);
  if (urgent.length) return { level: 'emergency', reasons: [...urgent, ...soon], alertReason: urgent[0].startsWith('Heavy') || urgent[0].startsWith('Bleeding') ? 'heavy-bleeding' : urgent[0].startsWith('Severe') ? 'preeclampsia-signs' : 'clot-signs' };
  if (r.fever && (r.smell || r.wound || r.breast)) return { level: 'doctor', reasons: soon, alertReason: 'infection-signs' };
  if (soon.length) return { level: 'doctor', reasons: soon, alertReason: null };
  return { level: 'ok', reasons: [], alertReason: null };
}

/**
 * How long the baby view lasts, and what it shows:
 *  - recovery (0–6 weeks): daily recovery check, feeds, vaccines
 *  - infant (6 weeks–6 months): feeds, vaccines, periods-coming-back card
 *  - older (6 months–2 years): vaccines and solids; feed log tucked away
 *  - done (after 2 years, last UIP visit): Sakhi suggests going back to Her Mode
 */
export type PostpartumStage = 'recovery' | 'infant' | 'older' | 'done';
export function stageOf(days: number): PostpartumStage {
  if (days <= 42) return 'recovery';
  if (days <= 182) return 'infant';
  if (days <= 730) return 'older';
  return 'done';
}
/** "Back to pregnancy view" is only for a mistaken tap, so it goes after 2 weeks. */
export const UNDO_DAYS = 14;
