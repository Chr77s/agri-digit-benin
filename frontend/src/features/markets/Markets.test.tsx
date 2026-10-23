import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { StocksPage } from '../stocks/StocksPage';
import { AnalysisPage } from './AnalysisPage';
import { isoDay } from './FormError';
import { PricesPage } from './PricesPage';
import { ShowcasePage } from './ShowcasePage';
import { SurveyPublicPage } from './SurveyPublicPage';
import { SurveysPage } from './SurveysPage';
import { TrainingsPage } from './TrainingsPage';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const page = (ui: ReactNode, path = '/') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
  </QueryClientProvider>,
);
const ref = (u: string) => (u.includes('/ref/') ? { body: [] } : undefined);
const price = (o: Record<string, unknown>) => ({ market: 'Banikoara', department: 'alibori', form: 'brut', product: 'maïs grain', price: 190, observed_on: '2026-10-18', change: null, simulated: false, ...o });

describe('Marchés : relevés, analyses, stocks, enquêtes, formations, vitrine', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('relevés de prix : un agent lit les derniers prix et saisit un relevé', async () => {
    auth.user = { id: 'u1', role: 'agent_atda', department: 'alibori' };
    let posted: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.includes('/prices') && init?.method === 'POST') { posted = JSON.parse(String(init.body)); return { status: 201, body: {} }; }
      if (u.includes('/prices')) return { body: { value_chain: 'mais', simulated: false, source: '', window_days: 30, history: [], latest: [price({ change: 6 }), price({ form: 'transforme', product: 'farine de maïs', price: 300 })] } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<PricesPage />);
    expect(await screen.findByText('+6 %')).toBeInTheDocument();
    expect(screen.getByText('premier relevé')).toBeInTheDocument();
    expect(screen.queryByText('Valeurs de démonstration')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Saisir un relevé' }));
    await user.type(screen.getByLabelText('Marché'), 'Kandi');
    await user.type(screen.getByLabelText(/Prix relevé/), '195');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await vi.waitFor(() => expect(posted).toMatchObject({ market: 'Kandi', department: 'alibori', value_chain: 'mais', form: 'brut', price_xof_per_kg: 195, observed_on: isoDay() }));
  });

  it('relevés de prix : un prix aberrant est refusé avant l’envoi, et la démonstration est étiquetée', async () => {
    auth.user = { id: 'u1', role: 'transformateur', department: 'borgou' };
    let posts = 0;
    mockFetch((u, init) => {
      if (u.includes('/prices/margins')) return { body: { results: [], note: '' } };
      if (u.includes('/prices') && init?.method === 'POST') { posts += 1; return { status: 201, body: {} }; }
      if (u.includes('/prices')) return { body: { value_chain: 'mais', simulated: true, source: 'Démonstration', window_days: 30, history: [], latest: [price({ observed_on: null, simulated: true })] } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<PricesPage />);
    expect(await screen.findByText('Valeurs de démonstration')).toBeInTheDocument();
    expect(screen.getAllByText('Démonstration').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Saisir un relevé' }));
    await user.type(screen.getByLabelText('Marché'), 'Parakou');
    await user.type(screen.getByLabelText(/Prix relevé/), '25000');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText(/Prix entier entre 1 et 20\s000 FCFA par kg\./)).toBeInTheDocument(); // espace insécable du séparateur
    expect(posts).toBe(0);
  });

  it('analyses : pas de projection sous 6 relevés, offre masquée sous 5 producteurs', async () => {
    auth.user = { id: 'u2', role: 'transformateur' };
    mockFetch((u) => {
      if (u.includes('/market-analysis')) return { body: {
        value_chain: 'mais', department: null, method: { window_days: 28, trend_threshold_pct: 5, min_observations: 6, min_span_days: 14, horizon_days: 28 },
        prices: [{ market: null, department: '', form: 'brut', product: 'maïs grain', observations: 3, span_days: 20, moving_avg_xof: 200, variation_pct: null, trend: null, reliability: 'insuffisante', projection: null,
          text: 'maïs grain, tous marchés : 3 relevé(s) sur 20 jour(s), c’est trop peu pour dégager une tendance.' }],
        supply: [{ value_chain: 'mais', department: 'alibori', season: '2026-pluie-1', producers: null, campaigns_pending: 1, without_estimate: 0, yield_source: 'demonstration', previous_season: null, masked: true, expected_kg: null, harvested_kg: null, season_total_kg: null, previous_harvest_kg: null, change_pct: null }],
      } };
      return ref(u);
    });
    page(<AnalysisPage />);
    expect(await screen.findByText(/c’est trop peu pour dégager une tendance/)).toBeInTheDocument();
    expect(screen.getByText('Pas de projection : il faut au moins 6 relevés répartis sur 14 jours')).toBeInTheDocument();
    expect(screen.getByText('Insuffisante')).toBeInTheDocument();
    expect(screen.getByText(/Masqué \(moins de 5 producteurs\)/)).toBeInTheDocument();
    expect(screen.getByText('Rendements de démonstration')).toBeInTheDocument();
  });

  it('enquête publique : toutes les notes sont exigées, la réponse part sans donnée personnelle, un 2e passage est refusé', async () => {
    auth.user = null;
    let sent: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.endsWith('/respond') && init?.method === 'POST') { sent = JSON.parse(String(init.body)); return { status: 201, body: { ok: true } }; }
      if (u.includes('/public/surveys/')) return { body: { code: 'ABC234', title: 'Satisfaction des acheteurs de farine', value_chain: '', department: '', questions: ['Qualité du produit', 'Prix'], status: 'active' } };
      return ref(u);
    });
    const user = userEvent.setup();
    const ui = (
      <Routes><Route path="/enquete/:code" element={<SurveyPublicPage />} /></Routes>
    );
    const view = page(ui, '/enquete/abc234');
    expect(await screen.findByText('Qualité du produit')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Envoyer mes réponses' }));
    expect(await screen.findByText('Répondez à toutes les questions.')).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(10);
    await user.click(radios[4]); // question 1 : note 5
    await user.click(radios[7]); // question 2 : note 3
    await user.click(screen.getByRole('button', { name: 'Envoyer mes réponses' }));
    expect(await screen.findByText('Merci pour votre réponse')).toBeInTheDocument();
    expect(sent).toMatchObject({ ratings: [5, 3], website: '', channel: 'web', comment: '' });
    expect(String((sent as unknown as Record<string, unknown>).device).length).toBeGreaterThanOrEqual(16);
    expect(Object.keys(sent as unknown as object).sort()).toEqual(['channel', 'comment', 'commune', 'department', 'device', 'ratings', 'website']);
    view.unmount();
    page(ui, '/enquete/abc234');
    expect(await screen.findByText('Merci, vous avez déjà répondu')).toBeInTheDocument();
  });

  it('enquête close : plus de formulaire', async () => {
    auth.user = null;
    mockFetch((u) => (u.includes('/public/surveys/') ? { body: { code: 'ABC234', title: 'Enquête', value_chain: '', department: '', questions: ['Q'], status: 'close' } } : ref(u)));
    page(<Routes><Route path="/enquete/:code" element={<SurveyPublicPage />} /></Routes>, '/enquete/ABC234');
    expect(await screen.findByText('Enquête terminée')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('résultats d’enquête : les petites cellules sont masquées, les commentaires sont lisibles du personnel', async () => {
    auth.user = { id: 'u3', role: 'responsable_programme' };
    mockFetch((u) => {
      if (u.includes('/surveys/s1/results')) return { body: {
        code: 'ABC234', title: 'Satisfaction', status: 'active', responses: 7, low_sample: false, min_cell: 5,
        questions: [{ index: 0, text: 'Qualité du produit', mean: 3.57, distribution: { 1: 2, 2: 0, 3: 0, 4: 2, 5: 3 } }],
        by_department: [{ department: 'alibori', responses: 5, masked: false, means: [4.6] }, { department: 'zou', responses: 2, masked: true, means: null }],
        comments: [{ text: 'Livraison tardive', date: '2026-10-19' }],
      } };
      if (u.includes('/surveys')) return { body: { results: [{ id: 's1', code: 'ABC234', title: 'Satisfaction', value_chain: 'mais', department: '', questions: ['Qualité du produit'], status: 'active', path: '/enquete/ABC234', created_at: '2026-10-18T08:00:00Z', closed_at: null, responses: 7 }] } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<SurveysPage />);
    expect(await screen.findByText(/\/enquete\/ABC234/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Résultats \(7 réponses\)/ }));
    expect(await screen.findByText('3,57 / 5')).toBeInTheDocument();
    expect(screen.getByText(/Masqué \(moins de 5 réponses\)/)).toBeInTheDocument();
    expect(screen.getByText('4,6')).toBeInTheDocument();
    expect(screen.getByText(/Livraison tardive/)).toBeInTheDocument();
  });

  it('formations : un transformateur s’inscrit, l’agent enregistre la présence', async () => {
    auth.user = { id: 'u4', role: 'transformateur', department: 'borgou' };
    let joined = '';
    const session = { id: 't1', title: 'Séchage et stockage', theme: 'stockage', department: 'borgou', date: '2999-01-01', place: 'Mairie de Parakou', seats: 3, audience: ['transformateur'], registered: 1, seats_left: 2, manage: false, my_registration: null };
    mockFetch((u, init) => {
      if (u.includes('/trainings/t1/register') && init?.method === 'POST') { joined = u; return { status: 201, body: { id: 'r1', attended: null } }; }
      if (u.endsWith('/trainings') || u.includes('/trainings?')) return { body: { results: [session] } };
      return ref(u);
    });
    const user = userEvent.setup();
    const v = page(<TrainingsPage />);
    expect(await screen.findByText('Séchage et stockage')).toBeInTheDocument();
    expect(screen.getByText('2 place(s) restante(s) sur 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "M'inscrire" }));
    await vi.waitFor(() => expect(joined).toContain('/trainings/t1/register'));
    v.unmount();

    auth.user = { id: 'u5', role: 'agent_atda', department: 'borgou' };
    let marked: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.includes('/trainings/t1/attendance') && init?.method === 'POST') { marked = JSON.parse(String(init.body)); return { body: { id: 'r1', attended: true } }; }
      if (u.includes('/trainings/t1/registrations')) return { body: { results: [{ id: 'r1', name: 'Awa SABI', role: 'transformateur', commune: 'parakou', attended: null }] } };
      if (u.endsWith('/trainings') || u.includes('/trainings?')) return { body: { results: [{ ...session, date: isoDay(), manage: true, present: 0, absent: 0, registered: 1 }] } };
      return ref(u);
    });
    page(<TrainingsPage />);
    await user.click(await screen.findByRole('button', { name: 'Inscrits et présence' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('checkbox', { name: 'Présent : Awa SABI' }));
    await vi.waitFor(() => expect(marked).toEqual({ registration: 'r1', present: true }));
  });

  it('vitrine : l’auteur retire son produit', async () => {
    auth.user = { id: 'u6', role: 'transformateur', department: 'borgou' };
    let out = '';
    mockFetch((u, init) => {
      if (u.includes('/showcase/s1/withdraw') && init?.method === 'POST') { out = u; return { body: {} }; }
      if (u.includes('/showcase')) return { body: { results: [{ id: 's1', company: 'Maïs d’Or SARL', name: 'Farine de maïs 1 kg', description: '', value_chain: 'mais', form: 'transforme', price_xof_per_kg: 450, department: 'borgou', contact: 'contact@maisdor.example', status: 'publie', created_at: '2026-10-19T08:00:00Z', is_mine: true }] } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<ShowcasePage />);
    expect(await screen.findByText('Farine de maïs 1 kg')).toBeInTheDocument();
    expect(screen.getByText(/450 FCFA\/kg \(indicatif\)/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retirer de la vitrine' }));
    await vi.waitFor(() => expect(out).toContain('/showcase/s1/withdraw'));
  });

  it('stocks : « non calculable » n’est jamais présenté comme une bonne nouvelle', async () => {
    auth.user = { id: 'u7', role: 'distributeur' };
    const row = { value_chain: 'mais', site: null, site_name: null, department: 'littoral', outflow_kg: 0, observed_days: 7 };
    mockFetch((u) => {
      if (u.includes('/stocks/outlook')) return { body: { scope: 'mine', window_days: 30, thresholds: { critical_days: 7, low_days: 15 },
        summary: { rupture: 1, critique: 0, bas: 0, ok: 0, non_calculable: 1 },
        results: [{ ...row, product: 'gari', stock_kg: 0, daily_outflow_kg: 8.3, days_cover: 0, level: 'rupture' }, { ...row, product: 'niébé', stock_kg: 400, daily_outflow_kg: 0, days_cover: null, level: 'non_calculable' }] } };
      return ref(u);
    });
    page(<StocksPage />);
    expect(await screen.findByText('gari')).toBeInTheDocument();
    expect(screen.getByText('épuisé')).toBeInTheDocument();
    expect(screen.getByText('non calculable')).toBeInTheDocument();
    expect(screen.getByText(/1 stock est en rupture ou en niveau critique/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Infinity|∞/);
  });

  it('stocks : le personnel voit un agrégat par département, sans identité', async () => {
    auth.user = { id: 'u8', role: 'admin_maep' };
    mockFetch((u) => {
      if (u.includes('/stocks/outlook')) return { body: { scope: 'aggregate', window_days: 30, thresholds: { critical_days: 7, low_days: 15 },
        summary: { rupture: 0, critique: 0, bas: 0, ok: 1, non_calculable: 0 },
        results: [{ department: 'borgou', value_chain: 'mais', holders: 2, groups: 2, at_risk_holders: 1, stock_kg: 10000, outflow_kg: 330, daily_outflow_kg: 16.5, days_cover: 606.1, level: 'ok' }] } };
      return ref(u);
    });
    page(<StocksPage />);
    expect(await screen.findByText('Stocks par département et filière')).toBeInTheDocument();
    expect(screen.getByText('Détenteurs en alerte')).toBeInTheDocument();
    expect(screen.getByText('606,1 jours')).toBeInTheDocument();
  });
});
