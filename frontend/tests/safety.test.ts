import { describe, expect, it } from 'vitest';
import { checkSafety } from '@/lib/chat/safety';

describe('safety check runs before any AI', () => {
  it('catches self-harm language as a crisis', () => {
    expect(checkSafety('I want to die', 'her', 'Priya')?.level).toBe('crisis');
  });
  it('escalates pregnancy danger signs', () => {
    const hit = checkSafety('severe headache and blurred vision', 'pregnancy', 'Meera');
    expect(hit).not.toBeNull();
    expect(['emergency', 'urgent']).toContain(hit!.level);
  });
  it('escalates bleeding in pregnancy', () => {
    expect(checkSafety('I am bleeding heavily', 'pregnancy', 'Meera')).not.toBeNull();
  });
  it('flags soaking a pad every hour', () => {
    expect(checkSafety('soaking a pad every hour since morning', 'her', 'Priya')).not.toBeNull();
  });
  it('stays quiet for ordinary messages', () => {
    expect(checkSafety('mild cramps today, slept 7 hours', 'her', 'Priya')).toBeNull();
    expect(checkSafety('what should I eat for breakfast', 'pregnancy', 'Meera')).toBeNull();
  });
});
