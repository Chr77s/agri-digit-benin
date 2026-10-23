import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { Toaster } from '../../shared/ui';
import { SupportsPage } from './SupportsPage';

// Sans IndexedDB (jsdom), la file hors ligne est simulée : `offline` fait répondre « gardé sur le téléphone ».
const queue = vi.hoisted(() => ({ offline: false }));
vi.mock('../outbox/offlineQueue', async (orig) => {
  const m = await orig<typeof import('../outbox/offlineQueue')>();
  return { ...m, postOrQueue: (...a: Parameters<typeof m.postOrQueue>) => (queue.offline ? Promise.resolve('queued' as const) : m.postOrQueue(...a)) };
});

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const page = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><SupportsPage /><Toaster /></MemoryRouter>
  </QueryClientProvider>,
);
const support = { id: 's1', producer_code: 'BJ-1', item: 'Engrais NPK', quantity: '4', unit: 'sac', value_xof: 60000, repayable: true, status: 'remis', created_at: '2026-10-14T10:00:00Z', program_name: 'Intrants maïs' };

describe('Mes appuis', () => {
  afterEach(() => { vi.unstubAllGlobals(); queue.offline = false; });

  it('producteur : signale « rien reçu » sans confirmer, l\'appui reste à confirmer', async () => {
    auth.user = { id: 'u1', role: 'producteur', full_name: 'Awa Sabi' };
    let reported: unknown;
    mockFetch((u, init) => {
      if (u.includes('/supports/s1/report')) { reported = JSON.parse(String(init?.body)); return { body: support }; }
      if (u.includes('/supports')) return { body: { results: [support], next: null } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    page();
    await user.click(await screen.findByRole('button', { name: 'Signaler un problème' }));
    expect(screen.getByRole('radio', { name: 'Il en manque une partie' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: "Je n'ai rien reçu" }));
    await user.click(screen.getByRole('button', { name: 'Envoyer le signalement' }));
    await waitFor(() => expect(reported).toEqual({ kind: 'rien_recu' }));
    expect(await screen.findByText('Signalement envoyé à votre agent.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer la réception' })).toBeInTheDocument();
  });
  it('agent sans réseau : la remise est gardée sur le téléphone', async () => {
    queue.offline = true;
    auth.user = { id: 'a1', role: 'agent_atda', full_name: 'Koffi Dossou', department: 'alibori' };
    mockFetch((u) => {
      if (u.includes('/producers')) return { body: { results: [{ id: 'p1', code: 'BJ-1', first_name: 'Awa', last_name: 'Sabi', status: 'valide' }], next: null } };
      if (u.includes('/supports') || u.includes('/programs')) return { body: { results: [], next: null } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    page();
    await screen.findByRole('option', { name: /BJ-1 Awa Sabi/ });
    await user.selectOptions(screen.getByLabelText(/^Producteur/), 'p1');
    await user.type(screen.getByLabelText(/^Appui$/), 'Engrais NPK');
    await user.type(screen.getByLabelText(/^Quantité$/), '4');
    await user.type(screen.getByLabelText(/^Valeur \(FCFA\)/), '60000');
    await user.click(screen.getByRole('button', { name: "Enregistrer l'appui" }));
    expect(await screen.findByText(/Remise gardée sur ce téléphone/)).toBeInTheDocument();
  });
});
