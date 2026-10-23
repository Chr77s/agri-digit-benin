import { describe, expect, it } from 'vitest';
import { FieldRenderer, stageAt, type FieldFrame, type Stage } from './field';
import type { Theme } from './scene';

const ORDER: Stage[] = ['semis', 'croissance', 'floraison', 'recolte'];

describe('stageAt', () => {
  it('bornes et valeurs hors de [0, 1]', () => {
    expect(stageAt(0)).toBe('semis');
    expect(stageAt(1)).toBe('recolte');
    expect(stageAt(-2)).toBe('semis');
    expect(stageAt(5)).toBe('recolte');
    expect(stageAt(Number.NaN)).toBe('semis');
  });

  it('parcourt les quatre stades dans l’ordre, sans retour en arrière', () => {
    const seen = new Set<Stage>();
    let prev = 0;
    for (let i = 0; i <= 1000; i++) {
      const k = ORDER.indexOf(stageAt(i / 1000));
      expect(k).toBeGreaterThanOrEqual(prev);
      prev = k;
      seen.add(ORDER[k]);
    }
    expect(seen.size).toBe(4);
  });
});

describe('FieldRenderer (faux contexte 2D)', () => {
  // jsdom n'a pas de canvas : toute méthode est acceptée et enregistrée, les propriétés sont stockées
  function fakeCtx() {
    const calls: { name: string; args: unknown[] }[] = [];
    const props: Record<string | symbol, unknown> = {};
    const ctx: object = new Proxy({}, {
      get: (_t, k) => (k in props ? props[k] : (...args: unknown[]) => { calls.push({ name: String(k), args }); return ctx; }),
      set: (_t, k, v) => { props[k] = v; return true; },
    });
    return { ctx: ctx as CanvasRenderingContext2D, calls };
  }
  const frame = (o: Partial<FieldFrame>): FieldFrame => ({ W: 1280, H: 720, theme: 'dark', seed: 1, grow: 1, light: 1, time: 0, cx: 870, groundY: 504, unit: 418, lite: false, ...o });

  it('dessine sans erreur et avec des coordonnées finies', () => {
    for (const theme of ['dark', 'light'] as Theme[]) {
      for (const [W, H, cx, groundY, unit] of [[1280, 720, 870, 504, 418], [390, 844, 195, 388, 287]]) {
        for (const lite of [false, true]) {
          for (const [seed, grow, light] of [[0, 0, 0], [0.4, 0, 0], [0.9, 0.05, 0.1], [1, 0.2, 0.3], [1, 0.6, 0.5], [1, 0.75, 0.8], [1, 1, 1]]) {
            const { ctx, calls } = fakeCtx();
            const r = new FieldRenderer(ctx);
            expect(() => r.draw(frame({ W, H, cx, groundY, unit, theme, seed, grow, light, lite, time: 12.3 }))).not.toThrow();
            expect(calls.some((c) => c.name === 'fill')).toBe(true);
            for (const c of calls) for (const a of c.args) if (typeof a === 'number') expect(Number.isFinite(a)).toBe(true);
          }
        }
      }
    }
  }, 30_000); // 56 rendus complets : plus de 5 s (délai par défaut) sur le poste de développement à 3,5 Go

  it('dessine des faces 3D dans le budget (2 000, 700 en lite)', () => {
    for (const lite of [false, true]) {
      for (const [W, H, cx, groundY, unit] of [[1280, 720, 870, 504, 418], [390, 844, 195, 388, 287]]) {
        let max = 0;
        for (let g = 0; g <= 20; g++) {
          const r = new FieldRenderer(fakeCtx().ctx);
          r.draw(frame({ W, H, cx, groundY, unit, lite, grow: g / 20, time: 5 }));
          max = Math.max(max, r.faces);
          if (g === 20) expect(r.faces).toBeGreaterThan(lite ? 100 : 300);
        }
        expect(max).toBeLessThanOrEqual(lite ? 700 : 2000);
      }
    }
  });

  it('les racines sont dessinées sous terre dès la germination', () => {
    const r = new FieldRenderer(fakeCtx().ctx);
    r.draw(frame({ seed: 1, grow: 0.08 }));
    expect(r.faces).toBeGreaterThan(20);
  });

  it('est déterministe et réutilise ses dégradés', () => {
    const a = fakeCtx(), b = fakeCtx();
    const ra = new FieldRenderer(a.ctx), rb = new FieldRenderer(b.ctx);
    ra.draw(frame({ time: 3 }));
    rb.draw(frame({ time: 3 }));
    expect(a.calls).toEqual(b.calls);
    const before = a.calls.filter((c) => c.name.startsWith('create')).length;
    ra.draw(frame({ time: 4 }));
    expect(a.calls.filter((c) => c.name.startsWith('create')).length).toBe(before);
  });

  it('immobile quand time = 0', () => {
    const a = fakeCtx(), b = fakeCtx();
    new FieldRenderer(a.ctx).draw(frame({ time: 0 }));
    new FieldRenderer(b.ctx).draw(frame({ time: 0 }));
    expect(a.calls).toEqual(b.calls);
  });
});
