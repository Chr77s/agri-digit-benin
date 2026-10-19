// Assemble les pages de l'espace agent : coque du _modele.html + fragment de contenu.
// node build.mjs  → écrit design/app/agent/*.html
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = 'C:/Users/Chris Nahum/Projets/agri-digit-benin/design/app/agent';

const LOCAL_CSS = `
  /* Local à l'espace agent (absent du kit) : panneau « États », jauge */
  .states { border: 1px dashed var(--line-input); border-radius: var(--r-lg); background: var(--surface-2); }
  .states > summary { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 16px; cursor: pointer; font-weight: 700; color: var(--ink-2); list-style: none; border-radius: var(--r-lg); }
  .states > summary::-webkit-details-marker { display: none; }
  .states > summary .ic { transition: transform var(--t) var(--ease); }
  .states[open] > summary .ic { transform: rotate(180deg); }
  .states-body { padding: 4px 16px 16px; display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); align-items: start; }
  .states-cap { display: block; font-size: var(--fs-xs); font-weight: 700; color: var(--ink-2); margin-bottom: 8px; }
  .meter { display: inline-flex; align-items: center; gap: 10px; }
  .meter-track { width: 88px; height: 10px; border-radius: var(--r-pill); background: var(--rain-2); overflow: hidden; flex: none; }
  .meter-track > span { display: block; height: 100%; width: var(--v); background: var(--leaf); border-radius: inherit; }
  .meter--low .meter-track > span { background: var(--laterite); }
  .meter--mid .meter-track > span { background: var(--d3); }
  .table td.td-primary .num { text-align: left; }
  .section-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 16px; }`;

const shell = (m) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${m.title} · Agri-Digit Bénin</title>
<meta name="description" content="${m.desc}">
<link rel="icon" href="../../../frontend/public/icon.svg">
<link rel="stylesheet" href="../kit.css">
<script src="../kit.js" defer></script>
<style>${LOCAL_CSS}${m.style ? '\n' + m.style : ''}
</style>
</head>
<body data-role="agent_atda" data-page="agent/${m.page}">
<a class="skip-link" href="#contenu">Aller au contenu</a>

<div class="proto-band" role="note">
  <svg class="ic" aria-hidden="true"><use href="#i-info"/></svg>
  <span><strong>Prototype</strong> · données de démonstration, aucune donnée officielle</span>
</div>

<div class="shell">
  <aside class="sidebar" data-kit-sidebar></aside>
  <div class="scrim" aria-hidden="true"></div>

  <div class="main">
    <header class="topbar">
      <button type="button" class="btn btn-icon tb-menu" data-open-nav aria-expanded="false" aria-controls="sidebar" aria-label="Ouvrir le menu">
        <svg class="ic" aria-hidden="true"><use href="#i-menu"/></svg>
      </button>
      <a class="tb-brand" href="accueil.html"><svg aria-hidden="true"><use href="#i-logo"/></svg><span>Agri-Digit</span></a>
      <form class="tb-search search" role="search" onsubmit="return false">
        <svg class="ic" aria-hidden="true"><use href="#i-search"/></svg>
        <label class="sr-only" for="q">Rechercher</label>
        <input class="input" id="q" type="search" placeholder="${m.search || 'Producteur, code, NPI ou village…'}" autocomplete="off">
        <kbd aria-hidden="true">/</kbd>
      </form>
      <span class="tb-spacer"></span>
      <button type="button" class="btn btn-icon tb-search-toggle" data-search-toggle aria-label="Rechercher">
        <svg class="ic" aria-hidden="true"><use href="#i-search"/></svg>
      </button>
      <button type="button" class="sync" data-sync data-state="pending" aria-label="État de synchronisation : 2 saisies en attente">
        <span class="sync-dot" aria-hidden="true"></span>
        <svg class="ic" aria-hidden="true"><use href="#i-sync"/></svg>
        <span class="sync-label">2 en attente</span>
      </button>
      <label class="sr-only" for="lang">Langue</label>
      <select class="select tb-lang" id="lang" data-lang>
        <option value="fr">Français</option>
        <option value="fon">Fɔngbè (à valider)</option>
        <option value="bba">Baatɔnum (à valider)</option>
        <option value="yo">Yorùbá (à valider)</option>
        <option value="dje">Dendi (à valider)</option>
      </select>
      <a class="btn btn-icon tb-notif" href="accueil.html" aria-label="File de travail, 14 éléments">
        <svg class="ic" aria-hidden="true"><use href="#i-bell"/></svg><span class="dot" aria-hidden="true">14</span>
      </a>
      <div class="profile">
        <button type="button" class="profile-btn" data-menu-trigger aria-expanded="false" aria-controls="menu-profil" aria-haspopup="true">
          <span class="avatar" data-kit-initials aria-hidden="true">KD</span>
          <span class="pb-name"><span data-kit-user>Koffi Dossou</span><small data-kit-role>Agent ATDA</small></span>
          <svg class="ic ic--sm" aria-hidden="true"><use href="#i-chevron-down"/></svg>
          <span class="sr-only">Menu du compte</span>
        </button>
        <div class="menu" id="menu-profil" role="menu" aria-label="Compte">
          <div class="menu-head"><b data-kit-user>Koffi Dossou</b><span class="muted" data-kit-role>Agent ATDA</span></div>
          <a class="menu-item" role="menuitem" href="#"><svg class="ic" aria-hidden="true"><use href="#i-user"/></svg>Mon profil et mon secteur</a>
          <a class="menu-item" role="menuitem" href="#"><svg class="ic" aria-hidden="true"><use href="#i-history"/></svg>Mes accès journalisés</a>
          <a class="menu-item" role="menuitem" href="#"><svg class="ic" aria-hidden="true"><use href="#i-help"/></svg>Aide</a>
          <hr class="menu-sep">
          <a class="menu-item menu-item--danger" role="menuitem" href="../acces/connexion.html"><svg class="ic" aria-hidden="true"><use href="#i-logout"/></svg>Se déconnecter</a>
        </div>
      </div>
    </header>

    <main class="page" id="contenu" tabindex="-1">
${m.main}
    </main>

    <footer class="app-foot">
      <span>Agri-Digit Bénin · MAEP · prototype</span>
      <nav aria-label="Informations légales"><a href="../acces/legal.html">Mentions légales</a><a href="../acces/legal.html#confidentialite">Confidentialité</a><a href="../acces/legal.html#conditions">Conditions</a></nav>
    </footer>
  </div>
</div>
${m.dialogs || ''}${m.script ? '<script>\n' + m.script + '\n</script>\n' : ''}</body>
</html>
`;

// Espace insécable avant « : ; ? ! » hors <style>/<script>
const nbsp = (html) => html.split(/(<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>)/).map((part, i) =>
  i % 2 ? part : part.replace(/ ([:;?!])(?=[\s<"&]|$)/g, '&nbsp;$1').replace(/« /g, '«&nbsp;').replace(/ »/g, '&nbsp;»')).join('');

const only = process.argv[2];
for (const f of readdirSync(join(HERE, 'frag')).filter((f) => f.endsWith('.html'))) {
  if (only && !f.startsWith(only)) continue;
  const raw = readFileSync(join(HERE, 'frag', f), 'utf8');
  const meta = JSON.parse(raw.match(/^<!--(\{[\s\S]*?\})-->/)[1]);
  const sec = (name) => { const m = raw.match(new RegExp(`<!--${name}-->([\\s\\S]*?)(?=<!--[A-Z]+-->|$)`)); return m ? m[1].trim() : ''; };
  const page = f.replace(/\.html$/, '');
  const html = shell({ ...meta, page, main: nbsp(sec('MAIN')), dialogs: nbsp(sec('DIALOGS')) + '\n', style: sec('STYLE'), script: sec('SCRIPT') });
  writeFileSync(join(OUT, f), html);
  console.log('ok', f);
}
