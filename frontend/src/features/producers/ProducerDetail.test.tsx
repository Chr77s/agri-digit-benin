import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { ProducerDetailPage } from './ProducersPages';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', role: 'agent_atda', department: 'alibori' } }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const producer = (status: string) => ({ id: 'p1', code: 'BJ-AGR-2026-000021', npi: '1000000024', first_name: 'Codjo', last_name: 'Gounou', sex: 'M', birth_date: '1984-01-25', department: 'alibori', commune: 'banikoara', phone: '0196000024', language: 'fr', status, reject_reason: null, created_at: '2026-10-20T09:56:34Z', validated_at: status === 'valide' ? '2026-10-21T16:10:41Z' : null });

const page = (status: string) => {
  mockFetch((u) => {
    if (u.includes('/ref/') || u.includes('/producers/p1/versions')) return { body: [] };
    if (u.includes('/producers/p1')) return { body: producer(status) };
    return { body: { results: [], next: null } };
  });
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/producteurs/p1']}><Routes><Route path="/producteurs/:id" element={<ProducerDetailPage />} /></Routes></MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('Fiche producteur : décision', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('en attente : les contrôles et le bouton Valider sont là', async () => {
    page('en_attente');
    expect(await screen.findByText('Contrôles avant de valider')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Valider la fiche' })).toBeInTheDocument();
  });

  it('validée : plus de contrôles ni de consigne, seulement la confirmation', async () => {
    page('valide');
    expect(await screen.findByRole('heading', { name: 'Codjo Gounou' })).toBeInTheDocument();
    expect(screen.queryByText('Contrôles avant de valider')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Valider la fiche' })).not.toBeInTheDocument();
  });
});
