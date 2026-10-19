import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { mockFetch } from '../../test-utils';
import { ProfilePage } from './ProfilePage';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const page = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><ProfilePage /></MemoryRouter>
  </QueryClientProvider>,
);
const producer = { id: 'p1', code: 'BJ-AGR-2026-000001', npi: '1042113902', first_name: 'Awa', last_name: 'Sabi', sex: 'F', birth_date: '1986-03-14', department: 'alibori', commune: 'banikoara', phone: '0197214408', language: 'fr', status: 'valide', reject_reason: null, created_at: '2026-05-02T10:00:00Z', validated_at: '2026-05-03T10:00:00Z' };

describe('Mon profil', () => {
  afterEach(async () => { cleanup(); vi.unstubAllGlobals(); await i18n.changeLanguage('fr'); });

  it('montre l’identité lue sur la fiche avec NPI et téléphone masqués, et change la langue', async () => {
    auth.user = { id: 'u1', role: 'producteur', full_name: 'Awa Sabi', phone: '0197214408', producer_id: 'p1' };
    mockFetch((u) => (u.includes('/producers/p1') ? { body: producer } : u.includes('/ref/') ? { body: [] } : undefined));
    const user = userEvent.setup();
    page();
    expect(screen.getByRole('heading', { level: 1, name: 'Mon profil' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Awa Sabi' })).toBeInTheDocument();
    expect(screen.getByText('•••• 3902')).toBeInTheDocument();
    expect(screen.queryByText(/1042113902/)).not.toBeInTheDocument();
    expect(screen.getByText('01 97 •• •• 08')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gérer mes consentements' })).toHaveAttribute('href', '/consentements');

    await user.click(screen.getByRole('radio', { name: /Fɔngbè/ }));
    expect(i18n.language).toBe('fon');
  });

  it('sans fiche liée au compte : le dit, sans appeler le serveur', () => {
    auth.user = { id: 'u2', role: 'producteur', full_name: 'Sans Fiche', phone: '0196000000', producer_id: null };
    const f = mockFetch(() => undefined);
    page();
    expect(screen.getByText("Aucune fiche producteur n'est liée à ce compte.")).toBeInTheDocument();
    expect(f.mock.calls.some(([u]) => String(u).includes('/producers/'))).toBe(false);
  });
});
