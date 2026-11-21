/**
 * Menstrual hygiene for Her Mode: what she uses, when to change it, whether she
 * has enough for her next period, safe disposal, low-cost access in India and
 * infection warning signs. Pure functions, so the card and the tests share them.
 * General guidance only; it never diagnoses.
 */

export type Product = 'pad' | 'cloth' | 'cup' | 'tampon' | 'period_underwear';

export type Soak = 'light' | 'half' | 'full';

/** One used pad or tampon, for the blood-loss score */
export interface PadEntry { at: string; soak: Soak; clots?: boolean; product?: Product }

export interface HygieneDoc {
  product: Product | null;
  /** ISO timestamps of changes in the current period (kept short) */
  changes: string[];
  /** disposable pads or tampons she has at home; null = not tracked */
  stock: number | null;
  /** how soaked each used pad was, last ~45 days */
  pads?: PadEntry[];
}

export const EMPTY_HYGIENE: HygieneDoc = { product: null, changes: [], stock: null, pads: [] };

// ------------------------------------------------------------ blood-loss score

/**
 * Pictorial Blood loss Assessment Chart (PBAC; Higham, O'Brien & Shaw, 1990,
 * BJOG 97:734-739). Each pad or tampon scores 1 (lightly stained), 5 (half
 * soaked) or 20 (fully soaked); a large clot adds 5. A total over 100 for one
 * period suggests heavy menstrual bleeding. Validated for pads and tampons
 * only, so cloth gives a rough guide and cups are not scored.
 */
export const PBAC_POINTS: Record<Soak, number> = { light: 1, half: 5, full: 20 };
export const PBAC_HEAVY = 100;

export interface PbacResult {
  score: number;
  items: number;
  heavy: boolean;
  /** true when pads alone already passed the line part-way through */
  validFor: 'validated' | 'rough' | 'not_scored';
  message: string;
}

export function addPad(pads: PadEntry[] | undefined, entry: PadEntry, now = new Date()): PadEntry[] {
  const cutoff = now.getTime() - 45 * 86_400_000;
  return [...(pads || []).filter(p => new Date(p.at).getTime() >= cutoff), entry];
}

/** Score the pads logged since this period began (periodStart: ISO date or timestamp). */
export function pbacScore(pads: PadEntry[] | undefined, periodStart: string | null, product: Product | null): PbacResult {
  if (product === 'cup' || product === 'period_underwear') {
    return { score: 0, items: 0, heavy: false, validFor: 'not_scored', message: 'The blood-loss score works with pads and tampons. With a cup, filling it more than twice a day on several days can mean heavy bleeding.' };
  }
  const since = periodStart ? new Date(periodStart).getTime() - 86_400_000 : -Infinity;
  const these = (pads || []).filter(p => new Date(p.at).getTime() >= since);
  const score = these.reduce((a, p) => a + (PBAC_POINTS[p.soak] || 0) + (p.clots ? 5 : 0), 0);
  const heavy = score > PBAC_HEAVY;
  const validFor = product === 'cloth' ? 'rough' : 'validated';
  const message = !these.length
    ? 'Tap how full each pad was when you change it, and Sakhi adds up a blood-loss score for this period.'
    : heavy
      ? `Score ${score} this period: over ${PBAC_HEAVY} suggests heavy menstrual bleeding. Please mention it to a doctor and ask for an Hb (iron) test.`
      : score > 75
        ? `Score ${score} this period: close to the heavy line (${PBAC_HEAVY}). Keep logging.`
        : `Score ${score} this period: within the usual range so far.`;
  return { score, items: these.length, heavy, validFor, message };
}

export interface ProductGuide {
  label: string;
  /** change or empty at least this often, in hours */
  maxHours: number;
  /** usual range shown to her */
  window: string;
  disposable: boolean;
  care: string[];
  disposal: string;
}

export const PRODUCTS: Record<Product, ProductGuide> = {
  pad: {
    label: 'Sanitary pad',
    maxHours: 6,
    window: 'every 4 to 6 hours, sooner on heavy days',
    disposable: true,
    care: [
      'Wash your hands before and after changing.',
      'Wash the outer area with plain water from front to back. Soap inside is not needed.',
      'Change even if the pad does not look full: a damp pad can cause rashes and infection.',
    ],
    disposal: 'Wrap the used pad in its cover or old newspaper and put it in a closed dustbin. Never flush it or throw it in open drains or ponds.',
  },
  cloth: {
    label: 'Cloth pad',
    maxHours: 6,
    window: 'every 4 to 6 hours, sooner on heavy days',
    disposable: false,
    care: [
      'Use clean cotton cloth only. Avoid synthetic or old dirty cloth.',
      'Soak in cold water first, then wash with soap.',
      'Dry fully in direct sunlight, not hidden indoors: sunlight kills germs. Iron it if you can.',
      'Store dry cloths in a clean, closed bag. Replace cloth after a few months or if it becomes stiff or stained.',
    ],
    disposal: 'Reuse after washing and sun-drying. When it wears out, wrap it in paper and put it in a closed dustbin.',
  },
  cup: {
    label: 'Menstrual cup',
    maxHours: 12,
    window: 'empty every 8 to 12 hours, never longer than 12',
    disposable: false,
    care: [
      'Wash your hands before taking it out or putting it in.',
      'Empty into the toilet, rinse with clean water and put it back.',
      'Boil it in water for 5 to 10 minutes at the start and end of each period.',
      'Break the seal before pulling it out, to avoid pain.',
    ],
    disposal: 'Empty into the toilet. A well-kept cup lasts for years; replace it if it cracks, smells or changes colour.',
  },
  tampon: {
    label: 'Tampon',
    maxHours: 8,
    window: 'every 4 to 8 hours, never longer than 8',
    disposable: true,
    care: [
      'Use the lowest absorbency that works for your flow.',
      'Wash your hands before and after.',
      'Use a pad at night instead if you may sleep more than 8 hours.',
    ],
    disposal: 'Wrap in paper and put it in a closed dustbin. Never flush it.',
  },
  period_underwear: {
    label: 'Period underwear',
    maxHours: 12,
    window: 'change every 8 to 12 hours, sooner on heavy days',
    disposable: false,
    care: [
      'Rinse in cold water until it runs clear, then wash normally.',
      'Do not use fabric softener: it stops it absorbing.',
      'Dry fully before wearing again.',
    ],
    disposal: 'Reuse after washing. When worn out, put it in a closed dustbin.',
  },
};

export const PRODUCT_ORDER: Product[] = ['pad', 'cloth', 'cup', 'tampon', 'period_underwear'];

/** Hours since her last change, or null when there is none today. */
export function hoursSinceChange(changes: string[], now = new Date()): number | null {
  const last = [...(changes || [])].sort().pop();
  if (!last) return null;
  const t = new Date(last).getTime();
  if (!Number.isFinite(t)) return null;
  const h = (now.getTime() - t) / 3_600_000;
  // A change from more than a day ago belongs to an earlier period. A change a
  // few minutes "ahead" is just a clock that hasn't ticked yet: count it as now.
  if (h > 24 || h < -0.1) return null;
  return Math.max(0, h);
}

export type ChangeState = 'fresh' | 'soon' | 'due' | 'overdue' | 'unknown';

export function changeState(product: Product | null, hours: number | null): ChangeState {
  if (!product || hours === null) return 'unknown';
  const max = PRODUCTS[product].maxHours;
  if (hours >= max + 2) return 'overdue';
  if (hours >= max) return 'due';
  if (hours >= max - 1.5) return 'soon';
  return 'fresh';
}

/** Add a change now and keep only the last 24 hours. */
export function addChange(changes: string[], now = new Date()): string[] {
  const cutoff = now.getTime() - 24 * 3_600_000;
  return [...(changes || []).filter(c => new Date(c).getTime() >= cutoff), now.toISOString()];
}

/** Count of changes logged since local midnight. */
export function changesToday(changes: string[], now = new Date()): number {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  return (changes || []).filter(c => { const t = new Date(c).getTime(); return t >= start.getTime() && t <= now.getTime(); }).length;
}

/**
 * Disposable pads or tampons needed for one period: about 4 a day, 6 on heavy
 * days. Heavy days are the first two when her flow is usually heavy.
 */
export function suppliesNeeded(periodLength: number, heavyFlow: boolean): number {
  const days = Math.max(2, Math.min(10, Math.round(periodLength || 5)));
  const heavyDays = heavyFlow ? Math.min(2, days) : 0;
  return heavyDays * 6 + (days - heavyDays) * 4;
}

export type SupplyLevel = 'ok' | 'low' | 'out' | 'untracked' | 'reusable';

export interface SupplyCheck {
  level: SupplyLevel;
  need: number;
  message: string;
}

export function supplyCheck(doc: HygieneDoc, periodLength: number, heavyFlow: boolean, daysUntilPeriod: number, bleeding: boolean): SupplyCheck {
  const need = suppliesNeeded(periodLength, heavyFlow);
  if (doc.product && !PRODUCTS[doc.product].disposable) {
    return { level: 'reusable', need: 0, message: doc.product === 'cloth'
      ? 'Keep at least 4 to 6 clean, sun-dried cloths ready before your period.'
      : `Check your ${PRODUCTS[doc.product].label.toLowerCase()} is clean and ready before your period.` };
  }
  if (doc.stock === null || doc.stock === undefined) {
    return { level: 'untracked', need, message: `One period usually needs about ${need}. Tell Sakhi how many you have and she will remind you before you run out.` };
  }
  const soon = bleeding || daysUntilPeriod <= 5;
  if (doc.stock <= 0) return { level: 'out', need, message: soon ? 'You have none left and your period is close. Buy or collect some today.' : 'You have none left. Get some before your next period.' };
  if (doc.stock < need) {
    return { level: 'low', need, message: soon
      ? `You have ${doc.stock}, and this period may need about ${need}. Get ${need - doc.stock} more soon.`
      : `You have ${doc.stock}. Your next period may need about ${need}.` };
  }
  return { level: 'ok', need, message: `You have ${doc.stock}: enough for about one period (${need}).` };
}

/** Signs that need a doctor; the first two are urgent. */
export const WARNING_SIGNS: { text: string; urgent: boolean }[] = [
  { text: 'Sudden high fever, vomiting, a sunburn-like rash or fainting while using a tampon or cup: remove it and go to hospital now.', urgent: true },
  { text: 'Soaking a pad every hour for several hours, or feeling dizzy and faint.', urgent: true },
  { text: 'Itching, burning or a bad smell that does not go away after a few days.', urgent: false },
  { text: 'Unusual discharge (green, grey or thick white), or pain while passing urine.', urgent: false },
  { text: 'Rash or sores where the pad touches, that do not heal.', urgent: false },
];

export interface LowCostOption { title: string; detail: string; mapsQuery?: string; phone?: string }

/**
 * Ways to get period products cheaply in India. Prices and free schemes vary by
 * state and change over time, so each is worded as something to confirm.
 */
export const LOW_COST: LowCostOption[] = [
  { title: 'Jan Aushadhi Suvidha pads', detail: 'Low-cost sanitary pads (about ₹1 a pad) sold at Pradhan Mantri Bhartiya Janaushadhi Kendras. Check the current price at your nearest kendra.', mapsQuery: 'Jan Aushadhi Kendra near me' },
  { title: 'ASHA worker or health centre', detail: 'Many states give free or cheap pads to girls and women through ASHA workers, PHCs and schools. Ask your ASHA worker what your state offers.', mapsQuery: 'Primary Health Centre near me' },
  // Partner listing: facts only, no health claims; free and ₹1 options stay first
  { title: 'Aram Cotton Napkins (Sakhi partner)', detail: 'Cotton pads with no plastic or gel, made by a women-led business in Pallipalayam, Erode. Packs of 16 to 24 pads for about ₹75 (L, XL and XXL sizes). Order by phone or WhatsApp.', mapsQuery: 'Aram Cotton Napkins Pallipalayam', phone: '919498354964' },
  { title: 'Reusable options save money', detail: 'A clean cotton cloth pad or a menstrual cup costs more once but can be reused for months or years.' },
];

/** Short myth-busting cards, rotated by day. */
export const MYTHS: { myth: string; fact: string }[] = [
  { myth: 'You should not bathe during your period.', fact: 'A daily bath is safe and helps you stay clean and feel better.' },
  { myth: 'Period blood is impure or dirty.', fact: 'It is normal blood and tissue from the womb. It is not impure.' },
  { myth: 'Touching pickles or cooking spoils food.', fact: 'Periods cannot spoil food. There is no science behind this.' },
  { myth: 'You should not exercise or play during your period.', fact: 'Gentle movement often eases cramps. Do what feels comfortable.' },
  { myth: 'Using a cup or tampon affects virginity.', fact: 'Virginity is not a medical state. Cups and tampons are safe for unmarried girls too.' },
  { myth: 'Talking about periods is shameful.', fact: 'Periods are a normal part of health. Talking helps girls get the care they need.' },
  { myth: 'Sour or cold food makes the flow heavier.', fact: 'Food does not change how much you bleed. Eat a normal, iron-rich diet.' },
];

export const mythForDay = (dayNumber: number) => MYTHS[((dayNumber % MYTHS.length) + MYTHS.length) % MYTHS.length];

export interface PeriodPbac { start: string; score: number; items: number }

/**
 * Blood-loss score for each recent period, grouping logged pads into periods
 * (a gap of more than 10 days starts a new one). Newest last.
 */
export function pbacByPeriod(pads: PadEntry[] | undefined): PeriodPbac[] {
  const sorted = [...(pads || [])].filter(p => Number.isFinite(new Date(p.at).getTime())).sort((a, b) => a.at.localeCompare(b.at));
  const out: PeriodPbac[] = [];
  let last = -Infinity;
  for (const p of sorted) {
    const t = new Date(p.at).getTime();
    if (t - last > 10 * 86_400_000) out.push({ start: p.at.slice(0, 10), score: 0, items: 0 });
    const cur = out[out.length - 1];
    cur.score += (PBAC_POINTS[p.soak] || 0) + (p.clots ? 5 : 0);
    cur.items += 1;
    last = t;
  }
  return out;
}
