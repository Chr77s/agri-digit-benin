import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { CampaignsPage } from './CampaignsPage';

const parcel = { id: 'pa1', name: 'Champ de Founougo', geometry: { type: 'Polygon', coordinates: [] }, land_type: 'pluvial_plateau', tenure: 'propriete', area_ha: 2.4, overlap_warning: false, overlap_with: [] };
const sown = new Date(Date.now() - 37 * 86_400_000);
const iso = `${sown.getFullYear()}-${String(sown.getMonth() + 1).padStart(2, '0')}-${String(sown.getDate()).padStart(2, '0')}`;
const camp = { id: 'c1', parcel: 'pa1', value_chain: 'mais', season: '2026-pluie-1', stage: 'croissance', version: 2, variety: 'EVDT 97 STR', sown_at: iso, estimated_kg: 2100 };

describe('Campagnes', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('montre le calendrier, les tâches, passe au stade suivant et ouvre la récolte avec l’estimation', async () => {
    const patches: Record<string, unknown>[] = [];
    mockFetch((u, init) => {
      if (init?.method === 'PATCH') { const b = JSON.parse(String(init.body)); patches.push(b); return { body: { ...camp, ...b } }; }
      if (u.includes('/campaigns')) return { body: [camp] };
      if (u.includes('/parcels')) return { body: [parcel] };
      if (u.includes('/ref/value-chains')) return { body: [{ code: 'mais', name: 'Maïs' }] };
      return u.includes('/auth/') ? undefined : { body: [] };
    });
    const user = userEvent.setup();
    renderApp(<CampaignsPage />);
    const card = (await screen.findByRole('heading', { name: /Champ de Founougo/ })).closest('article')!;
    expect(within(card).getByText('Calendrier · jour 38')).toBeInTheDocument();
    expect(within(card).getByText(/EVDT 97 STR/)).toBeInTheDocument();
    expect(within(card).getByText('Deuxième sarclage et buttage')).toBeInTheDocument();
    expect(within(card).queryByText('Vérifier la levée : Maïs')).not.toBeInTheDocument(); // stade dépassé
    await user.click(within(card).getByRole('button', { name: /Passer au stade suivant \(floraison\)/ }));
    expect(patches[0]).toMatchObject({ stage: 'floraison', base_version: 2 });

    await user.click(within(card).getByRole('button', { name: 'Déclarer une récolte' }));
    const dlg = await screen.findByRole('dialog');
    expect(within(dlg).getByText(/Estimé : 1\s?900 à 2\s?300 kg\./u)).toBeInTheDocument();
  });
});
