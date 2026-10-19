import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { MarketPage } from './MarketPage';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const page = (ui: ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>,
);
const offer = (o: Record<string, unknown>) => ({ type: 'offre', value_chain: 'mais', department: 'alibori', commune: 'banikoara', description: '', status: 'ouverte', created_at: '2026-10-15T10:00:00Z', owner_role: 'producteur', ...o });
const ref = (u: string) => (u.includes('/ref/') ? { body: [] } : undefined);

describe('Marché', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('producteur : voit ses annonces puis demande le paiement en un clic, montant calculé depuis l’annonce', async () => {
    auth.user = { id: 'u1', role: 'producteur', full_name: 'Awa Sabi' };
    let paid = false;
    const f = mockFetch((u, init) => {
      if (u.includes('/offers')) return { body: { results: [offer({ id: 'o1', is_mine: true, status: 'en_relation', quantity_kg: 1200, price_xof_per_kg: 205 })], next: null } };
      if (u.includes('/matches/mine')) return { body: { results: [{ id: 'm1', offer: 'o1', status: 'acceptee', is_owner: true, counterpart_phone: '0196452218', offer_summary: { type: 'offre', value_chain: 'mais', quantity_kg: 1200, price_xof_per_kg: 205, status: 'en_relation' } }], next: null } };
      if (u.endsWith('/payments') && init?.method === 'POST') { paid = true; return { status: 201, body: { id: 'p1', status: 'en_attente', provider: 'FakePay', reference: 'AGD-1', amount_xof: 246000 } }; }
      if (u.includes('/payments/p1') && paid) return { body: { id: 'p1', status: 'reussi', provider: 'FakePay', reference: 'AGD-1', amount_xof: 246000, receipt: { reference: 'AGD-1', amount_xof: 246000, payer_masked: '0196****18', payee_masked: '0197****42', paid_at: '2026-10-18T10:12:00Z' } } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<MarketPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Marché' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mes offres/ })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('button', { name: 'Voir les acheteurs' })).toBeInTheDocument();
    expect(screen.getByText(/Simulation FakePay/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Paiement' }));
    expect(await screen.findByLabelText(/Montant/)).toHaveValue('246000');
    await user.click(screen.getByRole('button', { name: 'Demander le paiement (simulation)' }));
    expect(await screen.findByText('Saisissez 10 chiffres, commençant par 01.')).toBeInTheDocument(); // rien n'est envoyé sans numéro
    expect(paid).toBe(false);
    await user.type(screen.getByLabelText(/Numéro Mobile Money de l'acheteur/), '0196452218');
    await user.click(screen.getByRole('button', { name: 'Demander le paiement (simulation)' }));
    expect(await screen.findByText('Paiement réussi (simulation).', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByText('Vous recevez')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partager le reçu' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Écouter' })).toBeInTheDocument();
    const post = f.mock.calls.find(([u, i]) => String(u).endsWith('/payments') && i?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ match: 'm1', amount_xof: 246000, payer_phone: '0196452218' });
  });

  it('acheteur : filtre par quantité minimale et ne repropose pas le contact déjà en attente', async () => {
    auth.user = { id: 'u2', role: 'transformateur', full_name: 'Sika Transfo' };
    mockFetch((u) => {
      if (u.includes('/offers')) return { body: { results: [
        offer({ id: 'big', quantity_kg: 58000, price_xof_per_kg: 215, description: 'Gros lot' }),
        offer({ id: 'small', quantity_kg: 2000, price_xof_per_kg: 200, description: 'Petit lot' }),
        offer({ id: 'other', quantity_kg: 12500, price_xof_per_kg: 208, description: 'Lot de N’Dali' }),
      ], next: null } };
      if (u.includes('/matches/mine')) return { body: { results: [{ id: 'm1', offer: 'big', status: 'proposee', is_owner: false }], next: null } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<MarketPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Marché : offres et demandes' })).toBeInTheDocument();
    const big = (await screen.findByText('Gros lot')).closest('li')!;
    expect(await within(big).findByText('Votre demande est en attente de réponse')).toBeInTheDocument();
    expect(within(big).queryByRole('button', { name: 'Prendre contact' })).not.toBeInTheDocument();
    expect(within(screen.getByText('Petit lot').closest('li')!).getByRole('button', { name: 'Prendre contact' })).toBeInTheDocument();
    expect(screen.getByText('Prévision simulée')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Quantité minimale'), '5');
    expect(screen.queryByText('Petit lot')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2 annonces' })).toBeInTheDocument();
  });

  it('transformateur propriétaire d’une offre acceptée : demande le paiement, ne paie pas sa propre vente', async () => {
    auth.user = { id: 'u3', role: 'transformateur', full_name: 'Sika Transfo' };
    mockFetch((u) => {
      if (u.includes('/offers')) return { body: { results: [], next: null } };
      if (u.includes('/matches/mine')) return { body: { results: [{ id: 'm1', offer: 'o1', status: 'acceptee', is_owner: true, counterpart_phone: '0197000042', offer_summary: { type: 'offre', value_chain: 'mais', quantity_kg: 500, price_xof_per_kg: 400, status: 'en_relation' } }], next: null } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<MarketPage />);
    await user.click(screen.getByRole('tab', { name: /Mes mises en relation/ }));
    const list = await screen.findByRole('list', { name: 'Mes mises en relation' });
    expect(await within(list).findByRole('button', { name: 'Paiement' })).toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: 'Payer' })).not.toBeInTheDocument();

    await user.click(within(list).getByRole('button', { name: 'Paiement' }));
    expect(await screen.findByRole('button', { name: 'Demander le paiement (simulation)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Payer/ })).not.toBeInTheDocument();
  });
});
