/* Agri-Digit Bénin · maquettes mobiles : noyau (icônes, aides de composition, cadre d'écran, planche).
   Les écrans sont déclarés dans ecrans.js avec M.group() et M.add(). */
(function () {
  'use strict';

  /* ---------- icônes (grille 24, trait 1,8 : même jeu que phone.js, étendu) ---------- */
  var IC = {
    home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h5v-6h3v6h5V9"/>',
    chat: '<path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5v-3.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M8.5 15.5c0-4.2 3-7 7-7 0 4.4-2.8 7.2-7 7.2z"/><path d="M8.5 15.7 12.5 12"/>',
    market: '<path d="M4 9.5h16L18.6 5H5.4z"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    map: '<path d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5z"/><path d="M9 4.5v13M15 6.5v13"/>',
    pin: '<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    doc: '<path d="M6.5 3.5h7.5l4 4v13h-11.5z"/><path d="M13.5 3.5V8h4.5M9.5 12.5h5M9.5 16h5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13" stroke-width="3"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
    alert: '<path d="M12 4 3 19.5h18z"/><path d="M12 10v4.5M12 17v.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    usercheck: '<circle cx="9.5" cy="8" r="3.5"/><path d="M3.5 20c0-3.3 2.7-6 6-6 1.6 0 3 .6 4.1 1.6"/><path d="M15 17.5l2 2 4-4"/>',
    trend: '<path d="M4 16.5l5.5-5.5 4 4 6.5-7"/><path d="M15 8h5v5"/>',
    wallet: '<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 10h17M15.5 15h2"/>',
    gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M12 9v11M4 13.5h16"/><path d="M12 9C10.5 5.5 7 5 7 7.4 7 9 12 9 12 9s5 0 5-1.6C17 5 13.5 5.5 12 9z"/>',
    sprout: '<path d="M12 20v-8"/><path d="M12 12C12 8 9.5 6 5.5 6c0 4 2.5 6 6.5 6z"/><path d="M12 14.5c0-3.5 2.3-5.5 6.5-5.5 0 3.6-2.4 5.5-6.5 5.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    cloudsun: '<path d="M8 4.5v1.3M3.8 8.5h1.3M5 5.5l.9.9M11.6 6.4l.9-.9"/><path d="M5.4 11A3.6 3.6 0 0 1 11.6 8"/><path d="M8 19.5h9.5a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.5A2.8 2.8 0 0 0 8 19.5z"/>',
    cloud: '<path d="M7 18.5h10.5a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.6 1.8A3.1 3.1 0 0 0 7 18.5z"/>',
    rain: '<path d="M7 14.5h10.5a3.8 3.8 0 0 0 0-7.6 5.3 5.3 0 0 0-10.3 1.7A3 3 0 0 0 7 14.5z"/><path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
    storm: '<path d="M7 13.5h10.5a3.8 3.8 0 0 0 0-7.6 5.3 5.3 0 0 0-10.3 1.7A3 3 0 0 0 7 13.5z"/><path d="M12.5 13.5 10.5 17h3l-2 3.5"/><path d="M7.5 16.5l-1 2.5M17 16.5l-1 2.5"/>',
    drop: '<path d="M12 3.5s6 6.5 6 10.5a6 6 0 0 1-12 0c0-4 6-10.5 6-10.5z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    zap: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    more: '<circle cx="12" cy="5.5" r=".9"/><circle cx="12" cy="12" r=".9"/><circle cx="12" cy="18.5" r=".9"/>',
    bag: '<path d="M7 7.5h10l1.5 12.5h-13z"/><path d="M9.5 7.5V6a2.5 2.5 0 0 1 5 0v1.5"/><path d="M9 12.5h6"/>',
    target: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c0-4 3.4-6.8 7.5-6.8s7.5 2.8 7.5 6.8"/>',
    users: '<circle cx="9" cy="9" r="3.2"/><path d="M3 19.5c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6"/><path d="M15.5 6.2a3 3 0 0 1 0 5.6M17.5 14.2c2 .7 3.5 2.6 3.5 5.3"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.5 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.5-3.6-8.5S9.5 6.1 12 3.5z"/>',
    camera: '<path d="M4 8.5h3.5L9 6h6l1.5 2.5H20v11H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    image: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    chev: '<path d="M9.5 6l6 6-6 6"/>',
    chevd: '<path d="M6 9.5l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    wifioff: '<path d="M3.5 3.5l17 17"/><path d="M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 4.5-2.6M14.5 10a10 10 0 0 1 4.5 2.5M2 9a14.5 14.5 0 0 1 4-2.6M11 5.6A14.5 14.5 0 0 1 22 9"/><path d="M12 19.5v.1"/>',
    sync: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L19.5 9"/><path d="M19.5 4.5V9H15"/><path d="M19.5 12a7.5 7.5 0 0 1-13 5.1L4.5 15"/><path d="M4.5 19.5V15H9"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    shield: '<path d="M12 3.5l7 2.5v5.5c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19.5h1M19.5 14v1"/>',
    share: '<circle cx="17.5" cy="5.5" r="2.3"/><circle cx="6.5" cy="12" r="2.3"/><circle cx="17.5" cy="18.5" r="2.3"/><path d="M8.5 10.8l7-4M8.5 13.2l7 4"/>',
    phone: '<path d="M5 4.5h3.5l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5V19a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z"/>',
    layers: '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5"/>',
    edit: '<path d="M4.5 19.5l1-4L15.5 5.5l3 3-10 10z"/><path d="M13.5 7.5l3 3"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    send: '<path d="M4 12l16-7.5-5.5 16-3-6.5z"/><path d="M11.5 14 20 4.5"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.5a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 3.6M12 17v.2"/>',
    logout: '<path d="M10 4.5H5.5v15H10"/><path d="M14 8l4 4-4 4M18 12H9"/>',
    idcard: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 15.5c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 10h4M14 13.5h4"/>',
    sign: '<path d="M3.5 17c2-3 3.5-7 5.5-7s-1 7 1.5 7 2.5-4 4.5-4 1 3 2.5 3 2-1 3-1.5"/><path d="M3.5 20.5h17"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
    trash: '<path d="M5 7h14M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    scale: '<path d="M12 4v16M7 20h10M5 8h14"/><path d="M5 8l-2.5 6a3 3 0 0 0 5 0zM19 8l-2.5 6a3 3 0 0 0 5 0z"/>',
    flag: '<path d="M5.5 21V4.5M5.5 5h11l-2 4 2 4h-11"/>',
    tag: '<path d="M3.5 12V4.5H11l9.5 9.5-7.5 7.5z"/><circle cx="7.8" cy="8.8" r="1.4"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    outbox: '<path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20"/><path d="M4 13.5 6 6h12l2 7.5V19H4z"/><path d="M12 3v7M9.5 5.5 12 3l2.5 2.5"/>',
    task: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12.5l3 3 5-6"/>',
    walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M9.5 21l2.2-6.5 2.8 2.5V21"/><path d="M7.5 12l2.5-4h3.5l2 3.5 2.5 1"/><path d="M13.5 8l-1.8 6.5"/>',
    sms: '<path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5v-3.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><path d="M8 11h.1M12 11h.1M16 11h.1" stroke-width="2.6"/>',
    hand: '<path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 10V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5c0 4-2.5 7-6.5 7-2.6 0-4-1.3-5.4-3.4L3.5 14a1.5 1.5 0 0 1 2.4-1.8L8 14"/>',
    bulb: '<path d="M9 17.5h6M10 21h4"/><path d="M8.5 14.5a6 6 0 1 1 7 0c-.8.6-1 1.5-1 3h-5c0-1.5-.2-2.4-1-3z"/>',
    sat: '<path d="M13 11l-2-2"/><path d="M5 9l4-4 3 3-4 4z"/><path d="M12 16l4-4 3 3-4 4z"/><path d="M9.5 9.5l5 5"/><path d="M4 20a5 5 0 0 0 5-5M4 16.5a1.5 1.5 0 0 0 1.5-1.5"/>',
    history: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/><path d="M12 8v4.5l3 1.8"/>',
    star: '<path d="M12 3.8l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.4l-5.1 2.8L8 13.6 3.8 9.7l5.7-.7z"/>'
  };
  function ic(n, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }
  var LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="14" rx="5.6" ry="7" fill="#F3C54A"/><path d="M12 13c0-3.5 1.6-6.5 5-8-.4 3.8-2 6.5-5 8z" fill="#6FA83A"/><path d="M12 13c0-2.8-1.4-5.2-4.2-6.2.2 3 1.6 5.1 4.2 6.2z" fill="#A7D46F"/></svg>';
  var SIG = '<svg viewBox="0 0 14 11" aria-hidden="true"><rect x="0" y="7" width="2.4" height="4" rx=".6" fill="currentColor"/><rect x="3.8" y="5" width="2.4" height="6" rx=".6" fill="currentColor"/><rect x="7.6" y="2.6" width="2.4" height="8.4" rx=".6" fill="currentColor"/><rect x="11.4" y="0" width="2.4" height="11" rx=".6" fill="currentColor" opacity=".35"/></svg>';
  var NOSIG = '<svg viewBox="0 0 14 11" aria-hidden="true"><rect x="0" y="7" width="2.4" height="4" rx=".6" fill="currentColor" opacity=".35"/><rect x="3.8" y="5" width="2.4" height="6" rx=".6" fill="currentColor" opacity=".35"/><rect x="7.6" y="2.6" width="2.4" height="8.4" rx=".6" fill="currentColor" opacity=".35"/><rect x="11.4" y="0" width="2.4" height="11" rx=".6" fill="currentColor" opacity=".35"/><path d="M1 1l12 9" stroke="currentColor" stroke-width="1.6"/></svg>';
  var BAT = '<svg viewBox="0 0 20 11" aria-hidden="true"><rect x=".6" y=".6" width="16.4" height="9.8" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.1" opacity=".5"/><rect x="2.2" y="2.2" width="10.4" height="6.6" rx="1.3" fill="currentColor"/><rect x="18" y="3.6" width="1.6" height="3.8" rx=".7" fill="currentColor" opacity=".5"/></svg>';

  /* ---------- aides de composition (renvoient du HTML) ---------- */
  function a(o, k, d) { return o && o[k] !== undefined ? o[k] : d; }
  var H = {
    ic: ic, LOGO: LOGO,
    /* barre du haut : retour 48 dp, titre, actions, bouton « Écouter » */
    tb: function (title, sub, o) {
      var back = a(o, 'back', true), listen = a(o, 'listen', true), acts = a(o, 'acts', '');
      return '<header class="tb' + (back ? '' : ' nob') + '">' +
        (back ? '<button class="ib" aria-label="Retour">' + ic(back === 'x' ? 'x' : 'back') + '</button>' : '') +
        '<div class="t"><h1>' + title + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + acts +
        (listen ? H.listen() : '') + '</header>';
    },
    listen: function (cls) { return '<button class="ib listen' + (cls ? ' ' + cls : '') + '" aria-label="Écouter cette page">' + ic('speaker') + '</button>'; },
    ib: function (n, label, cls, badge) { return '<button class="ib' + (cls ? ' ' + cls : '') + '" aria-label="' + label + '">' + ic(n) + (badge ? '<span class="badge num">' + badge + '</span>' : '') + '</button>'; },
    btn: function (label, n, cls) { return '<button class="btn' + (cls ? ' ' + cls : '') + '">' + (n ? ic(n) : '') + label + '</button>'; },
    ico: function (n, cls) { return '<span class="ico' + (cls ? ' ' + cls : '') + '">' + ic(n) + '</span>'; },
    row: function (lead, title, sub, end, cls) {
      // une pastille d'état passe sous le texte : le titre garde toute la largeur
      var under = '';
      if (end && /^<span class="chip/.test(end) && end.indexOf('aria-label') < 0) { under = '<div style="margin-top:6px">' + end + '</div>'; end = undefined; }
      return '<div class="row' + (cls ? ' ' + cls : '') + '">' + (lead || '') + '<div class="tx"><b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + under + '</div>' +
        (end === undefined ? ic('chev', 'chev') : end) + '</div>';
    },
    chip: function (t, cls, n) { return '<span class="chip' + (cls ? ' ' + cls : '') + '">' + (n ? ic(n) : '') + t + '</span>'; },
    sim: function (t) { return '<span class="tag-sim">' + (t || 'Simulation') + '</span>'; },
    demo: function (t) { return '<span class="tag-demo">' + (t || 'Démonstration') + '</span>'; },
    fld: function (label, inner, o) {
      return '<div class="fld"><label>' + label + '</label>' + inner +
        (a(o, 'hint') ? '<span class="hint">' + o.hint + '</span>' : '') +
        (a(o, 'err') ? '<span class="errm">' + ic('alert') + o.err + '</span>' : '') + '</div>';
    },
    inp: function (content, cls) { return '<div class="inp' + (cls ? ' ' + cls : '') + '">' + content + '</div>'; },
    chk: function (t, on) { return '<div class="chk' + (on ? ' on' : '') + '"><span class="box">' + (on ? ic('check') : '') + '</span><span>' + t + '</span></div>'; },
    wave: function (n, seed) {
      var s = '';
      for (var i = 0; i < n; i++) s += '<i style="--h:' + (0.25 + 0.75 * Math.abs(Math.sin((i + 1) * (seed || 1.7)) * Math.cos(i * 0.6))).toFixed(2) + '"></i>';
      return '<span class="wave" aria-hidden="true">' + s + '</span>';
    },
    audio: function (label, dur) { return '<button class="audio"><span class="pb">' + ic('speaker') + '</span>' + label + (dur ? '<small>' + dur + '</small>' : '') + '</button>'; },
    cta: function (inner, cls) { return '<div class="cta' + (cls ? ' ' + cls : '') + '">' + inner + '</div>'; },
    steps: function (n, tot) { var s = ''; for (var i = 1; i <= tot; i++) s += '<i' + (i <= n ? ' class="on"' : '') + '></i>'; return '<div class="steps" aria-label="Étape ' + n + ' sur ' + tot + '">' + s + '</div>'; },
    dots: function (n, tot) { var s = ''; for (var i = 1; i <= tot; i++) s += '<i' + (i === n ? ' class="on"' : '') + '></i>'; return '<div class="dots" aria-label="Écran ' + n + ' sur ' + tot + '">' + s + '</div>'; },
    sec: function (t, link) { return '<div class="h-sec"><h2>' + t + '</h2>' + (link ? '<a>' + link + '</a>' : '') + '</div>'; },
    kv: function (pairs) { return '<div class="kv">' + pairs.map(function (p) { return '<div><span>' + p[0] + '</span><b>' + p[1] + '</b></div>'; }).join('') + '</div>'; },
    kbd: function () {
      var k = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ']];
      return '<div class="kbd" aria-hidden="true">' + k.map(function (x) { return '<span>' + x[0] + (x[1] ? '<small>' + x[1] + '</small>' : '') + '</span>'; }).join('') +
        '<span class="fn">' + ic('back') + '</span><span>0<small>+</small></span><span class="go">' + ic('check') + '</span></div>';
    },
    /* plan d'un champ : rangs, chemin, arbres, polygone de parcelle (coordonnées en px du plan) */
    field: function (w, h, o) {
      o = o || {};
      var rows = '';
      for (var i = -8; i < (w / 16) + 10; i++) rows += '<path d="M' + (-40 + i * 18) + ' ' + (h + 20) + ' C ' + (20 + i * 18) + ' ' + (h * .62) + ', ' + (40 + i * 18) + ' ' + (h * .38) + ', ' + (130 + i * 18) + ' -20"/>';
      var trees = (o.trees || [[30, 40, 12], [44, 54, 8], [w - 30, 110, 12], [w - 20, 96, 8], [w - 60, 30, 10], [24, h - 40, 10]]).map(function (t) {
        return '<circle cx="' + t[0] + '" cy="' + t[1] + '" r="' + t[2] + '" fill="#5F8F3E"/><circle cx="' + (t[0] - t[2] * .3) + '" cy="' + (t[1] - t[2] * .3) + '" r="' + (t[2] * .55) + '" fill="#7AAA52"/>';
      }).join('');
      var road = 'M-10 ' + (h - 30) + ' C ' + (w * .25) + ' ' + (h - 50) + ', ' + (w * .45) + ' ' + (h - 14) + ', ' + (w * .65) + ' ' + (h - 34) + ' S ' + (w * .9) + ' ' + (h - 70) + ', ' + (w + 10) + ' ' + (h - 56);
      var poly = o.poly ? 'M' + o.poly.map(function (p) { return p.join(' '); }).join(' L') : '';
      var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        '<rect width="' + w + '" height="' + h + '" fill="' + (o.sat ? '#7E8F5E' : '#DDE8C7') + '"/>' +
        (o.sat ? '' : '<path d="M' + (w * .62) + ' -10 C ' + (w * .8) + ' 60, ' + (w + 10) + ' 90, ' + (w + 10) + ' 160 L' + (w + 10) + ' -10z" fill="#CFDDB2"/>') +
        '<g fill="none" stroke="' + (o.sat ? '#6F8050' : '#C3D5A1') + '" stroke-width="2.2">' + rows + '</g>' +
        (o.road === false ? '' : '<path d="' + road + '" fill="none" stroke="' + (o.sat ? '#B08A63' : '#C98B62') + '" stroke-width="12" stroke-linecap="round"/>') + trees;
      if (o.ndvi && o.poly) {
        var cells = '', pal = ['#B4532D', '#D9A35A', '#F3C54A', '#A9CC74', '#6FA83A', '#2F7A3E'];
        for (var y = 0; y < h; y += 14) for (var x = 0; x < w; x += 14) {
          var v = Math.abs(Math.sin(x * 0.037 + y * 0.051) + Math.cos(x * 0.023 - y * 0.031) * 0.8);
          var k = Math.min(5, Math.floor(v * 3.1 + (x > w * .55 && y > h * .45 ? -1.8 : 1)));
          cells += '<rect x="' + x + '" y="' + y + '" width="14" height="14" fill="' + pal[Math.max(0, k)] + '"/>';
        }
        s += '<clipPath id="ndv"><path d="' + poly + 'z"/></clipPath><g clip-path="url(#ndv)" opacity=".92">' + cells + '</g>';
      }
      if (o.poly) {
        if (o.closed !== false) s += '<path d="' + poly + 'z" fill="' + (o.ndvi ? 'none' : 'rgba(111,168,58,.34)') + '" stroke="' + (o.ndvi ? '#fff' : '#1F5A32') + '" stroke-width="3" stroke-linejoin="round"/>';
        else s += '<path d="' + poly + '" fill="none" stroke="#1F5A32" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>' +
          (o.ghost ? '<path d="M' + o.poly[o.poly.length - 1].join(' ') + ' L' + o.poly[0].join(' ') + '" fill="none" stroke="#1F5A32" stroke-width="2" stroke-dasharray="4 6" opacity=".6"/>' : '');
        if (o.verts) s += o.poly.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#fff" stroke="#1F5A32" stroke-width="2.5"/>'; }).join('');
      }
      if (o.gps) s += '<g transform="translate(' + o.gps[0] + ' ' + o.gps[1] + ')"><circle r="22" class="gpsring"/><circle r="9" fill="#fff"/><circle r="6.5" fill="#1F5A32"/></g>';
      return s + '</svg>';
    },
    qr: function (seed) {
      var n = 25, s = '', r = seed || 7;
      function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
      function finder(x, y) { return '<rect x="' + x + '" y="' + y + '" width="7" height="7" fill="#0E2F1C"/><rect x="' + (x + 1) + '" y="' + (y + 1) + '" width="5" height="5" fill="#fff"/><rect x="' + (x + 2) + '" y="' + (y + 2) + '" width="3" height="3" fill="#0E2F1C"/>'; }
      for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
        var inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
        if (!inF && rnd() > 0.52) s += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
      }
      return '<svg viewBox="0 0 ' + n + ' ' + n + '" shape-rendering="crispEdges" aria-hidden="true"><g fill="#0E2F1C">' + s + '</g>' + finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7) + '</svg>';
    },
    spark: function (pts, dn) { return '<svg viewBox="0 0 72 28" aria-hidden="true"><path class="spk' + (dn ? ' dn' : '') + '" d="M' + pts.map(function (y, i) { return (3 + i * 11) + ' ' + y; }).join(' L') + '"/></svg>'; },
    /* téléphone à touches : écran LCD (contenu en HTML) et touche enfoncée éventuelle */
    fp: function (lcd, down, cap) {
      var keys = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];
      var LSIG = '<svg viewBox="0 0 22 10"><rect x="0" y="7" width="3" height="3"/><rect x="4.5" y="5" width="3" height="5"/><rect x="9" y="3" width="3" height="7"/><rect x="13.5" y="0" width="3" height="10"/></svg>';
      var LBAT = '<svg viewBox="0 0 22 10"><rect x="0" y="0" width="19" height="10"/><rect x="1.5" y="1.5" width="16" height="7" style="fill:#B4D47E"/><rect x="3" y="3" width="10" height="4"/><rect x="19.5" y="3" width="2.5" height="4"/></svg>';
      return '<div class="fp" aria-hidden="true"><i class="ear"></i><span class="fsim">Simulation</span><div class="lcdw"><div class="lcd">' +
        '<div class="st">' + LSIG + '<span>08:12</span>' + LBAT + '</div><div class="bd">' + lcd + '</div></div></div>' +
        '<div class="keys"><div class="navk"><span class="soft-k call' + (down === 'call' ? ' down' : '') + '"><i></i></span><span class="dpad' + (down === 'ok' ? ' down' : '') + '"><i></i></span><span class="soft-k end"><i></i></span></div>' +
        '<div class="grid">' + keys.map(function (k) { return '<span class="k' + (down === k[0] ? ' down' : '') + '"><b>' + k[0] + '</b><small>' + (k[1] || '&nbsp;') + '</small></span>'; }).join('') + '</div></div></div>' +
        (cap ? '<p class="fp-cap">' + cap + '</p>' : '');
    }
  };

  /* ---------- registre ---------- */
  var groups = [], screens = {};
  function group(id, title, intent) { groups.push({ id: id, title: title, intent: intent, items: [] }); }
  function add(id, def) { def.id = id; screens[id] = def; groups[groups.length - 1].items.push(def); }

  var NAV_P = [['home', 'Accueil', 'accueil'], ['chat', 'Conseil', 'conseil'], ['scan', 'Photo', 'photo'], ['market', 'Marché', 'marche'], ['map', 'Parcelles', 'parcelles']];
  var NAV_A = [['users', 'Producteurs', 'producteurs'], ['plus', 'Inscrire', 'inscrire'], ['gift', 'Remises', 'remises'], ['sync', 'Envoi', 'envoi'], ['user', 'Moi', 'moi']];
  function nav(def) {
    var set = def.agent ? NAV_A : NAV_P, cur = def.agent || def.nav;
    return '<nav class="nav" aria-label="Navigation principale">' + set.map(function (n) {
      var on = n[2] === cur;
      return '<a' + (on ? ' class="on" aria-current="page"' : '') + '><span class="pi">' + ic(n[0]) + (def.dot === n[2] ? '<i class="dot"></i>' : '') + '</span>' + n[1] + '</a>';
    }).join('') + '</nav>';
  }
  function frame(def) {
    if (def.basic) return '<div class="scr fp-stage" aria-label="' + def.t + '">' + def.html + '</div>';
    var tone = def.tone || '', sbc = def.sbOver ? ' over' : (def.sbDark ? ' on-dark' : '');
    return '<div class="scr ' + tone + '" aria-label="' + def.t + '">' +
      '<div class="sb' + sbc + '"' + (def.sbBg ? ' style="background:' + def.sbBg + '"' : '') + '><span class="sb-l">08:12<span class="sim">Simulation</span></span><span class="sb-r">' +
      (def.offline ? NOSIG : SIG + '4G') + BAT + '</span></div>' +
      '<div class="main">' + def.html + '</div>' +
      ((def.nav || def.agent) ? nav(def) : '') +
      '<div class="gest' + (def.gestOver ? ' over' : '') + (def.gestDark ? ' on-dark' : '') + '"><i></i></div></div>';
  }

  /* ---------- planche ---------- */
  function board() {
    var only = new URLSearchParams(location.search).get('p');
    var gs = only ? groups.filter(function (g) { return g.id === only; }) : groups;
    var n = Object.keys(screens).length;
    var head = only ? '' :
      '<header class="bd-head"><h1>Agri-Digit Bénin, application mobile</h1>' +
      '<p><b>' + n + ' écrans, ' + groups.length + ' parcours.</b> Producteur (Android d\'entrée et de milieu de gamme, réseau intermittent, lecture parfois difficile) et mode agent terrain ATDA. Chaque écran est dessiné à 360 × 780 dp et s\'ouvre seul pour servir de référence de code.</p>' +
      '<ul class="bd-conv">' +
      '<li><b>Navigation</b>5 entrées en bas : Accueil, Conseil, Photo, Marché, Parcelles. Le reste part de l\'accueil (tuiles) ou du profil.</li>' +
      '<li><b>Lecture audio partout</b>Le haut-parleur en haut à droite lit l\'écran dans la langue choisie.</li>' +
      '<li><b>Pictogramme + mot court</b>Aucune icône seule pour une action ; boutons de 56 dp, cibles d\'au moins 48 dp.</li>' +
      '<li><b>Dire vrai</b>« Simulation » sur la barre d\'état et sur tout paiement ou calcul fictif ; « Démonstration » sur les chiffres.</li>' +
      '<li><b>Langues</b>Français affiché ; fon, bariba, yoruba et dendi basculent avec la mention « traduction en cours de validation ».</li>' +
      '<li><b>Hors ligne d\'abord</b>Chaque saisie part dans une file d\'envoi visible, envoyée au retour du réseau.</li></ul></header>';
    var toc = only ? '' : '<nav class="bd-toc" aria-label="Parcours">' + groups.map(function (g, i) { return '<a href="#' + g.id + '">' + (i + 1) + '. ' + g.title + '</a>'; }).join('') + '</nav>';
    var secs = gs.map(function (g) {
      var i = groups.indexOf(g) + 1;
      return '<section class="bd-sec" id="' + g.id + '"><h2>' + i + '. ' + g.title + '</h2><p>' + g.intent + '</p><div class="bd-grid">' +
        g.items.map(function (d) {
          return '<figure class="bd-fig"><div class="bd-dev' + (d.basic ? ' basic' : '') + '">' + frame(d) + '</div><figcaption><b>' + d.t + '</b><span>' + d.i + '</span>' +
            '<a href="ecrans/' + d.id + '.html">ecrans/' + d.id + '.html</a></figcaption></figure>';
        }).join('') + '</div></section>';
    }).join('');
    document.body.className = 'board';
    document.body.innerHTML = head + toc + '<main>' + secs + '</main>' +
      (only ? '' : '<footer class="bd-foot">Prototype de démonstration, données non officielles. Photos : Wikimedia Commons (Rachad Sanoussi, Africa Rice Center, Ji-Elle), CC BY-SA. Polices auto-hébergées (SIL OFL).</footer>');
  }
  function solo(id) {
    var d = screens[id];
    document.title = d.t + ' · Agri-Digit Bénin';
    document.body.className = 'solo';
    document.body.innerHTML = frame(d);
  }

  window.M = { H: H, group: group, add: add, board: board, solo: solo, screens: screens, groups: groups };
})();
