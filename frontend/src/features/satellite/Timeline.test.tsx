import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SatellitePoint } from '../../shared/api/types';
import { Timeline } from './Timeline';

const iso = (n: number) => new Date(Date.UTC(2026, 6, 1 + n)).toISOString().slice(0, 10);
const points = (cloudy: number[] = []): SatellitePoint[] => Array.from({ length: 9 }, (_, i) => ({
  from: iso(i * 10), to: iso(i * 10 + 9),
  ndvi: cloudy.includes(i) ? null : 0.3 + i * 0.05, ndmi: cloudy.includes(i) ? null : 0.1, valid_pct: cloudy.includes(i) ? 5 : 90,
}));

describe('Timeline', () => {
  it('propose les 9 passages : curseur de 0 à 8 et un repère par passage', () => {
    const { container } = render(<Timeline points={points()} index={8} onIndex={() => undefined} playing={false} onPlay={() => undefined} />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '8');
    expect(container.querySelectorAll('circle')).toHaveLength(9);
  });

  it('prévient la page quand on déplace le curseur', () => {
    const onIndex = vi.fn();
    render(<Timeline points={points()} index={8} onIndex={onIndex} playing={false} onPlay={() => undefined} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    expect(onIndex).toHaveBeenCalledWith(3);
  });

  it('écrit « Nuageux » pour un passage sans mesure, sans NaN ni valeur inventée', () => {
    render(<Timeline points={points([4])} index={4} onIndex={() => undefined} playing={false} onPlay={() => undefined} />);
    expect(screen.getAllByText(/Nuageux/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/NaN|undefined/);
  });

  it('reste lisible quand tous les passages sont nuageux', () => {
    const { container } = render(<Timeline points={points([0, 1, 2, 3, 4, 5, 6, 7, 8])} index={8} onIndex={() => undefined} playing={false} onPlay={() => undefined} />);
    expect(container.querySelector('polyline')).toBeNull();
    expect(document.body.textContent).not.toMatch(/NaN/);
  });

  it('le bouton de lecture appelle onPlay et annonce son état', () => {
    const onPlay = vi.fn();
    const { rerender } = render(<Timeline points={points()} index={0} onIndex={() => undefined} playing={false} onPlay={onPlay} />);
    fireEvent.click(screen.getByRole('button', { name: 'Lecture' }));
    expect(onPlay).toHaveBeenCalledTimes(1);
    rerender(<Timeline points={points()} index={0} onIndex={() => undefined} playing onPlay={onPlay} />);
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveAttribute('aria-pressed', 'true');
  });
});
