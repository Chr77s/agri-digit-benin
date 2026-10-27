import type { Department } from '../../shared/api/types';

/** Un lieu proposé par la recherche. `bounds` = [[sud, ouest], [nord, est]] ; `approximate` : position du centre du département, pas du lieu. */
export interface Place {
  id: string;
  label: string;
  detail: string;
  lat: number;
  lon: number;
  bounds?: [[number, number], [number, number]];
  zoom: number;
  approximate: boolean;
}

const MIN_CHARS = 2;
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Départements dont le nom contient la saisie (sans accents ni majuscules) : fonctionne hors ligne.
 * Avec `communes`, ajoute les communes placées au centre de leur département (leur position exacte n'est pas connue du serveur).
 */
export function departmentPlaces(deps: Department[], q: string, opts: { communes?: boolean } = {}): Place[] {
  const n = plain(q);
  if (n.length < MIN_CHARS) return [];
  const out: Place[] = deps
    .filter((d) => plain(d.name).includes(n))
    .map((d) => ({ id: `dep:${d.code}`, label: d.name, detail: '', lat: d.lat, lon: d.lon, zoom: 9, approximate: false }));
  if (opts.communes) {
    for (const d of deps) {
      for (const c of d.communes) {
        if (plain(c.name).includes(n)) out.push({ id: `com:${c.code}`, label: c.name, detail: d.name, lat: d.lat, lon: d.lon, zoom: 10, approximate: true });
      }
    }
  }
  return out;
}

/** Recherche limitée au Bénin. Le service public d'OpenStreetMap demande une requête par recherche validée, jamais à chaque lettre. */
export const nominatimUrl = (q: string) =>
  `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'bj', limit: '6', 'accept-language': 'fr' })}`;

const num = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN);

export function parseNominatim(rows: unknown): Place[] {
  if (!Array.isArray(rows)) return [];
  const out: Place[] = [];
  rows.forEach((r: Record<string, unknown> | null, i) => {
    const lat = num(r?.lat);
    const lon = num(r?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const parts = String(r?.display_name ?? '').split(',').map((s) => s.trim()).filter((s) => s && s !== 'Bénin');
    const label = String(r?.name || parts[0] || '');
    if (!label) return;
    const detail = (parts[0] === label ? parts.slice(1) : parts).filter((p) => p !== label).slice(-2).join(', ');
    const bb = Array.isArray(r?.boundingbox) ? (r.boundingbox as unknown[]).map(num) : [];
    const bounds = bb.length === 4 && bb.every(Number.isFinite) ? ([[bb[0], bb[2]], [bb[1], bb[3]]] as Place['bounds']) : undefined;
    out.push({ id: `osm:${String(r?.place_id ?? i)}`, label, detail, lat, lon, bounds, zoom: 15, approximate: false });
  });
  return out;
}

/**
 * Départements d'abord (immédiat), puis lieux d'OpenStreetMap. Si le service ne répond pas (hors ligne, limite atteinte),
 * `online` est faux et on propose les départements et les communes (position approximative).
 */
export async function findPlaces(
  q: string, deps: Department[], fetchImpl: typeof fetch = (...a) => fetch(...a), signal?: AbortSignal,
): Promise<{ places: Place[]; online: boolean }> {
  const query = q.trim();
  if (query.length < MIN_CHARS) return { places: [], online: true };
  const local = departmentPlaces(deps, query);
  try {
    const res = await fetchImpl(nominatimUrl(query), { headers: { Accept: 'application/json' }, signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // même nom et même lieu : une seule ligne (OpenStreetMap a souvent une commune et une ville du même nom) ; les départements sont déjà en tête
    const seen = new Set(local.map((p) => plain(p.label)));
    const osm = parseNominatim(await res.json()).filter((p) => {
      const key = `${plain(p.label)}|${plain(p.detail)}`;
      if (seen.has(plain(p.label)) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { places: [...local, ...osm], online: true };
  } catch (e) {
    if (signal?.aborted) throw e; // recherche remplacée par une autre : ce n'est pas une panne
    return { places: [...local, ...departmentPlaces(deps, query, { communes: true }).filter((p) => p.approximate)], online: false };
  }
}
