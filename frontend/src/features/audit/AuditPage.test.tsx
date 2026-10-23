import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { AuditPage } from './AuditPage';

const entry = { id: 'e1', seq: 7, at: '2026-10-19T08:00:00Z', actor_phone: '0197000005', actor_role: 'admin_maep', action: 'export.create', object_type: 'dataset', object_id: 'x', details: {}, prev_hash: '9f2c00000000a81e', hash: '41b700000000c3d0' };
const server = (verify: object) => mockFetch((u) => (u.includes('/audit-logs/verify') ? { body: verify } : u.includes('/audit-logs') ? { body: { results: [entry], next: null } } : u.includes('/auth/') ? undefined : { body: [] }));

describe('Journal d’audit', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('annonce une chaîne intègre et montre les empreintes d’une entrée', async () => {
    server({ ok: true, count: 22, broken_seq: null, checked_at: '2026-10-19T08:05:00Z' });
    renderApp(<AuditPage />);
    expect(await screen.findByText('Chaîne intègre')).toBeInTheDocument();
    expect(screen.getByText(/22 entrées vérifiées le/)).toBeInTheDocument();
    await userEvent.setup().click((await screen.findAllByRole('button', { name: 'Détail' }))[0]);
    expect(await screen.findByText(/9f2c…a81e/)).toBeInTheDocument();
    expect(screen.getByText(/41b7…c3d0/)).toBeInTheDocument();
  });

  it('affiche l’action en français et garde le code brut en infobulle et dans le détail', async () => {
    mockFetch((u) => (u.includes('/audit-logs/verify') ? { body: { ok: true, count: 1, broken_seq: null, checked_at: '2026-10-19T08:05:00Z' } }
      : u.includes('/audit-logs') ? { body: { results: [{ ...entry, action: 'credit.score_view', object_type: 'Producer', object_id: '9ca3fc21-8897-45fe-abe1-59871ce96289' }], next: null } } : { body: [] }));
    renderApp(<AuditPage />);
    const label = await screen.findByText('Score de crédit consulté');
    expect(label).toHaveAttribute('title', 'credit.score_view');
    expect(screen.queryByText('credit.score_view')).not.toBeInTheDocument();
    expect(screen.getByText(/9ca3fc21/)).toBeInTheDocument();
    expect(screen.queryByText(/9ca3fc21-8897/)).not.toBeInTheDocument(); // l’identifiant complet reste en infobulle
    await userEvent.setup().click((await screen.findAllByRole('button', { name: 'Détail' }))[0]);
    expect(await screen.findByText(/\(credit\.score_view\)/)).toBeInTheDocument();
  });

  it('signale une rupture avec le numéro de l’entrée', async () => {
    server({ ok: false, count: 6, broken_seq: 7, checked_at: '2026-10-19T08:05:00Z' });
    renderApp(<AuditPage />);
    expect(await screen.findByText('Rupture de chaîne détectée')).toBeInTheDocument();
    expect(screen.getByText(/Entrée n° 7 : l'empreinte ne correspond pas/)).toBeInTheDocument();
  });
});
