import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { ClimatePage } from './ClimatePage';
import { LandsPage } from './LandsPage';
import { SchemesPage } from './SchemesPage';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const page = (ui: ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>,
);
const ref = (u: string) => (u.includes('/ref/') ? { body: [] } : undefined);
const scheme = {
  id: 's1', name: 'Bas-fond de Founougo', kind: 'bas_fond', department: 'alibori', commune: 'banikoara', lat: null, lon: null, area_available_ha: 120, area_arable_ha: 90, area_used_ha: 40,
  status: 'a_rehabiliter', created_at: '2026-10-01T10:00:00Z',
  works: [{ id: 'w1', scheme: 's1', type: 'rehabilitation', title: 'Curage des canaux', status: 'planifie', planned_on: null, started_on: null, finished_on: null, cost_xof: 8000000, contractor: '', progress_pct: 0, notes: '', created_at: '2026-10-02T10:00:00Z' }],
};

describe('Terres et aménagements', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('agent : voit l’aménagement à réhabiliter et démarre ses travaux', async () => {
    auth.user = { id: 'u1', role: 'agent_atda', department: 'alibori' };
    let patched: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.includes('/works/w1') && init?.method === 'PATCH') { patched = JSON.parse(String(init.body)); return { body: {} }; }
      if (u.includes('/schemes')) return { body: { results: [scheme] } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<SchemesPage />);
    expect(await screen.findByText('Bas-fond de Founougo')).toBeInTheDocument();
    expect(screen.getByText('À réhabiliter')).toBeInTheDocument();
    expect(screen.getByText(/Disponible : 120 ha/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Démarrer' }));
    await vi.waitFor(() => expect(patched).toEqual({ status: 'en_cours' }));
  });

  it('producteur : déclare la superficie exploitable d’une parcelle', async () => {
    auth.user = { id: 'u2', role: 'producteur' };
    let patched: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.includes('/parcels/p1') && init?.method === 'PATCH') { patched = JSON.parse(String(init.body)); return { body: {} }; }
      if (u.includes('/parcels')) return { body: [{ id: 'p1', name: 'Champ 1', land_type: 'pluvial_plateau', tenure: 'coutumier', area_ha: 4, arable_ha: null, overlap_warning: false, overlap_with: [], geometry: {} }] };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<LandsPage />);
    expect(await screen.findByText(/Superficie mesurée : 4 ha/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Superficie exploitable/), '3,5');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await vi.waitFor(() => expect(patched).toEqual({ arable_ha: 3.5 }));
  });

  it('producteur : lit ses risques climatiques et le conseil qui va avec', async () => {
    auth.user = { id: 'u2', role: 'producteur' };
    mockFetch((u) => {
      if (u.includes('/climate-risks')) return { body: { results: [{
        parcel: 'p1', name: 'Champ 1', value_chain: 'mais', stage: 'floraison', land_type: 'pluvial_plateau', source: 'Open-Meteo (données ouvertes)', simulated: false, updated_at: '2026-10-20T08:00:00Z',
        risks: { stress_hydrique: { level: 'eleve', coverage: 0.2, rain_mm: 16, need_mm: 80 }, secheresse: { level: 'eleve', dry_days: 14, rain_next_3d_mm: 0 }, inondation: { level: 'faible', max_3d_mm: 0 } },
        advice: ['Plusieurs jours sans pluie utile : évitez de semer ou de repiquer avant le retour des pluies.'],
      }] } };
      return ref(u);
    });
    page(<ClimatePage />);
    expect(await screen.findByText('Champ 1')).toBeInTheDocument();
    expect(screen.getByText('14 jours de suite sans pluie utile.')).toBeInTheDocument();
    expect(screen.getAllByText('Élevé')).toHaveLength(2);
    expect(screen.getByText(/évitez de semer/)).toBeInTheDocument();
  });
});
