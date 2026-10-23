// Landing : aucun texte ne doit en chevaucher un autre, ni passer sous l'en-tête, ni sortir de l'écran pendant le parcours.
// Prérequis : `npm run dev`, visiteur non connecté. Parcourt la scène épinglée puis les sections, à plusieurs tailles d'écran.
import { test, expect } from '@playwright/test';

const SIZES = [[320, 568], [360, 640], [375, 812], [740, 360], [768, 1024], [1024, 768], [1280, 720], [1440, 900]];

for (const [width, height] of SIZES) {
  test(`landing sans chevauchement de texte en ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/accueil-3d');
    await page.locator('.lp-wrap').waitFor();
    const res = await page.evaluate(async () => {
  const op = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= +cs.opacity; } return o; };
  const check = () => {
    const hb = document.querySelector('.lp-header').getBoundingClientRect().bottom;
    const items = [], out = [];
    const w = document.createTreeWalker(document.querySelector('.landing'), NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode; if (!n.textContent.trim()) continue;
      const el = n.parentElement; const o = op(el); if (o < 0.05) continue;
      const d = el.closest('details'); if (d && !d.open && !el.closest('summary')) continue;
      const inHead = !!el.closest('.lp-header'), inAct = !!el.closest('.lp-stage');
      const r = document.createRange(); r.selectNodeContents(n);
      for (const b of r.getClientRects()) {
        if (b.width < 1 || b.bottom < 0 || b.top > innerHeight) continue;
        // le texte de la scène épinglée ne doit jamais passer sous l'en-tête ni sortir de l'écran
        // o > 0,9 : un acte qui glisse en entrant ou en sortant peut déborder un instant
        if (inAct && o > 0.9 && (b.top < hb - 4 || b.bottom > innerHeight + 1)) out.push('hors cadre: ' + n.textContent.trim().slice(0, 30));
        if (!inHead && b.top < hb - 22) continue; // le reste de la page défile sous l'en-tête opaque
        items.push({ b, el, t: n.textContent.trim().slice(0, 30) });
      }
    }
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i].b, c = items[j].b;
      if (items[i].el !== items[j].el && Math.min(a.right, c.right) - Math.max(a.left, c.left) > 3 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 4) out.push(items[i].t + ' <> ' + items[j].t);
    }
    return [...new Set(out)];
  };
  const res = {};
  const wrap = document.querySelector('.lp-wrap'); const span = wrap.offsetHeight - innerHeight;
  const pts = [...Array(61).keys()].map(i => span * i / 60);
  for (let y = wrap.offsetHeight; y < document.documentElement.scrollHeight; y += innerHeight * 0.4) pts.push(y);
  for (const y of pts) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); const o = check(); if (o.length) res[Math.round(100 * y / document.documentElement.scrollHeight) + '%'] = o.slice(0, 3); }
  scrollTo(0, 0);
  return res;
});
    expect(res).toEqual({});
  });
}
