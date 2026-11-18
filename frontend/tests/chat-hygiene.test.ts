import { describe, expect, it } from 'vitest';
import { HER_TOPICS, findTopics } from '@/lib/chat/offline/knowledge';

const ids = (text: string) => findTopics(HER_TOPICS, text.toLowerCase(), 5).map(t => t.id);

describe('offline chat answers hygiene questions', () => {
  it.each([
    ['How often should I change my pad?', 'hygiene_change'],
    ['how long can I keep a menstrual cup in', 'hygiene_change'],
    ['how do I wash cloth pads', 'hygiene_cloth'],
    ['where do I throw used pads', 'hygiene_disposal'],
    ['can I flush a tampon', 'hygiene_disposal'],
    ['where can I get cheap pads', 'hygiene_cost'],
    ['can I take a head bath during periods', 'hygiene_bath'],
  ])('%s', (q, id) => {
    expect(ids(q)).toContain(id);
  });

  it('does not answer hygiene for unrelated questions', () => {
    expect(ids('my cramps are bad today').some(i => i.startsWith('hygiene'))).toBe(false);
  });
});
