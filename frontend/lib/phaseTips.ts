/**
 * Daily, phase-aware micro-recommendations. General wellness suggestions, not
 * prescriptions: research on cycle syncing is still growing, so tips adapt to
 * how she actually logged feeling today (low energy, poor sleep, pain).
 */
import type { Phase } from './cyclePhase';

export type TipKind = 'move' | 'nourish' | 'mind';
export interface Tip { id: string; kind: TipKind; title: string; text: string }

export const PHASE_GUIDE: Record<Phase, { hormones: string; feel: string; energy: 'low' | 'rising' | 'peak' | 'winding down' }> = {
  menstrual: {
    hormones: 'Estrogen and progesterone are at their lowest.',
    feel: 'Energy is often lower, especially on the first two days. Rest counts as progress.',
    energy: 'low',
  },
  follicular: {
    hormones: 'Estrogen is rising as a new egg matures.',
    feel: 'Many women feel more energetic, social and motivated now.',
    energy: 'rising',
  },
  ovulatory: {
    hormones: 'Estrogen peaks and LH surges to release an egg.',
    feel: 'Energy and confidence often peak. This is also the most fertile time of the cycle.',
    energy: 'peak',
  },
  luteal: {
    hormones: 'Progesterone rises, then both hormones fall before your period.',
    feel: 'Bloating, cravings or mood dips can show up, mostly in the last week. Be gentle with yourself.',
    energy: 'winding down',
  },
};

const T = (id: string, kind: TipKind, title: string, text: string): Tip => ({ id, kind, title, text });

const POOLS: Record<Phase, Record<TipKind, Tip[]>> = {
  menstrual: {
    move: [
      T('m-walk', 'move', '20-minute easy walk', 'Gentle movement boosts blood flow and can take the edge off cramps.'),
      T('m-yoga', 'move', 'Restorative yoga', "Try child's pose, a supine twist and legs-up-the-wall for 10 minutes."),
      T('m-stretch', 'move', 'Hip and lower-back stretch', 'Slow cat-cow and a seated forward fold release lower-back tension.'),
      T('m-rest', 'move', 'Rest day is a good day', 'Skipping a workout today is fine. Light stretching before bed is plenty.'),
    ],
    nourish: [
      T('m-iron', 'nourish', 'Iron + vitamin C', 'Pair spinach, lentils, rajma or dates with lemon or amla to replace iron lost in bleeding.'),
      T('m-ginger', 'nourish', 'Warm ginger tea', 'Ginger has been shown in studies to ease period pain for some women.'),
      T('m-soup', 'nourish', 'Warm, simple meals', 'Soups, khichdi and dal are easy on a sensitive stomach.'),
      T('m-omega', 'nourish', 'Omega-3 boost', 'A handful of walnuts or a spoon of flax seeds may help with cramp-related inflammation.'),
      T('m-water', 'nourish', 'Hydrate', 'Aim for 8 glasses of water; warm water can feel soothing.'),
    ],
    mind: [
      T('m-light', 'mind', 'Plan a lighter day', 'Move one non-urgent task to next week if you can.'),
      T('m-heat', 'mind', 'Heat and cosy time', 'A hot water bottle and a favourite show is real self-care.'),
      T('m-sleep', 'mind', 'Earlier bedtime', 'Your body is working hard. Aim for 8 hours tonight.'),
      T('m-journal', 'mind', 'Two-line journal', 'Note how you feel today. It helps Sakhi spot your patterns.'),
    ],
  },
  follicular: {
    move: [
      T('f-hiit', 'move', '20-minute HIIT', 'Rising estrogen often makes high-intensity work feel easier. Try intervals today.'),
      T('f-strength', 'move', 'Strength session', 'Squats, lunges and push-ups: a good week to build up weights.'),
      T('f-new', 'move', 'Try something new', 'A dance class, a new route or a sport you have been curious about.'),
      T('f-run', 'move', 'Brisk jog or cycle', '30 minutes of cardio at a pace where talking is a little hard.'),
    ],
    nourish: [
      T('f-carbs', 'nourish', 'Complex carbs for fuel', 'Oats, millets, brown rice or whole-wheat roti keep energy steady for workouts.'),
      T('f-protein', 'nourish', 'Protein at every meal', 'Eggs, paneer, curd, tofu, chicken or sprouts help muscles recover.'),
      T('f-ferment', 'nourish', 'Fermented foods', 'Curd, idli or buttermilk support gut health.'),
      T('f-colour', 'nourish', 'Eat the rainbow', 'Add two colours of vegetables to lunch today.'),
    ],
    mind: [
      T('f-start', 'mind', 'Start something', 'Motivation is often higher now. Begin the project you have been postponing.'),
      T('f-social', 'mind', 'Make plans', 'A good time to schedule meet-ups and conversations.'),
      T('f-learn', 'mind', 'Learn one new thing', '15 minutes on a skill you want to build.'),
    ],
  },
  ovulatory: {
    move: [
      T('o-peak', 'move', 'Go for a personal best', 'Energy often peaks. Warm up well and try your strongest session of the month.'),
      T('o-sprint', 'move', 'Interval sprints', '6 rounds of 30 seconds fast, 90 seconds easy.'),
      T('o-group', 'move', 'Group workout or sport', 'Team games or a group class match the social energy of this phase.'),
      T('o-warmup', 'move', 'Extra warm-up', 'Spend 10 minutes warming up; joints can feel looser around ovulation.'),
    ],
    nourish: [
      T('o-fibre', 'nourish', 'Fibre-rich vegetables', 'Broccoli, cabbage and leafy greens support how your body processes estrogen.'),
      T('o-water', 'nourish', 'Extra water', 'If you are training harder, add 2 glasses of water.'),
      T('o-anti', 'nourish', 'Antioxidant fruit', 'Berries, pomegranate or guava for a fresh snack.'),
      T('o-zinc', 'nourish', 'Zinc snack', 'Pumpkin or sunflower seeds are an easy zinc source.'),
    ],
    mind: [
      T('o-talk', 'mind', 'Have the big conversation', 'Many women feel most articulate now: a good day for presentations or tough talks.'),
      T('o-connect', 'mind', 'Connect', 'Call a friend you have not spoken to in a while.'),
      T('o-fertile', 'mind', 'Fertile window', 'If you are trying to conceive, or avoiding pregnancy, this is the most fertile time.'),
    ],
  },
  luteal: {
    move: [
      T('l-pilates', 'move', 'Pilates or yoga', 'Lower-intensity sessions can keep cortisol down as progesterone rises.'),
      T('l-swim', 'move', 'Swim or easy cycle', 'Steady, moderate cardio for 30 minutes.'),
      T('l-strength', 'move', 'Moderate strength', 'Keep lifting, but at a weight that feels comfortable, not maximal.'),
      T('l-walk', 'move', 'Evening walk', 'A 20-minute walk after dinner can ease bloating and help sleep.'),
    ],
    nourish: [
      T('l-mag', 'nourish', 'Magnesium-rich foods', 'Pumpkin seeds, almonds, spinach, bananas or a square of 70% dark chocolate. Magnesium may ease PMS.'),
      T('l-calcium', 'nourish', 'Calcium for PMS', 'Curd, ragi or milk: calcium has some of the best evidence for easing PMS symptoms.'),
      T('l-cravings', 'nourish', 'Steady the cravings', 'Sweet potato, oats or chana keep blood sugar steady when cravings hit.'),
      T('l-salt', 'nourish', 'Ease up on salt', 'Less salty snacks can reduce bloating this week.'),
      T('l-caffeine', 'nourish', 'Lighter on caffeine', 'Swap the afternoon coffee for herbal tea if you feel anxious or sleep poorly.'),
    ],
    mind: [
      T('l-wind', 'mind', 'Wind-down routine', 'Screens off 30 minutes before bed; progesterone can make you sleepier, so lean into it.'),
      T('l-no', 'mind', 'Protect your energy', 'It is okay to say no to extra plans this week.'),
      T('l-breathe', 'mind', '4-7-8 breathing', 'Breathe in for 4, hold for 7, out for 8. Four rounds calm the nervous system.'),
      T('l-kit', 'mind', 'Pack your period kit', 'Pads, a pain reliever if you use one and a heat patch, ready for the days ahead.'),
    ],
  },
};

const GENTLE_MOVE: Tip[] = [
  T('g-walk', 'move', 'Just a short walk', 'You logged low energy or poor sleep, so swap today\'s workout for 15 easy minutes outside.'),
  T('g-stretch', 'move', 'Gentle stretch instead', 'Low energy today: 10 minutes of slow stretching beats pushing through a hard session.'),
];

export interface TodayContext {
  lowEnergy?: boolean;
  poorSleep?: boolean;
  pain?: number;
}

export function contextFromLog(log: any | undefined): TodayContext {
  if (!log) return {};
  const mood = String(log.mood || '').toLowerCase();
  const symptoms: string[] = (log.symptoms || []).map((s: string) => String(s).toLowerCase());
  return {
    lowEnergy: ['tired', 'fatigued', 'exhausted'].includes(mood) || symptoms.includes('fatigue'),
    poorSleep: typeof log.sleep_hours === 'number' && log.sleep_hours > 0 && log.sleep_hours < 6,
    pain: Number(log.cramps_severity) || 0,
  };
}

/** One tip per kind, rotating daily. `seed` is a day number so it changes each day. */
export function tipsForToday(phase: Phase, seed: number, ctx: TodayContext = {}): Tip[] {
  const pools = POOLS[phase];
  const pick = (arr: Tip[], salt: number) => arr[Math.abs(seed * 7 + salt) % arr.length];
  const tired = ctx.lowEnergy || ctx.poorSleep || (ctx.pain ?? 0) >= 5;
  const move = tired && phase !== 'menstrual' ? pick(GENTLE_MOVE, 1) : pick(pools.move, 1);
  return [move, pick(pools.nourish, 3), pick(pools.mind, 5)];
}

export const PHASE_TIP_NOTE = 'General wellness ideas. Research on cycle syncing is still growing, so always go by how you feel.';
