export default async ({ send, evalJS, sleep, logs }) => {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:8765/design/app/' + process.env.P + '.html' }); await sleep(1200);
  logs.push(await evalJS(`JSON.stringify([...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>392 && !e.closest('svg,thead,dialog')).slice(0,8).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)+' '+(e.textContent||'').slice(0,40)))`));
};
