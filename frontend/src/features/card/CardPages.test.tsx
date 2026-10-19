import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { AuthProvider } from '../auth/AuthContext';
import { CardPage, VerifyPage } from './CardPages';

const at = (path: string) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/verification/:code?" element={<VerifyPage />} />
          <Route path="/producteurs/:id/carte" element={<CardPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  </QueryClientProvider>,
);

describe('Vérification d’une carte', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('affiche seulement le nom et le statut d’une carte valide', async () => {
    mockFetch((u) => (u.includes('/verify/K7M2Q9XA') ? { body: { status: 'valide', full_name: 'Bio GOUNOU' } } : undefined));
    at('/verification/k7m2q9xa');
    expect(await screen.findByRole('heading', { name: 'Carte valide' })).toBeInTheDocument();
    expect(screen.getByText('Bio GOUNOU')).toBeInTheDocument();
    expect(screen.getByText(/ni NPI, ni téléphone/)).toBeInTheDocument();
  });

  it('code inconnu, puis refuse un code mal formé sans appeler le serveur', async () => {
    const f = mockFetch((u) => (u.includes('/verify/') ? { status: 404, body: { detail: 'Introuvable' } } : undefined));
    const user = userEvent.setup();
    at('/verification/ZZZZZZZZ');
    expect(await screen.findByText('Code inconnu')).toBeInTheDocument();
    const calls = f.mock.calls.length;
    await user.type(screen.getByLabelText('Code de vérification'), 'AB0I');
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    expect(screen.getByText(/Le code contient 8 lettres ou chiffres/)).toBeInTheDocument();
    expect(f.mock.calls.length).toBe(calls);
  });

  it('sans code : seulement le formulaire', async () => {
    const f = mockFetch(() => undefined);
    at('/verification');
    expect(screen.getByRole('heading', { name: 'Vérifier un code' })).toBeInTheDocument();
    expect(f.mock.calls.some(([u]) => String(u).includes('/verify/'))).toBe(false);
  });
});

describe('Carte du producteur (vue agent)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('montre la carte, le code de vérification et l’adresse publique', async () => {
    mockFetch((u) => (u.includes('/producers/p1/card')
      ? { body: { code: 'BJ-AGR-2026-000001', full_name: 'Bio GOUNOU', commune: 'banikoara', department: 'alibori', status: 'valide', verification_code: 'K7M2Q9XA', verify_url: '', issued_at: '2026-05-14T10:00:00Z' } }
      : undefined));
    at('/producteurs/p1/carte');
    expect(await screen.findByRole('img', { name: /Carte de producteur de Bio GOUNOU, code BJ-AGR-2026-000001/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /\/verification\/K7M2Q9XA$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Imprimer la carte' })).toBeInTheDocument();
  });

  it('partage le lien public de vérification avec la feuille de partage du téléphone', async () => {
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { ...navigator, share });
    mockFetch((u) => (u.includes('/producers/p1/card')
      ? { body: { code: 'BJ-AGR-2026-000001', full_name: 'Bio GOUNOU', commune: 'banikoara', department: 'alibori', status: 'valide', verification_code: 'K7M2Q9XA', verify_url: '', issued_at: '2026-05-14T10:00:00Z' } }
      : undefined));
    const user = userEvent.setup();
    at('/producteurs/p1/carte');
    await user.click(await screen.findByRole('button', { name: 'Partager le lien' }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringMatching(/\/verification\/K7M2Q9XA$/) }));
  });

  it('fiche non validée : pas de carte', async () => {
    mockFetch((u) => (u.includes('/card') ? { status: 409, body: { detail: 'Non validée', code: 'not_validated' } } : undefined));
    at('/producteurs/p1/carte');
    expect(await screen.findByText('Carte non disponible')).toBeInTheDocument();
  });
});
