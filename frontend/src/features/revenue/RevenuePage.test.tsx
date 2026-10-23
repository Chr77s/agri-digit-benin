import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { RevenuePage } from './RevenuePage';

const revenue = {
  season: null, seasons: ['2026-pluie-1'], sales_xof: 400000, unpriced_harvests: 1, expenses_xof: 60000, repayments_xof: 10000, net_xof: 330000, area_ha: 2,
  net_per_ha_xof: 165000, free_supports_xof: 0, market_received_xof: 0,
  by_campaign: [{ campaign: 'c1', value_chain: 'mais', season: '2026-pluie-1', parcel: 'Champ 1', area_ha: 2, sold_kg: 2050, sales_xof: 400000, expenses_xof: 50000, net_xof: 350000 }],
};

describe('Mon revenu', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('montre le revenu net, signale les ventes sans prix et enregistre une dépense', async () => {
    let posted: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.includes('/expenses') && init?.method === 'POST') { posted = JSON.parse(String(init.body)); return { status: 201, body: { id: 'e1' } }; }
      if (u.includes('/expenses')) return { body: { results: [] } };
      if (u.includes('/revenue')) return { body: revenue };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><RevenuePage /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText(/330\s?000/)).toBeInTheDocument();
    expect(screen.getByText(/1 récolte vendue sans prix n'est pas comptée/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Montant/), '15000');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));
    await vi.waitFor(() => expect(posted).toMatchObject({ category: 'intrants', amount_xof: 15000 }));
  });
});
