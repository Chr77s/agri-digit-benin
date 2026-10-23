import type { ReactNode } from 'react';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '../../shared/ui';
import { mockFetch, renderApp } from '../../test-utils';
import { ProgramsPage } from './ProgramsPages';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', role: 'producteur' } }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const program = { id: 'p1', name: 'Kits semences maïs', description: '', conditions: '', value_chains: ['mais'], status: 'publie', state: 'ouvert', closes_at: '2099-10-31' };
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5).toISOString();
const refused = (decided: string) => ({ id: 'a1', program: 'p1', status: 'refusee', reason: 'Le nombre de kits est atteint.', decided_at: decided, created_at: daysAgo(30) });

describe('Programmes (producteur) : contester un refus', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('contester envoie le motif, puis la candidature est de nouveau en instruction', async () => {
    let body: unknown;
    mockFetch((u, init) => {
      if (u.includes('/applications/a1/contest')) { body = JSON.parse(String(init?.body)); return { body: {} }; }
      if (u.includes('/applications')) return { body: { results: [body ? { ...refused(daysAgo(2)), status: 'en_instruction', contested_at: daysAgo(0), contest_reason: 'Inscrit avant la date.' } : refused(daysAgo(2))], next: null } };
      if (u.includes('/programs')) return { body: [program] };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    renderApp(<><ProgramsPage /><Toaster /></>);
    expect(await screen.findByText(/Le nombre de kits est atteint\./)).toBeInTheDocument();
    expect(screen.getByText(/pendant 15 jours/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Contester la décision' }));
    await user.click(screen.getByRole('button', { name: 'Déposer la contestation' }));
    expect(await screen.findByText(/Indiquez le motif/)).toBeInTheDocument(); // motif obligatoire, rien d'envoyé
    expect(body).toBeUndefined();
    await user.type(screen.getByRole('textbox', { name: /Pourquoi contestez-vous/ }), 'Inscrit avant la date.');
    await user.click(screen.getByRole('button', { name: 'Déposer la contestation' }));
    await waitFor(() => expect(body).toEqual({ reason: 'Inscrit avant la date.' }));
    expect(await screen.findByText('Contestation déposée', { selector: 'b, strong, span, h3, div' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Contester la décision' })).not.toBeInTheDocument();
  });

  it('au-delà de 15 jours, pas de bouton : la décision reste lisible', async () => {
    mockFetch((u) => (u.includes('/applications') ? { body: { results: [refused(daysAgo(20))], next: null } } : u.includes('/programs') ? { body: [program] } : u.includes('/ref/') ? { body: [] } : undefined));
    renderApp(<ProgramsPage />);
    expect(await screen.findByText(/Le nombre de kits est atteint\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Contester la décision' })).not.toBeInTheDocument();
  });
});
