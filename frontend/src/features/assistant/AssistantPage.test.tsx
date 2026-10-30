import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { AssistantPage } from './AssistantPage';

describe('Assistant agricole', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

  it('garde les questions sur ce téléphone, les retrouve par recherche et les efface', async () => {
    mockFetch((u, init) => {
      if (u.includes('/assistant/ask')) {
        const q = JSON.parse(String(init?.body)).question as string;
        return { body: q.includes('dose')
          ? { status: 'escalated', answer: "Transmise à l'agent ATDA de votre secteur.", citations: [], disclaimer: '' }
          : { status: 'answered', answer: 'Semer en juin.', citations: [{ doc_id: 'k1', title: 'Quand semer', source: 'INRAB', version: 1 }], disclaimer: 'Conseil indicatif' } };
      }
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    const user = userEvent.setup();
    const first = renderApp(<AssistantPage />);
    await user.type(screen.getByPlaceholderText('Ex. : Quand semer le maïs ?'), 'Quand semer le maïs ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect((await screen.findAllByText('Semer en juin.')).length).toBeGreaterThan(0);
    first.unmount();

    renderApp(<AssistantPage />);
    expect(screen.getAllByText('Quand semer le maïs ?').length).toBeGreaterThan(0); // relu depuis le téléphone
    await user.type(screen.getAllByRole('searchbox', { name: 'Chercher dans mes questions' })[0], 'riz');
    expect(screen.getAllByText('Aucune question ne correspond.').length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: "Effacer l'historique de ce téléphone" })[0]);
    expect(JSON.parse(localStorage.getItem('adb-assistant') ?? '[]')).toEqual([]);
  });

  it('question de dosage : le renvoi vers l\'agent s\'affiche une seule fois, avec le texte du serveur', async () => {
    mockFetch((u) => (u.includes('/assistant/ask')
      ? { body: { status: 'escalated', answer: 'Posez-la à votre agent ATDA.', citations: [], disclaimer: '' } }
      : u.includes('/auth/') ? undefined : { body: [] }));
    const user = userEvent.setup();
    renderApp(<AssistantPage />);
    await user.type(screen.getByPlaceholderText('Ex. : Quand semer le maïs ?'), 'Quelle dose ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByText('Posez-la à votre agent ATDA.')).toBeInTheDocument();
    expect(screen.queryByText(/transmise à l'agent ATDA de votre secteur, qui vous contactera/)).not.toBeInTheDocument();
  });

  it("envoie les derniers échanges avec la question et montre le nom de l'assistant", async () => {
    const bodies: { question: string; history?: { role: string; content: string }[] }[] = [];
    mockFetch((u, init) => {
      if (u.includes('/assistant/ask')) {
        bodies.push(JSON.parse(String(init?.body)));
        return { body: { status: 'answered', answer: bodies.length === 1 ? 'Semer en juin.' : 'Pour le riz, semer en juillet.', citations: [], disclaimer: '' } };
      }
      if (u.endsWith('/assistant/profile')) return { body: { name: 'Kossi' } };
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    const user = userEvent.setup();
    renderApp(<AssistantPage />);
    await user.type(screen.getByPlaceholderText('Ex. : Quand semer le maïs ?'), 'Quand semer le maïs ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect((await screen.findAllByText('Semer en juin.')).length).toBeGreaterThan(0);
    await user.type(screen.getByPlaceholderText('Ex. : Quand semer le maïs ?'), 'Et pour le riz ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect((await screen.findAllByText('Pour le riz, semer en juillet.')).length).toBeGreaterThan(0);
    expect(bodies[0].history).toEqual([]); // première question : pas d'historique
    expect(bodies[1].history).toEqual([{ role: 'user', content: 'Quand semer le maïs ?' }, { role: 'assistant', content: 'Semer en juin.' }]);
    expect((await screen.findAllByText(/Kossi · \d{2}:\d{2}/)).length).toBeGreaterThan(0);
    const stored = JSON.parse(localStorage.getItem('adb-assistant') ?? '[]') as { turns: { ask: Record<string, unknown> }[] }[];
    expect(stored[0].turns[1].ask).not.toHaveProperty('history'); // l'historique n'est pas copié dans chaque message gardé
  });
});
