import { describe, expect, it } from 'vitest';
import { hasWebGL } from './terrain';

describe('hasWebGL', () => {
  it("est faux sans WebGL (jsdom), pour que le bouton « Relief 3D » n'existe pas", () => {
    expect(hasWebGL()).toBe(false);
  });
});
