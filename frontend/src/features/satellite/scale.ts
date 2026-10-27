/** Échelles de couleurs des indices satellite. Rampe NDVI reprise du dégradé de la légende (producteur.css). */
export type IndexKind = 'ndvi' | 'ndmi';

/** Sous ce NDVI, un département entre dans « Zones à surveiller ». Repère indicatif, pas un seuil agronomique officiel. */
export const LOW_NDVI = 0.4;

const NO_DATA = '#9AA39C';
const RAMPS: Record<IndexKind, { range: [number, number]; stops: string[] }> = {
  ndvi: { range: [0, 1], stops: ['#C9B79A', '#E2D58A', '#A7CC6E', '#4E8A2B', '#016648'] },
  ndmi: { range: [-0.2, 0.6], stops: ['#C9B79A', '#B9D3D0', '#6FB7C9', '#2F86B5', '#0E4F8B'] },
};

export const indexRange = (kind: IndexKind) => RAMPS[kind].range;
export const indexStops = (kind: IndexKind) => RAMPS[kind].stops;

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);

/** Couleur d'une valeur ; sans mesure (nuages), un gris neutre qui ne ressemble à aucun niveau de végétation. */
export function indexColor(kind: IndexKind, v: number | null): string {
  if (v === null || !Number.isFinite(v)) return NO_DATA;
  const { range: [lo, hi], stops } = RAMPS[kind];
  const t = Math.min(1, Math.max(0, (v - lo) / (hi - lo))) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  const f = t - i;
  if (f === 0) return stops[i];
  if (f === 1) return stops[i + 1];
  const mix = (c: number) => Math.round(channel(stops[i], c) + (channel(stops[i + 1], c) - channel(stops[i], c)) * f);
  return `#${[0, 1, 2].map((c) => mix(c).toString(16).padStart(2, '0')).join('')}`;
}
