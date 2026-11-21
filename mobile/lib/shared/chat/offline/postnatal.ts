// GENERATED from frontend/lib/chat/offline/postnatal.ts by scripts/sync-shared.mjs. Do not edit here.
/**
 * Simple-mode answers after the birth: her recovery, breastfeeding and the
 * newborn (WHO / MoHFW home-based newborn care). Short, safe, no medicines.
 */
import type { Topic } from './knowledge';

export interface PostnatalCtx {
  who: string;
  pet: string;
  baby: string;
  daysOld: number;
  delivery: 'normal' | 'csection' | null;
  lastBp: { s: number; d: number } | null;
}

export const babyAgeText = (d: number) => (d < 14 ? `${d} day${d === 1 ? '' : 's'} old` : d < 90 ? `${Math.floor(d / 7)} weeks old` : `${Math.floor(d / 30.4)} months old`);

export const POSTNATAL_TOPICS: Topic<PostnatalCtx>[] = [
  {
    id: 'latch',
    match: /\b(breast ?feed\w*|latch\w*|nursing|feed(ing)? (my )?baby|milk (supply|coming|not enough|less)|enough milk|sore nipples?|cracked nipples?)\b/,
    answer: ({ pet, baby, daysOld }) => `${daysOld < 5 ? `In the first days the yellow milk (colostrum) is small in amount but exactly what ${baby} needs, ${pet}. ` : ''}Feed whenever ${baby} shows hunger, 8 to 12 times a day, from both sides. For a good latch, bring baby's whole body close, chin touching the breast, mouth wide open taking in most of the dark area, not just the nipple. Sore, cracked nipples usually mean a shallow latch: a drop of your own milk on them after feeds helps. ${baby} is getting enough if there are 6 or more wet nappies a day after the first week and weight is going up. Only breast milk for the first 6 months, not even water.`,
  },
  {
    id: 'pump',
    match: /\b(engorged|engorgement|breast (is )?(hard|swollen|painful|lump)|blocked duct|mastitis)\b/,
    answer: ({ pet }) => `Hard, full breasts are common in the first week, ${pet}. Feed often, start on the fuller side, and use a warm cloth before and a cool one after. A hard, red, painful patch with fever can be mastitis: keep feeding from that side and see a doctor today.`,
  },
  {
    id: 'bleeding',
    match: /\b(bleed\w*|lochia|discharge|blood after (birth|delivery))\b/,
    answer: ({ pet }) => `Bleeding after birth (lochia) is normal for up to 6 weeks, ${pet}: red at first, then pink or brown, then creamy and lighter. Go to hospital now if you soak a pad in an hour, pass clots bigger than a lemon, feel faint, or the discharge smells bad with fever.`,
  },
  {
    id: 'stitches',
    match: /\b(stitch\w*|tear|episiotomy|c ?-?section|caesarean|cesarean|wound|scar)\b/,
    answer: ({ pet, delivery }) => delivery === 'csection'
      ? `Keep the C-section wound clean and dry, ${pet}, wear loose clothes, and support your belly with a pillow when you cough or feed. No lifting anything heavier than your baby for 6 weeks. See a doctor if it gets red, swollen, leaks or you get a fever.`
      : `Wash the stitches with clean water after the toilet and pat dry, ${pet}. Sitting on a soft cushion and warm water sitz baths ease the soreness. See a doctor if the pain gets worse, it leaks, or smells bad.`,
  },
  {
    id: 'jaundice',
    match: /\b(jaundice|yellow (skin|eyes|baby)|baby (is |looks )?yellow)\b/,
    answer: ({ pet, daysOld }) => `${daysOld <= 1 ? `Yellow skin on the first day is not normal, ${pet}: please see a doctor today.` : `Mild yellowness on days 2 to 7 is common, ${pet}, and feeding often helps it clear.`} Press gently on baby's skin in daylight: see a doctor the same day if the yellow reaches the palms or soles, baby is very sleepy, or it lasts beyond 2 weeks.`,
  },
  {
    id: 'cord',
    match: /\b(cord|navel|belly button|umbilical)\b/,
    answer: ({ pet }) => `Keep the cord stump clean and dry and let it fall off on its own, usually in 1 to 2 weeks, ${pet}. Don't put oil, ash, turmeric or anything else on it. See a doctor if the skin around it gets red, swollen, or there is pus or a bad smell.`,
  },
  {
    id: 'crying',
    match: /\b(crying|cries|colic|won'?t stop crying|fussy|gas|burp\w*)\b/,
    answer: ({ pet, baby }) => `Babies cry to say they're hungry, wet, too hot or cold, or need holding, ${pet}. Try a feed, a nappy check, burping over your shoulder, and holding ${baby} close skin to skin. Evening crying that peaks around 6 weeks is common. See a doctor if crying is high-pitched and constant, or comes with fever, vomiting or poor feeding.`,
  },
  {
    id: 'baby-sleep',
    match: /\b(baby('s)? sleep\w*|sleep(ing)? (position|on (his|her) (back|tummy))|how much should (my )?baby sleep)\b/,
    answer: ({ pet }) => `Newborns sleep 14 to 17 hours a day in short stretches, waking to feed, ${pet}. Always lay baby on the back to sleep, on a firm flat surface, with no pillows or loose blankets near the face.`,
  },
  {
    id: 'warm',
    match: /\b(keep (baby|him|her) warm|baby (feels )?(cold|hot)|bath(e|ing)? (the |my )?baby|massage)\b/,
    answer: ({ pet }) => `Dress baby in one more layer than you're wearing, with a cap and socks, and hold baby skin to skin: it's the best warmth, ${pet}. Delay the first bath until at least 24 hours after birth, then keep baths short and warm. A gentle oil massage is fine, but keep oil out of the nose and ears.`,
  },
  {
    id: 'pn-food',
    match: /\b(eat|food|diet|meal|nutrition|protein|iron|calcium)\b/,
    answer: ({ pet }) => `While breastfeeding you need more food than in pregnancy, ${pet}: one extra meal a day, with dal, eggs or paneer, green vegetables, milk or curd, and plenty of water. Traditional foods like gond or methi laddoos and ajwain water are fine in moderation. Keep taking the iron and calcium tablets for 6 months after birth.`,
  },
  {
    id: 'pn-mood',
    match: /\b(sad|cry(ing)? a lot|low|baby blues|depress\w*|anxious|overwhelmed|can'?t cope|no energy)\b/,
    answer: ({ pet }) => `Tearful, up-and-down days in the first 2 weeks ("baby blues") are very common, ${pet}. Rest when baby sleeps, eat, and let family help. If the low mood lasts more than 2 weeks, or you feel hopeless or can't care for yourself or baby, please talk to your doctor or call Tele-MANAS on 14416. It's treatable and not your fault.`,
  },
  {
    id: 'spacing',
    match: /\b(contracepti\w*|family planning|pregnant again|spacing|copper ?-?t|iud|periods? (come )?back)\b/,
    answer: ({ pet }) => `You can get pregnant again before your first period returns, ${pet}. Waiting at least 2 years before the next pregnancy is healthiest. Copper-T (PPIUCD), Antara injections, Chhaya weekly pills and condoms are free at government health centres. Ask your ASHA or doctor which suits you while breastfeeding.`,
  },
  {
    id: 'pn-bp',
    match: /\b(bp|blood pressure)\b.*\b(normal|okay|ok|high|low|good|range|worry)\b|\bis my (bp|blood pressure)\b/,
    answer: ({ pet, lastBp }) => `${lastBp ? `Your last reading was ${lastBp.s}/${lastBp.d}. ` : ''}After birth, below 140/90 is the goal, ${pet}. BP can rise in the first 6 weeks even if it was normal in pregnancy: go to hospital if it's 160/110 or above, or if you get a bad headache or blurred vision.`,
  },
  {
    id: 'vaccines',
    match: /\b(vaccin\w*|injection for baby|immuni[sz]\w*|tika|teeka)\b/,
    answer: ({ pet }) => `Baby's vaccines are free at your health centre and Anganwadi, ${pet}: at birth, then 6, 10 and 14 weeks, 9 months and 16 to 24 months. The dates are in the Baby tab, and you can tick each one off. Take the MCP card every time.`,
  },
];
