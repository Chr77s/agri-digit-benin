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

  it('signale une rupture avec le numéro de l’entrée', async () => {
    server({ ok: false, count: 6, broken_seq: 7, checked_at: '2026-10-19T08:05:00Z' });
    renderApp(<AuditPage />);
    expect(await screen.findByText('Rupture de chaîne détectée')).toBeInTheDocument();
    expect(screen.getByText(/Entrée n° 7 : l'empreinte ne correspond pas/)).toBeInTheDocument();
  });
});
