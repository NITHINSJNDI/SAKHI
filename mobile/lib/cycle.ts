/**
 * Cycle phase calculations and tips for Her Mode & Dashboard.
 * Ported from frontend/lib/cyclePhase.ts and frontend/lib/phaseTips.ts.
 */

export type Phase = "menstrual" | "follicular" | "ovulatory" | "luteal";

export const PHASE_META: Record<
  Phase,
  { label: string; short: string; color: string; bg: string; border: string }
> = {
  menstrual: {
    label: "Menstrual phase",
    short: "Menstrual",
    color: "#E11D48",
    bg: "#FFF1F2",
    border: "#FECDD3",
  },
  follicular: {
    label: "Follicular phase",
    short: "Follicular",
    color: "#059669",
    bg: "#ECFDF5",
    border: "#A7F3D0",
  },
  ovulatory: {
    label: "Ovulatory phase",
    short: "Ovulatory",
    color: "#D97706",
    bg: "#FFFBEB",
    border: "#FDE68A",
  },
  luteal: {
    label: "Luteal phase",
    short: "Luteal",
    color: "#7C3AED",
    bg: "#F5F3FF",
    border: "#DDD6FE",
  },
};

const DAY = 86_400_000;

export function dayNum(value: string | Date): number {
  if (value instanceof Date) {
    return Math.floor(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / DAY);
  }
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return NaN;
  return Math.floor(Date.UTC(y, m - 1, d) / DAY);
}

export const todayNum = () => dayNum(new Date());

export interface PhaseInfo {
  phase: Phase;
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
  daysUntilPeriod: number;
  ovulationDay: number;
  isLate: boolean;
  daysLate: number;
  nextPeriodDate: string;
}

export function computePhaseInfo(
  lastPeriodStart?: string | null,
  cycleLengthAvg = 28,
  periodDuration = 5,
): PhaseInfo {
  const len = Math.max(18, Math.min(60, Math.round(cycleLengthAvg) || 28));
  const per = Math.max(2, Math.min(10, Math.round(periodDuration) || 5));
  const today = todayNum();
  const startDay = lastPeriodStart ? dayNum(lastPeriodStart) : today - 13;
  const cycleDay = Math.max(1, today - startDay + 1);

  const ovulationDay = Math.max(per + 2, len - 14);
  const ovStart = Math.max(per + 1, ovulationDay - 1);
  const ovEnd = Math.min(len, ovulationDay + 1);

  let phase: Phase;
  const isLate = cycleDay > len + 1;
  const daysLate = isLate ? cycleDay - (len + 1) : 0;

  if (isLate) {
    phase = "luteal";
  } else if (cycleDay <= per) {
    phase = "menstrual";
  } else if (cycleDay < ovStart) {
    phase = "follicular";
  } else if (cycleDay <= ovEnd) {
    phase = "ovulatory";
  } else {
    phase = "luteal";
  }

  const daysUntilPeriod = isLate ? 0 : Math.max(0, len - cycleDay + 1);
  const nextDateMs = (startDay + len) * DAY;
  const nextPeriodDate = new Date(nextDateMs).toISOString().split("T")[0];

  return {
    phase,
    cycleDay,
    cycleLength: len,
    periodLength: per,
    daysUntilPeriod,
    ovulationDay,
    isLate,
    daysLate,
    nextPeriodDate,
  };
}

export interface DailyTip {
  category: "Move" | "Nourish" | "Mind";
  title: string;
  detail: string;
}

export const PHASE_TIPS: Record<Phase, DailyTip[]> = {
  menstrual: [
    {
      category: "Move",
      title: "Gentle Restorative Yoga",
      detail: "Child's pose, cat-cow, and legs-up-the-wall ease pelvic congestion and cramps.",
    },
    {
      category: "Nourish",
      title: "Iron & Warm Fluids",
      detail: "Lentils, spinach, dates, and warm ginger tea help replenish iron and soothe pain.",
    },
    {
      category: "Mind",
      title: "Lighter Schedule",
      detail: "Progesterone and estrogen are low. Honour your need for extra sleep and quiet.",
    },
  ],
  follicular: [
    {
      category: "Move",
      title: "Higher Energy Workouts",
      detail: "Rising estrogen boosts stamina. Try cardio, strength training, or a brisk run.",
    },
    {
      category: "Nourish",
      title: "Fresh & Fermented Foods",
      detail: "Sprouts, curd, citrus fruits, and lean protein support egg follicle maturation.",
    },
    {
      category: "Mind",
      title: "Creative Focus",
      detail: "Motivation and cognitive clarity peak. Great time to kick off new projects.",
    },
  ],
  ovulatory: [
    {
      category: "Move",
      title: "Peak Performance",
      detail: "High stamina and coordination. Ideal time for interval training or personal bests.",
    },
    {
      category: "Nourish",
      title: "Fibre & Hydration",
      detail: "Leafy greens, berries, pumpkin seeds, and extra water support hormonal balance.",
    },
    {
      category: "Mind",
      title: "Social & Connected",
      detail: "High confidence and communication skills. Great for meaningful conversations.",
    },
  ],
  luteal: [
    {
      category: "Move",
      title: "Steady, Moderate Pace",
      detail: "Pilates, swimming, or an evening walk prevent cortisol spikes and ease bloating.",
    },
    {
      category: "Nourish",
      title: "Magnesium & Complex Carbs",
      detail: "Dark chocolate, almonds, and sweet potatoes help steady mood and curb cravings.",
    },
    {
      category: "Mind",
      title: "Wind Down Early",
      detail: "Slower evenings, 4-7-8 breathing, and reduced caffeine improve sleep quality.",
    },
  ],
};
