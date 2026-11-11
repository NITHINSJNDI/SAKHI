/**
 * Period pain relief toolkit. There is no instant cure, but several simple
 * steps have evidence for easing cramps (heat, movement, NSAIDs taken early,
 * ginger, TENS). Tips rotate so she does not see the same three every time,
 * and the ones she marks as helpful are offered first next time.
 */

export type ReliefGroup = 'heat' | 'position' | 'breath' | 'touch' | 'sip' | 'calm' | 'info';

export interface ReliefTip {
  id: string;
  group: ReliefGroup;
  title: string;
  steps: string[];
  /** optional guided timer, in seconds */
  seconds?: number;
  why?: string;
}

export const RELIEF_TIPS: ReliefTip[] = [
  { id: 'heat-pad', group: 'heat', title: 'Heat on your lower belly', seconds: 15 * 60,
    steps: ['Fill a hot water bottle (warm, not boiling) or use a heat patch.', 'Wrap it in a thin towel and rest it on your lower belly or lower back.', 'Keep it there for 15–20 minutes.'],
    why: 'In studies, steady heat eased period pain about as well as common pain relievers.' },
  { id: 'warm-shower', group: 'heat', title: 'Warm shower or bath',
    steps: ['Take a warm shower and let the water run over your lower back and belly.', 'Stay for 5–10 minutes and breathe slowly.'],
    why: 'Warmth relaxes the uterine muscle that is cramping.' },
  { id: 'knees-chest', group: 'position', title: 'Knees to chest', seconds: 90,
    steps: ['Lie on your back.', 'Hug both knees gently to your chest.', 'Rock slowly side to side for 60–90 seconds.'] },
  { id: 'childs-pose', group: 'position', title: "Child's pose", seconds: 120,
    steps: ['Kneel and sit back on your heels.', 'Fold forward, arms long or by your sides, forehead down.', 'Breathe into your lower back for 1–2 minutes.'] },
  { id: 'cat-cow', group: 'position', title: 'Slow cat-cow', seconds: 90,
    steps: ['On hands and knees, breathe in and let your belly drop.', 'Breathe out and round your back.', 'Repeat 10 slow rounds.'] },
  { id: 'side-curl', group: 'position', title: 'Curl up on your side',
    steps: ['Lie on your side in a gentle curl.', 'Put a pillow between your knees.', 'This takes pressure off the abdominal muscles.'] },
  { id: 'easy-walk', group: 'position', title: '10-minute easy walk', seconds: 10 * 60,
    steps: ['If you can stand comfortably, walk slowly for 10 minutes.', 'Movement increases blood flow and releases endorphins.'] },
  { id: 'breath-478', group: 'breath', title: '4-7-8 breathing', seconds: 76,
    steps: ['Breathe in through your nose for 4 counts.', 'Hold for 7.', 'Breathe out slowly through your mouth for 8.', 'Repeat 4 rounds.'],
    why: 'Slow breathing calms the stress response that makes pain feel worse.' },
  { id: 'box-breath', group: 'breath', title: 'Box breathing', seconds: 64,
    steps: ['In for 4, hold for 4, out for 4, hold for 4.', 'Repeat 4 times with your hand on your belly.'] },
  { id: 'belly-massage', group: 'touch', title: 'Gentle belly massage', seconds: 5 * 60,
    steps: ['Warm a little coconut or sesame oil in your hands.', 'Massage your lower belly in slow clockwise circles for 5 minutes.'],
    why: 'Small studies found abdominal massage reduced cramp pain.' },
  { id: 'back-press', group: 'touch', title: 'Lower-back pressure',
    steps: ['Lie on your back with a rolled towel or tennis ball under your lower back.', 'Or press your fists into the muscles either side of your spine.', 'Hold for 1–2 minutes.'] },
  { id: 'sp6', group: 'touch', title: 'Ankle acupressure point', seconds: 120,
    steps: ['Find the point four finger-widths above your inner ankle bone, just behind the shin.', 'Press firmly for 1 minute on each leg.'],
    why: 'Some small trials suggest this point (SP6) can ease period pain.' },
  { id: 'ginger', group: 'sip', title: 'Fresh ginger tea',
    steps: ['Steep a few slices of fresh ginger in hot water for 5 minutes.', 'Add honey or lemon if you like and sip slowly.'],
    why: 'Ginger eased period pain in several clinical studies.' },
  { id: 'warm-water', group: 'sip', title: 'Warm water, skip the fizz',
    steps: ['Sip a glass of warm water.', 'Skip cold fizzy drinks and extra coffee today; they can worsen bloating.'] },
  { id: 'distract', group: 'calm', title: '15 minutes of distraction',
    steps: ['Put on a favourite show, playlist or call a friend.', 'Focused distraction measurably lowers how strong pain feels.'] },
  { id: 'tens', group: 'calm', title: 'TENS device, if you have one',
    steps: ['Place the pads on your lower belly or lower back.', 'Start low and increase until it tingles but is comfortable.'],
    why: 'TENS has good evidence for period pain.' },
  { id: 'otc-info', group: 'info', title: 'If you use pain relief',
    steps: ['If an over-the-counter pain reliever such as ibuprofen is safe for you, it works best taken at the first sign of pain, with food.', 'Follow the pack or your pharmacist. Ask a doctor first if you have asthma, stomach ulcers, kidney problems or could be pregnant.'] },
];

export const RED_FLAGS = [
  'Pain so severe you cannot stand, you faint, or you keep vomiting',
  'Fever, chills or unusual discharge along with the pain',
  'Soaking through a pad or tampon every hour for two hours or more',
  'Sudden, sharp pain that feels different from your usual periods, especially if your period is late',
];

export const SEE_DOCTOR_SOON = 'Book a doctor visit if pain regularly stops you from school, work or daily life, or if these steps rarely help. Severe period pain is common, but it is not something you just have to live with.';

export interface ReliefFeedback {
  stats: Record<string, { tried: number; helped: number }>;
  recent: string[];
}

export const emptyFeedback = (): ReliefFeedback => ({ stats: {}, recent: [] });

/**
 * Pick a varied set: favourites first, recently shown tips pushed back, at most
 * one tip per group. `rand` is injectable for tests.
 */
export function pickRelief(
  feedback: ReliefFeedback | null | undefined,
  count = 3,
  severity = 5,
  rand: () => number = Math.random,
): ReliefTip[] {
  const fb = feedback || emptyFeedback();
  const recent = new Set(fb.recent.slice(-count * 2));
  const scored = RELIEF_TIPS.map(tip => {
    const s = fb.stats[tip.id];
    let score = rand();
    if (s) score += (s.helped / Math.max(1, s.tried)) * 2.5 + Math.min(s.helped, 3) * 0.3 - (s.tried - s.helped) * 0.4;
    if (recent.has(tip.id)) score -= 3;
    if (tip.group === 'heat') score += 0.6; // strongest evidence
    if (severity >= 7 && (tip.id === 'easy-walk' || tip.id === 'cat-cow')) score -= 1; // hard to do in bad pain
    if (tip.group === 'info') score += severity >= 6 ? 0.4 : -0.5;
    return { tip, score };
  }).sort((a, b) => b.score - a.score);

  const picked: ReliefTip[] = [];
  const groups = new Set<ReliefGroup>();
  for (const { tip } of scored) {
    if (picked.length >= count) break;
    if (groups.has(tip.group)) continue;
    picked.push(tip);
    groups.add(tip.group);
  }
  return picked;
}

export function recordShown(fb: ReliefFeedback | null | undefined, ids: string[]): ReliefFeedback {
  const next = fb ? { stats: { ...fb.stats }, recent: [...fb.recent] } : emptyFeedback();
  next.recent = [...next.recent, ...ids].slice(-12);
  return next;
}

export function recordFeedback(fb: ReliefFeedback | null | undefined, id: string, helped: boolean): ReliefFeedback {
  const next = fb ? { stats: { ...fb.stats }, recent: [...fb.recent] } : emptyFeedback();
  const s = next.stats[id] || { tried: 0, helped: 0 };
  next.stats[id] = { tried: s.tried + 1, helped: s.helped + (helped ? 1 : 0) };
  return next;
}

export function favourites(fb: ReliefFeedback | null | undefined, limit = 3): ReliefTip[] {
  if (!fb) return [];
  return Object.entries(fb.stats)
    .filter(([, s]) => s.helped > 0)
    .sort((a, b) => b[1].helped - a[1].helped)
    .slice(0, limit)
    .map(([id]) => RELIEF_TIPS.find(t => t.id === id))
    .filter(Boolean) as ReliefTip[];
}

/** Short text version for chat replies. */
export function reliefText(tips: ReliefTip[]): string {
  return tips.map(t => `• ${t.title}: ${t.steps[0]}`).join('\n');
}
