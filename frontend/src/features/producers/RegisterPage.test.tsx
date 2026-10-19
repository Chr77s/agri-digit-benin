import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { RegisterPage, ageOn } from './RegisterPage';

// Sans IndexedDB (jsdom), la file hors ligne est simulée : `offline` fait répondre « gardé sur le téléphone ».
const queue = vi.hoisted(() => ({ offline: false }));
vi.mock('../outbox/offlineQueue', async (orig) => {
  const m = await orig<typeof import('../outbox/offlineQueue')>();
  return { ...m, postOrQueue: (...a: Parameters<typeof m.postOrQueue>) => (queue.offline ? Promise.resolve('queued' as const) : m.postOrQueue(...a)) };
});

const departments = [{ code: 'alibori', name: 'Alibori', communes: [{ code: 'banikoara', name: 'Banikoara' }] }];

type U = ReturnType<typeof userEvent.setup>;
const next = (user: U) => user.click(screen.getByRole('button', { name: /Continuer|Voir le récapitulatif/ }));

/** Étapes 1 et 2 remplies, on arrive à l'étape Langue. */
async function fillValid(user: U, birth = '1990-07-01') {
  await user.type(screen.getByLabelText(/^NPI/), '1000000002');
  await user.click(screen.getByLabelText('Femme'));
  await user.type(screen.getByLabelText('Prénom'), 'Awa');
  await user.type(screen.getByLabelText('Nom'), 'SABI');
  await user.type(screen.getByLabelText('Date de naissance'), birth);
  await next(user);
  await waitFor(() => expect(screen.getByRole('option', { name: 'Alibori' })).toBeInTheDocument());
  await user.selectOptions(screen.getByLabelText('Département'), 'alibori');
  await user.selectOptions(screen.getByLabelText(/^Commune/), 'banikoara');
  await user.type(screen.getByLabelText(/^Téléphone/), '0197001234');
  await next(user);
  expect(await screen.findByRole('heading', { name: 'Langue préférée' })).toBeInTheDocument();
}
/** Langue -> consentement coché -> récapitulatif -> envoi. */
async function consentAndSend(user: U) {
  await next(user);
  await user.click(screen.getByRole('checkbox', { name: /je donne mon consentement/i }));
  await next(user);
  await user.click(await screen.findByRole('button', { name: /Envoyer l'inscription/ }));
}

describe('Inscription producteur', () => {
  afterEach(() => { vi.unstubAllGlobals(); queue.offline = false; });

  it('calcule l’âge', () => {
    expect(ageOn('2011-05-04', new Date('2026-10-16'))).toBe(15);
    expect(ageOn('1990-07-01', new Date('2026-10-16'))).toBe(36);
  });

  it('refuse l’envoi sans consentement, case non cochée par défaut', async () => {
    const f = mockFetch((u) => (u.includes('/ref/departments') ? { body: departments } : undefined));
    const user = userEvent.setup();
    renderApp(<RegisterPage />);
    await fillValid(user);
    await next(user);
    const consent = screen.getByRole('checkbox', { name: /je donne mon consentement/i });
    expect(consent).not.toBeChecked();
    await next(user);
    expect(await screen.findByText(/Cochez la case pour donner votre consentement/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Envoyer l'inscription/ })).not.toBeInTheDocument();
    expect(f.mock.calls.some(([u]) => String(u).includes('/producers/register'))).toBe(false);
  });

  it('sans réseau : la fiche est gardée sur le téléphone, sans code ni promesse de validation', async () => {
    queue.offline = true;
    mockFetch((u) => (u.includes('/ref/departments') ? { body: departments } : undefined));
    const user = userEvent.setup();
    renderApp(<RegisterPage />);
    await fillValid(user);
    await consentAndSend(user);
    expect(await screen.findByRole('heading', { name: 'Fiche gardée sur ce téléphone' })).toBeInTheDocument();
    expect(screen.getByText(/l'inscription part dès le retour de la connexion/)).toBeInTheDocument();
    expect(screen.queryByText('Votre code producteur')).not.toBeInTheDocument();
  });

  it('affiche le parcours parent ou tuteur pour un mineur', async () => {
    mockFetch((u) => (u.includes('/ref/departments') ? { body: departments } : undefined));
    const user = userEvent.setup();
    renderApp(<RegisterPage />);
    await fillValid(user, '2011-05-04');
    await next(user);
    expect(await screen.findByText(/Moins de 16 ans : parent ou tuteur légal/)).toBeInTheDocument();
    expect(screen.getByLabelText('NPI du parent ou tuteur')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /je donne mon consentement/i }));
    await next(user);
    expect(await screen.findByText(/saisissez le nom du parent ou tuteur légal/)).toBeInTheDocument();
  });

  it('montre l’erreur ANIP à côté du champ et le succès en attente', async () => {
    let attempt = 0;
    mockFetch((u, init) => {
      if (u.includes('/ref/departments')) return { body: departments };
      if (u.includes('/producers/register') && init?.method === 'POST') {
        attempt++;
        if (attempt === 1) return { status: 400, body: { detail: 'Nom différent', code: 'name_mismatch' } };
        return { status: 201, body: { id: 'p1', code: 'BJ-AGR-2026-000123', status: 'en_attente' } };
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp(<RegisterPage />);
    await fillValid(user);
    await consentAndSend(user);
    // retour à l'étape Identité, erreur sous le champ, saisie gardée
    expect((await screen.findAllByText(/ne correspond pas à la fiche ANIP/)).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Nom')).toHaveValue('SABI');
    await next(user);
    await next(user);
    await next(user);
    await next(user);
    await user.click(await screen.findByRole('button', { name: /Envoyer l'inscription/ }));
    expect(await screen.findByText('BJ-AGR-2026-000123')).toBeInTheDocument();
    expect(screen.getByText(/En attente de validation/)).toBeInTheDocument();
  });

  it('propose la fiche existante en cas de doublon', async () => {
    mockFetch((u, init) => {
      if (u.includes('/ref/departments')) return { body: departments };
      if (u.includes('/producers/register') && init?.method === 'POST') return { status: 409, body: { detail: 'Doublon', code: 'duplicate', existing: { id: 'x', code: 'BJ-AGR-2026-000001' } } };
      return undefined;
    });
    const user = userEvent.setup();
    renderApp(<RegisterPage />);
    await fillValid(user);
    await consentAndSend(user);
    expect(await screen.findByText('BJ-AGR-2026-000001')).toBeInTheDocument();
  });
});
