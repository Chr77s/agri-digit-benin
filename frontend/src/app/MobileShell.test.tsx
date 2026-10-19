import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../test-utils';
import { PageHeader, SuccessState, useIsMobile } from '../shared/ui';
import { Layout, showSystemNotification } from './Layout';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../features/auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user, ready: true, signOut: async () => undefined }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const shell = (role: string, page: ReactNode = <p>Contenu</p>) => {
  auth.user = { id: 'u1', role, full_name: 'Bio Gounou', phone: '0197000001', producer_id: null };
  mockFetch((u) => (u.includes('/notifications') ? { body: [] } : undefined));
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/']}><Routes><Route element={<Layout />}><Route path="/" element={page} /></Route></Routes></MemoryRouter>
    </QueryClientProvider>,
  );
};
const phone = (on: boolean) => vi.stubGlobal('matchMedia', (q: string) => ({ matches: on, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));

describe('Coque mobile', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('donne au producteur les cinq onglets du bas de la maquette, la page courante marquée', () => {
    shell('producteur');
    const tabs = screen.getByRole('navigation', { name: 'Onglets' });
    const links = within(tabs).getAllByRole('link');
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Accueil', '/'], ['Conseil', '/assistant'], ['Photo', '/diagnostic'], ['Marché', '/marche'], ['Parcelles', '/parcelles'],
    ]);
    expect(links[0]).toHaveAttribute('aria-current', 'page');
  });

  it("n'en donne pas aux rôles sans onglets : le tiroir reste leur menu", () => {
    shell('agent_atda');
    expect(screen.queryByRole('navigation', { name: 'Onglets' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir le menu' })).toBeInTheDocument();
  });

  it('PageHeader : bouton retour vers le dernier lien du fil d’Ariane', () => {
    shell('producteur', <PageHeader title="Langue et lecture" crumbs={[{ label: 'Accueil', to: '/' }, { label: 'Mon profil', to: '/profil' }, { label: 'Langue' }]} />);
    expect(screen.getByRole('link', { name: 'Retour : Mon profil' })).toHaveAttribute('href', '/profil');
  });

  it('SuccessState : annonce ce qui est fait et la suite', () => {
    render(<SuccessState title="Parcelle enregistrée" actions={<button type="button">Ouvrir une campagne</button>}>2,4 ha</SuccessState>);
    expect(screen.getByRole('status')).toHaveTextContent('Parcelle enregistrée2,4 ha');
    expect(screen.getByRole('button', { name: 'Ouvrir une campagne' })).toBeInTheDocument();
  });

  it('notification du système : passe par le service worker, et ne lève jamais (Chrome Android refuse le constructeur)', async () => {
    vi.stubGlobal('Notification', function Illegal() { throw new TypeError('Illegal constructor'); });
    await expect(showSystemNotification('Alerte pluie', { body: 'Jeudi', tag: 'n1' })).resolves.toBeUndefined();

    const showNotification = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { getRegistration: async () => ({ active: {}, showNotification }) } });
    await showSystemNotification('Alerte pluie', { body: 'Jeudi', tag: 'n1' });
    expect(showNotification).toHaveBeenCalledWith('Alerte pluie', { body: 'Jeudi', tag: 'n1' });

    vi.stubGlobal('navigator', { ...navigator, serviceWorker: { getRegistration: async () => { throw new Error('refusé'); } } });
    await expect(showSystemNotification('x', {})).resolves.toBeUndefined();
  });

  it('useIsMobile suit le seuil de 640 px, et vaut faux sans matchMedia', () => {
    const Probe = () => <p>{useIsMobile() ? 'mobile' : 'web'}</p>;
    phone(true);
    const { unmount } = render(<Probe />);
    expect(screen.getByText('mobile')).toBeInTheDocument();
    unmount();
    vi.stubGlobal('matchMedia', undefined);
    render(<Probe />);
    expect(screen.getByText('web')).toBeInTheDocument();
  });
});
