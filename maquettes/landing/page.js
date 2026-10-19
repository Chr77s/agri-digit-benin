/* Agri-Digit Bénin — landing « Bénin Vert » : champ 3D piloté par le défilement, téléphone épinglé, console institutionnelle. */
(() => {
  'use strict';
  const doc = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NB = ' ';
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => mq.matches || doc.classList.contains('reduce');
  const isMobile = () => innerWidth <= 820;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (t) => t * t * (3 - 2 * t);

  /* ---------- toast ---------- */
  const toastEl = $('#toast'); let toastT;
  const toast = (msg) => { toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('is-on'), 4200); };

  /* ---------- en-tête, tiroir, langue ---------- */
  const head = $('#tete');
  const onScrollHead = () => head.classList.toggle('is-solid', scrollY > 40);
  addEventListener('scroll', onScrollHead, { passive: true }); onScrollHead();
  const menuBtn = $('.menu-btn'), drawer = $('#tiroir');
  const setDrawer = (open) => {
    drawer.classList.toggle('is-open', open); menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    if (open) drawer.querySelector('a').focus();
  };
  menuBtn.addEventListener('click', () => setDrawer(!drawer.classList.contains('is-open')));
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setDrawer(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.classList.contains('is-open')) { setDrawer(false); menuBtn.focus(); } });
  document.addEventListener('click', (e) => { if (drawer.classList.contains('is-open') && !drawer.contains(e.target) && !menuBtn.contains(e.target)) setDrawer(false); });
  const LANGS = { fon: 'fon', bba: 'bariba', yo: 'yoruba', dje: 'dendi' };
  $$('[data-lang]').forEach((sel) => sel.addEventListener('change', () => {
    if (sel.value !== 'fr') toast(`Traduction en ${LANGS[sel.value]} en cours de validation par des locuteurs natifs${NB}: la page reste en français pour l'instant.`);
    sel.value = 'fr';
  }));

  /* ---------- champ 3D ---------- */
  const bg = $('.field-bg'), canvas = $('#champ'), saison = $('#saison');
  let field = null, fieldOn = true, rafId = 0, t0 = performance.now();
  let target = { grow: .5, light: .28 }, cur = { grow: .38, light: .2 };
  const weak = (navigator.hardwareConcurrency || 4) <= 2 || (navigator.deviceMemory || 4) <= 2;
  const lite = () => isMobile() || weak;
  // la photo s'affiche d'abord ; le champ 3D, lourd à construire, arrive après l'entrée du titre pour ne pas la figer
  bg.classList.add('is-photo');

  const dims = () => {
    const W = innerWidth, H = innerHeight, m = isMobile();
    return { W, H, cx: m ? W * .78 : W * .6, groundY: H * (m ? .94 : .9), unit: H * (m ? .5 : .66) };
  };
  const resize = () => {
    if (!field) return;
    const { W, H } = dims();
    field.resize(W, H, Math.min(devicePixelRatio || 1, dprCap));
    draw(performance.now());
  };
  // qualité adaptative : le champ est un décor, il cède de la résolution plutôt que de saccader
  let dprCap = lite() ? 1 : 1.25, frames = 0, last = 0, slow = 0;
  const adapt = (now) => {
    if (last && now - last < 200) { frames++; if (now - last > 26) slow++; }
    last = now;
    if (frames >= 60) {
      if (slow > 20 && dprCap > .6) { dprCap = Math.max(.6, dprCap - .25); resize(); }
      frames = slow = 0;
    }
  };
  const draw = (now) => {
    if (!field) return;
    const d = dims();
    field.draw({ W: d.W, H: d.H, theme: 'dark', seed: 1, grow: cur.grow, light: cur.light, time: reduced() ? 0 : (now - t0) / 1000, cx: d.cx, groundY: d.groundY, unit: d.unit, lite: lite() });
  };
  // progression de la saison : du héros au dernier chapitre
  const seasonTarget = () => {
    const r = saison.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    target.grow = .5 + .5 * ease(clamp(p * 1.15, 0, 1));
    target.light = .28 + .7 * ease(p);
  };
  const tick = (now) => {
    rafId = 0;
    if (!fieldOn) return;
    seasonTarget();
    cur.grow += (target.grow - cur.grow) * .08;
    cur.light += (target.light - cur.light) * .06;
    draw(now);
    adapt(now);
    if (!reduced()) rafId = requestAnimationFrame(tick);
  };
  const start = () => { if (field && !rafId && fieldOn) rafId = requestAnimationFrame(tick); };
  const stop = () => { if (rafId) cancelAnimationFrame(rafId); rafId = 0; };
  const initField = () => {
    try {
      if (window.AgriField && AgriField.webglAvailable() && !weak) field = new AgriField.Field3D(canvas, { lite: lite() });
    } catch (e) { field = null; }
    if (!field) return;
    resize();
    bg.classList.remove('is-photo');
    let rT; addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 120); });
    // aube : la lumière monte à l'ouverture
    if (reduced()) { cur = { grow: .72, light: .3 }; draw(performance.now()); }
    else start();
    // en mouvement réduit, un seul rendu figé ; sinon on redessine au défilement si la boucle dort
    addEventListener('scroll', () => { if (!reduced()) start(); }, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  };
  setTimeout(() => (window.requestIdleCallback || ((f) => setTimeout(f, 0)))(initField, { timeout: 900 }), reduced() ? 0 : 1700);
  // la boucle et l'affichage s'arrêtent quand le champ est recouvert
  new IntersectionObserver(([e]) => {
    fieldOn = e.isIntersecting; bg.classList.toggle('is-off', !fieldOn);
    $('.season-rail').classList.toggle('is-on', fieldOn && scrollY > innerHeight * .6);
    fieldOn ? start() : stop();
  }, { rootMargin: '0px 0px -2% 0px' }).observe(saison);

  /* ---------- téléphone ---------- */
  const host = $('#phone'); let ph = null;
  const CAPS = { hero: 'Assistant', assistant: 'Assistant', diagnostic: 'Diagnostic photo', meteo: 'Météo et alertes', marche: 'Marché et paiement', parcelle: 'Parcelle GPS', basic: 'Téléphone simple · USSD' };
  try { if (window.AgriPhone) ph = AgriPhone.mount(host, { screen: 'assistant', autoplay: !reduced() }); } catch (e) { ph = null; }
  if (ph && reduced()) try { ph.pause(); } catch (e) {}
  const cap = $('[data-cap]'), capWrap = cap.parentElement;
  let active = 'hero', mode = 'smart';
  const setChapter = (ch) => {
    if (ch === active) return;
    active = ch;
    $$('[data-chapter]').forEach((s) => s.classList.toggle('is-active', s.dataset.chapter === ch));
    $$('[data-rail]').forEach((a) => { const on = a.dataset.rail === ch; a.classList.toggle('is-active', on); on ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'); });
    $('.season-rail').classList.toggle('is-on', ch !== 'hero');
    capWrap.classList.add('is-swapping');
    setTimeout(() => { cap.textContent = `${CAPS[ch]} · écran simulé`; capWrap.classList.remove('is-swapping'); }, reduced() ? 0 : 180);
    if (!ph) return;
    try {
      const wantMode = ch === 'basic' ? 'basic' : 'smart';
      if (wantMode !== mode) { ph.mode(wantMode); mode = wantMode; }
      if (wantMode === 'smart') ph.show(ch === 'hero' ? 'assistant' : ch);
    } catch (e) {}
  };
  const chapters = $$('[data-chapter]');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) setChapter(e.target.dataset.chapter); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  chapters.forEach((c) => io.observe(c));
  $('[data-chapter="hero"]').classList.add('is-active');

  /* ---------- sillons ---------- */
  const sio = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-drawn'); sio.unobserve(e.target); } }), { threshold: .4 });
  $$('.sillons').forEach((s) => sio.observe(s));

  /* ---------- console : carte, départements, compteurs ---------- */
  const consoleEl = $('.console');
  const fmt = (n) => n.toLocaleString('fr-FR').replace(/ | | /g, ' ');
  fetch('relief.json').then((r) => r.json()).then((data) => buildMap(data)).catch(() => {
    $('#carte').setAttribute('aria-label', 'Carte indisponible : les données du POC n’ont pas pu être chargées.');
  });
  const LON0 = .75, LON1 = 3.9, LAT0 = 6.1, LAT1 = 12.45;
  function buildMap(data) {
    const box = $('#carte'), cv = box.querySelector('canvas');
    const deps = [...data.departments].sort((a, b) => b.farms - a.farms);
    const max = deps[0].farms;
    const list = $('#depts');
    list.innerHTML = deps.map((d) => `<li><button type="button" data-dep="${d.code}" aria-pressed="false"><span class="dn">${d.name}</span><span class="dv">${fmt(d.farms)}</span><span class="bar" aria-hidden="true"><i style="--w:${Math.max(2, (d.farms / max) * 100).toFixed(1)}%"></i></span></button></li>`).join('');
    const pos = (lon, lat) => [((lon - LON0) / (LON1 - LON0)) * 100, (1 - (lat - LAT0) / (LAT1 - LAT0)) * 100];
    deps.forEach((d) => {
      const [x, y] = pos(d.lon, d.lat);
      box.insertAdjacentHTML('beforeend', `<span class="pin" data-pin="${d.code}" style="left:${x}%;top:${y}%"></span><span class="pin-label" data-lbl="${d.code}" style="left:${x}%;top:${y}%">${d.name} · ${fmt(d.farms)}</span>`);
    });
    const paint = () => {
      const w = box.clientWidth, h = box.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = w * dpr; cv.height = h * dpr;
      const g = cv.getContext('2d'); g.scale(dpr, dpr);
      const c = data.cells, cell = data.cell, cw = (cell / (LON1 - LON0)) * w;
      for (let i = 0; i < c.length; i += 3) {
        const lon = c[i] * cell + cell / 2, lat = c[i + 1] * cell + cell / 2, v = c[i + 2] / data.max;
        const [x, y] = pos(lon, lat);
        const r = Math.max(.7, Math.sqrt(v) * cw * .62);
        g.fillStyle = v > .45 ? '#F3C54A' : v > .12 ? '#8CC152' : 'rgba(111,168,58,.7)';
        g.beginPath(); g.arc((x / 100) * w, (y / 100) * h, r, 0, 6.2832); g.fill();
      }
    };
    paint(); let pT; addEventListener('resize', () => { clearTimeout(pT); pT = setTimeout(paint, 150); });
    const select = (code) => {
      $$('[data-dep]', list).forEach((b) => { const on = b.dataset.dep === code; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      $$('[data-pin]', box).forEach((p) => p.classList.toggle('is-on', p.dataset.pin === code));
      $$('[data-lbl]', box).forEach((p) => p.classList.toggle('is-on', p.dataset.lbl === code));
    };
    list.addEventListener('click', (e) => { const b = e.target.closest('[data-dep]'); if (b) select(b.dataset.dep); });
    list.addEventListener('mouseover', (e) => { const b = e.target.closest('[data-dep]'); if (b) select(b.dataset.dep); });
    select('alibori');
  }
  const countUp = (el) => {
    const end = +el.dataset.count;
    if (reduced()) { el.textContent = fmt(end); return; }
    const t1 = performance.now(), dur = 1400;
    const step = (now) => { const k = clamp((now - t1) / dur, 0, 1); el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - k, 4)))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { consoleEl.classList.add('is-live'); $$('[data-count]').forEach(countUp); o.disconnect(); } }, { threshold: .25 }).observe(consoleEl);

  /* ---------- galerie ---------- */
  const PHOTOS = [
    ['riz-benin-23', 'Rizières au Bénin', 1200], ['mais-pobe', 'Champ de maïs à Pobé', 1200], ['coton-atakora', 'Champ de coton dans l’Atakora', 1067],
    ['anacarde', 'Fruits d’anacardier', 1200], ['riz-benin-25', 'Repiquage du riz', 1200], ['fonio-natitingou', 'Battage du fonio près de Natitingou', 1067],
    ['tata-somba-baliola', 'Tata somba dans l’Atacora', 1071], ['riz-malanville', 'Rizerie de Malanville', 1200], ['riz-benin-24', 'Riziculture au Bénin', 1200],
  ];
  const track = $('#track');
  // crédits inscrits dans la page : l'attribution CC BY-SA ne dépend d'aucun fichier externe
  const CREDITS = {"riz-benin-23.jpg": {"author": "Africa Rice Center", "license": "CC BY-SA 3.0", "source": "https://commons.wikimedia.org/wiki/File:Rice_cultivation_in_Benin_-_panoramio_(23).jpg"}, "mais-pobe.jpg": {"author": "Rachad sanoussi", "license": "CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Champ_de_ma%C3%AFs_%C3%A0_Pob%C3%A9.jpg"}, "coton-atakora.jpg": {"author": "Ji-Elle", "license": "CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:B%C3%A9nin-Champ_de_coton.jpg"}, "anacarde.jpg": {"author": "Bernice gbetie", "license": "CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Fruits_d%27acadjou.jpg"}, "riz-benin-25.jpg": {"author": "Africa Rice Center", "license": "CC BY-SA 3.0", "source": "https://commons.wikimedia.org/wiki/File:Rice_cultivation_in_Benin_-_panoramio_(25).jpg"}, "fonio-natitingou.jpg": {"author": "Crop Trust", "license": "CC BY-SA 4.0", "source": "https://commons.wikimedia.org/wiki/File:Threshing_fonio_with_a_small-scale_machine,_Natitingou,_northern_Benin.jpg"}, "tata-somba-baliola.jpg": {"author": "Martin Wegmann", "license": "CC BY-SA 3.0", "source": "https://commons.wikimedia.org/wiki/File:Benin_Tata_Somba.JPG"}, "riz-malanville.jpg": {"author": "Africa Rice Center", "license": "CC BY-SA 3.0", "source": "https://commons.wikimedia.org/wiki/File:Riziere_in_Malanville_-_Rice_milling_factory_in_Malanville_-_panoramio.jpg"}, "riz-benin-24.jpg": {"author": "Africa Rice Center", "license": "CC BY-SA 3.0", "source": "https://commons.wikimedia.org/wiki/File:Rice_cultivation_in_Benin_-_panoramio_(24).jpg"}};
  Promise.resolve(CREDITS).then((cr) => {
    track.innerHTML = PHOTOS.map(([k, t, h], i) => {
      const c = cr[k + '.jpg'];
      const credit = c ? `Photo${NB}: ${c.author}, ${c.license}, <a href="${c.source}" rel="noopener" target="_blank">Wikimedia Commons</a>` : '';
      return `<figure aria-label="${i + 1} sur ${PHOTOS.length}"><img src="img/${k}-800.jpg" srcset="img/${k}-800.jpg 800w, img/${k}-1600.jpg 1600w" sizes="(max-width: 700px) 78vw, 520px" width="1600" height="${h}" alt="${t}" loading="lazy" decoding="async"><figcaption><b>${t}</b><small>${credit}</small></figcaption></figure>`;
    }).join('');
    const names = [...new Set(Object.entries(cr).filter(([k]) => PHOTOS.some(([p]) => p + '.jpg' === k)).map(([, v]) => `${v.author} (${v.license})`))];
    $('#credits').textContent = names.length ? `Photographies de la galerie publiées sur Wikimedia Commons${NB}: ${names.join(', ')}. Champ de maïs en 3D${NB}: rendu temps réel, illustration ; image d'attente${NB}: capture de ce rendu. Écran diagnostic${NB}: photo de Rachad Sanoussi (CC BY-SA 4.0).` : '';
    updGal();
  });
  const galBtns = $$('[data-gal]');
  const updGal = () => {
    const max = track.scrollWidth - track.clientWidth - 4;
    galBtns[0].disabled = track.scrollLeft <= 4; galBtns[1].disabled = track.scrollLeft >= max;
  };
  galBtns.forEach((b) => b.addEventListener('click', () => {
    const f = track.querySelector('figure'); if (!f) return;
    track.scrollBy({ left: +b.dataset.gal * (f.getBoundingClientRect().width + 18), behavior: reduced() ? 'auto' : 'smooth' });
  }));
  track.addEventListener('scroll', () => requestAnimationFrame(updGal), { passive: true });
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); galBtns[e.key === 'ArrowRight' ? 1 : 0].click(); } });

  /* ---------- réduire les animations ---------- */
  const mBtn = $('#motion-btn');
  const syncMotion = () => {
    const on = doc.classList.contains('reduce');
    mBtn.setAttribute('aria-pressed', String(on));
    mBtn.querySelector('span').textContent = on ? 'Réactiver les animations' : 'Réduire les animations';
    mBtn.querySelector('use').setAttribute('href', on ? '#i-play' : '#i-pause');
  };
  mBtn.addEventListener('click', () => {
    const on = !doc.classList.contains('reduce');
    doc.classList.toggle('reduce', on);
    try { localStorage.setItem('agri-reduce', on ? '1' : '0'); } catch (e) {}
    syncMotion();
    if (ph) try { on ? ph.pause() : ph.play(); } catch (e) {}
    if (on) { stop(); draw(performance.now()); } else start();
  });
  syncMotion();
})();
