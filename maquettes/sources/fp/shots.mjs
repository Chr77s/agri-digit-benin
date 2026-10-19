// node cdp.mjs shots.mjs  (PAGES env : "pilotage/tableau-de-bord,filiere/collecte")
const OUT = 'C:/Users/Chris Nahum/Projets/agri-digit-benin/.impeccable/review/app/';
import { mkdirSync } from 'node:fs';
export default async ({ send, evalJS, shot, sleep, logs }) => {
  const pages = process.env.PAGES.split(',');
  for (const w of [1440, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: w === 390 ? 844 : 900, deviceScaleFactor: 1, mobile: w < 600 });
    for (const p of pages) {
      await send('Page.navigate', { url: `http://127.0.0.1:8765/design/app/${p}.html` });
      await sleep(900);
      await evalJS('document.fonts.ready.then(()=>1)');
      await sleep(300);
      const info = await evalJS(`(()=>{const o=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&r.width>0&&getComputedStyle(e).position!=='fixed'&&!e.closest('thead,.sr-only,dialog')}).slice(0,5).map(e=>e.tagName+'.'+e.className);return {sw:document.documentElement.scrollWidth,w:innerWidth,o}})()`);
      if (info.sw > info.w || info.o.length) logs.push(`OVERFLOW ${p}@${w}: ${JSON.stringify(info)}`);
      const [dir, name] = p.split('/'); mkdirSync(OUT + dir, { recursive: true });
      await shot(`${OUT}${dir}/${name}-${w}.png`, { full: true });
      if (w === 390) { const H = await evalJS("document.documentElement.scrollHeight"); for (let y = 0, k = 0; y < H && k < 6; y += 1500, k++) await shot(`rev/${dir}-${name}-m${k}.png`, { full: true, clip: { x: 0, y, width: 390, height: Math.min(1500, H - y), scale: 1 } }); }
    }
  }
};
