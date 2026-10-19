// node cdp.mjs job.mjs   (PAGES=accueil,producteurs pour filtrer)
const OUT = 'C:/Users/Chris Nahum/Projets/agri-digit-benin/.impeccable/review/app/agent/';
const ALL = ['accueil', 'producteurs', 'producteur-detail', 'alertes', 'boite-envoi', 'candidatures', 'selection', 'contestations', 'cooperatives', 'cooperative-detail', 'appuis', 'recoltes-signalees', 'satellite'];
const pages = process.env.PAGES ? process.env.PAGES.split(',') : ALL;
export default async ({ send, evalJS, shot, sleep, logs }) => {
  for (const p of pages) {
    for (const w of [1440, 390]) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
      await send('Page.navigate', { url: `http://127.0.0.1:8765/design/app/agent/${p}.html?v=${Date.now()}` });
      await sleep(900);
      await evalJS(`document.fonts.ready.then(()=>1)`);
      await evalJS(`document.querySelectorAll('details.states').forEach(d=>d.open=true);1`);
      await sleep(300);
      const info = await evalJS(`(()=>{const d=document.documentElement;const over=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>d.clientWidth+1&&r.width>0&&getComputedStyle(e).position!=='fixed'&&!e.closest('dialog,.table-scroll,.tabs,.sidebar,.menu,#kit-sprite')}).slice(0,5).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right));return {h:d.scrollHeight,sw:d.scrollWidth,cw:d.clientWidth,over}})()`);
      console.log(p, w, JSON.stringify(info));
            await sleep(250);
      await shot(`${OUT}${p}-${w}.png`, { full: true });
    }
  }
};
