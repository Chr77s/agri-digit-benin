import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '../../shared/ui';
import { mockFetch } from '../../test-utils';
import { CooperativeDetailPage, MyCooperativesPage } from './CooperativesPages';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const at = (path: string, ui: ReactNode, route = path) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}><Routes><Route path={route} element={ui} /></Routes><Toaster /></MemoryRouter>
  </QueryClientProvider>,
);
const nearby = (o: Record<string, unknown> = {}) => ({ id: 'c1', name: 'Coop de Kokey', department: 'alibori', commune: 'banikoara', value_chains: ['mais'], members_count: 41, request_id: null, request_status: null, request_reason: '', ...o });
const request = (o: Record<string, unknown> = {}) => ({ id: 'r1', cooperative: 'c1', cooperative_name: 'Coop de Kokey', producer_code: 'BJ-AGR-2026-000001', producer_name: 'Bio Gounou', producer_commune: 'banikoara', message: 'Je cultive du maïs.', status: 'en_attente', decision_reason: '', decided_at: null, created_at: '2026-10-18T10:00:00Z', ...o });

describe('Coopératives : demandes d\'adhésion', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('producteur : la demande exige son accord pour partager nom, code et commune, puis part avec son message', async () => {
    auth.user = { id: 'u1', role: 'producteur' };
    let sent: unknown;
    mockFetch((u, init) => {
      if (u.includes('/cooperatives/c1/join-request')) { sent = JSON.parse(String(init?.body)); return { status: 201, body: request() }; }
      if (u.includes('/cooperatives/nearby')) return { body: { results: [sent ? nearby({ request_status: 'en_attente' }) : nearby()] } };
      if (u.includes('/memberships/mine')) return { body: { results: [], next: null } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    at('/mes-cooperatives', <MyCooperativesPage />);
    await user.click(await screen.findByRole('button', { name: 'Demander à adhérer' }));
    const send = screen.getByRole('button', { name: 'Envoyer la demande' });
    expect(send).toBeDisabled(); // pas d'envoi sans accord
    await user.type(screen.getByRole('textbox', { name: /Message/ }), 'Je cultive du maïs.');
    await user.click(screen.getByRole('checkbox', { name: /voie mon nom, mon code producteur et ma commune/ }));
    await user.click(send);
    await waitFor(() => expect(sent).toEqual({ message: 'Je cultive du maïs.' }));
    expect(await screen.findByText('Demande envoyée')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Demander à adhérer' })).not.toBeInTheDocument();
  });

  it('gestionnaire : accepte une demande, refuse l\'autre avec un motif obligatoire', async () => {
    auth.user = { id: 'u8', role: 'gestionnaire_cooperative' };
    const decisions: { url: string; body: Record<string, unknown> }[] = [];
    mockFetch((u, init) => {
      if (u.includes('/decide')) { decisions.push({ url: u, body: JSON.parse(String(init?.body)) }); return { body: request() }; }
      if (u.includes('/join-requests')) return { body: { results: [request(), request({ id: 'r2', producer_name: 'Awa Sabi', producer_code: 'BJ-AGR-2026-000002', message: '' })], next: null } };
      if (u.includes('/members')) return { body: { results: [], next: null } };
      if (u.includes('/cooperatives/c1')) return { body: { id: 'c1', name: 'Coop de Kokey', department: 'alibori', commune: 'banikoara', value_chains: ['mais'], members_count: 0, manager_phone: '0196000008' } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    at('/cooperatives/c1', <CooperativeDetailPage />, '/cooperatives/:id');
    await user.click(await screen.findByRole('tab', { name: /Demandes d'adhésion/ }));
    expect(await screen.findByText('Bio Gounou')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Accepter' })[0]);
    await waitFor(() => expect(decisions[0]).toMatchObject({ url: expect.stringContaining('/join-requests/r1/decide'), body: { status: 'acceptee' } }));

    await user.click(screen.getAllByRole('button', { name: 'Refuser' })[1]);
    await user.click(screen.getByRole('button', { name: 'Confirmer le refus' }));
    expect(await screen.findByText(/Indiquez le motif/)).toBeInTheDocument();
    expect(decisions).toHaveLength(1); // pas de refus sans motif
    await user.type(screen.getByRole('textbox', { name: /Motif du refus/ }), 'Parcelles hors zone.');
    await user.click(screen.getByRole('button', { name: 'Confirmer le refus' }));
    await waitFor(() => expect(decisions[1].body).toEqual({ status: 'refusee', reason: 'Parcelles hors zone.' }));
  });
});
