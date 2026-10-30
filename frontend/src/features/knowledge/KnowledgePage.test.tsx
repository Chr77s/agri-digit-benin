import type { ReactNode } from 'react';
import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { KnowledgePage } from './KnowledgePage';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const doc = { id: 'k1', value_chain: 'mais', title: 'Lutte contre la chenille légionnaire', body: 'Reconnaître les jeunes larves dans le cornet.', source: 'INRAB ; FAO 2018', version: 3, status: 'relu', language: 'fr', language_validation: 'valide', updated_at: '2026-10-17T10:00:00Z', reviewed_by_name: 'Dr Kossi Ahoyo', reviewed_at: '2026-10-17T10:00:00Z' };

describe('Fiches techniques', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('ouvre une fiche relue, montre le relecteur et enregistre une nouvelle version avec ses sources', async () => {
    const patches: Record<string, unknown>[] = [];
    mockFetch((u, init) => {
      if (init?.method === 'PATCH') { const b = JSON.parse(String(init.body)); patches.push(b); return { body: { ...doc, ...b, version: 4, status: 'brouillon', reviewed_by_name: null, reviewed_at: null } }; }
      if (u.includes('/knowledge/batches')) return { body: [] };
      if (u.includes('/knowledge')) return { body: { results: [doc], next: null } };
      if (u.includes('/ref/value-chains')) return { body: [{ code: 'mais', name: 'Maïs' }] };
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    const user = userEvent.setup();
    renderApp(<KnowledgePage />);
    await user.click(await screen.findByRole('button', { name: /Lutte contre la chenille légionnaire/ }));
    expect(screen.getByText(/relue le 17\/10\/2026 par Dr Kossi Ahoyo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publier' })).toBeInTheDocument();
    expect(screen.getByLabelText('Source 2')).toHaveValue('FAO 2018');
    await user.click(screen.getByRole('button', { name: 'Ajouter une source' }));
    await user.type(screen.getByLabelText('Source 3'), 'ATDA Alibori');
    await user.click(screen.getByRole('button', { name: 'Enregistrer (nouvelle version)' }));
    expect(patches[0]).toMatchObject({ source: 'INRAB ; FAO 2018 ; ATDA Alibori', title: doc.title });
    expect(await screen.findByText(/Version 4 · brouillon/)).toBeInTheDocument();
  });

  it('ajoute un document, suit son avancement, puis le fait relire et publier', async () => {
    const calls: string[] = [];
    let uploaded: FormData | undefined;
    let state = { brouillon: 0, relu: 0, publie: 0 };
    mockFetch((u, init) => {
      if (u.endsWith('/knowledge/import') && init?.method === 'POST') { uploaded = init.body as FormData; state = { brouillon: 4, relu: 0, publie: 0 }; return { status: 201, body: { batch: 'b1', title: 'guide', chunks: 4 } }; }
      if (u.includes('/knowledge/batches/b1/review')) { calls.push('review'); state = { brouillon: 0, relu: 4, publie: 0 }; return { body: { reviewed: 4 } }; }
      if (u.includes('/knowledge/batches/b1/publish')) { calls.push('publish'); state = { brouillon: 0, relu: 0, publie: 4 }; return { body: { published: 4 } }; }
      if (u.endsWith('/knowledge/batches')) {
        return { body: state.brouillon + state.relu + state.publie ? [{ batch: 'b1', title: 'guide', source: 'Guide INRAB', value_chain: 'general', created_at: '2026-10-30T10:00:00Z', chunks: 4, status: state }] : [] };
      }
      if (u.includes('/knowledge')) return { body: { results: [], next: null } };
      if (u.includes('/ref/value-chains')) return { body: [{ code: 'mais', name: 'Maïs' }] };
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    const user = userEvent.setup();
    renderApp(<KnowledgePage />);
    await user.click(await screen.findByRole('button', { name: 'Ajouter le document' }));
    expect(screen.getByText('Choisissez un fichier.')).toBeInTheDocument(); // rien n'est envoyé sans fichier
    expect(uploaded).toBeUndefined();
    await user.upload(screen.getByLabelText(/^Fichier/), new File(['Le maïs se sème en juin.'], 'guide.txt', { type: 'text/plain' }));
    await user.type(screen.getByLabelText(/^Source/), 'Guide INRAB');
    await user.click(screen.getByRole('button', { name: 'Ajouter le document' }));
    expect(await screen.findByText(/4 extraits/)).toBeInTheDocument();
    expect(uploaded?.get('value_chain')).toBe('general');
    expect(uploaded?.get('source')).toBe('Guide INRAB');
    expect((uploaded?.get('file') as File).name).toBe('guide.txt');
    expect(screen.queryByRole('button', { name: 'Publier' })).not.toBeInTheDocument(); // pas de publication avant la relecture
    await user.click(await screen.findByRole('button', { name: 'Marquer comme relu' }));
    await user.click(await screen.findByRole('button', { name: 'Publier' }));
    expect(await screen.findByText('4 publiés')).toBeInTheDocument();
    expect(calls).toEqual(['review', 'publish']);
    expect(screen.queryByRole('button', { name: /Supprimer le document/ })).not.toBeInTheDocument(); // publié : plus supprimable
  });

  it("la personnalité de l'assistant se règle seulement en administrateur", async () => {
    let saved: unknown;
    mockFetch((u, init) => {
      if (u.endsWith('/assistant/profile') && init?.method === 'PUT') { saved = JSON.parse(String(init.body)); return { body: saved }; }
      if (u.endsWith('/assistant/profile')) return { body: { name: 'Agri-Conseil', persona: 'Tu es un conseiller chaleureux et patient.', default_persona: 'Personnalité par défaut du conseiller agricole.' } };
      if (u.includes('/knowledge/batches')) return { body: [] };
      if (u.includes('/knowledge')) return { body: { results: [], next: null } };
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    auth.user = { id: 'u2', role: 'agronome_inrab' };
    const first = renderApp(<KnowledgePage />);
    await screen.findByRole('button', { name: 'Ajouter le document' });
    expect(screen.queryByText("Personnalité de l'assistant")).not.toBeInTheDocument();
    first.unmount();

    auth.user = { id: 'u1', role: 'admin_maep' };
    const user = userEvent.setup();
    renderApp(<KnowledgePage />);
    const name = await screen.findByLabelText(/^Nom/);
    await vi.waitFor(() => expect(name).toHaveValue('Agri-Conseil'));
    await user.clear(name);
    await user.type(name, 'Kossi');
    await user.click(screen.getByRole('button', { name: 'Remettre la personnalité par défaut' }));
    expect(screen.getByRole('textbox', { name: /^Personnalité/ })).toHaveValue('Personnalité par défaut du conseiller agricole.');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    await vi.waitFor(() => expect(saved).toEqual({ name: 'Kossi', persona: 'Personnalité par défaut du conseiller agricole.' }));
    auth.user = null;
  });
});
