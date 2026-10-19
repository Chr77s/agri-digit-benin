// Prévisions SIMULÉES : aucun modèle ni aucune donnée réelle (pluie, NDVI, rendements) n'est branché.
// Générateur déterministe (même filière + même lieu = mêmes chiffres) pour que la démonstration reste stable.
// shortcut: chiffres inventés et étiquetés « Simulé » ; à remplacer par l'API d'un vrai modèle quand elle existera.

export type Level = 'faible' | 'modere' | 'eleve';
export const RISKS = ['drought', 'flood', 'pests'] as const;
export type Risk = (typeof RISKS)[number];

/** Graine 32 bits d'une chaîne (FNV-1a), puis suite pseudo-aléatoire mulberry32. */
export function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface YieldPoint { year: number; value: number; low?: number; high?: number; forecast: boolean }
/** Cinq campagnes passées puis deux prévues (avec fourchette), en t/ha. */
export function yieldSeries(vc: string, place: string, lastYear: number): YieldPoint[] {
  const r = rng(`${vc}|${place}|yield`);
  const base = 1.2 + r() * 1.2;
  const pts: YieldPoint[] = [];
  for (let y = lastYear - 6; y <= lastYear - 2; y++) pts.push({ year: y, value: round1(base + (r() - 0.4) * 0.5), forecast: false });
  for (let y = lastYear - 1; y <= lastYear; y++) {
    const v = round1(base + 0.15 + (r() - 0.3) * 0.4);
    const spread = 0.2 + 0.1 * (y - lastYear + 2);
    pts.push({ year: y, value: v, low: round1(v - spread), high: round1(v + spread), forecast: true });
  }
  return pts;
}

export interface CommuneRisk { code: string; name: string; drought: Level; flood: Level; pests: Level; yield: number | null }
const level = (x: number): Level => (x > 0.8 ? 'eleve' : x > 0.55 ? 'modere' : 'faible');
export function communeRisks(vc: string, communes: { code: string; name: string }[]): CommuneRisk[] {
  return communes.map((c) => {
    const r = rng(`${vc}|${c.code}|risk`);
    const drought = level(r()); const flood = level(r()); const pests = level(r());
    // Une commune sur huit environ : trop peu de parcelles tracées pour estimer un rendement.
    const y = r() < 0.12 ? null : round1(1.4 + r());
    return { code: c.code, name: c.name, drought, flood, pests, yield: y };
  });
}
