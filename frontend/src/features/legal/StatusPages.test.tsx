import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { ApiError } from '../../shared/api/client';
import { ErrorPage, NotFoundPage } from './StatusPages';
import { LegalPage } from './LegalPage';

describe('Écrans d’état et documents légaux', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('404 : rappelle l’adresse demandée et propose les pages utiles', () => {
    mockFetch(() => undefined);
    renderApp(<NotFoundPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Cette page est introuvable' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Vérifier une carte de producteur/ })).toHaveAttribute('href', '/verification');
  });

  it('erreur : réessayer appelle onRetry ; un 403 ne propose pas de réessayer', async () => {
    mockFetch(() => undefined);
    const retry = vi.fn();
    const { unmount } = renderApp(<ErrorPage error={new ApiError(502, { detail: 'Passerelle' })} onRetry={retry} />);
    expect(screen.getByText('Erreur du serveur · 502')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Réessayer' }).click();
    expect(retry).toHaveBeenCalled();
    unmount();
    renderApp(<ErrorPage error={new ApiError(403, { detail: 'Interdit' })} />);
    expect(screen.getByRole('heading', { name: 'Page réservée' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réessayer' })).not.toBeInTheDocument();
  });

  it('légal : sommaire du document et mentions à compléter surlignées', () => {
    mockFetch(() => undefined);
    renderApp(<LegalPage doc="notice" />);
    expect(screen.getByRole('navigation', { name: 'Sommaire : Mentions légales' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Hébergement' })).toHaveAttribute('href', '#notice-3');
    expect(document.querySelectorAll('mark.todo').length).toBeGreaterThan(0);
  });
});
