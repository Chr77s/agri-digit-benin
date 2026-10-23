import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { LoginPage } from './LoginPage';

describe('Connexion', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('refuse un téléphone mal formé avec un message qui dit comment corriger', async () => {
    const f = mockFetch(() => undefined);
    const user = userEvent.setup();
    renderApp(<LoginPage />);
    const phone = screen.getByLabelText(/Numéro de téléphone/);
    expect(phone).toHaveAttribute('inputmode', 'numeric');
    await user.type(phone, '12345');
    await user.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    expect(await screen.findByText(/10 chiffres commençant par 01/)).toBeInTheDocument();
    expect(f.mock.calls.some(([u]) => String(u).includes('/otp/request'))).toBe(false);
  });

  it('demande le code, affiche le bandeau Simulation et le mot de passe si requis', async () => {
    mockFetch((u) => {
      if (u.includes('/auth/otp/request')) return { body: { detail: 'Code envoyé', requires_password: true } };
      if (u.includes('/demo/otp-inbox')) return { body: [{ body: 'Votre code Agri-Digit : 123456', created_at: '2026-10-16T12:00:00Z' }] };
      return undefined;
    });
    const user = userEvent.setup();
    renderApp(<LoginPage />);
    await user.type(screen.getByLabelText(/Numéro de téléphone/), '0197000002');
    await user.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    expect(await screen.findByLabelText('Mot de passe')).toBeInTheDocument();
    expect(screen.getByLabelText(/Code à 6 chiffres/)).toBeInTheDocument();
    expect(await screen.findByText(/123456/)).toBeInTheDocument();
    expect(screen.getByText('Simulation')).toBeInTheDocument();
  });

  it('affiche l’erreur du serveur sur un code faux', async () => {
    mockFetch((u) => {
      if (u.includes('/auth/otp/request')) return { body: { detail: 'Code envoyé', requires_password: false } };
      if (u.includes('/auth/otp/verify')) return { status: 400, body: { detail: 'Code incorrect. Il vous reste 4 essais.', code: 'otp_invalid' } };
      if (u.includes('/demo/otp-inbox')) return { body: [] };
      return undefined;
    });
    const user = userEvent.setup();
    renderApp(<LoginPage />);
    await user.type(screen.getByLabelText(/Numéro de téléphone/), '0197000001');
    await user.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    expect(screen.queryByLabelText('Mot de passe')).not.toBeInTheDocument();
    await user.type(await screen.findByLabelText('Chiffre 1 sur 6'), '000000');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText(/Code incorrect/)).toBeInTheDocument();
  });

  it('onglet agent : demande le mot de passe en plus du code, et le compte bloqué désactive la connexion', async () => {
    const f = mockFetch((u) => {
      if (u.includes('/auth/otp/request')) return { body: { detail: 'Code envoyé', requires_password: false } };
      if (u.includes('/auth/otp/verify')) return { status: 429, body: { detail: 'Compte bloqué après 5 échecs. Réessayez dans 15 minutes.', code: 'locked' } };
      if (u.includes('/demo/otp-inbox')) return { body: [] };
      return undefined;
    });
    const user = userEvent.setup();
    renderApp(<LoginPage />);
    await user.click(screen.getByRole('tab', { name: 'Agent ou partenaire' }));
    await user.type(screen.getByLabelText(/Numéro de téléphone/), '0197000002');
    await user.click(screen.getByRole('button', { name: 'Recevoir le code' }));
    await user.type(await screen.findByLabelText('Chiffre 1 sur 6'), '123456');
    expect(screen.getByRole('button', { name: 'Renvoyer le code' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText(/Saisissez votre mot de passe/)).toBeInTheDocument();
    expect(f.mock.calls.some(([u]) => String(u).includes('/otp/verify'))).toBe(false);
    await user.type(screen.getByLabelText('Mot de passe'), 'AgriDemo-2026!');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(await screen.findByText(/Compte bloqué après 5 échecs/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeDisabled();
  });
});
