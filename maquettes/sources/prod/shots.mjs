// node cdp.mjs shots.mjs  (PAGES=accueil,parcelles)
const OUT = 'C:/Users/Chris Nahum/Projets/agri-digit-benin/.impeccable/review/app/producteur/';
const pages = (process.env.PAGES || '').split(',').filter(Boolean);
export default async function ({ send, evalJS, shot, sleep, logs }) {
  for (const p of pages) {
    for (const w of [1440, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
      await send('Page.navigate', { url: `http://127.0.0.1:8765/design/app/producteur/${p}.html` });
      await sleep(900);
      await evalJS('document.fonts.ready.then(()=>1)');
      await sleep(400);
      const info = await evalJS(`(()=>{const d=document.documentElement;const over=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>d.clientWidth+1&&r.width>0&&getComputedStyle(e).position!=='fixed'}).slice(0,5).map(e=>e.tagName+'.'+e.className);return {sw:d.scrollWidth,cw:d.clientWidth,h:d.scrollHeight,over}})()`);
      logs.push(`${p}@${w}: ${JSON.stringify(info)}`);
      const h = Math.min(info.h, 16000);
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 });
      await sleep(300);
      await shot(`${OUT}${p}-${w}.png`, {});
    }
  }
}
