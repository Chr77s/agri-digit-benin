/* Agri-Digit Bénin · kit applicatif : coque, navigation par rôle, interactions légères.
   Aucune dépendance. Les pages chargent <script src="../kit.js" defer></script>. */
(function () {
  'use strict';
  var script = document.currentScript;
  var BASE = new URL('.', script ? script.src : location.href).href; // dossier design/app/
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var ico = function (id, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>'; };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }
  };

  /* ---------- Rôles et navigation (reprend NAV de frontend/src/app/Layout.tsx) ---------- */
  var ROLES = {
    producteur: ['Producteur', 'Awa Sabi', 'Banikoara · Alibori'],
    agent_atda: ['Agent ATDA', 'Koffi Dossou', 'Secteur Banikoara'],
    agronome_inrab: ['Agronome INRAB', 'Dr Mariam Yessoufou', 'INRAB · Niaouli'],
    responsable_programme: ['Responsable de programme', 'Rachidi Bello', 'Programme maïs Nord'],
    admin_maep: ['Administrateur MAEP', 'Clarisse Agbo', 'MAEP · Cotonou'],
    auditeur_copil: ['Auditeur CoPil', 'Jean Hounkpè', 'Comité de pilotage'],
    agent_financier: ['Agent financier', 'Nafissatou Adam', 'Institution partenaire'],
    gestionnaire_cooperative: ['Gestionnaire de coopérative', 'Issa Orou', 'Coop. Kandi Maïs'],
    transformateur: ['Transformateur', 'Sika Transfo', 'Parakou'],
    distributeur: ['Distributeur', 'Agri Distrib', 'Bohicon'],
    repr_mtdi: ['Représentant MTDI (langues)', 'Pélagie Tossou', 'MTDI · Corpus des langues']
  };
  // Entrée : [chemin sans .html, icône, libellé]. Chaîne seule = titre de groupe.
  var METEO = ['producteur/meteo-prix', 'cloud-sun', 'Météo et prix'];
  var NAV = {
    producteur: ['Mon exploitation',
      ['producteur/accueil', 'home', 'Accueil'], ['producteur/parcelles', 'parcel', 'Mes parcelles'], ['producteur/campagnes', 'calendar', 'Mes campagnes'],
      'Conseil', ['producteur/assistant', 'chat', 'Poser une question'], ['producteur/diagnostic', 'leaf-scan', 'Photo de plante'], METEO, ['producteur/satellite', 'satellite', 'Suivi satellite'],
      'Vendre et recevoir', ['producteur/marche', 'market', 'Marché'], ['producteur/appuis', 'gift', 'Mes appuis'], ['producteur/programmes', 'clipboard', 'Programmes'], ['producteur/cooperatives', 'users', 'Mes coopératives'],
      'Mes droits', ['producteur/carte', 'id-card', 'Ma carte'], ['producteur/messages', 'mail', 'Mes messages'], ['producteur/contestations', 'scale', 'Mes contestations'], ['producteur/consentements', 'shield-check', 'Mes consentements']],
    agent_atda: ['Terrain',
      ['agent/accueil', 'home', 'Accueil'], ['agent/producteurs', 'users', 'Producteurs'], ['agent/alertes', 'megaphone', 'Alertes'], ['agent/boite-envoi', 'send', "Boîte d'envoi simulée"], METEO,
      'Programmes', ['agent/candidatures', 'file-text', 'Candidatures'], ['agent/selection', 'list-check', 'Sélections'], ['agent/appuis', 'gift', 'Appuis'], ['agent/contestations', 'scale', 'Contestations à instruire'],
      'Filières', ['agent/cooperatives', 'building', 'Coopératives'], ['agent/recoltes-signalees', 'flag', 'Récoltes signalées'], ['agent/satellite', 'satellite', 'Suivi satellite'],
      'Suivi', ['pilotage/tableau-de-bord', 'dashboard', 'Tableau de bord'], ['pilotage/suivi-evaluation', 'chart-bar', 'Indicateurs SEA']],
    agronome_inrab: [['pilotage/fiches', 'book', 'Fiches techniques'], ['pilotage/diagnostics-agronome', 'microscope', 'Diagnostics à revoir']],
    responsable_programme: [['pilotage/programmes', 'clipboard', 'Programmes'], ['agent/selection', 'list-check', 'Sélections'], ['agent/candidatures', 'file-text', 'Candidatures'],
      'Suivi', ['pilotage/tableau-de-bord', 'dashboard', 'Tableau de bord'], ['pilotage/suivi-evaluation', 'chart-bar', 'Indicateurs SEA'], ['pilotage/previsions', 'trend', 'Prévisions'], ['agent/satellite', 'satellite', 'Suivi satellite']],
    admin_maep: ['Pilotage',
      ['pilotage/tableau-de-bord', 'dashboard', 'Tableau de bord'], ['pilotage/suivi-evaluation', 'chart-bar', 'Indicateurs SEA'], ['pilotage/previsions', 'trend', 'Prévisions'], ['pilotage/exports', 'download', 'Exports'],
      'Registre et terrain', ['agent/producteurs', 'users', 'Producteurs'], ['agent/cooperatives', 'building', 'Coopératives'], ['agent/appuis', 'gift', 'Appuis'], ['agent/recoltes-signalees', 'flag', 'Récoltes signalées'], ['filiere/marche-acheteur', 'market', 'Marché'], ['agent/satellite', 'satellite', 'Suivi satellite'],
      'Communication', ['agent/alertes', 'megaphone', 'Alertes'], ['agent/boite-envoi', 'send', "Boîte d'envoi simulée"], ['pilotage/langues', 'languages', 'Traductions'],
      'Gouvernance', ['agent/selection', 'list-check', 'Sélections'], ['agent/contestations', 'scale', 'Contestations à instruire'], ['pilotage/comptes', 'user-cog', 'Comptes'], ['pilotage/journal', 'scroll', "Journal d'audit"], ['pilotage/interoperabilite', 'network', 'Interopérabilité']],
    auditeur_copil: [['pilotage/journal', 'scroll', "Journal d'audit"]],
    agent_financier: [['pilotage/credit', 'coins', 'Crédit']],
    gestionnaire_cooperative: [['filiere/cooperative-accueil', 'building', 'Ma coopérative'], ['filiere/collecte', 'warehouse', 'Collecte'], ['filiere/offres', 'tag', 'Offres groupées'], ['filiere/marche-acheteur', 'market', 'Marché']],
    transformateur: [['filiere/marche-acheteur', 'market', 'Marché'], ['filiere/offres', 'tag', 'Offres et achats']],
    distributeur: [['filiere/marche-acheteur', 'market', 'Marché'], ['filiere/offres', 'tag', 'Offres et achats']],
    repr_mtdi: [['pilotage/langues', 'languages', 'Traductions'], ['pilotage/suivi-evaluation', 'chart-bar', 'Indicateurs SEA'], ['agent/satellite', 'satellite', 'Suivi satellite']]
  };
  var PROFILE = { producteur: 'producteur/profil' };
  window.KIT_NAV = NAV;
  window.KIT_ROLES = ROLES;

  /* ---------- Sprite d'icônes inséré une fois dans la page ---------- */
  function loadSprite() {
    if (document.getElementById('kit-sprite')) return;
    fetch(BASE + 'icons.svg').then(function (r) { return r.ok ? r.text() : ''; }).then(function (t) {
      if (!t) return;
      var d = document.createElement('div');
      d.id = 'kit-sprite'; d.hidden = true; d.innerHTML = t;
      document.body.insertBefore(d, document.body.firstChild);
    }).catch(function () { /* hors serveur http : icônes absentes */ });
  }

  /* ---------- Barre latérale ---------- */
  function renderSidebar() {
    var side = $('[data-kit-sidebar]');
    if (!side) return;
    var role = document.body.dataset.role || 'producteur';
    var items = NAV[role] || [];
    var info = ROLES[role] || ['', '', ''];
    var page = document.body.dataset.page || '';
    if (!page) { // repli : déduit du chemin courant
      var m = location.pathname.match(/([^/]+\/[^/]+)\.html$/);
      page = m ? m[1] : '';
    }
    var first = items.filter(Array.isArray)[0];
    var html = '<div class="sb-head"><a class="sb-brand" href="' + BASE + (first ? first[0] + '.html' : 'index.html') + '" aria-label="Agri-Digit Bénin, accueil de l\'espace">' +
      '<svg aria-hidden="true"><use href="#i-logo"/></svg><span>Agri-Digit Bénin</span></a>' +
      '<button type="button" class="btn btn-icon sb-close" data-close-nav aria-label="Fermer le menu">' + ico('x') + '</button></div>' +
      '<div class="sb-role"><b>' + info[0] + '</b>' + info[2] + '</div><nav class="sb-nav" aria-label="Navigation principale">';
    var open = false, gid = 0;
    items.forEach(function (it) {
      if (typeof it === 'string') {
        if (open) html += '</ul>';
        gid++;
        html += '<p class="sb-group" id="sbg-' + gid + '">' + it + '</p><ul aria-labelledby="sbg-' + gid + '">';
        open = true; return;
      }
      if (!open) { html += '<ul>'; open = true; }
      var cur = it[0] === page ? ' aria-current="page"' : '';
      html += '<li><a class="sb-link" href="' + BASE + it[0] + '.html" data-label="' + it[2] + '"' + cur + '>' + ico(it[1]) + '<span class="sb-label">' + it[2] + '</span></a></li>';
    });
    if (open) html += '</ul>';
    html += '</nav><div class="sb-foot">' +
      '<a class="sb-link" href="' + BASE + 'index.html" data-label="Galerie des maquettes">' + ico('layers') + '<span class="sb-label">Galerie des maquettes</span></a>' +
      '<button type="button" class="sb-link sb-collapse" data-collapse-nav aria-expanded="true" style="border:0;background:none;width:100%;cursor:pointer" data-label="Replier le menu">' + ico('sidebar') + '<span class="sb-label">Replier le menu</span></button></div>';
    side.innerHTML = html;
    if (!side.id) side.id = 'sidebar';
    side.setAttribute('aria-label', 'Menu ' + info[0]);
    // Nom et rôle dans le menu profil, s'il contient les emplacements prévus
    $$('[data-kit-user]').forEach(function (el) { el.textContent = info[1]; });
    $$('[data-kit-role]').forEach(function (el) { el.textContent = info[0]; });
    $$('[data-kit-initials]').forEach(function (el) { el.textContent = info[1].replace(/^Dr /, '').split(' ').map(function (w) { return w[0]; }).slice(0, 2).join(''); });
    $$('[data-kit-profile]').forEach(function (el) { el.href = BASE + (PROFILE[role] || 'producteur/profil') + '.html'; });
  }

  /* ---------- Repli (≥ 1024 px) ---------- */
  function setCollapsed(on) {
    var shell = $('.shell'); if (!shell) return;
    shell.classList.toggle('is-collapsed', on);
    $$('[data-collapse-nav]').forEach(function (b) {
      b.setAttribute('aria-expanded', String(!on));
      var l = b.querySelector('.sb-label'); if (l) l.textContent = on ? 'Déplier le menu' : 'Replier le menu';
    });
    $$('.sb-link').forEach(function (a) { if (on) a.title = a.dataset.label || ''; else a.removeAttribute('title'); });
    store.set('adb-sidebar', on ? 'collapsed' : 'open');
  }

  /* ---------- Tiroir mobile (< 1024 px) : dialogue, Échap, focus piégé ---------- */
  var drawerOpener = null;
  var mqDesk = window.matchMedia('(min-width: 1024px)');
  function focusables(root) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
      .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }
  function openDrawer(opener) {
    var side = $('[data-kit-sidebar]'); if (!side || mqDesk.matches) return;
    drawerOpener = opener || document.activeElement;
    side.classList.add('is-open');
    side.setAttribute('role', 'dialog'); side.setAttribute('aria-modal', 'true');
    var main = $('.main'); if (main) main.inert = true;
    $$('[data-open-nav]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { var c = $('.sb-close', side); (c || focusables(side)[0] || side).focus(); }, 30);
  }
  function closeDrawer() {
    var side = $('[data-kit-sidebar]'); if (!side || !side.classList.contains('is-open')) return;
    side.classList.remove('is-open');
    side.removeAttribute('role'); side.removeAttribute('aria-modal');
    var main = $('.main'); if (main) main.inert = false;
    $$('[data-open-nav]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    document.documentElement.style.overflow = '';
    if (drawerOpener && drawerOpener.focus) drawerOpener.focus();
  }
  function trapDrawer(e) {
    var side = $('[data-kit-sidebar].is-open'); if (!side) return false;
    if (e.key === 'Escape') { closeDrawer(); return true; }
    if (e.key !== 'Tab') return false;
    var f = focusables(side); if (!f.length) return false;
    var a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    return true;
  }

  /* ---------- Menus déroulants (profil, actions) ---------- */
  function closeMenus(except) {
    $$('[data-menu-trigger][aria-expanded="true"]').forEach(function (t) {
      if (t === except) return;
      t.setAttribute('aria-expanded', 'false');
      var m = document.getElementById(t.getAttribute('aria-controls')); if (m) m.classList.remove('is-open');
    });
  }
  function toggleMenu(t, focusFirst) {
    var m = document.getElementById(t.getAttribute('aria-controls')); if (!m) return;
    var on = t.getAttribute('aria-expanded') !== 'true';
    closeMenus(t);
    t.setAttribute('aria-expanded', String(on));
    m.classList.toggle('is-open', on);
    if (on && focusFirst) { var i = $('.menu-item', m); if (i) i.focus(); }
  }

  /* ---------- Onglets (ARIA, flèches) ---------- */
  function selectTab(tab, focus) {
    var list = tab.closest('[role="tablist"]');
    $$('[role="tab"]', list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      var p = document.getElementById(t.getAttribute('aria-controls')); if (p) p.hidden = !on;
    });
    if (focus) tab.focus();
  }

  /* ---------- Toasts ---------- */
  function toast(opts) {
    if (typeof opts === 'string') opts = { text: opts };
    var box = $('.toasts');
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    var type = opts.type || 'ok';
    var icon = { ok: 'check-circle', error: 'alert', demo: 'info', info: 'info', offline: 'wifi-off' }[type] || 'info';
    var el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.innerHTML = ico(icon) + '<div class="to-body">' + (opts.title ? '<b></b>' : '') + '<span></span></div><button type="button" class="btn btn-icon" aria-label="Fermer la notification">' + ico('x') + '</button>';
    if (opts.title) el.querySelector('b').textContent = opts.title;
    el.querySelector('span').textContent = opts.text || '';
    var kill = function () { el.classList.add('is-leaving'); setTimeout(function () { el.remove(); }, 220); };
    el.querySelector('button').addEventListener('click', kill);
    box.appendChild(el);
    if (opts.timeout !== 0) setTimeout(kill, opts.timeout || 5000);
    return el;
  }

  /* ---------- Synchronisation / file d'attente hors ligne ---------- */
  function setSync(state, count) {
    $$('[data-sync]').forEach(function (s) {
      s.dataset.state = state;
      var label = $('.sync-label', s);
      var txt = { online: 'Synchronisé', pending: (count || 0) + ' en attente', syncing: 'Envoi en cours…', offline: 'Hors ligne' }[state];
      if (state === 'offline' && count) txt = 'Hors ligne · ' + count + ' en attente';
      if (label) label.textContent = txt;
      var icon = $('use', s); if (icon) icon.setAttribute('href', state === 'offline' ? '#i-wifi-off' : '#i-sync');
      s.setAttribute('aria-label', 'État de synchronisation : ' + txt);
    });
  }

  /* ---------- Tableau : tri et sélection ---------- */
  function sortBy(th) {
    var table = th.closest('table'), tbody = table.tBodies[0];
    var idx = Array.prototype.indexOf.call(th.parentNode.children, th);
    var dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    $$('th[aria-sort]', table).forEach(function (h) { h.setAttribute('aria-sort', 'none'); var u = $('.th-sort use', h); if (u) u.setAttribute('href', '#i-sort'); });
    th.setAttribute('aria-sort', dir);
    var u = $('.th-sort use', th); if (u) u.setAttribute('href', dir === 'ascending' ? '#i-sort-asc' : '#i-sort-desc');
    var val = function (tr) { var c = tr.children[idx]; var v = c ? (c.dataset.sort || c.textContent.trim()) : ''; var n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return isNaN(n) ? v.toLowerCase() : n; };
    var rows = Array.prototype.slice.call(tbody.rows);
    rows.sort(function (a, b) { var x = val(a), y = val(b); var r = x > y ? 1 : x < y ? -1 : 0; return dir === 'ascending' ? r : -r; });
    rows.forEach(function (r) { tbody.appendChild(r); });
  }
  function syncSelection(table) {
    var boxes = $$('tbody .cb', table), on = boxes.filter(function (b) { return b.checked; }).length;
    var all = $('thead .cb', table);
    if (all) { all.checked = on > 0 && on === boxes.length; all.indeterminate = on > 0 && on < boxes.length; }
    var card = table.closest('.table-card'), bar = card && $('.bulkbar', card);
    if (bar) { bar.hidden = on === 0; var c = $('[data-bulk-count]', bar); if (c) c.textContent = on; }
  }

  /* ---------- Saisie OTP ---------- */
  function initOtp(otp) {
    var ins = $$('input', otp);
    ins.forEach(function (inp, i) {
      inp.addEventListener('input', function () {
        inp.value = inp.value.replace(/\D/g, '').slice(-1);
        if (inp.value && ins[i + 1]) ins[i + 1].focus();
        otp.removeAttribute('data-invalid');
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !inp.value && ins[i - 1]) { ins[i - 1].focus(); ins[i - 1].value = ''; e.preventDefault(); }
        if (e.key === 'ArrowLeft' && ins[i - 1]) ins[i - 1].focus();
        if (e.key === 'ArrowRight' && ins[i + 1]) ins[i + 1].focus();
      });
      inp.addEventListener('paste', function (e) {
        var d = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, ins.length);
        if (!d) return; e.preventDefault();
        d.split('').forEach(function (c, k) { ins[k].value = c; });
        ins[Math.min(d.length, ins.length - 1)].focus();
      });
    });
  }

  /* ---------- Minuteur (ex. renvoi du code) ---------- */
  function initTimer(el) {
    var total = parseInt(el.dataset.timer, 10) || 60, left = total;
    var out = $('b', el), bar = $('.timer-bar span', el);
    var tick = function () {
      if (out) out.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      if (bar) bar.style.setProperty('--v', (left / total * 100) + '%');
      if (left-- <= 0) { clearInterval(h); el.dispatchEvent(new CustomEvent('timer-end', { bubbles: true })); var b = el.dataset.enables && document.getElementById(el.dataset.enables); if (b) b.disabled = false; }
    };
    var h = setInterval(tick, 1000); tick();
  }

  /* ---------- Initialisation ---------- */
  function init() {
    loadSprite();
    renderSidebar();
    if (store.get('adb-sidebar') === 'collapsed') setCollapsed(true);
    $$('[role="tablist"]').forEach(function (l) { var s = $('[role="tab"][aria-selected="true"]', l) || $('[role="tab"]', l); if (s) selectTab(s); });
    $$('.otp').forEach(initOtp);
    $$('[data-timer]').forEach(initTimer);
    $$('.table').forEach(syncSelection);
    if (!navigator.onLine) setSync('offline');
    if (location.hash === '#menu') setTimeout(function () { openDrawer(); }, 50); // revue : ouvre le tiroir mobile
    mqDesk.addEventListener('change', function () { if (mqDesk.matches) closeDrawer(); });
    window.addEventListener('offline', function () { setSync('offline', 0); toast({ type: 'offline', title: 'Vous êtes hors ligne', text: 'Vos saisies sont gardées sur cet appareil et partiront au retour du réseau.' }); });
    window.addEventListener('online', function () { setSync('online'); toast({ text: 'Connexion rétablie. File d’attente envoyée.' }); });
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open-nav]'); if (t) { openDrawer(t); return; }
    if (e.target.closest('[data-close-nav]') || e.target.classList.contains('scrim')) { closeDrawer(); return; }
    t = e.target.closest('[data-collapse-nav]'); if (t) { setCollapsed(!$('.shell').classList.contains('is-collapsed')); return; }
    t = e.target.closest('[data-menu-trigger]'); if (t) { toggleMenu(t, e.detail === 0); return; }
    if (!e.target.closest('.menu')) closeMenus();
    t = e.target.closest('[role="tab"]'); if (t) { selectTab(t); return; }
    t = e.target.closest('[data-search-toggle]');
    if (t) { var tb = t.closest('.topbar'); tb.classList.toggle('is-searching'); var i = $('.tb-search input', tb); if (tb.classList.contains('is-searching') && i) i.focus(); return; }
    t = e.target.closest('[data-open-dialog]');
    if (t) { var d = document.getElementById(t.dataset.openDialog); if (d && d.showModal) d.showModal(); return; }
    t = e.target.closest('[data-close-dialog]'); if (t) { var dl = t.closest('dialog'); if (dl) dl.close(t.dataset.closeDialog || ''); }
    if (e.target.tagName === 'DIALOG' && e.target.open) { // clic sur le voile
      var r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close();
    }
    t = e.target.closest('[data-toast]'); if (t) toast({ text: t.dataset.toast, title: t.dataset.toastTitle, type: t.dataset.toastType });
    t = e.target.closest('.chip[aria-pressed]'); if (t && !t.disabled) t.setAttribute('aria-pressed', String(t.getAttribute('aria-pressed') !== 'true'));
    t = e.target.closest('.th-sort'); if (t) sortBy(t.closest('th'));
    t = e.target.closest('[data-sync]');
    if (t) {
      var st = t.dataset.state;
      if (st === 'pending') { setSync('syncing'); setTimeout(function () { setSync('online'); toast({ text: 'File d’attente envoyée (simulation).' }); }, 1400); }
      else if (st === 'offline') toast({ type: 'offline', title: 'Hors ligne', text: 'Les saisies partiront automatiquement au retour du réseau.' });
      else toast({ text: 'Tout est synchronisé. Dernier envoi il y a 2 min.' });
    }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('thead .cb')) { $$('tbody .cb', t.closest('table')).forEach(function (b) { b.checked = t.checked; }); }
    if (t.matches('.table .cb')) syncSelection(t.closest('table'));
    if (t.matches('[data-lang]') && t.value !== 'fr') toast({ type: 'demo', title: 'Traduction en cours de validation', text: 'Le corpus est validé avec le MTDI. L’interface reste en français pour l’instant.' });
  });
  document.addEventListener('keydown', function (e) {
    if (trapDrawer(e)) return;
    var open = $('[data-menu-trigger][aria-expanded="true"]');
    if (open) {
      var m = document.getElementById(open.getAttribute('aria-controls'));
      if (e.key === 'Escape') { closeMenus(); open.focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        var items = $$('.menu-item', m), i = items.indexOf(document.activeElement);
        e.preventDefault(); items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); return;
      }
    }
    if (e.key === 'Escape') { var tb = $('.topbar.is-searching'); if (tb) { tb.classList.remove('is-searching'); var b = $('[data-search-toggle]', tb); if (b) b.focus(); } }
    var tab = e.target.closest && e.target.closest('[role="tab"]');
    if (tab) {
      var tabs = $$('[role="tab"]', tab.closest('[role="tablist"]')), k = tabs.indexOf(tab), n = null;
      if (e.key === 'ArrowRight') n = tabs[(k + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(k - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    }
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { var s = $('.tb-search input'); if (s && s.offsetParent) { e.preventDefault(); s.focus(); } }
  });
  ['dragenter', 'dragover'].forEach(function (ev) { document.addEventListener(ev, function (e) { var z = e.target.closest && e.target.closest('.dropzone'); if (z) z.classList.add('is-drag'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { document.addEventListener(ev, function (e) { var z = e.target.closest && e.target.closest('.dropzone'); if (z) z.classList.remove('is-drag'); }); });

  window.Kit = { toast: toast, setSync: setSync, openDrawer: openDrawer, closeDrawer: closeDrawer, setCollapsed: setCollapsed, base: BASE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
