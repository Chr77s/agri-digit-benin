import { describe, expect, it } from 'vitest';
import { BENIN_BBOX, decodeTerrarium, hasWebGL, tileRange } from './terrain';

describe('decodeTerrarium', () => {
  it("décode l'altitude depuis les canaux RVB d'une tuile Terrarium", () => {
    expect(decodeTerrarium(128, 0, 0)).toBe(0);
    expect(decodeTerrarium(128, 100, 0)).toBe(100);
    expect(decodeTerrarium(128, 100, 128)).toBeCloseTo(100.5, 5);
    expect(decodeTerrarium(127, 255, 0)).toBe(-1);
  });
});

describe('tileRange', () => {
  it('couvre le Bénin avec peu de tuiles au niveau 7', () => {
    const r = tileRange(BENIN_BBOX, 7);
    expect(r.x0).toBeLessThanOrEqual(r.x1);
    expect(r.y0).toBeLessThanOrEqual(r.y1);
    expect((r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1)).toBeLessThanOrEqual(12);
  });
  it('place le nord au-dessus (y plus petit) et l’est à droite (x plus grand)', () => {
    const r = tileRange([0, 0, 90, 60], 3);
    expect(r).toEqual({ x0: 4, x1: 6, y0: 2, y1: 4 });
  });
});

describe('hasWebGL', () => {
  it("est faux sans WebGL (jsdom), pour que le bouton « Relief 3D » n'existe pas", () => {
    expect(hasWebGL()).toBe(false);
  });
});
