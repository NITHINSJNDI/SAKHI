import { describe, expect, it } from 'vitest';
import { bpRefreshDays, daysSince, isMeasuredBy, measuredByShort, staleNote } from '@/lib/readings';

describe('readings from check-ups, not only home machines', () => {
  it('knows who measured a reading', () => {
    expect(isMeasuredBy('asha')).toBe(true);
    expect(isMeasuredBy('neighbour')).toBe(false);
    expect(measuredByShort('mcp_card')).toBe('MCP card');
    expect(measuredByShort(undefined)).toBeNull();
  });
  it('counts days since a reading', () => {
    expect(daysSince('2026-11-01', new Date(2026, 10, 18, 15))).toBe(17);
    expect(daysSince(null)).toBeNull();
  });
  it('asks for BP more often late in pregnancy', () => {
    expect(bpRefreshDays(20)).toBe(28);
    expect(bpRefreshDays(30)).toBe(14);
    expect(bpRefreshDays(37)).toBe(7);
  });
  it('flags an old BP reading and points to free checks', () => {
    expect(staleNote('bp', 10, 20)).toBeNull();
    const note = staleNote('bp', 35, 20)!;
    expect(note).toMatch(/5 weeks old/);
    expect(note).toMatch(/ASHA/);
    expect(staleNote('bp', 10, 37)).toMatch(/10 days old/);
  });
  it('reminds about the sugar test schedule', () => {
    expect(staleNote('sugar', 60, 26)).toMatch(/24 to 28 weeks/);
  });
});
