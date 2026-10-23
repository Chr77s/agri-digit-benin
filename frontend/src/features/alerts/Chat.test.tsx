import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { ChatThread } from './Chat';

const producer = { id: 'p1', code: 'BJ-AGR-2026-000001', name: 'Bio GOUNOU' };

describe('Messagerie producteur et agent', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('le producteur écrit à son agent et voit la réponse dans le fil', async () => {
    let sent: unknown;
    mockFetch((u, init) => {
      if (u.endsWith('/chat') && init?.method === 'POST') {
        sent = JSON.parse(String(init.body));
        return { status: 201, body: { producer, results: [{ id: 'm1', body: 'Mes plants jaunissent.', created_at: '2026-10-20T08:00:00Z', read_at: null, from_producer: true, mine: true }] } };
      }
      if (u.endsWith('/chat')) return { body: { producer, results: [] } };
      return undefined;
    });
    const user = userEvent.setup();
    renderApp(<ChatThread />);
    expect(await screen.findByText(/Pas encore de message/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Envoyer' })).toBeDisabled(); // rien à envoyer
    await user.type(screen.getByLabelText(/Votre message/), 'Mes plants jaunissent.');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    await waitFor(() => expect(sent).toEqual({ body: 'Mes plants jaunissent.' }));
    expect(await screen.findByText('Mes plants jaunissent.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Votre message/)).toHaveValue('');
  });
});
