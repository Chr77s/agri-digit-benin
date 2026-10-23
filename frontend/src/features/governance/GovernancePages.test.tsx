import { cleanup, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { ServicesPage } from './GovernancePages';

describe('Services et innovations', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('le producteur voit services, innovations et financements, et peut filtrer', async () => {
    mockFetch((u) => {
      if (u.includes('/publications')) return { body: { results: [
        { id: 'a', kind: 'service', title: 'Assurance récolte', body: 'Indicielle', provider: 'AMAB', value_chains: [], amount_xof: null, link: '', created_at: '2026-10-20' },
        { id: 'b', kind: 'financement', title: 'Ligne FNDA maïs', body: 'Crédit de campagne', provider: 'FNDA', value_chains: ['mais'], amount_xof: 500000000, link: '', created_at: '2026-10-20' },
      ] } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    renderApp(<ServicesPage />);
    expect(await screen.findByText('Assurance récolte')).toBeInTheDocument();
    expect(screen.getByText(/500.000.000 FCFA mobilisés/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publier' })).not.toBeInTheDocument(); // le producteur ne publie pas
    await user.click(screen.getByRole('button', { name: 'Financement mobilisé' }));
    expect(screen.queryByText('Assurance récolte')).not.toBeInTheDocument();
  });
});
