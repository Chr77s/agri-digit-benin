import type { StyleSpecification } from 'maplibre-gl';
import type { SatellitePoint, SatelliteZones } from '../../shared/api/types';
import { BASEMAPS, type Basemap } from '../parcels/ParcelBasemaps';
import type { SatelliteParcel } from './api';
import { indexColor, type IndexKind } from './scale';
import { TERRARIUM } from './terrain';

type Fc<G extends GeoJSON.Geometry = GeoJSON.Geometry> = GeoJSON.FeatureCollection<G, Record<string, unknown>>;

/** MapLibre ne connaît pas `{s}` : un modèle par sous-domaine. */
export function tileUrls(b: (typeof BASEMAPS)[number]): string[] {
  return b.url.includes('{s}') ? (b.subdomains ?? 'abc').split('').map((s) => b.url.replace('{s}', s)) : [b.url];
}

/** Départements colorés par l'indice du passage choisi ; sans mesure (nuages, série absente), une couleur neutre et `measured: false`. */
export function zoneCollection(zones: SatelliteZones | undefined, series: Record<string, SatellitePoint[]>, kind: IndexKind, index: number): Fc {
  return {
    type: 'FeatureCollection',
    features: (zones?.features ?? []).map((f) => {
      const pts = series[f.properties.code];
      const v = pts ? (pts[Math.min(index, pts.length - 1)]?.[kind] ?? null) : null;
      return { type: 'Feature', geometry: f.geometry, properties: { code: f.properties.code, color: indexColor(kind, v), measured: v !== null } };
    }),
  };
}

export const parcelCollection = (parcels: SatelliteParcel[], selected: string): Fc<GeoJSON.Point> => ({
  type: 'FeatureCollection',
  features: parcels.map((p) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] }, properties: { id: p.id, name: p.name, selected: p.id === selected },
  })),
});

/** Le contour de la seule parcelle choisie. */
export const outlineCollection = (parcels: SatelliteParcel[], selected: string): Fc => ({
  type: 'FeatureCollection',
  features: parcels.filter((p) => p.id === selected).map((p) => ({ type: 'Feature', geometry: p.geometry, properties: { id: p.id } })),
});

const EMPTY: Fc = { type: 'FeatureCollection', features: [] };

/** Imagerie satellite plaquée sur le relief réel (tuiles Terrarium), ombrage, ciel et brume ; indices et parcelles par-dessus. */
export function reliefStyle(basemap: Basemap, exaggeration: number): StyleSpecification {
  const b = BASEMAPS.find((x) => x.key === basemap) ?? BASEMAPS[0];
  // shortcut: pas de typage fin des expressions (l'union de MapLibre fait exploser tsc) ; `validateStyleMin` le vérifie dans reliefStyle.test.ts
  return {
    version: 8,
    sources: {
      imagery: { type: 'raster', tiles: tileUrls(b), tileSize: 256, maxzoom: b.maxNativeZoom ?? b.maxZoom, attribution: b.attribution },
      dem: {
        type: 'raster-dem', tiles: [TERRARIUM], tileSize: 256, maxzoom: 12, encoding: 'terrarium',
        attribution: 'Altitudes : Mapzen / AWS Terrain Tiles (SRTM, USGS, données ouvertes)',
      },
      // une source distincte pour l'ombrage : MapLibre déconseille de partager celle du relief
      'dem-shade': { type: 'raster-dem', tiles: [TERRARIUM], tileSize: 256, maxzoom: 12, encoding: 'terrarium' },
      zones: { type: 'geojson', data: EMPTY },
      outline: { type: 'geojson', data: EMPTY },
      parcels: { type: 'geojson', data: EMPTY },
    },
    layers: [
      { id: 'imagery', type: 'raster', source: 'imagery' },
      { id: 'shade', type: 'hillshade', source: 'dem-shade', paint: { 'hillshade-exaggeration': 0.55, 'hillshade-shadow-color': '#0F2A1A', 'hillshade-highlight-color': '#FFFFFF', 'hillshade-illumination-direction': 315 } },
      // l'indice s'efface en s'approchant, pour laisser voir l'imagerie à l'échelle de la parcelle
      { id: 'zones-fill', type: 'fill', source: 'zones', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, ['case', ['get', 'measured'], 0.6, 0.2], 11, ['case', ['get', 'measured'], 0.15, 0.05]] } },
      { id: 'zones-line', type: 'line', source: 'zones', paint: { 'line-color': '#0A2415', 'line-width': 1.2, 'line-opacity': 0.8 } },
      { id: 'parcel-outline', type: 'line', source: 'outline', paint: { 'line-color': '#F3C54A', 'line-width': 3 } },
      {
        id: 'parcels', type: 'circle', source: 'parcels',
        paint: { 'circle-radius': ['case', ['get', 'selected'], 9, 6], 'circle-color': ['case', ['get', 'selected'], '#F3C54A', '#F6732F'], 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 },
      },
    ],
    terrain: { source: 'dem', exaggeration },
    sky: {
      'sky-color': '#7FA8C9', 'sky-horizon-blend': 0.5, 'horizon-color': '#E9E4D4', 'horizon-fog-blend': 0.6,
      'fog-color': '#D8DFD2', 'fog-ground-blend': 0.3, 'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0],
    },
  } as unknown as StyleSpecification;
}
