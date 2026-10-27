import { describe, expect, it } from 'vitest';
import { ndmiLevel } from './api';
import { indexColor, indexRange, LOW_NDVI } from './scale';

describe('indexColor', () => {
  it('donne les couleurs aux extrémités de la rampe NDVI', () => {
    expect(indexColor('ndvi', 0)).toBe('#C9B79A');
    expect(indexColor('ndvi', 1)).toBe('#016648');
  });
  it("borne les valeurs hors de l'intervalle", () => {
    expect(indexColor('ndvi', 2)).toBe('#016648');
    expect(indexColor('ndvi', -1)).toBe('#C9B79A');
  });
  it('rend un gris neutre sans mesure (null ou NaN), jamais une couleur de végétation', () => {
    expect(indexColor('ndvi', null)).toBe('#9AA39C');
    expect(indexColor('ndmi', Number.NaN)).toBe('#9AA39C');
  });
  it('interpole entre deux arrêts', () => {
    const mid = indexColor('ndvi', 0.125);
    expect(mid).toMatch(/^#[0-9a-f]{6}$/i);
    expect(mid).not.toBe('#C9B79A');
    expect(mid).not.toBe('#E2D58A');
  });
  it('utilise une rampe propre au NDMI', () => {
    expect(indexColor('ndmi', -0.2)).toBe('#C9B79A');
    expect(indexColor('ndmi', 0.6)).toBe('#0E4F8B');
    expect(indexRange('ndmi')).toEqual([-0.2, 0.6]);
  });
  it('fixe le seuil de surveillance du NDVI à 0,4', () => {
    expect(LOW_NDVI).toBe(0.4);
  });
});

describe('ndmiLevel', () => {
  it('classe en trois niveaux (seuils 0,1 et 0,3)', () => {
    expect(ndmiLevel(0.05)).toBe('low');
    expect(ndmiLevel(0.2)).toBe('mid');
    expect(ndmiLevel(0.4)).toBe('high');
  });
});
