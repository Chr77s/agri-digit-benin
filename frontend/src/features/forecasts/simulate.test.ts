import { describe, expect, it } from 'vitest';
import { communeRisks, rng, yieldSeries } from './simulate';

describe('prévisions simulées', () => {
  it('sont déterministes et bornées', () => {
    expect(rng('a')()).toBe(rng('a')());
    expect(rng('a')()).not.toBe(rng('b')());
    const s = yieldSeries('mais', 'ALI', 2027);
    expect(s.map((p) => p.year)).toEqual([2021, 2022, 2023, 2024, 2025, 2026, 2027]);
    expect(s.filter((p) => p.forecast)).toHaveLength(2);
    for (const p of s.filter((x) => x.forecast)) expect(p.low! <= p.value && p.value <= p.high!).toBe(true);
    const r = communeRisks('mais', [{ code: 'c1', name: 'C1' }, { code: 'c2', name: 'C2' }]);
    expect(r).toEqual(communeRisks('mais', [{ code: 'c1', name: 'C1' }, { code: 'c2', name: 'C2' }]));
    for (const x of r) for (const k of ['drought', 'flood', 'pests'] as const) expect(['faible', 'modere', 'eleve']).toContain(x[k]);
  });
});
