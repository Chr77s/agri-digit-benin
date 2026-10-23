import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { mockFetch } from '../../test-utils';
import { ProfilePage } from './ProfilePage';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown>, signIn: vi.fn() }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user, signIn: auth.signIn }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

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

  it('change le numéro avec un code SMS envoyé au nouveau numéro, puis reconnecte avec la nouvelle session', async () => {
    auth.user = { id: 'u1', role: 'producteur', full_name: 'Awa Sabi', phone: '0197214408', producer_id: 'p1' };
    const sent: unknown[] = [];
    mockFetch((u, init) => {
      if (u.includes('/phone-change/request')) { sent.push(JSON.parse(String(init?.body))); return { body: { detail: 'ok' } }; }
      if (u.includes('/phone-change/confirm')) return JSON.parse(String(init?.body)).code === '123456'
        ? { body: { access: 'tok', user: { ...auth.user, phone: '0196123456' } } }
        : { status: 400, body: { detail: 'Code incorrect.', code: 'invalid_code' } };
      if (u.includes('/demo/otp-inbox')) return { body: [{ body: 'Agri-Digit : votre code de confirmation du nouveau numéro est 123456.', created_at: '2026-10-19T10:00:00Z' }] };
      return u.includes('/producers/p1') ? { body: producer } : u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    page();
    await user.click(screen.getByRole('button', { name: 'Recevoir un code par SMS' }));
    expect(await screen.findByText(/Saisissez 10 chiffres/)).toBeInTheDocument();
    expect(sent).toEqual([]);
    await user.type(screen.getByLabelText('Nouveau numéro'), '0196123456');
    await user.click(screen.getByRole('button', { name: 'Recevoir un code par SMS' }));
    expect(await screen.findByText(/Code envoyé au 01 96 •• •• 56/)).toBeInTheDocument();
    expect(sent).toEqual([{ new_phone: '0196123456' }]);
    expect(await screen.findByText(/code de confirmation du nouveau numéro est 123456/)).toBeInTheDocument();
    for (const d of '123456') await user.type(screen.getByRole('textbox', { name: `Chiffre ${'123456'.indexOf(d) + 1} sur 6` }), d);
    await user.click(screen.getByRole('button', { name: 'Confirmer le nouveau numéro' }));
    expect(await screen.findByText('Numéro changé. Utilisez-le désormais pour vous connecter.')).toBeInTheDocument();
    expect(auth.signIn).toHaveBeenCalledWith('tok', expect.objectContaining({ phone: '0196123456' }));
  });

  it('sur téléphone : un menu, puis une rubrique par écran avec retour au profil', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
    auth.user = { id: 'u1', role: 'producteur', full_name: 'Awa Sabi', phone: '0197214408', producer_id: 'p1' };
    mockFetch((u) => (u.includes('/producers/p1') ? { body: producer } : u.includes('/ref/') ? { body: [] } : undefined));
    const at = (path: string) => render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[path]}><Routes><Route path="/profil/:section?" element={<ProfilePage />} /></Routes></MemoryRouter>
      </QueryClientProvider>,
    );
    const { unmount } = at('/profil');
    expect(await screen.findByText('BJ-AGR-2026-000001')).toBeInTheDocument();
    for (const [name, href] of [['Téléphone', '/profil/numero'], ['Langue et lecture', '/profil/langue'], ['Données hors ligne', '/profil/donnees'], ["File d'envoi", '/profil/envoi'], ['Aide et mon agent', '/profil/aide']]) {
      expect(screen.getByRole('link', { name: new RegExp(name) })).toHaveAttribute('href', href);
    }
    unmount();
    at('/profil/envoi');
    expect(screen.getByRole('heading', { level: 1, name: "File d'envoi" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour : Mon profil' })).toHaveAttribute('href', '/profil');
    expect(screen.getByText("Rien n'est en attente d'envoi sur ce téléphone.")).toBeInTheDocument();
  });

  it('sans fiche liée au compte : le dit, sans appeler le serveur', () => {
    auth.user = { id: 'u2', role: 'producteur', full_name: 'Sans Fiche', phone: '0196000000', producer_id: null };
    const f = mockFetch(() => undefined);
    page();
    expect(screen.getByText("Aucune fiche producteur n'est liée à ce compte.")).toBeInTheDocument();
    expect(f.mock.calls.some(([u]) => String(u).includes('/producers/'))).toBe(false);
  });
});
