import { describe, expect, it, vi } from 'vitest';
import relief from './relief.json';
import { BANIKOARA, PALETTES, ReliefRenderer, actVisibility, buildWorld, camAt, clamp01, smooth, type Theme } from './scene';
import { ACT_WINDOWS, FIELD_END, fieldAt, irisAt, RELIEF_END } from './journey';

const farms = (w: ReturnType<typeof buildWorld>) => w.cols.reduce((s, c) => s + c.n, 0);

describe('buildWorld', () => {
  const fine = buildWorld(false);
  const coarse = buildWorld(true);

  it('conserve toutes les fermes dans les deux modes', () => {
    expect(farms(fine)).toBe(relief.total);
    expect(farms(coarse)).toBe(relief.total);
    expect(fine.total).toBe(relief.total);
  });

  it('le mode grossier a environ le quart des colonnes', () => {
    expect(coarse.cols.length).toBeLessThan(fine.cols.length);
    expect(coarse.cols.length).toBeLessThanOrEqual(fine.cols.length * 0.25 * 1.2);
  });

  it.each([['fin', fine], ['grossier', coarse]] as const)('mode %s : colonnes allumées autour de Banikoara seulement', (_n, w) => {
    const lit = w.cols.filter((c) => c.hl);
    expect(lit.length).toBeGreaterThan(0);
    for (const c of lit) expect(Math.hypot(c.x - BANIKOARA.x, c.y - BANIKOARA.y)).toBeLessThan(2.6);
  });

  it.each([['fin', fine], ['grossier', coarse]] as const)('mode %s : valeurs de colonne valides', (_n, w) => {
    for (const c of w.cols) {
      expect(c.t).toBeGreaterThanOrEqual(0);
      expect(c.t).toBeLessThanOrEqual(1);
      expect(c.bucket).toBeGreaterThanOrEqual(0);
      expect(c.bucket).toBeLessThanOrEqual(15);
      expect(Number.isFinite(c.h) && Number.isFinite(c.delay) && Number.isFinite(c.x) && Number.isFinite(c.y)).toBe(true);
    }
  });

  it('12 départements dont la somme des fermes vaut le total', () => {
    expect(fine.deps).toHaveLength(12);
    expect(coarse.deps).toHaveLength(12);
    expect(fine.deps.reduce((s, d) => s + d.farms, 0)).toBe(relief.total);
    expect(fine.alibori).toBeGreaterThan(0);
  });
});

describe('camAt', () => {
  // première et dernière clés de KEYS dans scene.ts
  const first = { tx: 0, ty: 0, ratio: 1, pitch: 34, yaw: -8 };
  const last = { tx: BANIKOARA.x, ty: BANIKOARA.y, ratio: 0.16, pitch: 74, yaw: 0 }; // plongée sur Banikoara

  it('correspond aux clés de début et de fin', () => {
    for (const [k, v] of Object.entries(first)) expect(camAt(0)[k as keyof typeof first]).toBeCloseTo(v, 9);
    for (const [k, v] of Object.entries(last)) expect(camAt(1)[k as keyof typeof last]).toBeCloseTo(v, 9);
  });

  it('borne les valeurs hors de [0, 1]', () => {
    expect(camAt(-3)).toEqual(camAt(0));
    expect(camAt(42)).toEqual(camAt(1));
    expect(camAt(Number.NEGATIVE_INFINITY)).toEqual(camAt(0));
    expect(camAt(Number.POSITIVE_INFINITY)).toEqual(camAt(1));
  });

  it('est continue sur tout [0, 1]', () => {
    for (let i = 0; i <= 1000; i++) {
      const p = i / 1000;
      const a = camAt(p);
      const b = camAt(p + 0.001);
      expect(Math.abs(a.tx - b.tx)).toBeLessThan(0.5);
      expect(Math.abs(a.ty - b.ty)).toBeLessThan(0.5);
      expect(Math.abs(a.pitch - b.pitch)).toBeLessThan(0.5);
      expect(Math.abs(a.yaw - b.yaw)).toBeLessThan(0.5);
      expect(Math.abs(a.ratio - b.ratio)).toBeLessThan(0.02);
    }
  });
});

describe('helpers', () => {
  it('clamp01 et smooth', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(smooth(0, 1, -1)).toBe(0);
    expect(smooth(0, 1, 0.5)).toBe(0.5);
    expect(smooth(0, 1, 2)).toBe(1);
  });
});

describe('actVisibility', () => {
  it('acte 1 : visible au départ, sorti à 0,3', () => {
    expect(actVisibility(0, ACT_WINDOWS[0])).toBe(1);
    expect(actVisibility(0.3, ACT_WINDOWS[0])).toBe(0);
  });

  it('récolte : absente à 0,5, visible à la fin', () => {
    expect(actVisibility(0.5, ACT_WINDOWS[6])).toBe(0);
    expect(actVisibility(1, ACT_WINDOWS[6])).toBe(1);
  });

  it('reste dans [0, 1] pour tous les actes', () => {
    for (const w of ACT_WINDOWS) {
      for (let i = -10; i <= 110; i++) {
        const v = actVisibility(i / 100, w);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('chronologie', () => {
  it("le champ ne s'ouvre qu'une fois l'animation de la carte terminée", () => {
    const parcelGone = ACT_WINDOWS[2][3];
    expect(irisAt(parcelGone)).toBe(0);
    expect(irisAt(RELIEF_END)).toBe(1);
    for (let i = 0; i < 100; i++) expect(irisAt((i + 1) / 100)).toBeGreaterThanOrEqual(irisAt(i / 100));
  });

  it('les stades du champ suivent la carte et finissent mûrs', () => {
    expect(fieldAt(RELIEF_END)).toEqual({ seed: 0, grow: 0, light: 0 });
    expect(fieldAt(1)).toEqual(FIELD_END);
    for (const w of ACT_WINDOWS.slice(3)) expect(w[0]).toBeGreaterThanOrEqual(RELIEF_END);
  });
});

describe('PALETTES', () => {
  it.each(['dark', 'light'] as Theme[])('%s : 16 couleurs rgb(...) pour les faces supérieures', (t) => {
    const { top } = PALETTES[t];
    expect(top).toHaveLength(16);
    for (const c of top) expect(c).toMatch(/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/);
  });
});

describe('ReliefRenderer (faux contexte 2D)', () => {
  function fakeCtx() {
    const gradient = { addColorStop: vi.fn() };
    const ctx = {
      globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: 'start', textBaseline: 'alphabetic',
      createLinearGradient: vi.fn(() => gradient),
      fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
      fill: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fillText: vi.fn(), strokeText: vi.fn(),
    };
    return ctx;
  }
  const world = buildWorld(true);

  it.each([[0], [0.5], [1]])('dessine sans erreur pour p = %s en thèmes sombre et clair', (p) => {
    for (const theme of ['dark', 'light'] as Theme[]) {
      for (const [W, H] of [[1280, 720], [390, 844]]) {
        const ctx = fakeCtx();
        const r = new ReliefRenderer(ctx as unknown as CanvasRenderingContext2D, world);
        expect(() => r.draw({ W, H, p, intro: 1, theme })).not.toThrow();
        expect(ctx.fill).toHaveBeenCalled();
        for (const [x, y] of [...ctx.moveTo.mock.calls, ...ctx.lineTo.mock.calls] as [number, number][]) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
        }
      }
    }
  });

  it("dessine aussi pendant l'introduction (intro = 0)", () => {
    const ctx = fakeCtx();
    const r = new ReliefRenderer(ctx as unknown as CanvasRenderingContext2D, world);
    expect(() => r.draw({ W: 1280, H: 720, p: 0, intro: 0, theme: 'dark' })).not.toThrow();
  });
});
