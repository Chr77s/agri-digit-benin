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
});
