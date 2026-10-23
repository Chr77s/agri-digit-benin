import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { AgentHome } from './AgentHome';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const page = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><AgentHome /></MemoryRouter>
  </QueryClientProvider>,
);
const fiche = { id: 'p1', code: 'BNK-000412', first_name: 'Bawa', last_name: 'Orou', commune: 'banikoara', status: 'en_attente', created_at: '2020-01-01T10:00:00Z' };

describe('Accueil de l’agent ATDA', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('file vide : le dit clairement', async () => {
    auth.user = { id: 'a1', role: 'agent_atda', full_name: 'Koffi Dossou', phone: '0196401277', department: 'alibori' };
    mockFetch((u) => (u.includes('/ref/') ? { body: [] } : { body: { results: [], next: null } }));
    page();
    expect(screen.getByRole('heading', { level: 1, name: 'File de travail du jour' })).toBeInTheDocument();
    expect(await screen.findByText('Rien à traiter aujourd\'hui')).toBeInTheDocument();
  });

  it('une fiche en attente passe en tête de file, signalée en retard', async () => {
    auth.user = { id: 'a1', role: 'agent_atda', full_name: 'Koffi Dossou', phone: '0196401277', department: 'alibori' };
    mockFetch((u) => {
      if (u.includes('/ref/')) return { body: [] };
      if (u.includes('/producers') && u.includes('en_attente')) return { body: { results: [fiche], next: null } };
      return { body: { results: [], next: null } };
    });
    page();
    expect(await screen.findByText('Bawa Orou')).toBeInTheDocument();
    expect(screen.getByText('Délai dépassé')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ouvrir' })).toHaveAttribute('href', '/producteurs/p1');
    expect(screen.getByText("à traiter aujourd'hui")).toBeInTheDocument();
  });
});
