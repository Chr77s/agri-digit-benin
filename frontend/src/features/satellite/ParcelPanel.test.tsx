import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import type { SatelliteParcel } from './api';
import { ParcelCard } from './ParcelCard';
import { ParcelSearch } from './ParcelSearch';

const GEOM: GeoJSON.Polygon = { type: 'Polygon', coordinates: [[[2, 11], [2.1, 11], [2.1, 11.1], [2, 11.1], [2, 11]]] };
const parcel = (over: Partial<SatelliteParcel> = {}): SatelliteParcel => ({
  id: 'p1', name: 'Champ du marigot', producer: '1000000001', department: 'alibori', lat: 11.05, lon: 2.05, area_ha: 1.25,
  land_type: 'bas_fond', tenure: 'propriete', value_chains: ['mais'], geometry: GEOM, ...over,
});
const point = (ndvi: number | null, ndmi: number | null) => ({ from: '2026-10-01', to: '2026-10-10', ndvi, ndmi, valid_pct: ndvi === null ? 5 : 80 });
const sat = (scope: 'parcel' | 'department', pts: ReturnType<typeof point>[], simulated = false) => ({
  source: 'Copernicus', simulated, scope, results: [], series: { [scope === 'parcel' ? 'p1' : 'alibori']: pts },
});
const api = (satellite: unknown) => (u: string) => {
  if (u.includes('/ref/value-chains')) return { body: [{ code: 'mais', name: 'Maïs' }, { code: 'riz', name: 'Riz' }] };
  if (u.includes('/ref/departments')) return { body: [{ code: 'alibori', name: 'Alibori', communes: [] }] };
  if (u.includes('/parcels/p1/satellite')) return { body: satellite };
  return undefined;
};

describe('Fiche de la parcelle choisie', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("décrit la parcelle et lit les indices du passage affiché, avec leur sens en toutes lettres", async () => {
    mockFetch(api(sat('parcel', [point(0.4, 0.1), point(0.61, 0.22)])));
    renderApp(<ParcelCard parcel={parcel()} index={1} onClose={() => undefined} canOpenList={false} />);
    expect(screen.getByRole('heading', { name: 'Champ du marigot' })).toBeInTheDocument();
    expect(screen.getByText('Producteur 1000000001')).toBeInTheDocument();
    expect(await screen.findByText('Alibori')).toBeInTheDocument(); // le nom arrive avec la liste des départements
    expect(screen.getByText('1,25 ha')).toBeInTheDocument();
    expect(screen.getByText('Bas-fond')).toBeInTheDocument();
    expect(screen.getByText('Propriété')).toBeInTheDocument();
    expect(await screen.findByText('Maïs')).toBeInTheDocument();
    expect(await screen.findByText('0,61 : végétation vigoureuse')).toBeInTheDocument(); // le passage 1, pas le passage 0
    expect(screen.getByText('0,22 : humidité moyenne')).toBeInTheDocument();
    expect(screen.getByText('Mesure sur le tracé de la parcelle.')).toBeInTheDocument();
  });

  it("dit « Nuageux » sans valeur inventée et précise quand les indices sont ceux du département", async () => {
    mockFetch(api(sat('department', [point(null, null)], true)));
    renderApp(<ParcelCard parcel={parcel({ value_chains: [] })} index={0} onClose={() => undefined} canOpenList={false} />);
    expect(await screen.findAllByText('Nuageux')).toHaveLength(2);
    expect(screen.getByText(/indices du département \(Alibori\)/)).toBeInTheDocument();
    expect(screen.getByText(/Valeurs de démonstration/)).toBeInTheDocument();
    expect(screen.getByText('Aucune campagne')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/NaN|undefined/);
  });

  it("se ferme par la croix et n'offre « Voir mes parcelles » qu'au producteur", async () => {
    mockFetch(api(sat('parcel', [point(0.5, 0.2)])));
    const onClose = vi.fn();
    const first = renderApp(<ParcelCard parcel={parcel()} index={0} onClose={onClose} canOpenList={false} />);
    expect(screen.queryByRole('link', { name: 'Voir mes parcelles' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Fermer la fiche de la parcelle' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    first.unmount();
    renderApp(<ParcelCard parcel={parcel()} index={0} onClose={onClose} canOpenList />);
    expect(screen.getByRole('link', { name: 'Voir mes parcelles' })).toHaveAttribute('href', '/parcelles');
  });
});

describe('Recherche de parcelle', () => {
  afterEach(() => vi.unstubAllGlobals());
  const list = [parcel(), parcel({ id: 'p2', name: 'Bas-fond de Kandi', producer: '1000000002', value_chains: ['riz'] })];

  it('filtre sans tenir compte des accents ni des majuscules, par nom ou par filière, et choisit au clic', async () => {
    mockFetch(api(undefined));
    const onPick = vi.fn();
    renderApp(<ParcelSearch parcels={list} onPick={onPick} />);
    const box = screen.getByRole('searchbox', { name: 'Rechercher une parcelle' });
    await userEvent.type(box, 'MAÏS');
    expect(await screen.findByRole('button', { name: /Champ du marigot/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Kandi/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Champ du marigot/ }));
    expect(onPick).toHaveBeenCalledWith('p1');
    expect(box).toHaveValue('');
  });

  it("annonce l'absence de résultat, et ne s'affiche pas sans parcelle", async () => {
    mockFetch(api(undefined));
    const first = renderApp(<ParcelSearch parcels={list} onPick={() => undefined} />);
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByRole('status')).toHaveTextContent('Aucune parcelle ne correspond.');
    first.unmount();
    const { container } = renderApp(<ParcelSearch parcels={[]} onPick={() => undefined} />);
    expect(container.querySelector('.sat-search')).toBeNull();
  });
});
