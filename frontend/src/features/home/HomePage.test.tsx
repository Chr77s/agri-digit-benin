import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { SiteMapPage } from '../legal/SiteMapPage';
import { LegalPage } from '../legal/LegalPage';
import { HomePage } from './HomePage';

describe('Page d’accueil', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('présente la promesse, trois étapes, et mène à l’inscription', () => {
    mockFetch(() => undefined);
    renderApp(<HomePage />);
    expect(screen.getByRole('heading', { level: 1, name: /Votre champ dans votre téléphone/ })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Créer mon compte producteur/ }).every((a) => a.getAttribute('href') === '/inscription')).toBe(true);
    expect(screen.getAllByRole('link', { name: 'Se connecter' }).every((a) => a.getAttribute('href') === '/connexion')).toBe(true);
    expect(screen.getAllByRole('listitem').filter((li) => li.classList.contains('hm-step'))).toHaveLength(3);
    // pas de badge institutionnel : le logo porte déjà la mention
    expect(screen.queryByText('République du Bénin · MAEP')).not.toBeInTheDocument();
    for (const name of ['Partenaires', 'Vos questions']) expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    expect(screen.getAllByText(/Faut-il un smartphone/)).toHaveLength(1);
    for (const id of ['comment', 'qui', 'confiance', 'partenaires', 'faq']) expect(document.getElementById(id)).not.toBeNull();
  });

  it('pied de page : rubriques, espaces, aide et mentions légales, avec leurs adresses', () => {
    mockFetch(() => undefined);
    renderApp(<HomePage />);
    const foot = screen.getByRole('contentinfo');
    const href = (name: RegExp | string) => within(foot).getByRole('link', { name }).getAttribute('href');
    expect(href('Comment ça marche')).toBe('#comment');
    expect(href('Partenaires')).toBe('#partenaires');
    expect(href('Créer un compte producteur')).toBe('/inscription');
    expect(href('Vérifier une carte producteur')).toBe('/verification');
    expect(href('Contact et assistance')).toBe('/contact');
    expect(href('Plan du site')).toBe('/plan-du-site');
    expect(href('Accessibilité')).toBe('/accessibilite');
    expect(href(/Mentions légales/)).toBe('/mentions-legales');
    expect(href(/confidentialité/i)).toBe('/confidentialite');
    expect(href(/Conditions d.utilisation/)).toBe('/conditions-utilisation');
    expect(within(foot).getByRole('button', { name: 'Retour en haut' })).toBeInTheDocument();
    expect(within(foot).getAllByRole('navigation')).toHaveLength(4);
  });

  it('plan du site, accessibilité et contact : pages publiques complètes', () => {
    mockFetch(() => undefined);
    const { unmount } = renderApp(<SiteMapPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Plan du site' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Déclaration d\'accessibilité' })).toHaveAttribute('href', '/accessibilite');
    unmount();
    const a = renderApp(<LegalPage doc="accessibility" />);
    expect(screen.getByRole('heading', { name: 'Déclaration d\'accessibilité' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Limites connues' })).toBeInTheDocument();
    a.unmount();
    renderApp(<LegalPage doc="contact" />);
    expect(screen.getByRole('heading', { name: 'Contact et assistance' })).toBeInTheDocument();
  });
});
