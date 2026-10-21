import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Hero, OtpInput, QuickTiles, Stat, Table, initials, pageList } from '.';
import { NAV } from '../../app/Layout';

describe('kit Bénin Vert', () => {
  it('pagination : première, dernière, voisines de la courante, trous marqués', () => {
    expect(pageList(0, 1)).toEqual([0]);
    expect(pageList(0, 3)).toEqual([0, 1, 2]);
    expect(pageList(5, 10)).toEqual([0, null, 4, 5, 6, null, 9]);
    expect(pageList(9, 10)).toEqual([0, null, 8, 9]);
  });

  it('initiales sans titre « Dr »', () => {
    expect(initials('Dr Mariam Yessoufou')).toBe('MY');
    expect(initials('Awa Sabi')).toBe('AS');
  });

  it('OTP : avance seule, ignore les lettres, accepte le code collé', async () => {
    const user = userEvent.setup();
    function Host() { const [v, setV] = useState(''); return <><OtpInput label="Code" value={v} onChange={setV} /><output>{v}</output></>; }
    render(<Host />);
    const boxes = screen.getAllByRole('textbox');
    expect(boxes).toHaveLength(6);
    await user.click(boxes[0]);
    await user.keyboard('1a2');
    expect(screen.getByRole('status')).toHaveTextContent('12');
    expect(boxes[2]).toHaveFocus();
    await user.click(boxes[0]);
    await user.paste('654321');
    expect(screen.getByRole('status')).toHaveTextContent('654321');
  });

  it('tableau : sélection de toutes les lignes visibles et barre groupée', async () => {
    const user = userEvent.setup();
    const rows = [{ id: 'a', n: 'Awa' }, { id: 'b', n: 'Koffi' }];
    render(<Table caption="Producteurs" rowKey={(r) => r.id} data={rows} columns={[{ key: 'n', label: 'Nom' }]}
      selectable bulkActions={(keys) => <span>choisis : {keys.join(',')}</span>} />);
    expect(screen.getByRole('table', { name: 'Producteurs' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Tout sélectionner' }));
    expect(screen.getByText('choisis : a,b')).toBeInTheDocument();
    await user.click(screen.getAllByRole('checkbox', { name: 'Sélectionner la ligne' })[0]);
    expect(screen.getByText('choisis : b')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Tout sélectionner' })).toHaveProperty('indeterminate', true);
  });

  it('chaque rôle a une page d\'arrivée et des entrées uniques', () => {
    for (const items of Object.values(NAV)) {
      expect(items.length).toBeGreaterThan(0);
      expect(new Set(items.map((n) => n.to)).size).toBe(items.length);
    }
  });
  it('refonte : carte d’accueil, chiffre pastel avec icône et tuiles d’accès rapide', () => {
    render(
      <MemoryRouter>
        <Hero title="Bonjour Awa" text="Mercredi" actions={<button type="button">Aller</button>} aside={<span>35 °C</span>} />
        <Stat icon="parcel" tone="peach" label="Parcelles" value="2" />
        <QuickTiles label="Accès rapide" items={[{ to: '/marche', icon: 'market', label: 'Marché' }, { to: '/revenu', icon: 'coins', label: 'Revenu' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Bonjour Awa' })).toBeInTheDocument();
    expect(screen.getByText('35 °C')).toBeInTheDocument();
    expect(screen.getByText('Parcelles').closest('.stat')).toHaveClass('stat--peach');
    const nav = screen.getByRole('navigation', { name: 'Accès rapide' });
    expect(nav.querySelectorAll('a')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Marché' })).toHaveAttribute('href', '/marche');
  });
});
