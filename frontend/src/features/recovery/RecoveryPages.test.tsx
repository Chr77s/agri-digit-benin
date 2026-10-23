import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { RecoveryPage, RepaymentsPage } from './RecoveryPages';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const page = (ui: ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>,
);
const claim = {
  id: 'c1', kind: 'appui', label: 'Engrais NPK', amount_xof: 30000, paid_xof: 0, outstanding_xof: 30000, overdue_xof: 10000, status: 'en_retard',
  debtor: 'BJ-AGR-2026-000001', department: 'alibori', next_due_on: '2026-10-01', next_amount_xof: 10000, created_at: '2026-07-01T10:00:00Z',
  installments: [1, 2, 3].map((n) => ({ rank: n, due_on: `2026-1${n}-01`, amount_xof: 10000, paid_xof: 0, status: n === 1 ? 'en_retard' : 'a_venir' })),
};

describe('Recouvrement', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('producteur : voit le retard puis paie la prochaine échéance en un clic', async () => {
    auth.user = { id: 'u1', role: 'producteur', phone: '0196000001' };
    let paid = false;
    mockFetch((u, init) => {
      if (u.endsWith('/claims/c1/pay') && init?.method === 'POST') { paid = true; return { status: 201, body: { id: 'p1', claim: 'c1', status: 'en_attente', amount_xof: 10000, reference: 'AGR-1', provider: 'FakePay' } }; }
      if (u.includes('/claim-payments/p1')) return { body: { id: 'p1', claim: 'c1', status: 'reussi', amount_xof: 10000, reference: 'AGR-1', provider: 'FakePay' } };
      if (u.includes('/claims')) return { body: { results: [claim], next: null } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    page(<RepaymentsPage />);
    expect(await screen.findByText(/10\s?000 FCFA sont en retard/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Payer 10\s?000 FCFA/ }));
    expect(screen.getByLabelText(/Numéro Mobile Money/)).toHaveValue('0196000001'); // le numéro du compte est proposé
    await user.click(screen.getByRole('button', { name: /Payer 10\s?000 FCFA/, hidden: false }));
    expect(paid).toBe(true);
    expect(await screen.findByText('Remboursement reçu', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('institution financière : ouvre un prêt à un producteur qui a consenti', async () => {
    auth.user = { id: 'u2', role: 'agent_financier' };
    let body: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.endsWith('/claims') && init?.method === 'POST') { body = JSON.parse(String(init.body)); return { status: 201, body: { ...claim, kind: 'pret' } }; }
      if (u.includes('/claims/portfolio')) return { body: { total: { count: 1, amount_xof: 30000, paid_xof: 0, outstanding_xof: 30000, overdue_xof: 10000, overdue_count: 1, recovery_rate: 0 }, by_kind: {}, by_department: {} } };
      if (u.includes('/credit/consented-producers')) return { body: { results: [{ id: 'pr1', code: 'BJ-AGR-2026-000001', first_name: 'Awa', last_name: 'Sabi' }], next: null } };
      if (u.includes('/claims')) return { body: { results: [], next: null } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    page(<RecoveryPage />);
    expect(await screen.findByText('0 %')).toBeInTheDocument(); // taux de recouvrement
    await user.selectOptions(await screen.findByLabelText(/Producteur/), 'pr1');
    await user.type(screen.getByLabelText(/Objet/), 'Crédit de campagne');
    await user.type(screen.getByLabelText(/Montant à rembourser/), '90000');
    await user.click(screen.getByRole('button', { name: 'Ouvrir la créance' }));
    await vi.waitFor(() => expect(body).toMatchObject({ kind: 'pret', producer: 'pr1', amount_xof: 90000, installments: 3 }));
  });
});
