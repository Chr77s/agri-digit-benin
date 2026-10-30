import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { AssistantPage } from './AssistantPage';

const PLACEHOLDER = 'Écrivez votre question…';
const answered = (answer: string, citations: { doc_id: string; title: string; source: string; version: number }[] = []) =>
  ({ body: { status: 'answered', answer, citations, disclaimer: '' } });

describe('Assistant agricole', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });

  it('garde les questions sur ce téléphone, les retrouve par recherche et les efface', async () => {
    mockFetch((u) => (u.includes('/assistant/ask') ? answered('Semer en juin.') : u.includes('/auth/') ? undefined : { body: [] }));
    const user = userEvent.setup();
    const first = renderApp(<AssistantPage />);
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), 'Quand semer le maïs ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByText('Semer en juin.')).toBeInTheDocument();
    first.unmount();

    renderApp(<AssistantPage />);
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument(); // l'historique reste fermé tant qu'on ne l'ouvre pas
    await user.click(screen.getByRole('button', { name: 'Mes conversations' }));
    expect(within(screen.getByRole('region', { name: 'Mes conversations' })).getByText('Quand semer le maïs ?')).toBeInTheDocument(); // relu depuis le téléphone
    await user.type(screen.getByRole('searchbox', { name: 'Chercher dans mes questions' }), 'riz');
    expect(screen.getByText('Aucune question ne correspond.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "Effacer l'historique de ce téléphone" }));
    expect(JSON.parse(localStorage.getItem('adb-assistant') ?? '[]')).toEqual([]);
  });

  it('question de dosage : le renvoi vers l\'agent s\'affiche une seule fois, avec le texte du serveur', async () => {
    mockFetch((u) => (u.includes('/assistant/ask')
      ? { body: { status: 'escalated', answer: 'Posez-la à votre agent ATDA.', citations: [], disclaimer: '' } }
      : u.includes('/auth/') ? undefined : { body: [] }));
    const user = userEvent.setup();
    renderApp(<AssistantPage />);
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), 'Quelle dose ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByText('Posez-la à votre agent ATDA.')).toBeInTheDocument();
    expect(screen.queryByText(/transmise à l'agent ATDA de votre secteur, qui vous contactera/)).not.toBeInTheDocument();
  });

  it("envoie les derniers échanges avec la question et montre le nom de l'assistant", async () => {
    const bodies: { question: string; history?: { role: string; content: string }[] }[] = [];
    mockFetch((u, init) => {
      if (u.includes('/assistant/ask')) {
        bodies.push(JSON.parse(String(init?.body)));
        return answered(bodies.length === 1 ? 'Semer en juin.' : 'Pour le riz, semer en juillet.');
      }
      if (u.endsWith('/assistant/profile')) return { body: { name: 'Kossi' } };
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    const user = userEvent.setup();
    renderApp(<AssistantPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Kossi' })).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), 'Quand semer le maïs ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByText('Semer en juin.')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), 'Et pour le riz ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    expect(await screen.findByText('Pour le riz, semer en juillet.')).toBeInTheDocument();
    expect(bodies[0].history).toEqual([]); // première question : pas d'historique
    expect(bodies[1].history).toEqual([{ role: 'user', content: 'Quand semer le maïs ?' }, { role: 'assistant', content: 'Semer en juin.' }]);
    const stored = JSON.parse(localStorage.getItem('adb-assistant') ?? '[]') as { turns: { ask: Record<string, unknown> }[] }[];
    expect(stored[0].turns[1].ask).not.toHaveProperty('history'); // l'historique n'est pas copié dans chaque message gardé
  });

  it('affiche la réponse en Markdown et range les sources dans un menu fermé', async () => {
    mockFetch((u) => (u.includes('/assistant/ask')
      ? answered('Séchez les graines :\n\n- **trois jours** au soleil\n- puis ensachez', [{ doc_id: 'k1', title: 'Stockage', source: 'INRAB', version: 1 }])
      : u.includes('/auth/') ? undefined : { body: [] }));
    const user = userEvent.setup();
    renderApp(<AssistantPage />);
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), 'Comment stocker le niébé ?');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));
    const bold = await screen.findByText('trois jours');
    expect(bold.tagName).toBe('STRONG');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument(); // plus de signes Markdown à l'écran
    const sources = screen.getByText('Source (1)').closest('details') as HTMLDetailsElement;
    expect(sources.open).toBe(false); // l'agriculteur ouvre les sources s'il le souhaite
    await user.click(within(sources).getByText('Source (1)'));
    expect(sources.open).toBe(true);
    expect(within(sources).getByText(/Stockage/)).toBeInTheDocument();
  });

  it('une question type part toute seule, Entrée envoie et Maj+Entrée passe à la ligne', async () => {
    const asked: string[] = [];
    mockFetch((u, init) => {
      if (u.includes('/assistant/ask')) { asked.push(JSON.parse(String(init?.body)).question); return answered('Réponse.'); }
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    const user = userEvent.setup();
    renderApp(<AssistantPage />);
    await user.click(await screen.findByRole('button', { name: 'Comment stocker le niébé ?' }));
    await screen.findByText('Réponse.');
    await user.type(screen.getByPlaceholderText(PLACEHOLDER), 'Premier{Shift>}{Enter}{/Shift}second{Enter}');
    await vi.waitFor(() => expect(asked).toHaveLength(2));
    expect(asked[0]).toBe('Comment stocker le niébé ?');
    expect(asked[1]).toBe('Premier\nsecond');
  });
});
