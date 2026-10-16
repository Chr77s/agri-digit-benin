import { buildPlant, buildUnder, fieldLayout, Geo, grassGeo, kernelGeo, leaf, ridgeY, webglAvailable, type LeafArgs, type PlantSpec } from './field3d';

const finite = (g: Geo) => {
  for (let i = 0; i < g.nv * 3; i++) if (!Number.isFinite(g.pos[i]) || !Number.isFinite(g.nor[i]) || !Number.isFinite(g.col[i])) return false;
  for (let i = 0; i < g.ni; i++) if (g.idx[i] >= g.nv) return false;
  return g.ni % 3 === 0;
};
const spec = (lod: 0 | 1 | 2): PlantSpec => ({ seed: 5, lod, leaves: 14, height: 1.8, phi0: 0.5, tint: 0, lean: 0.01 });

describe('field3d', () => {
  it('webglAvailable renvoie false sous jsdom sans lever', () => {
    expect(webglAvailable()).toBe(false);
  });

  it('feuille : comptes exacts, sommets finis, longueur respectée', () => {
    const g = new Geo(2000, 8000);
    const a: LeafArgs = { x: 0, y: 1, z: 0, phi: 0, len: 0.9, w: 0.09, a0: 0.5, a1: 2.4, twist: 1, lat: 0.2, sen: 0.3, tint: 0, sway: 0.2, segs: 40, across: 5, wave: 0.004, round: false, roll: 0, seed: 3 };
    expect(leaf(g, a)).toBe(41 * 5);
    expect(g.ni).toBe(40 * 4 * 6);
    expect(finite(g)).toBe(true);
    // la nervure (colonne du milieu) suit un arc de la bonne longueur
    let L = 0;
    for (let k = 1; k <= 40; k++) {
      const i = (k * 5 + 2) * 3, j = ((k - 1) * 5 + 2) * 3;
      L += Math.hypot(g.pos[i] - g.pos[j], g.pos[i + 1] - g.pos[j + 1], g.pos[i + 2] - g.pos[j + 2]);
    }
    expect(L).toBeGreaterThan(0.8);
    expect(L).toBeLessThan(1);
  });

  it('plant : rien avant la levée, puis il grandit jusqu’à ~2,3 m ; géométrie finie à chaque niveau de détail', () => {
    for (const lod of [0, 1, 2] as const) {
      let prev = 0;
      for (const grow of [0.05, 0.3, 0.65, 1]) {
        const g = new Geo(40000, 150000), cob = new Geo(2000, 4000);
        const h = buildPlant(g, lod === 0 ? cob : null, grow, spec(lod));
        expect(finite(g)).toBe(true);
        expect(finite(cob)).toBe(true);
        if (grow < 0.11) { expect(h).toBe(0); expect(g.nv).toBe(0); continue; }
        expect(g.nv).toBeGreaterThan(0);
        expect(h).toBeGreaterThanOrEqual(prev);
        prev = h;
      }
      expect(prev).toBeGreaterThan(2);
      expect(prev).toBeLessThan(2.7);
    }
  });

  it('épi nu seulement à partir de la floraison ; le plant détaillé tient dans ses tampons', () => {
    const g = new Geo(40000, 150000), cob = new Geo(2000, 4000);
    buildPlant(g, cob, 0.4, spec(0));
    expect(cob.nv).toBe(0);
    g.reset();
    buildPlant(g, cob, 1, spec(0));
    expect(cob.nv).toBeGreaterThan(100);
    expect(g.nv).toBeLessThan(g.maxV * 0.8);
  });

  it('sous terre, grain et herbe : géométries finies', () => {
    for (const grow of [0.02, 0.1, 0.3]) {
      const g = new Geo(40000, 150000);
      buildUnder(g, grow);
      expect(finite(g)).toBe(true);
      if (grow > 0.05) expect(g.nv).toBeGreaterThan(0);
    }
    const k = new Geo(200, 600), h = new Geo(200, 600);
    kernelGeo(k); grassGeo(h);
    expect(k.nv).toBe(9 * 11);
    expect(h.nv).toBe(9 * 12);
    expect(finite(k) && finite(h)).toBe(true);
  });

  it('champ : rangs à 0,8 m, plants à 0,25 m, rien devant le plant principal', () => {
    for (const lite of [true, false]) {
      const L = fieldLayout(lite);
      expect(L.n).toBeGreaterThan(lite ? 500 : 1500);
      expect(L.n).toBeLessThan(lite ? 2000 : 5000);
      for (let i = 0; i < L.n; i++) {
        expect(Math.abs(L.x[i] / 0.8 - Math.round(L.x[i] / 0.8))).toBeLessThan(0.05);
        expect(L.z[i]).toBeLessThan(-2);
        expect(L.v[i]).toBeLessThan(3);
      }
      expect(L.m.every(Number.isFinite)).toBe(true);
      // écart sur le rang : la plupart des voisins à 0,25 m
      const row = [...L.z.filter((_, i) => Math.round(L.x[i] / 0.8) === 1)].sort((a, b) => b - a);
      const gaps = row.slice(1).map((z, i) => row[i] - z);
      const med = gaps.sort((a, b) => a - b)[gaps.length >> 1];
      expect(med).toBeGreaterThan(0.2);
      expect(med).toBeLessThan(0.3);
    }
  });

  it('billons : sommet sur le rang, sillon entre deux rangs, tournière plate', () => {
    expect(ridgeY(0)).toBeCloseTo(0);
    expect(ridgeY(0.4)).toBeCloseTo(-0.07);
    expect(ridgeY(0.4, 0)).toBeCloseTo(0);
  });
});
