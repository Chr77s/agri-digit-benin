import { act, cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { GpsTrace } from './GpsTrace';
import { areaHa, distanceM, lengthM, type LonLat } from './shape';

// carré d'environ 100 m de côté près de Banikoara (1 ha)
const LAT = 11.3;
const dLat = 100 / 111_195;
const dLon = 100 / (111_195 * Math.cos((LAT * Math.PI) / 180));
const SQUARE: LonLat[] = [[2.43, LAT], [2.43 + dLon, LAT], [2.43 + dLon, LAT + dLat], [2.43, LAT + dLat]];

describe('Géométrie du tracé', () => {
  it('mesure distance, périmètre et surface', () => {
    expect(distanceM(SQUARE[0], SQUARE[1])).toBeCloseTo(100, 0);
    expect(lengthM(SQUARE, true)).toBeCloseTo(400, -1);
    expect(areaHa(SQUARE)).toBeCloseTo(1, 1);
    expect(areaHa(SQUARE.slice(0, 2))).toBe(0);
  });
});

describe('Tracé GPS en marchant', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'geolocation'); });

  it('garde les points précis, ferme le contour et enregistre la parcelle', async () => {
    let push: (lon: number, lat: number, acc: number) => void = () => undefined;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: (ok: PositionCallback) => { push = (lon, lat, accuracy) => ok({ coords: { longitude: lon, latitude: lat, accuracy } } as GeolocationPosition); return 1; },
        clearWatch: vi.fn(),
      },
    });
    const posts: Record<string, unknown>[] = [];
    mockFetch((u, init) => {
      if (init?.method === 'POST' && u.endsWith('/parcels')) { const b = JSON.parse(String(init.body)); posts.push(b); return { status: 201, body: { ...b, id: 'p9', area_ha: 1.0, overlap_warning: false, overlap_with: [] } }; }
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    const user = userEvent.setup();
    renderApp(<GpsTrace />);
    expect(screen.getByRole('button', { name: 'Terminer' })).toBeDisabled();
    act(() => push(2.43, LAT, 60)); // trop imprécis : ignoré
    expect(screen.getByText(/attendez qu'elle passe sous ± 20 m/)).toBeInTheDocument();
    act(() => { for (const [lon, lat] of SQUARE) push(lon, lat, 4); push(2.43, LAT + dLat + 0.000001, 4); }); // le dernier : moins de 3 m, ignoré
    expect(screen.getByRole('img', { name: 'Contour du champ : 4 points relevés' })).toBeInTheDocument();
    expect(screen.getByText('± 4 m')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Terminer' }));
    expect(screen.getByText(/Contour fermé et mesuré/)).toBeInTheDocument();
    expect(screen.getAllByText(/ha/, { selector: 'dd' })[0].textContent).toMatch(/^(0,99|1(,0\d?)?)\s*ha$/u);

    await user.click(screen.getByRole('button', { name: /Enregistrer/ }));
    expect(posts).toHaveLength(0); // nom, terrain et statut foncier manquent
    await user.type(screen.getByLabelText(/Nom/), 'Champ de Founougo');
    await user.selectOptions(screen.getByLabelText(/terrain/i), 'pluvial_plateau');
    await user.click(screen.getByRole('button', { name: /coutumier/i }));
    await user.click(screen.getByRole('button', { name: /Enregistrer/ }));
    expect(await screen.findByText('Parcelle enregistrée', { selector: 'h1' })).toBeInTheDocument();
    expect(posts[0]).toMatchObject({ name: 'Champ de Founougo', land_type: 'pluvial_plateau', tenure: 'coutumier' });
    expect((posts[0].geometry as { coordinates: number[][][] }).coordinates[0]).toHaveLength(5);
  });
});
