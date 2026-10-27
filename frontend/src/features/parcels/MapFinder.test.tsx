import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type L from 'leaflet';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { MapFinder } from './MapFinder';

const DEPARTMENTS = [
  { code: 'alibori', name: 'Alibori', lat: 11.3, lon: 2.4, communes: [{ code: 'kandi', name: 'Kandi' }] },
  { code: 'atacora', name: 'Atacora', lat: 10.3, lon: 1.4, communes: [] },
];
const OSM = [{ place_id: 7, lat: '10.3075', lon: '1.3775', name: 'Natitingou', display_name: 'Natitingou, Atacora, Bénin', boundingbox: ['10.25', '10.36', '1.32', '1.43'] }];

/** Carte simulée : le composant ne lui demande que de se déplacer et d'accueillir des couches. */
const fakeMap = () => ({ flyTo: vi.fn(), fitBounds: vi.fn(), addLayer: vi.fn(), removeLayer: vi.fn() });
const setup = (osm: (() => unknown) | 'down' = () => OSM) => {
  const fetchSpy = mockFetch((u) => {
    if (u.includes('/ref/departments')) return { body: DEPARTMENTS };
    if (u.includes('nominatim')) {
      if (osm === 'down') throw new TypeError('Failed to fetch');
      return { body: osm() };
    }
    return undefined;
  });
  const map = fakeMap();
  const onNavigate = vi.fn();
  renderApp(<MapFinder map={map as unknown as L.Map} onNavigate={onNavigate} />);
  return { map, onNavigate, fetchSpy };
};
const osmCalls = (f: ReturnType<typeof vi.fn>) => f.mock.calls.filter(([u]) => String(u).includes('nominatim')).length;

describe('MapFinder : recherche de lieu', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('propose un département dès la frappe, sans interroger le service en ligne, et y place la carte', async () => {
    const { map, onNavigate, fetchSpy } = setup();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Rechercher un lieu' }), 'alib');
    await userEvent.click(await screen.findByRole('button', { name: /Alibori/ }));
    expect(map.flyTo).toHaveBeenCalledWith([11.3, 2.4], 9);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(osmCalls(fetchSpy)).toBe(0);
  });

  it("cherche un village en ligne à la validation (une seule requête) et cadre la carte sur le lieu choisi", async () => {
    const { map, fetchSpy } = setup();
    const box = screen.getByRole('searchbox', { name: 'Rechercher un lieu' });
    await userEvent.type(box, 'Natitingou{Enter}');
    await userEvent.click(await screen.findByRole('button', { name: /Natitingou/ }));
    expect(osmCalls(fetchSpy)).toBe(1);
    expect(map.fitBounds).toHaveBeenCalledWith([[10.25, 1.32], [10.36, 1.43]], { maxZoom: 17, padding: [24, 24] });
    expect(box).toHaveValue('Natitingou');
  });

  it("dit qu'aucun lieu ne correspond", async () => {
    setup(() => []);
    await userEvent.type(screen.getByRole('searchbox'), 'zzzz{Enter}');
    expect(await screen.findByText(/Aucun lieu trouvé/)).toBeInTheDocument();
  });

  it('hors ligne : prévient et propose le département et la commune, avec une position approximative', async () => {
    setup('down');
    await userEvent.type(screen.getByRole('searchbox'), 'kandi{Enter}');
    expect(await screen.findByText(/Recherche en ligne indisponible/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kandi.*position approximative/ })).toBeInTheDocument();
  });
});

describe('MapFinder : ma position', () => {
  afterEach(() => { vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'geolocation'); });
  const geo = (impl: (ok: PositionCallback, ko: PositionErrorCallback) => void) =>
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: impl } });

  it('centre la carte sur la position et annonce la précision', async () => {
    geo((ok) => ok({ coords: { latitude: 10.31, longitude: 1.38, accuracy: 12.4 } } as GeolocationPosition));
    const { map, onNavigate } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Ma position' }));
    await waitFor(() => expect(map.flyTo).toHaveBeenCalled());
    expect(map.flyTo.mock.calls[0][1]).toBe(17);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/à environ 12 m près/)).toBeInTheDocument();
  });

  it.each([
    [1, /Position refusée/],
    [2, /Position introuvable/],
    [3, /met trop de temps/],
  ])("explique l'échec (code %i) sans déplacer la carte", async (code, message) => {
    geo((_ok, ko) => ko({ code } as GeolocationPositionError));
    const { map, onNavigate } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Ma position' }));
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(map.flyTo).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("dit que l'appareil ne donne pas sa position quand le navigateur ne sait pas la lire", async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Ma position' }));
    expect(await screen.findByText(/ne donne pas sa position/)).toBeInTheDocument();
  });
});
