import { describe, expect, it } from 'vitest';
import { unitFor } from './viz';

describe('unitFor', () => {
  it('accorde l\'unité au nombre', () => {
    expect(unitFor(1, 'producteurs')).toBe('producteur');
    expect(unitFor(1, 'alertes')).toBe('alerte');
    expect(unitFor(1, 'candidatures')).toBe('candidature');
    expect(unitFor(2, 'producteurs')).toBe('producteurs');
    expect(unitFor(0, 'alertes')).toBe('alertes');
  });
  it('laisse les unités sans « s » final', () => {
    expect(unitFor(1, 'ha')).toBe('ha');
    expect(unitFor(1, '%')).toBe('%');
    expect(unitFor(1, undefined)).toBeUndefined();
  });
});
