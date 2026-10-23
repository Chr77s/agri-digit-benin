import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch } from '../../test-utils';
import { EquipmentPage } from './EquipmentPage';
import { MechanizationPage } from './MechanizationPage';
import { PmeaPage } from './PmeaPage';
import { SeedsPage } from './SeedsPage';

const auth = vi.hoisted(() => ({ user: null as null | Record<string, unknown> }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: auth.user }), AuthProvider: ({ children }: { children: ReactNode }) => children }));

const page = (ui: ReactNode) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>,
);
const ref = (u: string) => (u.includes('/ref/') ? { body: [] } : undefined);
const tractor = { id: 'e1', kind: 'tracteur', label: 'Tracteur 75 ch', quantity: 1, condition: 'bon', acquired_year: null, for_hire: true, hire_rate_xof_per_ha: 25000, department: 'alibori', commune: 'banikoara', owner: 'BJ-AGR-2026-000002' };

describe('Prestations aux exploitations', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('propriétaire : propose son matériel à la location avec un tarif', async () => {
    auth.user = { id: 'u1', role: 'producteur' };
    let patched: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.includes('/equipment/e1') && init?.method === 'PATCH') { patched = JSON.parse(String(init.body)); return { body: {} }; }
      if (u.includes('/equipment')) return { body: { results: [{ ...tractor, for_hire: false, hire_rate_xof_per_ha: null }] } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<EquipmentPage />);
    await user.click(await screen.findByRole('button', { name: 'Proposer à la location' }));
    await user.click(screen.getByRole('button', { name: 'Proposer à la location', hidden: false }));
    expect(await screen.findByText('Indiquez un tarif supérieur à zéro.')).toBeInTheDocument(); // rien n'est envoyé sans tarif
    expect(patched).toBeNull();
    await user.type(screen.getByLabelText(/Tarif par hectare/), '25000');
    await user.click(screen.getByRole('button', { name: 'Proposer à la location', hidden: false }));
    await vi.waitFor(() => expect(patched).toEqual({ for_hire: true, hire_rate_xof_per_ha: 25000 }));
  });

  it('producteur : demande une prestation de labour et voit le coût estimé', async () => {
    auth.user = { id: 'u2', role: 'producteur' };
    let body: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.includes('/mechanization/requests') && init?.method === 'POST') { body = JSON.parse(String(init.body)); return { status: 201, body: {} }; }
      if (u.includes('/mechanization/requests')) return { body: { results: [] } };
      if (u.includes('/mechanization/providers')) return { body: { results: [tractor] } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<MechanizationPage />);
    await user.click(await screen.findByRole('button', { name: 'Demander' }));
    await user.type(screen.getByLabelText(/Surface à travailler/), '2');
    expect(screen.getByText(/Coût estimé : 50\s?000 FCFA/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Date souhaitée/), '2999-01-01');
    await user.click(screen.getByRole('button', { name: 'Envoyer la demande' }));
    await vi.waitFor(() => expect(body).toMatchObject({ equipment: 'e1', operation: 'labour', area_ha: 2, wished_on: '2999-01-01' }));
  });

  it('agent : remet des semences d’un lot, limité au stock', async () => {
    auth.user = { id: 'u3', role: 'agent_atda', department: 'alibori' };
    let body: Record<string, unknown> | null = null;
    mockFetch((u, init) => {
      if (u.includes('/seed-lots/l1/distribute') && init?.method === 'POST') { body = JSON.parse(String(init.body)); return { status: 201, body: {} }; }
      if (u.includes('/seed-lots')) return { body: { stock_kg: 380, results: [{ id: 'l1', code: 'SEM-AB12CD', value_chain: 'mais', variety: 'EVDT 97 STR', category: 'r1', certificate_no: 'CERT-1', centre: 'Centre de Kandi', department: 'alibori', produced_on: '2026-05-10', quantity_kg: 500, available_kg: 380, distributed_kg: 120, beneficiaries: 1 }] } };
      if (u.includes('/producers')) return { body: { results: [{ id: 'pr1', code: 'BJ-AGR-2026-000001', first_name: 'Awa', last_name: 'Sabi', status: 'valide' }], next: null } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<SeedsPage />);
    expect(await screen.findByText('SEM-AB12CD')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remettre' }));
    await user.selectOptions(await screen.findByLabelText(/Producteur/), 'pr1');
    await user.type(screen.getByLabelText(/Quantité \(reste/), '900');
    await user.click(screen.getByRole('button', { name: 'Remettre', hidden: false }));
    expect(await screen.findByText('Entre 0 et 380 kg.')).toBeInTheDocument();
    expect(body).toBeNull();
    await user.clear(screen.getByLabelText(/Quantité \(reste/));
    await user.type(screen.getByLabelText(/Quantité \(reste/), '120');
    await user.click(screen.getByRole('button', { name: 'Remettre', hidden: false }));
    await vi.waitFor(() => expect(body).toMatchObject({ producer: 'pr1', quantity_kg: 120, repayable: false }));
  });

  it('agent : vérifie une entreprise de l’annuaire', async () => {
    auth.user = { id: 'u3', role: 'agent_atda', department: 'alibori' };
    let verified = false;
    mockFetch((u, init) => {
      if (u.includes('/pmea/p1/verify') && init?.method === 'POST') { verified = true; return { body: {} }; }
      if (u.includes('/pmea')) return { body: { department: null, results: [{ id: 'p1', name: 'Huilerie de Parakou', services: ['transformation'], value_chains: ['soja'], department: 'borgou', commune: 'parakou', contact_name: '', phone: '0196112233', description: '', verified: false, mine: false }] } };
      return ref(u);
    });
    const user = userEvent.setup();
    page(<PmeaPage />);
    expect(await screen.findByText('Huilerie de Parakou')).toBeInTheDocument();
    expect(screen.getByText('À vérifier')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vérifier' }));
    await vi.waitFor(() => expect(verified).toBe(true));
  });
});
