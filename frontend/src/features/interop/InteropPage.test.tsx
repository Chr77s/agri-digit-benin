import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { InteropPage } from './InteropPage';

const connectors = [
  { partner: 'xroad', label: 'X-Road Bénin', configured: true, last_exchange_at: '2026-10-19T08:30:00Z', calls_24h: 3, failures_24h: 1, avg_ms: 320, key: { masked: 'xr_live_••••••••3f9a', created_at: '2026-10-01T08:00:00Z', last_used_at: null } },
  { partner: 'sonama', label: 'SONAMA', configured: false, last_exchange_at: null, calls_24h: 0, failures_24h: 0, avg_ms: null, key: null },
  { partner: 'fnda', label: 'FNDA', configured: false, last_exchange_at: null, calls_24h: 0, failures_24h: 0, avg_ms: null, key: null },
];
const exchanges = [
  { id: 'e2', at: '2026-10-19T08:31:00Z', partner: 'xroad', ok: false, via: 'refused', rows: null, status: 401, ip: '41.138.x.x' },
  { id: 'e1', at: '2026-10-19T08:30:00Z', partner: 'xroad', ok: true, via: 'api_key', rows: 12, status: 200, ip: '' },
];

describe('Interopérabilité', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('montre connecteurs, échanges et clés ; renouveler affiche la clé une seule fois', async () => {
    const posts: string[] = [];
    mockFetch((u, init) => {
      if (init?.method === 'POST' && u.includes('/interop/keys/')) { posts.push(u); return { status: 201, body: { partner: 'sonama', key: 'so_live_NOUVELLECLE1234' } }; }
      if (u.includes('/interop/connectors')) return { body: connectors };
      if (u.includes('/interop/exchanges')) return { body: { results: exchanges, next: null } };
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    const user = userEvent.setup();
    renderApp(<InteropPage />);
    expect(await screen.findByRole('heading', { name: 'X-Road Bénin' })).toBeInTheDocument();
    expect(screen.getByText('Dégradé')).toBeInTheDocument();
    expect(screen.getByText('320 ms')).toBeInTheDocument();
    expect(await screen.findByText('Clé invalide · 41.138.x.x')).toBeInTheDocument();
    expect(screen.getByText('200 · réussi')).toBeInTheDocument();
    expect(screen.getByText('xr_live_••••••••3f9a')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Créer une clé' })[0]);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Renouveler' }));
    expect(posts[0]).toContain('/interop/keys/sonama/renew');
    expect(await screen.findByText('so_live_NOUVELLECLE1234')).toBeInTheDocument();
  });
});
