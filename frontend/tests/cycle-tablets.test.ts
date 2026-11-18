import { describe, expect, it } from 'vitest';
import { dayNum, detectPeriodStarts, phaseOnCycleDay } from '@/lib/cyclePhase';
import { patternOf, toMin } from '@/lib/tablets';
import { anaemiaWatch } from '@/lib/anaemia';

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('cycle phase engine', () => {
  it('puts day 1 in the period and mid-cycle near ovulation', () => {
    expect(phaseOnCycleDay(1, 28, 5)).toBe('menstrual');
    expect(phaseOnCycleDay(8, 28, 5)).toBe('follicular');
    expect(phaseOnCycleDay(14, 28, 5)).toBe('ovulatory');
    expect(phaseOnCycleDay(24, 28, 5)).toBe('luteal');
  });
  it('finds two separate periods a month apart', () => {
    const logs = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-29', '2026-09-30']
      .map(d => ({ log_date: d, on_period: true }));
    expect(detectPeriodStarts(logs)).toEqual([dayNum('2026-09-01'), dayNum('2026-09-29')]);
  });
  it('keeps a long period as the same period when the start is known', () => {
    const logs = Array.from({ length: 9 }, (_, i) => ({ log_date: `2026-10-${String(1 + i).padStart(2, '0')}`, on_period: true }));
    expect(detectPeriodStarts(logs, '2026-10-01')).toEqual([dayNum('2026-10-01')]);
  });
});

describe('tablet ledger', () => {
  it('reads Indian 1-0-1 patterns', () => {
    expect(patternOf(['morning', 'night'])).toBe('1-0-1');
    expect(patternOf(['morning', 'afternoon', 'night'])).toBe('1-1-1');
    expect(patternOf(['evening'])).toBeNull();
  });
  it('parses times', () => {
    expect(toMin('08:30')).toBe(510);
    expect(Number.isNaN(toMin('soon'))).toBe(true);
  });
});

describe('anaemia watch', () => {
  it('a low haemoglobin result outranks check-ins', () => {
    const w = anaemiaWatch([], [{ date: iso(new Date()), key: 'hb', value: 7.5, source: 'manual' }], false);
    expect(w.level).toBe('low');
    expect(w.next).toMatch(/doctor/i);
  });
  it('is clear with no warning signs', () => {
    expect(anaemiaWatch([], [], false).level).toBe('clear');
  });
});
