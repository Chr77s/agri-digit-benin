import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayersPanel } from './LayersPanel';

const base = {
  basemap: 'sentinel' as const, onBasemap: () => undefined, kind: 'ndvi' as const, onKind: () => undefined,
  showDepartments: true, onToggleDepartments: () => undefined, watch: [], onSelect: () => undefined,
};

describe('LayersPanel', () => {
  it("choisir le NDMI prévient la page", () => {
    const onKind = vi.fn();
    render(<LayersPanel {...base} onKind={onKind} />);
    fireEvent.click(screen.getByRole('radio', { name: /NDMI/ }));
    expect(onKind).toHaveBeenCalledWith('ndmi');
  });

  it('change de fond de carte', () => {
    const onBasemap = vi.fn();
    render(<LayersPanel {...base} onBasemap={onBasemap} />);
    fireEvent.click(screen.getByRole('radio', { name: /relief/i }));
    expect(onBasemap).toHaveBeenCalledWith('relief');
  });

  it("n'affiche le bouton « Relief 3D » que si la 3D est disponible", () => {
    const onRelief = vi.fn();
    const { rerender } = render(<LayersPanel {...base} />);
    expect(screen.queryByRole('button', { name: 'Relief 3D' })).toBeNull();
    rerender(<LayersPanel {...base} onRelief={onRelief} />);
    fireEvent.click(screen.getByRole('button', { name: 'Relief 3D' }));
    expect(onRelief).toHaveBeenCalledTimes(1);
  });

  it('range la fiche de la parcelle en haut du panneau, avant les réglages de la carte', () => {
    render(<LayersPanel {...base} top={<section aria-label="Fiche test">Champ 1</section>} />);
    const fiche = screen.getByRole('region', { name: 'Fiche test' });
    const indice = screen.getByRole('group', { name: 'Indice' });
    expect(fiche.compareDocumentPosition(indice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("dit qu'aucune zone n'est à surveiller quand la liste est vide", () => {
    render(<LayersPanel {...base} />);
    expect(screen.getByText('Aucune zone sous 0,4 sur ce passage.')).toBeInTheDocument();
  });

  it('liste les zones à surveiller avec leur valeur et sélectionne au clic', () => {
    const onSelect = vi.fn();
    render(<LayersPanel {...base} watch={[{ code: 'zou', name: 'Zou', ndvi: 0.31 }]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Zou : NDVI 0,31/ }));
    expect(onSelect).toHaveBeenCalledWith('zou');
  });
});
