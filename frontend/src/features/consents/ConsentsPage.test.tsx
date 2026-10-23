import type { ReactNode } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { Toaster } from '../../shared/ui';
import { ConsentsPage } from './ConsentsPage';

const auth = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ signOut: auth.signOut }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const consents = [
  { id: 'c1', type: 'donnees_personnelles', text_version: 'v1', created_at: '2026-05-02T10:00:00Z', withdrawn_at: null },
  { id: 'c2', type: 'credit', text_version: 'v1', created_at: '2026-05-02T10:00:00Z', withdrawn_at: null },
];

async function withdraw(type: string) {
  const user = userEvent.setup();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><ConsentsPage /><Toaster /></MemoryRouter></QueryClientProvider>);
  await user.click(await screen.findByRole('button', { name: type === 'credit' ? 'Retirer le partage pour le crédit' : 'Retirer ce consentement' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Retirer' }));
}

describe('Mes consentements', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); auth.signOut.mockReset(); });
  const server = () => mockFetch((u) => (u.includes('/consents/mine') ? { body: consents } : u.includes('/withdraw') ? { body: { ...consents[0], withdrawn_at: '2026-10-19T10:00:00Z' } } : { body: [] }));

  it('retirer « Données personnelles » ferme le compte : la session s’arrête', async () => {
    server();
    await withdraw('donnees_personnelles');
    expect(await screen.findByText(/votre compte est fermé/)).toBeInTheDocument();
    expect(auth.signOut).toHaveBeenCalled();
  });

  it('retirer le partage pour le crédit garde la session', async () => {
    server();
    await withdraw('credit');
    expect(await screen.findByText(/Consentement retiré\. Le retrait est enregistré/)).toBeInTheDocument();
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
