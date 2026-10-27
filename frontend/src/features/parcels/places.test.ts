import { describe, expect, it, vi } from 'vitest';
import type { Department } from '../../shared/api/types';
import { departmentPlaces, findPlaces, nominatimUrl, parseNominatim } from './places';

const deps: Department[] = [
  { code: 'alibori', name: 'Alibori', lat: 11.3, lon: 2.4, communes: [{ code: 'banikoara', name: 'Banikoara' }, { code: 'kandi', name: 'Kandi' }] },
  { code: 'atlantique', name: 'Atlantique', lat: 6.6, lon: 2.2, communes: [{ code: 'abomey-calavi', name: 'Abomey-Calavi' }] },
];

const row = (over: Record<string, unknown> = {}) => ({
  place_id: 1, lat: '10.3075', lon: '1.3775', name: 'Natitingou', display_name: 'Natitingou, Atacora, Bénin',
  boundingbox: ['10.25', '10.36', '1.32', '1.43'], ...over,
});
const answer = (rows: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => rows }) as unknown as Response);

describe('departmentPlaces', () => {
  it('trouve un département sans tenir compte des accents ni des majuscules', () => {
    expect(departmentPlaces(deps, 'ATLANTIQUE').map((p) => p.label)).toEqual(['Atlantique']);
    expect(departmentPlaces(deps, 'alib')[0]).toMatchObject({ label: 'Alibori', lat: 11.3, lon: 2.4, approximate: false });
  });
  it('ne propose rien pour une saisie vide ou trop courte', () => {
    expect(departmentPlaces(deps, '')).toEqual([]);
    expect(departmentPlaces(deps, ' a')).toEqual([]);
  });
  it('replace une commune au centre de son département, en le disant (hors ligne, la position exacte manque)', () => {
    const [p] = departmentPlaces(deps, 'banikoara', { communes: true });
    expect(p).toMatchObject({ label: 'Banikoara', lat: 11.3, lon: 2.4, approximate: true });
    expect(p.detail).toMatch(/Alibori/);
    expect(departmentPlaces(deps, 'banikoara')).toEqual([]); // sans l'option, seuls les départements
  });
});

describe('nominatimUrl', () => {
  it('cherche au Bénin, en français, avec peu de résultats, et encode la saisie', () => {
    const u = new URL(nominatimUrl('Kérou & co'));
    expect(u.origin + u.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(u.searchParams.get('q')).toBe('Kérou & co');
    expect(u.searchParams.get('countrycodes')).toBe('bj');
    expect(u.searchParams.get('format')).toBe('jsonv2');
    expect(u.searchParams.get('accept-language')).toBe('fr');
    expect(Number(u.searchParams.get('limit'))).toBeLessThanOrEqual(8);
  });
});

describe('parseNominatim', () => {
  it("transforme une réponse en lieux avec leur cadre, et écarte ce qui n'a pas de position valable", () => {
    const places = parseNominatim([row(), row({ place_id: 2, lat: 'x' }), { nimportequoi: true }, row({ place_id: 3, boundingbox: undefined, name: '', display_name: 'Pira, Donga, Bénin' })]);
    expect(places).toHaveLength(2);
    expect(places[0]).toMatchObject({ label: 'Natitingou', detail: 'Atacora', lat: 10.3075, lon: 1.3775, approximate: false });
    expect(places[0].bounds).toEqual([[10.25, 1.32], [10.36, 1.43]]);
    expect(places[1]).toMatchObject({ label: 'Pira', detail: 'Donga' });
    expect(places[1].bounds).toBeUndefined();
  });
  it("accepte une réponse qui n'est pas une liste", () => {
    expect(parseNominatim(null)).toEqual([]);
    expect(parseNominatim({ error: 'x' })).toEqual([]);
  });
});

describe('findPlaces', () => {
  it('ne contacte pas le service pour une saisie vide', async () => {
    const f = answer([]);
    expect(await findPlaces('  ', deps, f)).toEqual({ places: [], online: true });
    expect(f).not.toHaveBeenCalled();
  });
  it("met les départements d'abord, puis les lieux du service, sans doublon", async () => {
    const f = answer([row({ name: 'Alibori', display_name: 'Alibori, Bénin' }), row()]);
    const r = await findPlaces('ali', deps, f);
    expect(r.online).toBe(true);
    expect(r.places.map((p) => p.label)).toEqual(['Alibori', 'Natitingou']);
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("n'affiche qu'une fois deux entrées du service qui portent le même nom et le même lieu (commune et ville)", async () => {
    const f = answer([row(), row({ place_id: 9, boundingbox: ['10.2', '10.4', '1.3', '1.5'] }), row({ place_id: 10, name: 'Natitingou', display_name: 'Natitingou, Donga, Bénin' })]);
    const r = await findPlaces('natit', deps, f);
    expect(r.places.map((p) => `${p.label} (${p.detail})`)).toEqual(['Natitingou (Atacora)', 'Natitingou (Donga)']);
    expect(r.places[0].bounds).toEqual([[10.25, 1.32], [10.36, 1.43]]); // on garde la première, la plus pertinente selon le service
  });
  it('retombe sur les départements et les communes quand le service ne répond pas', async () => {
    const r = await findPlaces('kandi', deps, vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    expect(r.online).toBe(false);
    expect(r.places).toHaveLength(1);
    expect(r.places[0]).toMatchObject({ label: 'Kandi', approximate: true });
  });
  it('traite une réponse en erreur (429, 500) comme une absence de réseau', async () => {
    const r = await findPlaces('alibori', deps, answer({ error: 'rate limited' }, false));
    expect(r.online).toBe(false);
    expect(r.places.map((p) => p.label)).toEqual(['Alibori']);
  });
});
