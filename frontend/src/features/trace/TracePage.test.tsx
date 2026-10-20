import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { TracePage } from './TracePage';

describe('Traçabilité', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('remonte un lot par son code jusqu’au producteur et aux intrants', async () => {
    mockFetch((u) => {
      if (u.includes('/lots/LOT-ABC123/trace')) return { body: {
        lot: 'LOT-ABC123',
        origins: [{ lot: 'LOT-111111', producer_code: 'BJ-AGR-2026-000001', commune: 'banikoara', parcel: 'Champ 1', season: '2026-pluie-1', harvested_at: '2026-10-10', inputs: ['Semences BEMA14 (2 sac)'] }],
        steps: [{ code: 'LOT-ABC123', product: 'Farine de maïs', quantity_kg: 1100, status: 'en_stock', holder_role: 'transformateur', site: null }],
      } };
      if (u.includes('/sites')) return { body: { results: [] } };
      if (u.endsWith('/lots')) return { body: { results: [], harvests: [] } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    renderApp(<TracePage />);
    await user.type(screen.getByPlaceholderText('LOT-A1B2C3'), 'lot-abc123');
    await user.click(screen.getByRole('button', { name: 'Remonter' }));
    expect(await screen.findByText(/Producteur BJ-AGR-2026-000001/)).toBeInTheDocument();
    expect(screen.getByText(/Semences BEMA14 \(2 sac\)/)).toBeInTheDocument();
    expect(screen.getByText(/Farine de maïs · 1/)).toBeInTheDocument();
  });
});
