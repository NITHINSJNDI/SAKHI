// GENERATED from frontend/lib/wellness.ts by scripts/sync-shared.mjs. Do not edit here.
export interface WellnessSymptomInput {
  cyclePhase?: string;  // "menstrual" | "follicular" | "ovulation" | "luteal" | "unknown"
  crampSeverity: number;
  headacheSeverity: number;
  bloatingSeverity: number;
  nausea?: boolean;
  fatigueSeverity: number;
  anxietyOrStress?: boolean;
  moodSwings?: boolean;
  cycleDelayed?: boolean;
  flowIntensity?: string;
}

export interface AdviceItem {
  category: 'Nutrition' | 'Pain Relief' | 'Mental Health' | 'Movement' | 'Insight';
  tip: string;
  explanation: string;
}

export function generateWellnessAdvice(s: WellnessSymptomInput): AdviceItem[] {
  const adviceList: AdviceItem[] = [];
  const phase = s.cyclePhase || 'unknown';

  // =========================================================================
  // 1. CYCLE PHASE INSIGHTS & BASELINE ADVICE
  // =========================================================================
  if (phase === 'menstrual') {
    adviceList.push({
      category: 'Insight',
      tip: "Your hormones are at their lowest point right now.",
      explanation: "It's completely normal to feel tired and introspective. Your body is working hard to shed the uterine lining."
    });
    adviceList.push({
      category: 'Nutrition',
      tip: "Boost your iron and Vitamin C.",
      explanation: "Eating iron-rich foods like spinach, lentils, or dark chocolate, paired with Vitamin C (like citrus), helps replenish what you lose during your period."
    });
  } else if (phase === 'follicular') {
    adviceList.push({
      category: 'Insight',
      tip: "Estrogen is rising, bringing a natural energy boost.",
      explanation: "This is a great time to start new projects, learn something new, or socialize."
    });
    adviceList.push({
      category: 'Movement',
      tip: "Take advantage of the energy spike.",
      explanation: "Light to moderate cardio, running, or dancing are great ways to utilize the rising estrogen levels."
    });
  } else if (phase === 'ovulation') {
    adviceList.push({
      category: 'Insight',
      tip: "Estrogen and testosterone are peaking.",
      explanation: "You might feel your most confident and social right now. It's also when you are most fertile."
    });
    adviceList.push({
      category: 'Nutrition',
      tip: "Focus on anti-inflammatory foods.",
      explanation: "High estrogen can sometimes slow digestion. Fiber-rich foods like berries, nuts, and leafy greens keep things moving smoothly."
    });
  } else if (phase === 'luteal') {
    adviceList.push({
      category: 'Insight',
      tip: "Progesterone is taking over.",
      explanation: "Progesterone has a natural calming effect, but as it drops right before your period, it can trigger PMS symptoms. This is your body, not just your mind."
    });
    adviceList.push({
      category: 'Mental Health',
      tip: "Prioritize boundaries and self-care.",
      explanation: "It's normal to feel more sensitive or easily overwhelmed. Give yourself permission to rest and say no to extra commitments."
    });
  }

  // =========================================================================
  // 2. SYMPTOM-SPECIFIC ADVICE
  // =========================================================================

  // Pain Relief (Cramps & Headaches)
  if (s.crampSeverity >= 4) {
    adviceList.push({
      category: 'Pain Relief',
      tip: "Apply a heat patch to your lower abdomen or lower back.",
      explanation: "Heat helps relax the contracting uterine muscles that cause cramps. Sip on warm chamomile or ginger tea for extra comfort."
    });
  }

  if (s.headacheSeverity >= 4) {
    adviceList.push({
      category: 'Pain Relief',
      tip: "Hydrate and rest in a dark, quiet room.",
      explanation: "Hormonal headaches are often triggered by estrogen drops. Staying hydrated and applying a cold compress to your forehead can help soothe the pain."
    });
  }

  // Bloating & Nausea
  if (s.bloatingSeverity >= 4) {
    adviceList.push({
      category: 'Nutrition',
      tip: "Reduce sodium intake and sip peppermint tea.",
      explanation: "Progesterone slows down your digestive tract. Peppermint tea helps relax your gut, and avoiding salty or heavily processed foods will reduce water retention."
    });
  }

  if (s.nausea) {
    adviceList.push({
      category: 'Nutrition',
      tip: "Try ginger and small, frequent meals.",
      explanation: "Ginger root is a natural anti-nausea remedy. Eat small, bland meals like toast or crackers instead of large, heavy portions."
    });
  }

  // Energy & Mood
  if (s.fatigueSeverity >= 5) {
    adviceList.push({
      category: 'Movement',
      tip: "Swap intense workouts for gentle restorative yoga.",
      explanation: "Pushing through severe fatigue raises cortisol (stress). A 15-minute gentle stretch or a short walk is much better for your body today."
    });
  }

  if (s.anxietyOrStress || s.moodSwings) {
    adviceList.push({
      category: 'Mental Health',
      tip: "Try a 5-minute breathing exercise or meditation.",
      explanation: "Hormonal shifts directly impact neurotransmitters like serotonin. A quick breathing exercise can help reset your nervous system."
    });
    if (phase === 'luteal') {
      adviceList.push({
        category: 'Nutrition',
        tip: "Consider a magnesium-rich snack.",
        explanation: "Magnesium helps regulate cortisol and relax the nervous system. Try a handful of pumpkin seeds, almonds, or a banana."
      });
    }
  }

  // Irregularity & Delays
  if (s.cycleDelayed) {
    adviceList.push({
      category: 'Insight',
      tip: "Don't panic if your cycle is a few days late.",
      explanation: "Stress, travel, illness, and dietary changes can all delay ovulation, which in turn delays your period. Focus on stress-reduction. (Note: If you are sexually active and significantly delayed, consider a pregnancy test)."
    });
  }

  return adviceList;
}
