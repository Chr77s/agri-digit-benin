// Assemble les maquettes filière/pilotage : coque du kit (_modele.html) + fragments src/<dossier>__<page>.html.
// node build.mjs  →  écrit design/app/<dossier>/<page>.html
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = 'C:/Users/Chris Nahum/Projets/agri-digit-benin';
const APP = join(ROOT, 'design/app');

const COMMON_CSS = readFileSync(join(HERE, 'common.css'), 'utf8');
const ic = (n, c = '') => `<svg class="ic${c ? ' ' + c : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const SPROUT = `<svg class="empty-art" viewBox="0 0 148 104" aria-hidden="true" fill="none" stroke-linecap="round"><path d="M6 92c30-14 106-14 136 0M14 80c26-11 94-11 120 0M24 69c22-8 78-8 100 0" stroke="#A9BBA0" stroke-width="1.5"/><path d="M74 66V36" stroke="#1F5A32" stroke-width="2.5"/><path d="M74 44c0-10-7-17-19-17 0 10 7 17 19 17zM74 52c0-9 6-14 17-14 0 9-6 14-17 14z" fill="#6FA83A" stroke="#1F5A32" stroke-width="2"/><circle cx="112" cy="20" r="7" fill="#F3C54A"/></svg>`;

// <!--STATES {...}--> : panneau repliable des états (chargement, vide, erreur, hors ligne, + extra)
function states(o) {
  const [et, ep, eb] = o.empty, [rt, rp, rc] = o.error;
  return `<details class="states">
  <summary>${ic('layers')}États de la page (revue)${ic('chevron-down', 'ic--sm states-chev')}</summary>
  <div class="states-body">
    <div><p class="state-cap">Chargement</p><div class="card" aria-busy="true" aria-label="Chargement en cours"><span class="skel skel-title"></span><span class="skel skel-line" style="width:80%"></span><span class="skel skel-line" style="width:55%"></span><span class="skel skel-block" style="margin-top:14px"></span></div></div>
    <div><p class="state-cap">Vide</p><div class="card empty">${SPROUT}<h3>${et}</h3><p>${ep}</p>${eb ? `<button type="button" class="btn btn-secondary">${eb}</button>` : ''}</div></div>
    <div><p class="state-cap">Erreur</p><div class="card state-error"><span class="se-icon">${ic('wifi-off', 'ic--lg')}</span><h3>${rt}</h3><p>${rp}</p><code>${rc}</code><div class="cluster" style="justify-content:center"><button class="btn btn-primary" type="button">Réessayer</button></div></div></div>
    <div><p class="state-cap">Hors ligne</p><div class="stack" style="--gap:10px"><div class="banner banner--offline" style="border-radius:var(--r-md);padding:12px 16px">${ic('wifi-off')}<span>${o.offline || 'Hors ligne. Vous consultez les dernières données reçues ; les actions partiront au retour du réseau.'}</span></div>${o.extra || ''}</div></div>
  </div>
</details>`;
}

// Typographie française dans les nœuds texte seulement (hors balises, scripts et styles) : espaces insécables.
function typo(html) {
  return html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/).map((s, i) => (i % 2 ? s : s
    .replace(/(\d) (?=\d{3}\b)/g, '$1&nbsp;')
    .replace(/(\d) (?=\d{3}\b)/g, '$1&nbsp;')
    .replace(/ ([:;?!»])/g, '&nbsp;$1')
    .replace(/« /g, '«&nbsp;')
    .replace(/(\d) (%|ha\b|kg\b|t\/ha|t\b|FCFA|mm\b|h\b|min\b|j\b)/g, '$1&nbsp;$2'))).join('');
}

const tpl = readFileSync(join(APP, '_modele.html'), 'utf8');
const head = tpl.slice(0, tpl.indexOf('<main class="page"'));
const foot = tpl.slice(tpl.indexOf('</main>'), tpl.indexOf('<dialog'));

for (const f of readdirSync(join(HERE, 'src')).filter((x) => x.endsWith('.html'))) {
  const raw = readFileSync(join(HERE, 'src', f), 'utf8');
  const [, metaS, rest] = raw.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
  const m = JSON.parse(metaS);
  const [dir, page] = f.replace('.html', '').split('__');
  const part = (k) => { const r = rest.match(new RegExp(`<!--@${k}-->([\\s\\S]*?)(?=<!--@|$)`)); return r ? r[1].trim() : ''; };
  let main = part('main').replace(/<!--STATES (\{[\s\S]*?\})-->/g, (_, j) => states(JSON.parse(j)))
    .replace('<!--MAP-->', () => readFileSync(join(HERE, 'map.svg'), 'utf8'));
  const sync = m.sync || ['online', 'Synchronisé'];
  let h = head
    .replace(/<title>[^<]*<\/title>/, `<title>${m.title} · Agri-Digit Bénin</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${m.desc}`)
    .replace(/<!-- MODÈLE[\s\S]*?-->\n/, '')
    .replace('href="../../frontend/public/icon.svg"', 'href="../../../frontend/public/icon.svg"')
    .replace('href="kit.css"', 'href="../kit.css"').replace('src="kit.js"', 'src="../kit.js"')
    .replace(/<body[^>]*>/, `<body data-role="${m.role}" data-page="${dir}/${page}">`)
    .replace('</head>', `<style>\n${COMMON_CSS}${part('head') ? '\n' + part('head') : ''}\n</style>\n</head>`)
    .replace(/placeholder="Rechercher une parcelle, un message…"/, `placeholder="${m.search}"`)
    .replace(/data-state="pending" aria-label="[^"]*"/, `data-state="${sync[0]}" aria-label="État de synchronisation : ${sync[1]}"`)
    .replace('<span class="sync-label">2 en attente</span>', `<span class="sync-label">${sync[1]}</span>`)
    .replace(/aria-label="Messages, 3 non lus">([\s\S]*?)<span class="dot" aria-hidden="true">3<\/span>/, m.notif ? `aria-label="Messages, ${m.notif} non lus">$1<span class="dot" aria-hidden="true">${m.notif}</span>` : 'aria-label="Messages, aucun non lu">$1')
    .replace('href="acces/connexion.html"', 'href="../acces/connexion.html"')
    .replace('<a class="tb-brand" href="#">', `<a class="tb-brand" href="../${m.home || dir + '/' + page}.html">`);
  if (sync[0] === 'online') h = h.replace(/<span class="sync-dot" aria-hidden="true"><\/span>\s*/, '<span class="sync-dot" aria-hidden="true"></span>\n        ');
  const f2 = foot.replace(/href="acces\/legal\.html/g, 'href="../acces/legal.html');
  const out = `${h}<main class="page" id="contenu" tabindex="-1">\n${typo(main)}\n    ${f2}${typo(part('after'))}\n</body>\n</html>\n`;
  mkdirSync(join(APP, dir), { recursive: true });
  writeFileSync(join(APP, dir, page + '.html'), out);
  console.log('ok', dir + '/' + page);
}
