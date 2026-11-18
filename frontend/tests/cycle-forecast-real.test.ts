import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { backtest } from '@/lib/ml/cycleForecast';

/**
 * Backtest on REAL cycles: the Marquette University "Menstrual Cycle Data"
 * (Fehring, 2012; about 1,665 cycles from 159 women; anonymised, reuse agreed
 * in the consent form). Download "FedCycleData071012 (2).csv" from
 * https://epublications.marquette.edu/data_nfp/7 (or the Kaggle copy) and save
 * it as ai-health-app/ml-service/data/FedCycleData071012.csv. Skipped if absent.
 */
const FILE = path.resolve(__dirname, '../../ai-health-app/ml-service/data/FedCycleData071012.csv');

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function loadWomen(file = FILE): number[][] {
  const [header, ...rows] = parseCsv(readFileSync(file, 'utf-8'));
  const h = header.map(x => x.trim().toLowerCase());
  const id = h.findIndex(x => x === 'clientid' || x === 'subcode');
  const num = h.findIndex(x => x === 'cyclenumber');
  const len = h.findIndex(x => x === 'lengthofcycle');
  if (id < 0 || len < 0) throw new Error(`Unexpected columns: ${h.slice(0, 12).join(', ')}`);
  const byWoman = new Map<string, { n: number; len: number }[]>();
  for (const r of rows) {
    const L = Number(r[len]);
    if (!r[id] || !Number.isFinite(L) || L < 10 || L > 120) continue;
    const list = byWoman.get(r[id].trim()) || [];
    list.push({ n: num >= 0 ? Number(r[num]) : list.length, len: L });
    byWoman.set(r[id].trim(), list);
  }
  return [...byWoman.values()].map(l => l.sort((a, b) => a.n - b.n).map(x => x.len)).filter(c => c.length >= 3);
}

describe.skipIf(!existsSync(FILE))('cycle forecast on real cycles (Marquette data)', () => {
  const women = existsSync(FILE) ? loadWomen() : [];
  const r = backtest(women);
  it('reports results', () => {
    console.log('REAL cycle backtest', JSON.stringify({ women: women.length, ...r }));
    expect(r.predictions).toBeGreaterThan(500);
  });
  it('beats a fixed 28-day calendar', () => {
    expect(r.mae.model).toBeLessThan(r.mae.fixed_28);
  });
  it('80% range holds roughly 80% of real cycles', () => {
    expect(r.coverage80).toBeGreaterThan(0.65);
  });
});
