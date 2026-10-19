import type { ReactNode } from 'react';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { ProgramsPage } from './ProgramsPages';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u4', role: 'responsable_programme' } }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const programs = [
  { id: 'p1', name: 'Engrais maïs Nord', description: '', conditions: '', value_chains: ['mais'], status: 'publie', state: 'ouvert', closes_at: '2099-10-31' },
  { id: 'p2', name: 'Motopompes bas-fonds', description: '', conditions: '', value_chains: ['riz'], status: 'brouillon', state: 'brouillon', closes_at: null },
];

describe('Programmes (responsable)', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('liste brouillons et ouverts, estime les éligibles et enregistre un brouillon incomplet', async () => {
    const posts: { url: string; body: Record<string, unknown> }[] = [];
    mockFetch((u, init) => {
      if (init?.method === 'POST' && u.endsWith('/programs/estimate')) return { body: { count: 1136 } };
      if (init?.method === 'POST' && u.endsWith('/programs')) { posts.push({ url: u, body: JSON.parse(String(init.body)) }); return { status: 201, body: { ...programs[1], id: 'p3' } }; }
      if (u.includes('/programs')) return { body: programs };
      if (u.includes('/ref/value-chains')) return { body: [{ code: 'riz', name: 'Riz' }, { code: 'mais', name: 'Maïs' }] };
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    const user = userEvent.setup();
    renderApp(<ProgramsPage />);
    expect(await screen.findByText('Motopompes bas-fonds')).toBeInTheDocument();
    expect(screen.getAllByText('Brouillon').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Reprendre' })).toBeInTheDocument();
    expect(await screen.findByText('1 136')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Nom/), 'Kits de stockage');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(posts).toHaveLength(1);
    expect(posts[0].body).toMatchObject({ name: 'Kits de stockage', status: 'brouillon', closes_at: null, value_chains: [] });

    await user.click(screen.getByRole('button', { name: 'Publier le programme' }));
    expect((await screen.findAllByText(/Fixez la date de clôture/)).length).toBeGreaterThan(0);
    expect(posts).toHaveLength(1); // publication bloquée côté formulaire
  });
});
