/**
 * Pregnancy weeks, milestones, and baby size data for Mom Mode & Dashboard.
 * Ported from frontend/lib/pregnancyWeeks.ts and frontend/lib/chat/offline/knowledge.ts.
 */

export interface BabySize {
  week: number;
  size: string;
  fruit: string;
  approxWeight: string;
  approxLength: string;
  milestone: string;
}

export const BABY_SIZES: BabySize[] = [
  {
    week: 4,
    size: "Poppy Seed",
    fruit: "🌱 Poppy seed",
    approxWeight: "< 1 g",
    approxLength: "1 mm",
    milestone: "Blastocyst implants into uterine lining; placenta starts forming.",
  },
  {
    week: 6,
    size: "Lentil",
    fruit: "🫘 Lentil",
    approxWeight: "< 1 g",
    approxLength: "4 mm",
    milestone: "Heart begins to beat; neural tube closes.",
  },
  {
    week: 8,
    size: "Rajma Bean",
    fruit: "🫘 Rajma bean",
    approxWeight: "1 g",
    approxLength: "1.6 cm",
    milestone: "Tiny arms and legs are forming with webbed fingers.",
  },
  {
    week: 10,
    size: "Strawberry",
    fruit: "🍓 Strawberry",
    approxWeight: "4 g",
    approxLength: "3.1 cm",
    milestone: "Vital organs like kidneys and intestines begin functioning.",
  },
  {
    week: 12,
    size: "Lime",
    fruit: "🍋 Lime",
    approxWeight: "14 g",
    approxLength: "5.4 cm",
    milestone: "Fingernails develop; baby's reflexes are emerging.",
  },
  {
    week: 14,
    size: "Lemon",
    fruit: "🍋 Lemon",
    approxWeight: "43 g",
    approxLength: "8.7 cm",
    milestone: "Second trimester begins! Baby can squint, frown, and swallow.",
  },
  {
    week: 16,
    size: "Avocado",
    fruit: "🥑 Avocado",
    approxWeight: "100 g",
    approxLength: "11.6 cm",
    milestone: "Baby can hold their head erect; fine hair (lanugo) covers the body.",
  },
  {
    week: 18,
    size: "Sweet Potato",
    fruit: "🍠 Sweet potato",
    approxWeight: "190 g",
    approxLength: "14.2 cm",
    milestone: "You might begin feeling gentle flutters (quickening) soon.",
  },
  {
    week: 20,
    size: "Banana",
    fruit: "🍌 Banana",
    approxWeight: "300 g",
    approxLength: "16.4 cm",
    milestone: "Halfway point! Routine anatomy scan typically takes place.",
  },
  {
    week: 22,
    size: "Papaya",
    fruit: "🍈 Papaya",
    approxWeight: "430 g",
    approxLength: "27.8 cm",
    milestone: "Senses of sight and hearing are becoming more receptive.",
  },
  {
    week: 24,
    size: "Corn Cob",
    fruit: "🌽 Corn cob",
    approxWeight: "600 g",
    approxLength: "30.0 cm",
    milestone: "Viability milestone reached; baby responds to sounds from outside.",
  },
  {
    week: 26,
    size: "Lettuce",
    fruit: "🥬 Lettuce",
    approxWeight: "760 g",
    approxLength: "35.6 cm",
    milestone: "Baby's eyes are opening; lungs are developing air sacs.",
  },
  {
    week: 28,
    size: "Brinjal (Eggplant)",
    fruit: "🍆 Brinjal",
    approxWeight: "1.0 kg",
    approxLength: "37.6 cm",
    milestone: "Third trimester begins! Baby has regular sleep and wake cycles.",
  },
  {
    week: 30,
    size: "Cabbage",
    fruit: "🥬 Cabbage",
    approxWeight: "1.3 kg",
    approxLength: "39.9 cm",
    milestone: "Baby's brain is growing rapidly with deep convolutions forming.",
  },
  {
    week: 32,
    size: "Coconut",
    fruit: "🥥 Coconut",
    approxWeight: "1.7 kg",
    approxLength: "42.4 cm",
    milestone: "Baby is practicing breathing movements; toenails are visible.",
  },
  {
    week: 34,
    size: "Melon",
    fruit: "🍈 Cantaloupe",
    approxWeight: "2.1 kg",
    approxLength: "45.0 cm",
    milestone: "Central nervous system and immune system are maturing.",
  },
  {
    week: 36,
    size: "Large Papaya",
    fruit: "🍈 Large papaya",
    approxWeight: "2.6 kg",
    approxLength: "47.4 cm",
    milestone: "Baby may drop down into your pelvis (lightening).",
  },
  {
    week: 38,
    size: "Small Pumpkin",
    fruit: "🎃 Small pumpkin",
    approxWeight: "3.1 kg",
    approxLength: "49.8 cm",
    milestone: "Full term approaching; baby's organs are ready for the outside world.",
  },
  {
    week: 40,
    size: "Watermelon",
    fruit: "🍉 Watermelon",
    approxWeight: "3.4 kg",
    approxLength: "51.2 cm",
    milestone: "Full term! Your little one is fully ready to meet you.",
  },
];

export function sizeForWeek(week: number): BabySize {
  const clamped = Math.max(4, Math.min(42, Math.round(week)));
  const match = [...BABY_SIZES].reverse().find((s) => clamped >= s.week);
  return match ?? BABY_SIZES[0];
}

const DAY = 86_400_000;

export function calculateGestation(
  profileOrWeeks?: { weeks_pregnant?: number; expected_due_date?: string; due_date?: string } | number,
) {
  const today = new Date();
  const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  let weeks = 12;
  let daysToDue = 196;
  let dueDateStr = "";

  if (typeof profileOrWeeks === "number") {
    weeks = profileOrWeeks;
    daysToDue = Math.max(0, (40 - weeks) * 7);
    dueDateStr = new Date(todayMs + daysToDue * DAY).toISOString().split("T")[0];
  } else if (profileOrWeeks) {
    const rawDue = profileOrWeeks.expected_due_date || profileOrWeeks.due_date;
    if (rawDue && !isNaN(Date.parse(rawDue))) {
      dueDateStr = rawDue.slice(0, 10);
      const dueMs = Date.parse(dueDateStr + "T00:00:00Z");
      daysToDue = Math.round((dueMs - todayMs) / DAY);
      const ga = Math.max(0, Math.min(44 * 7, 280 - daysToDue));
      weeks = Math.max(1, Math.floor(ga / 7));
    } else {
      weeks = Number(profileOrWeeks.weeks_pregnant) || 12;
      daysToDue = Math.max(0, (40 - weeks) * 7);
      dueDateStr = new Date(todayMs + daysToDue * DAY).toISOString().split("T")[0];
    }
  }

  const trimester = weeks <= 13 ? 1 : weeks <= 27 ? 2 : 3;
  const progressPercent = Math.min(100, Math.max(0, Math.round((weeks / 40) * 100)));

  return {
    weeks,
    trimester,
    daysToDue: Math.max(0, daysToDue),
    dueDate: dueDateStr,
    progressPercent,
    babySize: sizeForWeek(weeks),
  };
}
