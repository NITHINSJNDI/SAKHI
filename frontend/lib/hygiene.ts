/**
 * Menstrual hygiene for Her Mode: what she uses, when to change it, whether she
 * has enough for her next period, safe disposal, low-cost access in India and
 * infection warning signs. Pure functions, so the card and the tests share them.
 * General guidance only; it never diagnoses.
 */

export type Product = 'pad' | 'cloth' | 'cup' | 'tampon' | 'period_underwear';

export interface HygieneDoc {
  product: Product | null;
  /** ISO timestamps of changes in the current period (kept short) */
  changes: string[];
  /** disposable pads or tampons she has at home; null = not tracked */
  stock: number | null;
}

export const EMPTY_HYGIENE: HygieneDoc = { product: null, changes: [], stock: null };

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

export interface LowCostOption { title: string; detail: string; mapsQuery?: string }

/**
 * Ways to get period products cheaply in India. Prices and free schemes vary by
 * state and change over time, so each is worded as something to confirm.
 */
export const LOW_COST: LowCostOption[] = [
  { title: 'Jan Aushadhi Suvidha pads', detail: 'Low-cost sanitary pads (about ₹1 a pad) sold at Pradhan Mantri Bhartiya Janaushadhi Kendras. Check the current price at your nearest kendra.', mapsQuery: 'Jan Aushadhi Kendra near me' },
  { title: 'ASHA worker or health centre', detail: 'Many states give free or cheap pads to girls and women through ASHA workers, PHCs and schools. Ask your ASHA worker what your state offers.', mapsQuery: 'Primary Health Centre near me' },
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
