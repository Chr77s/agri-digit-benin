import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CollectionPage, weighingErrors } from './CollectionPage';
import { coverDays, ruptures, STOCKS } from './demo';
import { OffersPage } from './OffersPage';

describe('Stocks et ruptures', () => {
  it('calcule les jours de couverture et classe les ruptures à venir', () => {
    expect(coverDays({ stock_t: 18, daily_t: 3 })).toBe(6);
    expect(coverDays({ stock_t: 5, daily_t: 0 })).toBe(Infinity);
    expect(ruptures(STOCKS).map((s) => s.id)).toEqual(['mais-boh', 'gari-abo', 'soja-boh']); // niébé déjà à 0, riz à 45 j
  });

  it('page /offres : étiquetée démonstration, mise à jour d’un stock à zéro → « En rupture »', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><OffersPage /></MemoryRouter>);
    expect(screen.getByText('Données de démonstration')).toBeInTheDocument();
    expect(screen.getByText('Maïs grain, Bohicon : 6 jours')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mettre à jour un stock' }));
    const dlg = screen.getByRole('dialog', { name: 'Mettre à jour un stock' });
    await user.type(within(dlg).getByLabelText('Stock (tonnes)'), 'abc');
    await user.click(within(dlg).getByRole('button', { name: 'Enregistrer le stock' }));
    expect(within(dlg).getByText(/Saisissez un stock en tonnes/)).toBeInTheDocument();
    await user.clear(within(dlg).getByLabelText('Stock (tonnes)'));
    await user.type(within(dlg).getByLabelText('Stock (tonnes)'), '0');
    await user.click(within(dlg).getByRole('button', { name: 'Enregistrer le stock' }));
    expect(screen.queryByText('Maïs grain, Bohicon : 6 jours')).not.toBeInTheDocument();
    expect(screen.getAllByText('En rupture')).toHaveLength(2);
  });
});

describe('Collecte', () => {
  it('refuse le maïs humide sauf s’il est marqué « à resécher »', () => {
    const v = { member: 'ALI-KAN-01187', bags: '12', kg: '1 180', moisture: '16,5', redry: false };
    expect(weighingErrors(v)).toEqual({ moisture: 'supply.collection.errWet' });
    expect(weighingErrors({ ...v, redry: true })).toEqual({});
    expect(Object.keys(weighingErrors({ member: '', bags: '0', kg: 'x', moisture: '3', redry: false })).sort()).toEqual(['bags', 'kg', 'member', 'moisture']);
  });

  it('page /collecte : une pesée valide est gardée et annoncée en attente', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><CollectionPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1, name: 'Circuit de collecte' })).toBeInTheDocument();
    const form = screen.getByRole('form', { name: 'Saisir une pesée' });
    await user.selectOptions(within(form).getByLabelText('Membre'), 'ALI-KAN-01187');
    await user.type(within(form).getByLabelText('Sacs'), '12');
    await user.type(within(form).getByLabelText('Poids net'), '1180');
    await user.type(within(form).getByLabelText('Humidité'), '16,5');
    await user.click(within(form).getByRole('button', { name: 'Enregistrer la pesée' }));
    expect(within(form).getByText(/doit sécher encore/)).toBeInTheDocument();
    await user.click(within(form).getByLabelText('Lot à resécher avant stockage'));
    await user.click(within(form).getByRole('button', { name: 'Enregistrer la pesée' }));
    expect(screen.getByRole('status')).toHaveTextContent('1 pesée gardée sur cet appareil (1,2 t)');
    expect(screen.getByText('+1,2 t en attente')).toBeInTheDocument();
  });
});
