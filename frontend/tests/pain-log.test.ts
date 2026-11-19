import { describe, it, expect } from 'vitest';
import { addPainEvent, painEvents, removePainEvent, worstPain } from '@/lib/painLog';

describe('pain through the day', () => {
  it('keeps every report and scores the day by the worst', () => {
    let day: any = { log_date: '2026-11-19', cramps_severity: 0 };
    day = addPainEvent(day, 0, 'check-in', { at: '2026-11-19T08:00:00.000Z' });
    day = addPainEvent(day, 7, 'quick', { at: '2026-11-19T14:00:00.000Z', where: ['Tummy'] });
    day = addPainEvent(day, 3, 'chat', { at: '2026-11-19T20:00:00.000Z' });
    expect(painEvents(day).map(e => e.level)).toEqual([0, 7, 3]);
    expect(day.cramps_severity).toBe(7);
    expect(worstPain(day)).toBe(7);
  });
  it('a later lower score does not hide the morning peak', () => {
    let day: any = { log_date: '2026-11-19' };
    day = addPainEvent(day, 8, 'quick', { at: '2026-11-19T09:00:00.000Z' });
    day = addPainEvent(day, 2, 'check-in', { at: '2026-11-19T21:00:00.000Z' });
    expect(day.cramps_severity).toBe(8);
  });
  it('keeps a day logged before this feature as the first report', () => {
    const old = { log_date: '2026-11-18T07:00:00.000Z', cramps_severity: 5 };
    const day = addPainEvent(old, 2, 'quick', { at: '2026-11-18T15:00:00.000Z' });
    expect(painEvents(day).map(e => e.level)).toEqual([5, 2]);
    expect(day.cramps_severity).toBe(5);
    expect(worstPain(old)).toBe(5);
  });
  it('removing a report recalculates the worst', () => {
    let day: any = { log_date: '2026-11-19' };
    day = addPainEvent(day, 2, 'quick', { at: '2026-11-19T09:00:00.000Z' });
    day = addPainEvent(day, 9, 'quick', { at: '2026-11-19T13:00:00.000Z' });
    day = removePainEvent(day, '2026-11-19T13:00:00.000Z');
    expect(day.cramps_severity).toBe(2);
    expect(removePainEvent(day, '2026-11-19T09:00:00.000Z').cramps_severity).toBe(0);
  });
  it('clamps levels to 0-10', () => {
    expect(addPainEvent({}, 14, 'quick').cramps_severity).toBe(10);
    expect(addPainEvent({}, -3, 'quick').cramps_severity).toBe(0);
  });
});
