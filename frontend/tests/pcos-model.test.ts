import { describe, expect, it } from 'vitest';
import { predictPcos } from '@/lib/ml/scoring';

// Expected values come from the Python service (main.predict_pcos) on the same
// risk_models.json, so this also checks the two copies agree.
describe('PCOS symptom model', () => {
  it('scores many signs as high, matching Python', () => {
    const r = predictPcos({
      cycle_regularity: 0, acne_severity: 6, hair_growth: true, skin_darkening: true,
      weight_gain: true, bmi: 28.5, age: 24, period_days: 6, hair_loss: true,
    });
    expect(r.ml).not.toBeNull();
    expect(r.probability_pcos).toBeCloseTo(0.967, 3);
    expect(r.risk_level).toBe('High');
  });
  it('scores no signs as low, matching Python', () => {
    const r = predictPcos({ cycle_regularity: 1, acne_severity: 1 });
    expect(r.probability_pcos).toBeCloseTo(0.04, 3);
    expect(r.risk_level).toBe('Low');
  });
  it('explains which answers drove the score', () => {
    const r = predictPcos({ cycle_regularity: 0, skin_darkening: true });
    expect(r.ml!.explanation.length).toBe(9);
    expect(r.ml!.model.name).toBe('PCOS symptom screen');
  });
});
