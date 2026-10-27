import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { describe, expect, it } from 'vitest';
import type { SatelliteZones } from '../../shared/api/types';
import { BASEMAPS } from '../parcels/ParcelBasemaps';
import type { SatelliteParcel } from './api';
import { outlineCollection, parcelCollection, reliefStyle, tileUrls, zoneCollection } from './reliefStyle';
import { indexColor } from './scale';

const SQUARE: GeoJSON.Polygon = { type: 'Polygon', coordinates: [[[2, 11], [2.1, 11], [2.1, 11.1], [2, 11.1], [2, 11]]] };
const zones: SatelliteZones = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { code: 'alibori', name: 'Alibori' }, geometry: SQUARE },
    { type: 'Feature', properties: { code: 'zou', name: 'Zou' }, geometry: SQUARE },
    { type: 'Feature', properties: { code: 'borgou', name: 'Borgou' }, geometry: SQUARE },
  ],
};
const pt = (ndvi: number | null) => ({ from: '2026-10-01', to: '2026-10-10', ndvi, ndmi: 0.2, valid_pct: 80 });
const series = { alibori: [pt(0.3), pt(0.7)], zou: [pt(null), pt(null)] };
const parcel = (id: string, lon: number): SatelliteParcel => ({
  id, name: `Champ ${id}`, producer: '1000000001', department: 'alibori', lat: 11.05, lon, area_ha: 1, land_type: 'bas_fond',
  tenure: 'propriete', value_chains: [], geometry: SQUARE,
});

describe('tileUrls', () => {
  it("développe {s} en un modèle par sous-domaine (MapLibre n'a pas cette variable)", () => {
    const street = BASEMAPS.find((b) => b.key === 'street')!;
    expect(tileUrls(street)).toEqual(['a', 'b', 'c'].map((s) => `https://${s}.tile.openstreetmap.org/{z}/{x}/{y}.png`));
    const relief = BASEMAPS.find((b) => b.key === 'relief')!;
    expect(tileUrls(relief)).toHaveLength(3);
  });
  it("garde une seule adresse quand il n'y a pas de sous-domaine", () => {
    const sentinel = BASEMAPS.find((b) => b.key === 'sentinel')!;
    expect(tileUrls(sentinel)).toEqual([sentinel.url]);
  });
});

describe('zoneCollection', () => {
  it('colore chaque département avec la valeur du passage choisi', () => {
    const fc = zoneCollection(zones, series, 'ndvi', 1);
    const by = Object.fromEntries(fc.features.map((f) => [f.properties!.code, f.properties!]));
    expect(by.alibori).toMatchObject({ color: indexColor('ndvi', 0.7), measured: true });
  });
  it('marque « sans mesure » un passage nuageux et un département absent des séries, sans inventer de valeur', () => {
    const fc = zoneCollection(zones, series, 'ndvi', 0);
    const by = Object.fromEntries(fc.features.map((f) => [f.properties!.code, f.properties!]));
    expect(by.zou).toMatchObject({ color: indexColor('ndvi', null), measured: false });
    expect(by.borgou).toMatchObject({ color: indexColor('ndvi', null), measured: false });
  });
  it("borne l'index au dernier passage et accepte des zones pas encore chargées", () => {
    expect(zoneCollection(zones, series, 'ndvi', 99).features[0].properties!.color).toBe(indexColor('ndvi', 0.7));
    expect(zoneCollection(undefined, series, 'ndvi', 0).features).toEqual([]);
  });
});

describe('parcelCollection et outlineCollection', () => {
  const list = [parcel('p1', 2.05), parcel('p2', 2.5)];
  it('place chaque point en [longitude, latitude] et marque la parcelle choisie', () => {
    const fc = parcelCollection(list, 'p2');
    expect(fc.features[0].geometry).toEqual({ type: 'Point', coordinates: [2.05, 11.05] });
    expect(fc.features.map((f) => f.properties!.selected)).toEqual([false, true]);
  });
  it('ne dessine un contour que pour la parcelle choisie', () => {
    expect(outlineCollection(list, '').features).toEqual([]);
    expect(outlineCollection(list, 'inconnue').features).toEqual([]);
    expect(outlineCollection(list, 'p1').features).toHaveLength(1);
    expect(outlineCollection(list, 'p1').features[0].geometry).toEqual(SQUARE);
  });
});

describe('reliefStyle', () => {
  it.each(BASEMAPS.map((b) => b.key))('est un style MapLibre valide avec le fond « %s »', (key) => {
    expect(validateStyleMin(reliefStyle(key, 3))).toEqual([]);
  });
  it("plaque l'imagerie sur un relief exagéré, avec l'attribution du fond et celle des altitudes", () => {
    const s = reliefStyle('sentinel', 2.5);
    expect(s.terrain).toEqual({ source: 'dem', exaggeration: 2.5 });
    expect(s.layers.map((l) => l.id)).toEqual(['imagery', 'shade', 'zones-fill', 'zones-line', 'parcel-outline', 'parcels']); // imagerie dessous, indices et parcelles dessus
    expect((s.sources.imagery as { attribution: string }).attribution).toMatch(/EOX/);
    expect(s.sources.dem).toMatchObject({ encoding: 'terrarium' });
    expect((s.sources.dem as { attribution: string }).attribution).toMatch(/SRTM|Mapzen|elevation/i);
  });
  it("a un ciel et une brume pour que l'horizon ne coupe pas net", () => {
    expect(reliefStyle('sentinel', 3).sky).toMatchObject({ 'sky-color': expect.any(String), 'fog-color': expect.any(String) });
  });
});
