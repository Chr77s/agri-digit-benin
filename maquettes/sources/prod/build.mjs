// Assemble les fragments src/*.html dans la coque commune et écrit design/app/producteur/*.html (HTML statique).
// Macros : {{I:nom}} icône · {{I:nom:sm}} · {{B:ton|Texte}} badge · {{STAGE:n}} rail des 4 stades (n = stade courant, 1-4).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = new URL('./src/', import.meta.url);
const OUT = 'C:/Users/Chris Nahum/Projets/agri-digit-benin/design/app/producteur/';
const icon = (n, m) => `<svg class="ic${m ? ' ic--' + m : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const BADGE_ICON = { ok: 'check', wait: 'clock', bad: 'x', draft: 'edit', urgent: 'alert', offline: 'wifi-off' };
const STAGES = ['Semis', 'Croissance', 'Floraison', 'Récolte'];
const stage = (n) => `<ol class="stagebar" aria-label="Stade ${n} sur 4 : ${STAGES[n - 1]}">` +
  STAGES.map((s, i) => `<li${i + 1 < n ? ' class="is-done"' : i + 1 === n ? ' class="is-now" aria-current="step"' : ''}><span>${s}</span></li>`).join('') + '</ol>';

// Fond de carte simulé commun (champs, piste, cours d'eau), viewBox 0 0 400 250
const MAPBG = '<rect width="400" height="250" fill="#DDE9CF"/><path d="M0 40 L140 20 L170 120 L0 150Z" fill="#CFE1BC"/><path d="M260 0 L400 0 L400 110 L300 130Z" fill="#D3E4C2"/><path d="M0 170 L120 160 L150 250 L0 250Z" fill="#C7DCB2"/><path d="M-10 200 C100 170 220 200 410 140" stroke="#F8FBF4" stroke-width="10" fill="none"/><path d="M-10 200 C100 170 220 200 410 140" stroke="#C9B79A" stroke-width="1" stroke-dasharray="6 6" fill="none"/><path d="M330 250 C320 200 350 170 340 120 C330 80 360 40 350 0" stroke="#9CC3D8" stroke-width="6" fill="none" stroke-linecap="round"/>';
const macros = (s) => s
  .replace(/\{\{I:([a-z0-9-]+)(?::(sm|lg))?\}\}/g, (_, n, m) => icon(n, m))
  .replace(/\{\{B:([a-z]+)\|([^}]+)\}\}/g, (_, t, x) => `<span class="badge badge--${t}">${BADGE_ICON[t] ? icon(BADGE_ICON[t]) : ''}${x}</span>`)
  .replace(/\{\{STAGE:(\d)\}\}/g, (_, n) => stage(+n))
  .replace(/\{\{MAPBG\}\}/g, MAPBG);

// Espace insécable avant : ; ? ! dans le texte (hors balises, styles et scripts).
const nbsp = (html) => html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/).map((p, i) => i % 2 ? p : p.replace(/ ([:;?!])(?=\s|$|<)/g, '\u00A0$1').replace(/ ([:;?!])$/g, '\u00A0$1')).join('');

const COMMON_CSS = readFileSync(new URL('./common.css', import.meta.url), 'utf8');

const shell = ({ title, desc, page, navpage, search, head, main, after }) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · Agri-Digit Bénin</title>
<meta name="description" content="${desc}">
<link rel="icon" href="../../../frontend/public/icon.svg">
<link rel="stylesheet" href="../kit.css">
<script src="../kit.js" defer></script>
<style>
/* Styles locaux de l'espace producteur (absents du kit) */
${COMMON_CSS}${head ? '\n' + head.trim() : ''}
</style>
</head>
<body data-role="producteur" data-page="producteur/${navpage || page}">
<a class="skip-link" href="#contenu">Aller au contenu</a>

<div class="proto-band" role="note">
  ${icon('info')}
  <span><strong>Prototype</strong> · données de démonstration, aucune donnée officielle</span>
</div>

<div class="shell">
  <aside class="sidebar" data-kit-sidebar></aside>
  <div class="scrim" aria-hidden="true"></div>

  <div class="main">
    <header class="topbar">
      <button type="button" class="btn btn-icon tb-menu" data-open-nav aria-expanded="false" aria-controls="sidebar" aria-label="Ouvrir le menu">${icon('menu')}</button>
      <a class="tb-brand" href="accueil.html"><svg aria-hidden="true"><use href="#i-logo"/></svg><span>Agri-Digit</span></a>
      <form class="tb-search search" role="search" onsubmit="return false">
        ${icon('search')}
        <label class="sr-only" for="q">Rechercher</label>
        <input class="input" id="q" type="search" placeholder="${search || 'Rechercher une parcelle, un message…'}" autocomplete="off">
        <kbd aria-hidden="true">/</kbd>
      </form>
      <span class="tb-spacer"></span>
      <button type="button" class="btn btn-icon tb-search-toggle" data-search-toggle aria-label="Rechercher">${icon('search')}</button>
      <button type="button" class="sync" data-sync data-state="pending" aria-label="État de synchronisation : 2 en attente">
        <span class="sync-dot" aria-hidden="true"></span>${icon('sync')}<span class="sync-label">2 en attente</span>
      </button>
      <label class="sr-only" for="lang">Langue</label>
      <select class="select tb-lang" id="lang" data-lang>
        <option value="fr">Français</option>
        <option value="fon">Fɔngbè (à valider)</option>
        <option value="bba">Baatɔnum (à valider)</option>
        <option value="yo">Yorùbá (à valider)</option>
        <option value="dje">Dendi (à valider)</option>
      </select>
      <a class="btn btn-icon tb-notif" href="messages.html" aria-label="Messages, 3 non lus">${icon('bell')}<span class="dot" aria-hidden="true">3</span></a>
      <div class="profile">
        <button type="button" class="profile-btn" data-menu-trigger aria-expanded="false" aria-controls="menu-profil" aria-haspopup="true">
          <span class="avatar" data-kit-initials aria-hidden="true">AS</span>
          <span class="pb-name"><span data-kit-user>Awa Sabi</span><small data-kit-role>Producteur</small></span>
          ${icon('chevron-down', 'sm')}
          <span class="sr-only">Menu du compte</span>
        </button>
        <div class="menu" id="menu-profil" role="menu" aria-label="Compte">
          <div class="menu-head"><b data-kit-user>Awa Sabi</b><span class="muted" data-kit-role>Producteur</span></div>
          <a class="menu-item" role="menuitem" href="profil.html" data-kit-profile>${icon('user')}Mon profil</a>
          <a class="menu-item" role="menuitem" href="consentements.html">${icon('shield-check')}Mes données et consentements</a>
          <a class="menu-item" role="menuitem" href="assistant.html">${icon('help')}Aide</a>
          <hr class="menu-sep">
          <a class="menu-item menu-item--danger" role="menuitem" href="../acces/connexion.html">${icon('logout')}Se déconnecter</a>
        </div>
      </div>
    </header>

    <main class="page" id="contenu" tabindex="-1">
${main.trim()}
    </main>

    <footer class="app-foot">
      <span>Agri-Digit Bénin · MAEP · prototype</span>
      <nav aria-label="Informations légales"><a href="../acces/legal.html">Mentions légales</a><a href="../acces/legal.html#confidentialite">Confidentialité</a><a href="../acces/legal.html#conditions">Conditions</a></nav>
    </footer>
  </div>
</div>
${after ? '\n' + after.trim() + '\n' : ''}</body>
</html>
`;

const only = process.argv[2];
for (const f of readdirSync(SRC)) {
  if (!f.endsWith('.html') || (only && !f.startsWith(only))) continue;
  const raw = readFileSync(join(fileURLToPath(SRC), f), 'utf8').replace(/\r\n/g, '\n');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('front matter manquant : ' + f);
  const meta = Object.fromEntries(m[1].split('\n').map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
  const parts = { head: '', main: '', after: '' };
  let cur = 'main';
  for (const chunk of m[2].split(/(<!--@(?:head|main|after)-->)/)) {
    const k = chunk.match(/^<!--@(head|main|after)-->$/);
    if (k) cur = k[1]; else parts[cur] += chunk;
  }
  const html = nbsp(macros(shell({ ...meta, page: f.replace(/\.html$/, ''), ...parts })));
  writeFileSync(OUT + f, html);
  console.log('ok', f, html.length);
}
