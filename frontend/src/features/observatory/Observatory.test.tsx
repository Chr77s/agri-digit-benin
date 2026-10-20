import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { ActorsMapPage } from './ActorsMapPage';
import { CoveragePage } from './CoveragePage';
import { ModelQualityPage } from './ModelQualityPage';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));
// Leaflet ne dessine rien sous jsdom : on vérifie les couches, la légende et le tableau, qui portent la même information.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  CircleMarker: ({ children }: { children: ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMap: () => ({ fitBounds: vi.fn() }),
}));

const page = (ui: ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>,
);
const ref = (u: string) => {
  if (u.includes('/ref/value-chains')) return { body: [{ code: 'riz', name: 'Riz' }, { code: 'mais', name: 'Maïs' }] };
  if (u.includes('/ref/departments')) return { body: [{ code: 'alibori', name: 'Alibori', communes: [] }, { code: 'zou', name: 'Zou', communes: [] }] };
  return undefined;
};

const row = (year: number, extra: Record<string, unknown> = {}) => ({
  id: `r${year}`, year, production_t: 90000, consumption_t: 170000, imports_t: 60000, exports_t: null, coverage_pct: 52.9, import_dependency_pct: 35.3,
  coverage_change_pts: -22.1, production_change_pct: -25, consumption_change_pct: 6.3, imports_change_pct: 50, source: 'Données de démonstration (non officielles)', demo: true,
  updated_at: '2026-10-20T08:00:00Z', ...extra,
});
const coverage = (can_edit: boolean) => ({
  thresholds: { coverage_min_pct: 80, imports_rise_pct: 20, production_drop_pct: 15 }, demo_source: 'Données de démonstration (non officielles)', can_edit,
  chains: [{ value_chain: 'riz', series: [row(2024, { coverage_pct: 75, production_change_pct: null, imports_change_pct: null, coverage_change_pts: null }), row(2025)], latest: row(2025) }],
  alerts: [
    { value_chain: 'riz', year: 2025, kind: 'couverture_faible', value: 52.9, threshold: 80, source: 'x', demo: true },
    { value_chain: 'riz', year: 2025, kind: 'production_en_baisse', value: -25, threshold: -15, source: 'x', demo: true },
  ],
});

describe('Couverture de la consommation nationale', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('affiche le bandeau de démonstration, la veille avec ses seuils et « non disponible » pour une valeur absente', async () => {
    auth.user = { id: 'u1', role: 'auditeur_copil' };
    mockFetch((u) => (u.includes('/national-coverage') ? { body: coverage(false) } : ref(u)));
    page(<CoveragePage />);
    expect(await screen.findByText('Données de démonstration (non officielles)', { selector: 'h3, h2, div, strong, b, span' })).toBeInTheDocument();
    expect(screen.getByText(/Couverture de 52,9 % \(seuil : 80 %\)/)).toBeInTheDocument();
    expect(screen.getByText(/Production en baisse de 25 % sur un an \(seuil : 15 %\)/)).toBeInTheDocument();
    expect(screen.getByText(/Seuils : couverture sous 80 %/)).toBeInTheDocument();
    expect(screen.getAllByText('non disponible').length).toBeGreaterThan(0); // exportations jamais saisies : pas de zéro
    expect(screen.queryByRole('form', { name: 'Saisir ou corriger une statistique' })).not.toBeInTheDocument(); // lecture seule
  });

  it('administration : la source est obligatoire, puis la ligne part au serveur avec les valeurs inconnues à null', async () => {
    auth.user = { id: 'u2', role: 'admin_maep' };
    let posted: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.includes('/national-coverage') && init?.method === 'POST') { posted = JSON.parse(String(init.body)); return { status: 201, body: coverage(true) }; }
      if (u.includes('/national-coverage')) return { body: coverage(true) };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<CoveragePage />);
    const form = within(await screen.findByRole('form', { name: 'Saisir ou corriger une statistique' }));
    await user.selectOptions(form.getByLabelText('Filière'), 'riz');
    await user.type(form.getByLabelText(/^Production/), '1000');
    await user.click(form.getByRole('button', { name: 'Enregistrer' }));
    expect(await form.findByText('Indiquez la source du chiffre.')).toBeInTheDocument();
    expect(posted).toBeNull();
    await user.type(form.getByLabelText(/^Source/), 'Annuaire statistique du MAEP, 2025');
    await user.click(form.getByRole('button', { name: 'Enregistrer' }));
    await vi.waitFor(() => expect(posted).toMatchObject({ value_chain: 'riz', production_t: 1000, consumption_t: null, imports_t: null, exports_t: null, source: 'Annuaire statistique du MAEP, 2025' }));
  });

  it('administration : un lot JSON invalide est refusé avant tout envoi', async () => {
    auth.user = { id: 'u2', role: 'admin_maep' };
    mockFetch((u) => (u.includes('/national-coverage') ? { body: coverage(true) } : ref(u)));
    const user = userEvent.setup();
    page(<CoveragePage />);
    const form = within(await screen.findByRole('form', { name: 'Importer un lot (JSON)' }));
    await user.click(form.getByLabelText('Lot JSON'));
    await user.paste('pas du json');
    await user.click(form.getByRole('button', { name: 'Importer' }));
    expect(await form.findByText("Ce texte n'est pas un JSON valide.")).toBeInTheDocument();
  });
});

const collection = {
  type: 'FeatureCollection',
  layers: [
    { id: 'sites', label: 'Sites', chain_filter: false, count: 1 },
    { id: 'cooperatives', label: 'Coopératives', chain_filter: true, count: 2 },
    { id: 'parcels', label: 'Parcelles', chain_filter: true, count: 1, truncated: true },
  ],
  filters: { department: null, value_chain: null },
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [2.938, 11.134] }, properties: { layer: 'sites', id: 's1', kind: 'magasin', name: 'Magasin de Kandi', department: 'alibori', commune: 'kandi', capacity_t: 200 } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [2.4, 11.3] }, properties: { layer: 'cooperatives', department: 'alibori', precision: 'departement', count: 2, names: ['Coopérative A', 'Coopérative B'], by_tag: { cooperative: 2 } } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [2.43, 11.31] }, properties: { layer: 'parcels', producer: 'AGR-0001', department: 'alibori', area_ha: 1.2, value_chains: ['mais'] } },
  ],
};

describe('Carte des acteurs', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('une case par couche, légende, et jamais de nom de personne', async () => {
    auth.user = { id: 'u1', role: 'admin_maep' };
    mockFetch((u) => (u.includes('/map/actors') ? { body: collection } : ref(u)));
    const user = userEvent.setup();
    page(<ActorsMapPage />);
    expect(await screen.findByText('Magasin de Kandi', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Sites/ })).toBeChecked();
    expect(screen.getAllByText('Placé au centre du département, pas à l\'adresse exacte.').length).toBeGreaterThan(0); // légende et fenêtre d'information
    expect(screen.getByText(/Couche limitée aux premières parcelles/)).toBeInTheDocument();
    expect(screen.getByText('Coopérative A, Coopérative B', { selector: 'td' })).toBeInTheDocument();
    expect(screen.getByText('Producteur AGR-0001', { selector: 'td' })).toBeInTheDocument(); // le code, pas le nom
    expect(screen.getAllByTestId('marker')).toHaveLength(3);
    await user.click(screen.getByRole('checkbox', { name: /Coopératives/ }));
    expect(screen.queryByText('Coopérative A, Coopérative B', { selector: 'td' })).not.toBeInTheDocument();
    expect(screen.getAllByTestId('marker')).toHaveLength(2);
  });

  it('envoie les filtres filière et département au serveur', async () => {
    auth.user = { id: 'u1', role: 'responsable_programme' };
    const urls: string[] = [];
    mockFetch((u) => { if (u.includes('/map/actors')) { urls.push(u); return { body: collection }; } return ref(u); });
    const user = userEvent.setup();
    page(<ActorsMapPage />);
    await screen.findByText('Magasin de Kandi', { selector: 'td' });
    await user.selectOptions(screen.getByLabelText('Filière'), 'mais');
    await user.selectOptions(screen.getByLabelText('Département'), 'zou');
    await vi.waitFor(() => expect(urls.at(-1)).toContain('department=zou'));
    expect(urls.at(-1)).toContain('value_chain=mais');
    expect(screen.getByText('Le filtre par filière ne s\'applique pas à cette couche.')).toBeInTheDocument();
  });

  it('un agent n\'a pas de filtre département : le serveur le borne à son secteur', async () => {
    auth.user = { id: 'u3', role: 'agent_atda', department: 'alibori' };
    mockFetch((u) => (u.includes('/map/actors') ? { body: collection } : ref(u)));
    page(<ActorsMapPage />);
    await screen.findByText('Magasin de Kandi', { selector: 'td' });
    expect(screen.queryByLabelText('Département')).not.toBeInTheDocument();
  });
});

const share = (value: number | null, n: number) => ({ value, n, reliable: n >= 30 });
const quality = {
  min_n: 5, reliable_n: 30,
  models: [
    { id: 'diagnostic', simulated: true, total: 3, threshold: 0.6, escalated_share: share(null, 3), escalated_low_confidence: 1, escalated_by_producer: 1, reviewed: 3, confirmed_share: share(null, 3), corrected: 0, trend: [{ month: '2026-10', total: 3, escalated: 2, reviewed: 3, confirmed: 3, confirmed_share: null }] },
    { id: 'rendement', simulated: false, overall: { n: 8, reliable: false, mae_kg: 425, mape_pct: 43.8, bias_pct: 43.8 }, verified: { n: 3, reliable: false, mae_kg: null, mape_pct: null, bias_pct: null },
      by_value_chain: [{ value_chain: 'mais', n: 8, reliable: false, mae_kg: 425, mape_pct: 43.8, bias_pct: 43.8 }], declaration_gap: { n: 2, mean_pct: null }, demo_reference: true },
    { id: 'credit', simulated: false, measurable: false, reason: 'aucune issue de crédit : aucune échéance échue', debtors: 0, due: 0, min_due: 30, paid_share: null, bands: [] },
  ],
  not_measured: [{ id: 'sols', reason: 'Lecture par seuils généraux non validés.' }],
};

describe('Qualité des modèles', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('dit ce qui est simulé, ce qui manque de cas et ce qui n\'est pas mesurable, sans chiffre inventé', async () => {
    auth.user = { id: 'u1', role: 'agronome_inrab' };
    mockFetch((u) => (u.includes('/models/quality') ? { body: quality } : ref(u)));
    page(<ModelQualityPage />);
    expect(await screen.findByText(/Le diagnostic est une simulation/)).toBeInTheDocument();
    expect(screen.getAllByText('non disponible').length).toBeGreaterThanOrEqual(2); // 3 cas seulement : pas de taux
    expect(screen.getAllByText('n = 3').length).toBeGreaterThan(0);
    expect(screen.getByText(/rendements de référence sont des valeurs de démonstration/)).toBeInTheDocument();
    expect(screen.getAllByText('indicative').length).toBeGreaterThan(0); // 8 cas : sous le seuil de fiabilité
    expect(screen.getByText('Non mesurable : aucune issue de crédit : aucune échéance échue')).toBeInTheDocument();
    expect(screen.getByText('Lecture des analyses de sol')).toBeInTheDocument();
  });
});
