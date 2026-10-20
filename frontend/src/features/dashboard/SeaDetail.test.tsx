import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { SeaDetail } from './SeaDetail';

const page = (ui: ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>,
);
const ref = (u: string) => {
  if (u.includes('/ref/value-chains')) return { body: [{ code: 'mais', name: 'Maïs' }, { code: 'riz', name: 'Riz' }] };
  if (u.includes('/ref/departments')) return { body: [{ code: 'alibori', name: 'Alibori', communes: [] }, { code: 'zou', name: 'Zou', communes: [] }] };
  return undefined;
};
const api = (u: string) => {
  if (u.includes('/dashboard/sea/production')) return { body: { source: 'Registre Agri-Digit (prototype, données fictives)', updated_at: null, min_cell: 5, seasons: ['2026-pluie-1'], rows: [
    { value_chain: 'mais', season: '2026-pluie-1', masked: false, producers: 6, parcels: 6, quantity_kg: 9000, yield_kg_ha: 1000 },
    { value_chain: 'riz', season: '2026-pluie-1', masked: true, producers: null, parcels: null, quantity_kg: null, yield_kg_ha: null },
  ] } };
  if (u.includes('/dashboard/sea/workforce')) return { body: { source: 'x', min_cell: 5, by_value_chain: [], by_department: [
    { key: 'alibori', total: 19, f_u35: 6, f_o35: null, m_u35: 5, m_o35: null, masked: true },
  ] } };
  if (u.includes('/dashboard/sea/impact')) return { body: { source: 'x', min_group: 5, window_days: 365, excluded: 1, warning: 'Comparaison non causale : les appuis ne sont pas attribués au hasard.',
    overall: { cells_used: 0, n_treated: null, n_control: null, gap_pct: null, available: false },
    cells: [{ department: 'zou', value_chain: 'mais', season: '2026-pluie-1', n_treated: null, n_control: 3, mean_treated: null, mean_control: null, gap_pct: null, available: false }],
    by_program: [] } };
  return ref(u);
};

describe('Suivi-évaluation détaillé', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('production : une cellule masquée par le serveur n\'est jamais un zéro', async () => {
    mockFetch(api);
    page(<SeaDetail department="" />);
    expect(await screen.findByText('Production par filière et par saison')).toBeInTheDocument();
    expect(await screen.findByText(/9\s?000/)).toBeInTheDocument();
    expect(screen.getAllByText('masqué').length).toBeGreaterThanOrEqual(4); // producteurs, parcelles, récolte, rendement du riz
  });

  it('effectifs : les cases de moins de 5 personnes restent masquées', async () => {
    mockFetch(api);
    page(<SeaDetail department="" />);
    expect(await screen.findByText('Effectifs de producteurs validés')).toBeInTheDocument();
    expect(await screen.findByText('Femmes, moins de 35 ans')).toBeInTheDocument();
    expect(screen.getAllByText('masqué').length).toBeGreaterThanOrEqual(2);
  });

  it('impact : avertissement non causal, « non disponible » sous 5 producteurs par groupe', async () => {
    mockFetch(api);
    page(<SeaDetail department="zou" />);
    expect(await screen.findByText('Comparaison non causale', { selector: 'h3, strong, b, div, span, p' })).toBeInTheDocument();
    expect(screen.getByText(/les appuis ne sont pas attribués au hasard/)).toBeInTheDocument();
    expect(await screen.findByText(/non disponible : il faut au moins 5 producteurs/)).toBeInTheDocument();
    expect(screen.getByText('< 5')).toBeInTheDocument(); // effectif du groupe traité masqué
    expect(screen.getByText(/1 producteur\(s\) ont reçu un appui/)).toBeInTheDocument();
  });
});
