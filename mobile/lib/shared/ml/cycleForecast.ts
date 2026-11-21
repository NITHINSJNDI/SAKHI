// GENERATED from frontend/lib/ml/cycleForecast.ts by scripts/sync-shared.mjs. Do not edit here.
/**
 * Next-period forecast for Her Mode.
 *
 * A small Bayesian model of her own cycle lengths:
 *  - Her typical cycle length starts from a population prior (about 29 days,
 *    Bull et al. 2019, npj Digital Medicine 2:83) or what she told us at
 *    onboarding, and moves towards her own logged cycles as they come in
 *    (normal-normal update, prior worth PRIOR_CYCLES cycles).
 *  - Her cycle-to-cycle variation is learned the same way, starting from a
 *    typical spread of about 3 days.
 *  - A cycle far outside her usual pattern (a skipped period, a missed log)
 *    is set aside as an outlier, so one odd month does not move every forecast.
 *
 * The answer is a date RANGE (80% interval) plus a most-likely day, not one
 * confident date. With few cycles logged the range is honestly wide.
 */

export const POP_MEAN = 29;
export const POP_SD = 3;
/** how many cycles the prior is "worth" */
export const PRIOR_CYCLES = 2;
const Z80 = 1.2816;

export interface CycleForecast {
  /** most likely cycle length */
  mean: number;
  /** predictive SD of the next cycle length, in days */
  sd: number;
  /** 80% range of the next cycle length */
  low: number;
  high: number;
  /** cycles used, after outliers are set aside */
  used: number;
  outliers: number[];
  confidence: 'high' | 'medium' | 'low';
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Set aside cycles far from her median (more than 3 robust SDs, and at least 8 days). */
export function splitOutliers(lengths: number[]): { kept: number[]; outliers: number[] } {
  const valid = lengths.filter(n => Number.isFinite(n) && n >= 15 && n <= 90);
  if (valid.length < 4) return { kept: valid, outliers: [] };
  const med = median(valid);
  const mad = median(valid.map(n => Math.abs(n - med))) * 1.4826;
  const limit = Math.max(8, 3 * mad);
  return {
    kept: valid.filter(n => Math.abs(n - med) <= limit),
    outliers: valid.filter(n => Math.abs(n - med) > limit),
  };
}

export function forecastCycle(lengths: number[], priorMean = POP_MEAN): CycleForecast {
  const { kept, outliers } = splitOutliers(lengths.slice(-12));
  const n = kept.length;
  const prior = Number.isFinite(priorMean) && priorMean >= 18 && priorMean <= 60 ? priorMean : POP_MEAN;
  const xbar = n ? kept.reduce((a, b) => a + b, 0) / n : prior;
  const mean = (PRIOR_CYCLES * prior + n * xbar) / (PRIOR_CYCLES + n);

  // Variation: pooled with a prior spread worth 3 cycles
  const ss = kept.reduce((a, x) => a + (x - xbar) ** 2, 0);
  const priorDf = 3;
  const sigma = Math.sqrt((priorDf * POP_SD ** 2 + ss) / (priorDf + Math.max(0, n - 1)));
  // Uncertainty about her mean adds to the spread of the next cycle
  const sd = sigma * Math.sqrt(1 + 1 / (PRIOR_CYCLES + n));

  const confidence: CycleForecast['confidence'] = n >= 4 && sd <= 3 ? 'high' : n >= 2 && sd <= 5 ? 'medium' : 'low';
  return {
    mean: round1(mean),
    sd: round1(sd),
    low: Math.max(15, Math.floor(mean - Z80 * sd)),
    high: Math.ceil(mean + Z80 * sd),
    used: n,
    outliers,
    confidence,
  };
}

export interface NextPeriod extends CycleForecast {
  /** day numbers (days since epoch) */
  likelyDay: number;
  earliestDay: number;
  latestDay: number;
}

/** Turn a forecast into calendar days from her last period start (day numbers). */
export function nextPeriod(lastStart: number, lengths: number[], priorMean?: number): NextPeriod {
  const f = forecastCycle(lengths, priorMean);
  return {
    ...f,
    likelyDay: lastStart + Math.round(f.mean),
    earliestDay: lastStart + f.low,
    latestDay: lastStart + f.high,
  };
}

const round1 = (v: number) => Math.round(v * 10) / 10;

// ------------------------------------------------------------ evaluation

export interface BacktestResult {
  predictions: number;
  /** mean absolute error in days, per method */
  mae: { model: number; median_of_last_3: number; fixed_28: number };
  /** share of actual cycles inside the model's 80% range */
  coverage80: number;
}

/**
 * Walk forward through each woman's cycles: predict cycle k from cycles
 * before it, compare with what happened. Needs at least 2 earlier cycles.
 */
export function backtest(women: number[][], priorMean = POP_MEAN): BacktestResult {
  let n = 0, eModel = 0, eMed = 0, eFixed = 0, inside = 0;
  for (const cycles of women) {
    for (let k = 2; k < cycles.length; k++) {
      const past = cycles.slice(0, k);
      const actual = cycles[k];
      const f = forecastCycle(past, priorMean);
      eModel += Math.abs(f.mean - actual);
      eMed += Math.abs(median(past.slice(-3)) - actual);
      eFixed += Math.abs(28 - actual);
      if (actual >= f.low && actual <= f.high) inside++;
      n++;
    }
  }
  const r = (v: number) => Math.round((v / Math.max(1, n)) * 100) / 100;
  return { predictions: n, mae: { model: r(eModel), median_of_last_3: r(eMed), fixed_28: r(eFixed) }, coverage80: r(inside) };
}

/**
 * A seeded synthetic cohort for checking the method: each woman has her own
 * typical length (about 29 ± 3 days) and her own variation (1 to 6 days), with
 * an occasional very long cycle. This is NOT real data; it only shows the
 * method behaves sensibly. Real accuracy must be measured on real logs.
 */
export function syntheticCohort(women = 300, cyclesEach = 10, seed = 7): number[][] {
  let s = seed >>> 0;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  const out: number[][] = [];
  for (let w = 0; w < women; w++) {
    const mu = 29 + 3 * gauss();
    const sd = 1 + 5 * rand();
    const cycles: number[] = [];
    for (let c = 0; c < cyclesEach; c++) {
      let len = mu + sd * gauss();
      if (rand() < 0.04) len += 20 + 15 * rand(); // an odd, very long cycle
      cycles.push(Math.max(18, Math.min(80, Math.round(len))));
    }
    out.push(cycles);
  }
  return out;
}
