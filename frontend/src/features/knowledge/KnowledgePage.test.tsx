import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { KnowledgePage } from './KnowledgePage';

const doc = { id: 'k1', value_chain: 'mais', title: 'Lutte contre la chenille légionnaire', body: 'Reconnaître les jeunes larves dans le cornet.', source: 'INRAB ; FAO 2018', version: 3, status: 'relu', language: 'fr', language_validation: 'valide', updated_at: '2026-10-17T10:00:00Z', reviewed_by_name: 'Dr Kossi Ahoyo', reviewed_at: '2026-10-17T10:00:00Z' };

describe('Fiches techniques', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('ouvre une fiche relue, montre le relecteur et enregistre une nouvelle version avec ses sources', async () => {
    const patches: Record<string, unknown>[] = [];
    mockFetch((u, init) => {
      if (init?.method === 'PATCH') { const b = JSON.parse(String(init.body)); patches.push(b); return { body: { ...doc, ...b, version: 4, status: 'brouillon', reviewed_by_name: null, reviewed_at: null } }; }
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
});
