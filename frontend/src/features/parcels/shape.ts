import turfArea from '@turf/area';
import type { GeoPolygon } from '../../shared/api/types';

export type LonLat = [number, number];

const R = 6_371_008.8; // rayon terrestre moyen (m)
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance au sol entre deux points (haversine), en mètres. */
export function distanceM(a: LonLat, b: LonLat): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Longueur d'une ligne de points (ouverte), ou du contour si `closed`. */
export function lengthM(pts: LonLat[], closed = false): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += distanceM(pts[i - 1], pts[i]);
  return closed && pts.length > 2 ? s + distanceM(pts[pts.length - 1], pts[0]) : s;
}

/** Polygone GeoJSON fermé à partir des points relevés (au moins 3). */
export function toPolygon(pts: LonLat[]): GeoPolygon | null {
  return pts.length < 3 ? null : { type: 'Polygon', coordinates: [[...pts, pts[0]]] };
}

export function areaHa(pts: LonLat[]): number {
  const g = toPolygon(pts);
  return g ? turfArea({ type: 'Feature', properties: {}, geometry: g }) / 10_000 : 0;
}

/** Points d'un contour projetés dans une boîte `w` x `h` (marge comprise), nord en haut. */
export function fitPoints(pts: LonLat[], w: number, h: number, pad = 8): [number, number][] {
  if (!pts.length) return [];
  const k = Math.cos(rad(pts[0][1]));
  const xs = pts.map((p) => p[0] * k);
  const ys = pts.map((p) => -p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min((w - 2 * pad) / (x1 - x0 || 1), (h - 2 * pad) / (y1 - y0 || 1));
  const ox = (w - (x1 - x0) * s) / 2;
  const oy = (h - (y1 - y0) * s) / 2;
  return xs.map((x, i) => [ox + (x - x0) * s, oy + (ys[i] - y0) * s]);
}

/** Contour d'une parcelle enregistrée (premier anneau, sans le point de fermeture). */
export const ringOf = (g: GeoPolygon): LonLat[] => (g.coordinates[0] ?? []).slice(0, -1) as LonLat[];
