import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '../../shared/ui';
import { mockFetch } from '../../test-utils';
import { CooperativeDetailPage } from './CooperativesPages';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const page = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={['/cooperatives/c1']}><Routes><Route path="/cooperatives/:id" element={<CooperativeDetailPage />} /></Routes><Toaster /></MemoryRouter>
  </QueryClientProvider>,
);

describe('Coopératives : ajouter un membre', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it.each(['producteur', 'gestionnaire_cooperative'])('%s : saisit le code du producteur, sans liste du registre', async (role) => {
    auth.user = { id: 'u1', role };
    let sent: unknown;
    let registryCalled = false;
    mockFetch((u, init) => {
      if (u.includes('/producers')) { registryCalled = true; return { body: { results: [{ id: 'p1', code: 'BJ-AGR-2026-000001', first_name: 'Bio', last_name: 'Gounou' }], next: null } }; }
      if (u.includes('/cooperatives/c1/members') && init?.method === 'POST') { sent = JSON.parse(String(init.body)); return { status: 201, body: {} }; }
      if (u.includes('/members')) return { body: { results: [], next: null } };
      if (u.includes('/cooperatives/c1')) return { body: { id: 'c1', name: 'Coop de Kokey', department: 'alibori', commune: 'banikoara', value_chains: ['mais'], members_count: 0, manager_phone: '0196000008' } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    page();
    await user.click(await screen.findByRole('button', { name: 'Ajouter un membre' }));
    await user.type(await screen.findByRole('textbox', { name: /Code du producteur/ }), 'BJ-AGR-2026-000021');
    await user.click(screen.getByRole('button', { name: 'Ajouter à la coopérative' }));
    await waitFor(() => expect(sent).toEqual({ producer: 'BJ-AGR-2026-000021', role: 'membre' }));
    expect(registryCalled).toBe(false);
  });
});
