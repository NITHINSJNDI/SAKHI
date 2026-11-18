import { describe, expect, it } from 'vitest';
import {
  EMPTY_HYGIENE, MYTHS, PRODUCTS, addChange, changeState, changesToday, hoursSinceChange,
  mythForDay, suppliesNeeded, supplyCheck,
} from '@/lib/hygiene';

const at = (h: number, m = 0) => new Date(2026, 10, 18, h, m);

describe('change timer', () => {
  it('reports hours since the last change', () => {
    expect(hoursSinceChange([at(8).toISOString(), at(10).toISOString()], at(13))).toBeCloseTo(3);
  });
  it('counts a change a moment ahead of the clock as just now', () => {
    expect(hoursSinceChange([at(9, 1).toISOString()], at(9))).toBe(0);
  });
  it('ignores changes older than a day or with no history', () => {
    expect(hoursSinceChange([], at(9))).toBeNull();
    expect(hoursSinceChange([new Date(2026, 10, 16, 9).toISOString()], at(9))).toBeNull();
  });
  it('moves from fresh to overdue for a pad (6 h limit)', () => {
    expect(changeState('pad', 2)).toBe('fresh');
    expect(changeState('pad', 5)).toBe('soon');
    expect(changeState('pad', 6.5)).toBe('due');
    expect(changeState('pad', 8)).toBe('overdue');
  });
  it('allows a cup up to 12 hours', () => {
    expect(changeState('cup', 8)).toBe('fresh');
    expect(changeState('cup', 12)).toBe('due');
  });
  it('is unknown without a product or a change', () => {
    expect(changeState(null, 3)).toBe('unknown');
    expect(changeState('pad', null)).toBe('unknown');
  });
  it('keeps only the last 24 hours of changes', () => {
    const old = new Date(2026, 10, 16, 9).toISOString();
    const next = addChange([old, at(8).toISOString()], at(12));
    expect(next).toHaveLength(2);
    expect(next).not.toContain(old);
    expect(changesToday(next, at(12))).toBe(2);
  });
});

describe('supplies', () => {
  it('needs more on heavy days', () => {
    expect(suppliesNeeded(5, false)).toBe(20);
    expect(suppliesNeeded(5, true)).toBe(24);
  });
  it('clamps unrealistic period lengths', () => {
    expect(suppliesNeeded(0, false)).toBe(20);
    expect(suppliesNeeded(1, false)).toBe(8);
    expect(suppliesNeeded(30, false)).toBe(40);
  });
  it('warns when stock is low and the period is close', () => {
    const s = supplyCheck({ ...EMPTY_HYGIENE, product: 'pad', stock: 6 }, 5, false, 2, false);
    expect(s.level).toBe('low');
    expect(s.message).toContain('14 more');
  });
  it('flags no stock', () => {
    expect(supplyCheck({ ...EMPTY_HYGIENE, product: 'pad', stock: 0 }, 5, false, 20, false).level).toBe('out');
  });
  it('is fine with enough stock', () => {
    expect(supplyCheck({ ...EMPTY_HYGIENE, product: 'pad', stock: 30 }, 5, true, 2, false).level).toBe('ok');
  });
  it('asks for a count when stock is not tracked', () => {
    expect(supplyCheck(EMPTY_HYGIENE, 5, false, 10, false).level).toBe('untracked');
  });
  it('gives readiness advice for reusable products', () => {
    const s = supplyCheck({ ...EMPTY_HYGIENE, product: 'cloth', stock: null }, 5, false, 2, false);
    expect(s.level).toBe('reusable');
    expect(s.message).toMatch(/sun-dried/);
  });
});

describe('content', () => {
  it('every product has care steps and disposal advice', () => {
    for (const g of Object.values(PRODUCTS)) {
      expect(g.care.length).toBeGreaterThan(0);
      expect(g.disposal.length).toBeGreaterThan(10);
      expect(g.maxHours).toBeLessThanOrEqual(12);
    }
  });
  it('rotates myths by day, including negative days', () => {
    expect(mythForDay(0)).toBe(MYTHS[0]);
    expect(mythForDay(MYTHS.length + 1)).toBe(MYTHS[1]);
    expect(mythForDay(-1)).toBe(MYTHS[MYTHS.length - 1]);
  });
});
