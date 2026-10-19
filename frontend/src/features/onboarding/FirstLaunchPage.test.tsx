import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { App } from '../../app/App';
import { FirstLaunchPage, firstLaunchDone } from './FirstLaunchPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: null, ready: true }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const at = (path: string, ui: ReactNode) => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
  </QueryClientProvider>,
);
const phone = () => vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));

describe('Premier lancement', () => {
  afterEach(async () => { vi.unstubAllGlobals(); localStorage.clear(); await i18n.changeLanguage('fr'); });

  it('sur téléphone, un visiteur arrive sur le premier lancement tant qu’il ne l’a pas fini', () => {
    phone();
    at('/', <App />);
    expect(screen.getByRole('heading', { name: 'Choisissez votre langue' })).toBeInTheDocument();
  });

  it('langue, trois écrans, autorisations, puis la connexion ; le passage est mémorisé', async () => {
    const user = userEvent.setup();
    at('/bienvenue', <Routes><Route path="/bienvenue" element={<FirstLaunchPage />} /><Route path="/connexion" element={<h1>Connexion</h1>} /></Routes>);

    await user.click(screen.getByRole('radio', { name: /Fɔngbè/ }));
    expect(i18n.language).toBe('fon');
    expect(localStorage.getItem('adb-lang')).toBe('fon');
    await user.click(screen.getByRole('radio', { name: /Français/ }));
    expect(screen.getAllByText('À valider')).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Continuer en français' }));
    expect(screen.getByRole('heading', { name: 'Un conseiller dans votre poche' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByRole('heading', { name: 'Une photo de la feuille, un conseil' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Passer' }));

    expect(screen.getByRole('heading', { name: 'Autorisations' })).toBeInTheDocument();
    expect(firstLaunchDone()).toBe(false);
    await user.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    expect(firstLaunchDone()).toBe(true);
  });

  it('demande vraiment l’autorisation au navigateur et affiche sa réponse', async () => {
    const requestPermission = vi.fn(async () => 'granted');
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
    const user = userEvent.setup();
    at('/bienvenue', <FirstLaunchPage />);
    await user.click(screen.getByRole('button', { name: /Continuer/ }));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: /Suivant|Commencer/ }));
    await user.click(screen.getByRole('button', { name: 'Autoriser : Notifications' }));
    expect(requestPermission).toHaveBeenCalled();
    expect(await screen.findByText('Autorisé')).toBeInTheDocument();
    // Sans appareil photo ni micro dans le navigateur de test : dit tel quel, pas « autorisé ».
    await user.click(screen.getByRole('button', { name: 'Autoriser : Micro' }));
    expect(await screen.findByText('Absent du téléphone')).toBeInTheDocument();
  });
});
