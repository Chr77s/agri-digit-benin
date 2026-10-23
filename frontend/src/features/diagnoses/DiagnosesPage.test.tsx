import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { DiagnosesPage } from './DiagnosesPage';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const page = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><DiagnosesPage /></MemoryRouter>
  </QueryClientProvider>,
);
const diag = (o: Record<string, unknown> = {}) => ({ id: 'd1', value_chain: 'mais', pathology: 'chenille_legionnaire', pathology_label: 'Chenille légionnaire d\'automne', confidence: 0.83, status: 'auto', advice: 'Inspectez les cornets.', simulation: true, created_at: '2026-10-19T08:14:00Z', review_comment: '', ...o });

describe('Diagnostic par photo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('producteur : « Pas sûr ? » envoie la demande avec son mot, puis le diagnostic part chez l\'agronome', async () => {
    auth.user = { id: 'u1', role: 'producteur', full_name: 'Awa Sabi' };
    let asked: unknown;
    mockFetch((u, init) => {
      if (u.includes('/ask-agronome')) { asked = JSON.parse(String(init?.body)); return { body: diag({ status: 'transmis_agronome', producer_note: 'Les feuilles du centre sont trouées.' }) }; }
      if (u.includes('/diagnoses/d1/image')) return { status: 404, body: {} };
      if (u.includes('/diagnoses')) return { body: { results: [asked ? diag({ status: 'transmis_agronome', producer_note: 'Les feuilles du centre sont trouées.' }) : diag()], next: null } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    page();
    await user.click(await screen.findByRole('button', { name: 'Pas sûr ? Demander un agronome' }));
    await user.type(screen.getByRole('textbox', { name: /Ce que vous voyez/ }), 'Les feuilles du centre sont trouées.');
    await user.click(screen.getByRole('button', { name: 'Envoyer la demande' }));
    await waitFor(() => expect(asked).toEqual({ note: 'Les feuilles du centre sont trouées.' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Pas sûr ? Demander un agronome' })).not.toBeInTheDocument());
    expect(await screen.findByText(/Les feuilles du centre sont trouées\./)).toBeInTheDocument();
  });

  it('les conseils de cadrage s\'ouvrent depuis le formulaire de photo', async () => {
    auth.user = { id: 'u1', role: 'producteur', full_name: 'Awa Sabi' };
    mockFetch((u) => (u.includes('/diagnoses') ? { body: { results: [], next: null } } : u.includes('/ref/') ? { body: [] } : undefined));
    const user = userEvent.setup();
    page();
    await user.click(await screen.findByRole('button', { name: 'Conseils de cadrage' }));
    expect(await screen.findByRole('heading', { name: 'Pour une bonne photo' })).toBeInTheDocument();
    expect(screen.getByText('À la lumière du jour')).toBeInTheDocument();
    expect(screen.getByText('Faites aussi le dessous')).toBeInTheDocument();
  });
});
