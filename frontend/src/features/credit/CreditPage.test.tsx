import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { CreditPage } from './CreditPage';

const producers = [{ id: 'p1', code: 'ALI-BNK-00412', first_name: 'Awa', last_name: 'Sabi', commune: 'banikoara', consented_at: '2026-09-03T10:00:00Z' }];
const score = { score: 64, disclaimer: 'Aide à la décision.', factors: [{ name: 'Superficie cultivée', weight: 0.2, value: 0.46, contribution: 9.2 }] };

describe('Score de crédit', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('liste les producteurs ayant consenti, puis affiche le score et ses facteurs', async () => {
    mockFetch((u) => (u.includes('/credit/consented-producers') ? { body: { results: producers, next: null } } : u.includes('/credit/scores/p1') ? { body: score } : u.includes('/auth/') ? undefined : { body: [] }));
    const user = userEvent.setup();
    renderApp(<CreditPage />);
    expect(await screen.findByText('ALI-BNK-00412')).toBeInTheDocument();
    expect(screen.getByText('03/09/2026')).toBeInTheDocument();
    expect(screen.getByText('Choisissez un producteur')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Consulter le score' }));
    expect(await screen.findByText('64 / 100')).toBeInTheDocument();
    expect(screen.getByText('9 / 20')).toBeInTheDocument();
    expect(screen.getByText('Score affiché')).toBeInTheDocument();
    expect(screen.getByText(/Aide à la décision\./)).toBeInTheDocument();
  });
});
