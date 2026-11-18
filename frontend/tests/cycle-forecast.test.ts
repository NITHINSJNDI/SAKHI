import { describe, expect, it } from 'vitest';
import { backtest, forecastCycle, nextPeriod, splitOutliers, syntheticCohort } from '@/lib/ml/cycleForecast';

describe('cycle forecast', () => {
  it('starts near the population prior with a wide, low-confidence range', () => {
    const f = forecastCycle([]);
    expect(f.mean).toBe(29);
    expect(f.confidence).toBe('low');
    expect(f.high - f.low).toBeGreaterThanOrEqual(8);
  });
  it('moves towards her own cycles as they are logged', () => {
    const f = forecastCycle([33, 34, 33, 34, 33, 34]);
    expect(f.mean).toBeGreaterThan(32);
    expect(f.mean).toBeLessThan(34);
    expect(f.confidence).toBe('high');
  });
  it('gives a wider range for irregular cycles', () => {
    const regular = forecastCycle([28, 29, 28, 29, 28]);
    const irregular = forecastCycle([24, 35, 27, 38, 30]);
    expect(irregular.high - irregular.low).toBeGreaterThan(regular.high - regular.low);
  });
  it('sets aside one very long cycle', () => {
    const { kept, outliers } = splitOutliers([28, 29, 28, 62, 29, 28]);
    expect(outliers).toEqual([62]);
    expect(kept).toHaveLength(5);
  });
  it('turns lengths into calendar days', () => {
    const p = nextPeriod(1000, [30, 30, 30, 30]);
    expect(p.earliestDay).toBeLessThanOrEqual(p.likelyDay);
    expect(p.latestDay).toBeGreaterThanOrEqual(p.likelyDay);
    expect(p.likelyDay).toBeGreaterThanOrEqual(1029);
  });
});

describe('backtest on a synthetic cohort (method check, not real accuracy)', () => {
  const r = backtest(syntheticCohort());
  it('beats a fixed 28-day calendar', () => {
    expect(r.mae.model).toBeLessThan(r.mae.fixed_28);
  });
  it('is at least as good as the median of the last 3 cycles', () => {
    expect(r.mae.model).toBeLessThanOrEqual(r.mae.median_of_last_3 + 0.1);
  });
  it('its 80% range holds roughly 80% of real outcomes', () => {
    expect(r.coverage80).toBeGreaterThan(0.7);
    expect(r.coverage80).toBeLessThan(0.92);
  });
  it('reports results', () => {
    console.log('cycle backtest', JSON.stringify(r));
    expect(r.predictions).toBeGreaterThan(1000);
  });
});
