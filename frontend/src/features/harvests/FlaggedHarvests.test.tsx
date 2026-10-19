import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderApp } from '../../test-utils';
import { FlaggedHarvestsPage } from './HarvestPages';

const harvest = (o: Record<string, unknown> = {}) => ({ id: 'h1', campaign: 'c1', producer_code: 'BJ-AGR-2026-000311', value_chain: 'mais', harvested_at: '2026-10-10', quantity_kg: 4200, stored_kg: 1200, sold_kg: 3000, estimated_kg: 1750, deviation_pct: 140, flagged: true, check_status: 'a_verifier', check_reason: '', checked_at: null, declared_kg: null, ...o });

describe('Récoltes signalées', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('corriger la quantité exige la quantité et un motif, puis envoie la conclusion', async () => {
    let body: unknown;
    mockFetch((u, init) => {
      if (u.includes('/harvests/h1/check')) { body = JSON.parse(String(init?.body)); return { body: harvest({ check_status: 'corrigee' }) }; }
      if (u.includes('to_check=true')) return { body: { results: [harvest()], next: null } };
      if (u.includes('to_check=false')) return { body: { results: [harvest({ id: 'h2', producer_code: 'BJ-AGR-2026-000256', check_status: 'confirmee', check_reason: 'Vérifiée sur place.', checked_at: '2026-10-12T09:00:00Z' })], next: null } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    renderApp(<FlaggedHarvestsPage />);
    expect(await screen.findByText('BJ-AGR-2026-000311')).toBeInTheDocument();
    expect(screen.getByText('+140 %')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    await user.click(screen.getByRole('radio', { name: /Quantité corrigée/ }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer la vérification' }));
    expect(await screen.findByText(/Indiquez le motif/)).toBeInTheDocument();
    expect(body).toBeUndefined(); // ni quantité ni motif : rien n'est envoyé
    await user.type(screen.getByLabelText('Quantité corrigée'), '2400');
    await user.type(screen.getByRole('textbox', { name: /Motif/ }), 'Le producteur avait compté la récolte de son frère.');
    await user.click(screen.getByRole('button', { name: 'Enregistrer la vérification' }));
    await waitFor(() => expect(body).toEqual({ conclusion: 'corrigee', reason: 'Le producteur avait compté la récolte de son frère.', quantity_kg: 2400 }));
  });

  it('l\'onglet « Vérifiées » montre la conclusion et son motif', async () => {
    mockFetch((u) => {
      if (u.includes('to_check=true')) return { body: { results: [harvest()], next: null } };
      if (u.includes('to_check=false')) return { body: { results: [harvest({ id: 'h2', producer_code: 'BJ-AGR-2026-000256', check_status: 'confirmee', check_reason: 'Vérifiée sur place.', checked_at: '2026-10-12T09:00:00Z' })], next: null } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    renderApp(<FlaggedHarvestsPage />);
    await user.click(await screen.findByRole('button', { name: /Vérifiées/ }));
    expect(await screen.findByText('Déclaration confirmée')).toBeInTheDocument();
    expect(screen.getByText(/Vérifiée sur place\./)).toBeInTheDocument();
  });

  it('plus rien à vérifier : l\'onglet « Vérifiées » reste accessible', async () => {
    mockFetch((u) => {
      if (u.includes('to_check=true')) return { body: { results: [], next: null } };
      if (u.includes('to_check=false')) return { body: { results: [harvest({ id: 'h2', check_status: 'confirmee', check_reason: 'Vérifiée sur place.', checked_at: '2026-10-12T09:00:00Z' })], next: null } };
      return u.includes('/ref/') ? { body: [] } : undefined;
    });
    const user = userEvent.setup();
    renderApp(<FlaggedHarvestsPage />);
    await user.click(await screen.findByRole('button', { name: /Vérifiées/ }));
    expect(await screen.findByText(/Vérifiée sur place\./)).toBeInTheDocument();
  });
});
