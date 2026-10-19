/* Agri-Digit Bénin · simulateur de téléphone du producteur (maquette v3 « Bénin Vert »).
   API globale : AgriPhone.mount(el, { screen, autoplay }) -> { show, mode, pause, play, el }.
   Scènes déclaratives : data-at="n" (apparaît à l'étape n), data-out="n" (disparaît), data-on / data-off="n" (classe is-on),
   data-type="n" (texte saisi), data-draw="n" (tracé SVG, pathLength=1), data-count="n" (compteur). */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- icônes (grille 24, trait 1,8) ---------- */
  var IC = {
    home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h5v-6h3v6h5V9"/>',
    chat: '<path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5v-3.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M8.5 15.5c0-4.2 3-7 7-7 0 4.4-2.8 7.2-7 7.2z"/><path d="M8.5 15.7 12.5 12"/>',
    market: '<path d="M4 9.5h16L18.6 5H5.4z"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
    map: '<path d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5z"/><path d="M9 4.5v13M15 6.5v13"/>',
    pin: '<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    doc: '<path d="M6.5 3.5h7.5l4 4v13h-11.5z"/><path d="M13.5 3.5V8h4.5M9.5 12.5h5M9.5 16h5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
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
    calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>'
  };
  function ic(n, cls) { return '<svg class="ph-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + '</svg>'; }
  var LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="14" rx="5.6" ry="7" fill="#F3C54A"/><path d="M12 13c0-3.5 1.6-6.5 5-8-.4 3.8-2 6.5-5 8z" fill="#6FA83A"/><path d="M12 13c0-2.8-1.4-5.2-4.2-6.2.2 3 1.6 5.1 4.2 6.2z" fill="#A7D46F"/></svg>';

  function wave(n, live, seed) {
    var s = '', h;
    for (var i = 0; i < n; i++) {
      h = 0.25 + 0.75 * Math.abs(Math.sin((i + 1) * (seed || 1.7)) * Math.cos(i * 0.6));
      s += '<i style="--h:' + h.toFixed(2) + ';--d:' + (-(i * 0.13) % 1).toFixed(2) + 's"></i>';
    }
    return '<span class="wave' + (live ? ' live' : '') + '">' + s + '</span>';
  }
  function typed(text, at, cps, out) {
    return '<span data-type="' + at + '" data-text="' + text + '"' + (cps ? ' data-cps="' + cps + '"' : '') +
      (out ? ' data-out="' + out + '"' : '') + '><span class="ty-on"></span><span class="ty-off">' + text + '</span></span>';
  }
  function spark(pts, dn, at) {
    return '<svg viewBox="0 0 64 24" aria-hidden="true"><path class="spk' + (dn ? ' dn' : '') + '" pathLength="1" data-draw="' + at +
      '" data-dur="900" d="M' + pts.map(function (y, i) { return (2 + i * 10) + ' ' + y; }).join(' L') + '"/></svg>';
  }

  /* ---------- scènes ---------- */
  var SCREENS = {
    accueil: {
      tab: 0, tone: 'dark',
      label: "Accueil de l'application du producteur : bonjour Bio GOUNOU à Banikoara, météo du jour, alerte de fortes pluies jeudi, raccourcis vers l'assistant, le diagnostic photo, le marché et les appuis, et stade de la parcelle de maïs (croissance).",
      steps: [250, 420, 590, 760, 1200], end: 2400, hold: 6500,
      html: function () {
        return '<div class="v-home" style="display:contents">' +
          '<div class="hero"><div class="hello"><div><h3>Bonjour, Bio</h3><p>' + ic('pin') + 'Banikoara · Alibori</p></div><div class="ph-av">BG</div></div>' +
          '<div class="wx"><span class="ico">' + ic('sun') + '</span><span class="big num">31°</span><span class="t"><b>Ensoleillé ce matin</b>Pluie attendue jeudi</span></div></div>' +
          '<div class="ph-body">' +
          '<div class="alert" data-at="1"><span class="dot">' + ic('alert') + '</span><span><b>Fortes pluies jeudi</b>Reportez l\'épandage d\'engrais.</span></div>' +
          '<div class="shortcuts" data-at="2">' +
          '<div class="sc"><i>' + ic('chat') + '</i>Assistant</div><div class="sc"><i>' + ic('scan') + '</i>Photo d\'une feuille</div>' +
          '<div class="sc"><i>' + ic('market') + '</i>Prix du marché</div><div class="sc"><i>' + ic('gift') + '</i>Mes appuis</div></div>' +
          '<div class="ph-card" data-at="3"><div class="stage-top"><span class="sprout">' + ic('sprout') + '</span><span><b>Maïs · parcelle de Founougo</b><span>2,4 ha · semé le 12 août</span></span></div>' +
          '<div class="track"><span class="rail"></span><span class="fill" data-on="5"></span><span class="dots"><span class="done"></span><span class="done"></span><span class="cur"></span><span></span><span></span></span></div>' +
          '<div class="track-l"><span>Semis</span><span>Levée</span><b>Croissance</b><span>Floraison</span><span>Récolte</span></div></div>' +
          '<div class="ph-card" data-at="4" style="padding:10px 12px"><div class="tip">' + ic('calendar') + '<span><b>À faire cette semaine</b>Sarclage et buttage avant jeudi.</span></div></div>' +
          '</div></div>';
      }
    },

    assistant: {
      tab: 1, tone: 'light',
      label: "Assistant agricole : le producteur écrit « Quand semer le maïs à Banikoara ? » ; la réponse cite la fiche technique INRAB sur le maïs et rappelle « Conseil indicatif, vérifiez avec votre agent ATDA ». Puis il passe en fon et pose une question vocale ; la réponse est vocale en fon, traduction en cours de validation.",
      steps: [0, 0, 0, 0, 300, 2400, 3000, 5000, 5300, 6400], end: 7000, hold: 5000,
      html: function () {
        return '<div class="v-chat" style="display:contents">' +
          '<div class="ph-bar"><span class="ph-av">' + ic('sprout') + '</span><span class="grow"><h3>Assistant agricole</h3><p>Répond à partir des fiches INRAB et ATDA</p></span><span class="ph-ibtn">' + ic('more') + '</span></div>' +
          '<div class="langs"><span class="lang is-on" data-off="6">Français</span><span class="lang" data-on="6">Fon</span><span class="lang">Bariba</span><span class="lang">Yoruba</span><span class="lang">Dendi</span></div>' +
          '<div class="chat-vp"><div class="chat">' +
          '<div class="msg me" data-at="2">Quand semer le maïs à Banikoara ?</div>' +
          '<div class="stack" style="align-self:flex-start;max-width:90%">' +
          '<div class="msg bot typing" data-at="3" data-out="4"><i></i><i></i><i></i></div>' +
          '<div class="msg bot" data-at="4" style="max-width:none">' + '<span>' + "Au début de la saison des pluies, quand le sol est humide sur 10 cm. Votre agent ATDA vous donne la date pour votre commune." + '</span>' +
          '<div class="cite" data-at="4">' + ic('doc') + 'Fiche technique INRAB · maïs<span>Source</span></div>' +
          '<div class="disc" data-at="4">' + ic('info') + 'Conseil indicatif, vérifiez avec votre agent ATDA</div></div></div>' +
          '<div class="msg me" data-at="8"><span class="voice"><span class="play">' + ic('play') + '</span>' + wave(18, false, 2.3) + '<small>0:07</small></span></div>' +
          '<div class="msg-cap" data-at="8">Question vocale · fon</div>' +
          '<div class="stack" style="align-self:flex-start;max-width:90%">' +
          '<div class="msg bot typing" data-at="9" data-out="10"><i></i><i></i><i></i></div>' +
          '<div class="msg bot" data-at="10" style="max-width:none"><span class="voice"><span class="play">' + ic('play') + '</span>' + wave(20, true, 1.3) + '<small>0:12</small></span>' +
          '<div class="vnote"><b>Réponse vocale en fon</b> · traduction en cours de validation</div></div></div>' +
          '</div></div>' +
          '<div class="composer"><div class="field">' +
          '<span class="ph-ph" data-out="1">Écrivez ou dictez votre question</span>' +
          typed('Quand semer le maïs à Banikoara ?', 1, 24, 2) +
          '<span class="ph-ph" data-at="2" data-out="7">Écrivez ou dictez votre question</span>' +
          '<span class="rec" data-at="7" data-out="8"><span class="red"></span>Parlez maintenant…' + wave(12, true, 3.1) + '</span>' +
          '<span class="ph-ph" data-at="8">Écrivez ou dictez votre question</span>' +
          '</div><span class="mic" data-on="7" data-off="8">' + ic('mic') + '</span></div>' +
          '</div>';
      }
    },

    diagnostic: {
      tab: 2, tone: 'dark', nav: false,
      label: "Diagnostic photo : l'appareil photo vise une feuille de maïs, l'image est analysée, puis le résultat s'affiche : chenille légionnaire d'automne probable, risque élevé, recommandations de prévention, et cas revu par un agronome en cas de doute. Analyse simulée.",
      steps: [300, 650, 1700, 2900, 3700, 4300, 4800], end: 5200, hold: 5000,
      html: function () {
        return '<div class="v-diag" style="display:contents">' +
          '<div class="finder"><div class="photo"></div></div>' +
          '<div class="ph-bar"><span class="ph-ibtn">' + ic('x') + '</span><span class="grow"><h3>Photo d\'une feuille</h3><p>Cadrez la partie abîmée</p></span><span class="ph-ibtn">' + ic('zap') + '</span></div>' +
          '<div class="frame-box" data-at="1"><i class="cn"></i><i class="cn"></i><i class="cn"></i><i class="cn"></i></div>' +
          '<div class="scan" data-at="2" data-out="5"></div>' +
          '<i class="spot" data-at="3" style="left:132px;top:214px"></i><i class="spot" data-at="3" style="left:190px;top:262px;transition-delay:.12s"></i><i class="spot" data-at="3" style="left:104px;top:292px;transition-delay:.24s"></i>' +
          '<div class="hint" data-at="4" data-out="5"><span class="sp"></span>Analyse de la feuille…</div>' +
          '<div class="flash" data-on="4" data-off="5"></div>' +
          '<div class="shutter-row"><span class="thumb"></span><span class="shutter"></span><span class="ph-ibtn" style="background:rgba(255,255,255,.12);color:#fff">' + ic('back') + '</span></div>' +
          '<div class="sheet" data-at="5"><div class="grab"></div>' +
          '<h4>Chenille légionnaire d\'automne probable</h4><div class="sci">Spodoptera frugiperda · trous et sciure sur les feuilles</div>' +
          '<div class="risk">Niveau de risque<span class="meter" data-on="6"><i></i><i></i><i></i></span><span class="ph-chip chip-lat">Élevé</span></div>' +
          '<ul class="recs">' +
          '<li>' + ic('check') + 'Inspectez 20 plants par endroit, chaque semaine.</li>' +
          '<li>' + ic('check') + 'Écrasez les masses d\'œufs, retirez les larves visibles.</li>' +
          '<li>' + ic('check') + 'Traitez seulement sur avis de votre agent ATDA.</li></ul>' +
          '<div class="review" data-at="7">' + ic('usercheck') + 'Revu par un agronome si doute</div>' +
          '</div></div>';
      }
    },

    meteo: {
      tab: 0, tone: 'dark',
      label: "Météo de Banikoara sur 5 jours avec la pluie attendue ; une notification d'alerte arrive : « Fortes pluies jeudi à Banikoara : reportez l'épandage ».",
      steps: [300, 800, 2100], end: 2700, hold: 5500,
      html: function () {
        var days = [['Auj.', 'sun', 33, 22, 0], ['Lun.', 'cloudsun', 32, 22, 2], ['Mar.', 'cloud', 30, 21, 6], ['Mer.', 'rain', 28, 21, 14], ['Jeu.', 'storm', 26, 20, 42]];
        var d = '', b = '';
        days.forEach(function (x, i) {
          var hi = i === 4;
          d += '<div class="day' + (hi ? ' alertd' : '') + '"><b>' + x[0] + '</b>' + ic(x[1]) + '<span class="tp num">' + x[2] + '° <span>' + x[3] + '°</span></span></div>';
          b += '<div class="bar' + (hi ? ' hi' : '') + '"><span class="num">' + x[4] + '</span><i style="height:' + Math.max(2, Math.round(x[4] / 42 * 38)) + 'px"></i></div>';
        });
        return '<div class="v-meteo" style="display:contents">' +
          '<div class="hero"><div class="ph-bar"><span class="grow"><h3>Météo</h3><p>Banikoara · prévisions locales</p></span></div>' +
          '<div class="now"><span class="big num">31°</span><span class="t"><b>Ensoleillé</b>Ressenti 34° · humidité 58 %</span><span class="ico">' + ic('sun') + '</span></div></div>' +
          '<div class="ph-body">' +
          '<div class="ph-card" data-at="1"><div class="ph-h">5 jours<small>Pluie en mm</small></div><div class="days">' + d + '</div>' +
          '<div class="bars" data-on="2">' + b + '</div></div>' +
          '<div class="ph-card" data-at="1" style="padding:10px 12px"><div class="tip">' + ic('drop') + '<span><b>Fenêtre de travail</b>Sarclez lundi ou mardi. Après jeudi, attendez que le sol ressuie.</span></div></div>' +
          '</div>' +
          '<div class="notif" data-at="3"><span class="app">' + LOGO + '</span><span><span class="top">Agri-Digit Bénin · maintenant</span><b>Alerte pluie</b><p>Fortes pluies jeudi à Banikoara : reportez l\'épandage.</p></span></div>' +
          '</div>';
      }
    },

    marche: {
      tab: 3, tone: 'light',
      label: "Marché du maïs : prix au kilo à Parakou, Malanville et Bohicon avec leur tendance ; le producteur publie une offre, un acheteur est intéressé, et le paiement Mobile Money se fait en un clic (paiement simulé).",
      steps: [300, 550, 1600, 2300, 3000, 4300, 4700, 5300], end: 5800, hold: 5000,
      html: function () {
        return '<div class="v-market" style="display:contents">' +
          '<div class="ph-bar"><span class="grow"><h3>Marché · maïs grain</h3><p>Prix relevés cette semaine</p></span><span class="ph-ibtn">' + ic('more') + '</span></div>' +
          '<div class="ph-body">' +
          '<div class="ph-card prices" data-at="1">' +
          '<div class="prow"><span class="mk"><b>Parakou</b><span>Borgou</span></span>' + spark([18, 16, 17, 13, 11, 7, 6], false, 2) + '<span class="pr">285 F<small class="up">+4 %</small></span></div>' +
          '<div class="prow"><span class="mk"><b>Malanville</b><span>Alibori</span></span>' + spark([8, 9, 7, 11, 12, 13, 15], true, 2) + '<span class="pr">260 F<small class="dn">−2 %</small></span></div>' +
          '<div class="prow"><span class="mk"><b>Bohicon</b><span>Zou</span></span>' + spark([19, 17, 14, 15, 10, 8, 5], false, 2) + '<span class="pr">310 F<small class="up">+6 %</small></span></div>' +
          '</div>' +
          '<div class="ph-card offer" data-at="3"><span class="bag">' + ic('bag') + '</span><span class="grow"><b>Mon offre · 1,2 t</b>Maïs grain sec · 290 F/kg</span><span class="ph-chip chip-ok" data-at="4">' + ic('check') + 'Publiée</span></div>' +
          '<div class="ph-card" data-at="5"><div class="buyer"><span class="ph-av">TP</span><span><b>Un transformateur de Parakou</b>veut 1 t à 290 F/kg</span></div>' +
          '<div class="paybox stack">' +
          '<div data-out="7"><div class="paybtn" data-on="6">' + ic('wallet') + 'Être payé en un clic</div><div class="paycap">Mobile Money : payer ou être payé en un clic</div></div>' +
          '<div class="paid" data-at="7"><svg class="ok" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="18"/><path pathLength="1" data-draw="7" data-dur="550" d="M10.5 18.5l5 5 10-10.5"/></svg>' +
          '<span><b><span data-count="7" data-to="290000" data-dur="700" data-dec="0">0</span> F reçus</b><span>Mobile Money · réf. SIM-0427</span>' +
          '<span class="ph-chip chip-sun" data-at="8">Paiement simulé</span></span></div>' +
          '</div></div>' +
          '</div></div>';
      }
    },

    parcelle: {
      tab: 4, tone: 'light',
      label: "Parcelle mesurée au GPS : le producteur fait le tour de son champ de maïs à Founougo, le point GPS trace le contour et la surface se calcule : 2,4 hectares, stade croissance.",
      steps: [300, 800, 6000, 6250, 7200], end: 7600, hold: 4500,
      pts: [[78, 92], [190, 66], [222, 150], [176, 218], [70, 196], [78, 92]],
      html: function () {
        var rows = '';
        for (var i = -6; i < 22; i++) rows += '<path d="M' + (-20 + i * 16) + ' 300 C ' + (40 + i * 16) + ' 190, ' + (60 + i * 16) + ' 120, ' + (150 + i * 16) + ' -10"/>';
        var trees = [[30, 40, 11], [42, 52, 8], [252, 104, 11], [262, 92, 7], [236, 34, 10], [20, 250, 9], [118, 260, 7]].map(function (t) {
          return '<circle cx="' + t[0] + '" cy="' + t[1] + '" r="' + t[2] + '" fill="#5F8F3E"/><circle cx="' + (t[0] - t[2] * .3) + '" cy="' + (t[1] - t[2] * .3) + '" r="' + t[2] * .55 + '" fill="#7AAA52"/>';
        }).join('');
        var pts = this.pts, d = 'M' + pts.map(function (p) { return p.join(' '); }).join(' L');
        var verts = pts.slice(0, 5).map(function (p, i) {
          return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#fff" stroke="#1F5A32" stroke-width="2" class="vx" data-vx="' + i + '" opacity="0"/>';
        }).join('');
        return '<div class="v-parc" style="display:contents">' +
          '<div class="ph-bar"><span class="ph-ibtn" style="margin-left:-6px">' + ic('back') + '</span><span class="grow"><h3>Nouvelle parcelle</h3><p>Founougo · Banikoara</p></span><span class="ph-ibtn">' + ic('target') + '</span></div>' +
          '<div class="map"><svg viewBox="0 0 272 272" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
          '<rect width="272" height="272" fill="#DDE8C7"/><path d="M180 -10 C 230 60, 290 90, 290 160 L290 -10z" fill="#CFDDB2"/>' +
          '<g fill="none" stroke="#C3D5A1" stroke-width="2.2">' + rows + '</g>' +
          '<path d="M-10 238 C 60 222, 120 252, 170 236 S 250 200, 290 214" fill="none" stroke="#C98B62" stroke-width="11" stroke-linecap="round"/>' +
          '<path d="M-10 238 C 60 222, 120 252, 170 236 S 250 200, 290 214" fill="none" stroke="#DDA57E" stroke-width="6" stroke-dasharray="1 7" stroke-linecap="round"/>' +
          trees +
          '<path class="fillp" data-at="3" d="' + d + 'z"/>' +
          '<path class="tr" pathLength="1" data-draw="2" data-dur="5200" d="' + d + '"/>' + verts +
          '<g data-at="2"><g class="gps"><circle class="ring" r="9" cx="0" cy="0"/><circle r="6" fill="#fff"/><circle r="4" fill="#1F5A32"/></g></g>' +
          '</svg>' +
          '<div class="chipf"><span class="ph-chip" data-at="1" data-out="3">' + ic('pin') + 'Marchez le long de la limite</span><span class="ph-chip chip-ok" data-at="3">' + ic('check') + 'Contour fermé</span></div>' +
          '<div class="scale"><span>50 m</span><i></i></div></div>' +
          '<div class="ph-body"><div class="ph-card meas">' +
          '<span><span class="k">Surface calculée</span><div class="v"><span class="mark-sun" data-count="4" data-to="2.4" data-dur="900" data-dec="1">0,0</span><small>ha</small></div></span>' +
          '<span><span class="k">Distance parcourue</span><div class="v s"><span data-count="2" data-to="630" data-dur="5200" data-dec="0">0</span> m</div></span>' +
          '<span class="full"><span class="ph-chip chip-ok" data-at="5">' + ic('sprout') + 'Maïs · croissance, jour 38</span><span class="ph-chip chip-sun" data-at="5">GPS ± 3 m</span></span>' +
          '</div><div class="paybtn" data-at="5">' + ic('check') + 'Enregistrer la parcelle</div></div></div>';
      },
      frame: function (v, t) {
        var g = v.querySelector('.ph_gps'), pts = this.pts, p = Math.max(0, Math.min(1, (t - this.steps[1]) / 5200));
        // shortcut: interpolation linéaire par segments de longueur égale en temps pondéré par la longueur réelle
        var L = [], tot = 0, i;
        for (i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(l); tot += l; }
        var s = p * tot, k = 0;
        while (k < L.length - 1 && s > L[k]) { s -= L[k]; k++; }
        var f = Math.min(1, s / L[k]), x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f;
        g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
        var acc = 0;
        v.querySelectorAll('.ph_vx').forEach(function (c, j) {
          c.setAttribute('opacity', t >= this.steps[1] && p * tot >= acc - 0.5 ? 1 : 0);
          acc += L[j];
        }, this);
      }
    },

    ussd: {
      tab: -1, basic: true,
      label: "Téléphone simple sans internet : le producteur compose le code USSD *000# (exemple), reçoit un menu numéroté (1 Météo, 2 Prix, 3 Conseil, 4 Mes appuis), puis un SMS d'alerte : fortes pluies jeudi à Banikoara, reportez l'épandage.",
      steps: [600, 3200, 3400, 4600, 6900, 8100], end: 8600, hold: 4500,
      code: '*000#', codeAt: 800, codeStep: 420,
      html: function () { return ''; },
      frame: function (v, t) {
        var n = Math.max(0, Math.min(5, Math.floor((t - this.codeAt) / this.codeStep) + 1));
        var dial = v.querySelector('.ph_lcd-dial');
        if (dial) dial.textContent = this.code.slice(0, n);
        var down = null, since = t - this.codeAt - (n - 1) * this.codeStep;
        if (n > 0 && n <= 5 && since < 200) down = this.code[n - 1];
        if (t >= 3050 && t < 3300) down = 'call';
        if (t >= 7900 && t < 8120) down = 'ok';
        var dots = v.querySelector('.ph_lcd-dots');
        if (dots) dots.textContent = '...'.slice(0, 1 + Math.floor(t / 300) % 3);
        v.closest('.ph-fp').querySelectorAll('[data-key]').forEach(function (k) { k.classList.toggle('is-down', k.getAttribute('data-key') === down); });
      }
    }
  };
  var ORDER = ['accueil', 'assistant', 'diagnostic', 'meteo', 'marche', 'parcelle'];

  var SIG = '<svg viewBox="0 0 14 11" aria-hidden="true"><rect x="0" y="7" width="2.4" height="4" rx=".6" fill="currentColor"/><rect x="3.8" y="5" width="2.4" height="6" rx=".6" fill="currentColor"/><rect x="7.6" y="2.6" width="2.4" height="8.4" rx=".6" fill="currentColor"/><rect x="11.4" y="0" width="2.4" height="11" rx=".6" fill="currentColor" opacity=".35"/></svg>';
  var BAT = '<svg class="bat" viewBox="0 0 20 11" aria-hidden="true"><rect x=".6" y=".6" width="16.4" height="9.8" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.1" opacity=".5"/><rect x="2.2" y="2.2" width="10.4" height="6.6" rx="1.3" fill="currentColor"/><rect x="18" y="3.6" width="1.6" height="3.8" rx=".7" fill="currentColor" opacity=".5"/></svg>';

  function smartHTML() {
    var views = ORDER.map(function (n) {
      return '<section class="ph-view" data-screen="' + n + '">' + SCREENS[n].html() + '</section>';
    }).join('');
    var tabs = [['home', 'Accueil'], ['chat', 'Conseil'], ['scan', 'Photo'], ['market', 'Marché'], ['map', 'Parcelle']].map(function (t) {
      return '<span class="ph-tab">' + ic(t[0]) + t[1] + '</span>';
    }).join('');
    return '<div class="ph-dev"><div class="ph-scr" data-tone="dark">' +
      '<div class="ph-status"><span class="ph-status-l">08:12<span class="ph-sim">Simulation</span></span><span class="ph-status-r">' + SIG + '4G' + BAT + '</span></div>' +
      '<div class="ph-views">' + views + '</div>' +
      '<div class="ph-nav"><span class="ph-pill"></span>' + tabs + '</div><i class="ph-gest"></i>' +
      '<i class="ph-cam"></i><i class="ph-glare"></i></div></div>';
  }

  function basicHTML() {
    var keys = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']];
    var LSIG = '<svg viewBox="0 0 22 10"><rect x="0" y="7" width="3" height="3"/><rect x="4.5" y="5" width="3" height="5"/><rect x="9" y="3" width="3" height="7"/><rect x="13.5" y="0" width="3" height="10"/></svg>';
    var LBAT = '<svg viewBox="0 0 22 10"><rect x="0" y="0" width="19" height="10"/><rect x="1.5" y="1.5" width="16" height="7" fill="#B4D47E" style="fill:#B4D47E"/><rect x="3" y="3" width="10" height="4"/><rect x="19.5" y="3" width="2.5" height="4"/></svg>';
    return '<div class="ph-fp"><i class="fp-ear"></i><span class="fp-sim">Simulation</span>' +
      '<div class="fp-lcd-w"><div class="fp-lcd"><section class="ph-view" data-screen="ussd" style="padding:0;transform:none;background:none">' +
      '<div class="lcd-st">' + LSIG + '<span>08:12</span>' + LBAT + '</div>' +
      '<div class="lcd-l" data-out="1"><div class="lcd-c" style="margin-top:22px;font-size:22px">MTN BJ</div><div class="lcd-c">Dim. 18 oct.</div><div class="lcd-soft"><span>Menu</span><span>Noms</span></div></div>' +
      '<div class="lcd-l" data-at="1" data-out="3"><div class="lcd-big"><span class="lcd-dial"></span><span class="cur">_</span></div><div class="lcd-c" style="font-size:15px;margin-top:6px">code exemple</div><div class="lcd-soft"><span>Appeler</span><span>Effacer</span></div></div>' +
      '<div class="lcd-l" data-at="3" data-out="4"><div class="lcd-c" style="margin-top:34px;font-size:20px">Envoi USSD<span class="lcd-dots">...</span></div><div class="lcd-c">*000# (exemple)</div></div>' +
      '<div class="lcd-l lcd-menu" data-at="4" data-out="5"><div class="lcd-inv">AGRI-DIGIT BENIN</div><div class="sel">1 Météo</div><div>2 Prix</div><div>3 Conseil</div><div>4 Mes appuis</div><div class="lcd-soft"><span>Répondre</span><span>Annuler</span></div></div>' +
      '<div class="lcd-l" data-at="5" data-out="6"><div class="lcd-c" style="margin-top:24px"><svg viewBox="0 0 20 14" style="width:34px;height:24px;margin:0 auto 6px"><rect x="1" y="1" width="18" height="12" fill="none" stroke="#17260F" stroke-width="2"/><path d="M1 1l9 7 9-7" fill="none" stroke="#17260F" stroke-width="2"/></svg>1 nouveau message</div><div class="lcd-soft"><span>Lire</span><span>Retour</span></div></div>' +
      '<div class="lcd-l" data-at="6"><div class="lcd-inv">De : AGRIDIGIT</div><div style="font-size:16.5px">Fortes pluies jeudi a Banikoara : reportez l\'epandage. Conseil indicatif, voir agent ATDA.</div><div class="lcd-soft"><span>Options</span><span>Retour</span></div></div>' +
      '</section></div></div>' +
      '<div class="fp-keys"><div class="fp-nav"><span class="fp-soft call" data-key="call"><i></i></span><span class="fp-dpad" data-key="ok"><i></i></span><span class="fp-soft end"><i></i></span></div>' +
      '<div class="fp-grid">' + keys.map(function (k) { return '<span class="fp-k" data-key="' + k[0] + '"><b>' + k[0] + '</b><small>' + (k[1] || '&nbsp;') + '</small></span>'; }).join('') + '</div></div></div>';
  }

  /* ---------- moteur ---------- */
  function fmt(v, dec) { return v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/ | /g, ' '); }

  function mount(container, opts) {
    opts = opts || {};
    var root = document.createElement('div');
    root.className = 'ph';
    root.setAttribute('role', 'img');
    root.innerHTML = '<div class="ph-z">' + smartHTML() + basicHTML() + '</div>';
    container.appendChild(root);
    // préfixe ph_ sur les classes internes : aucune collision avec les styles de la page
    root.querySelectorAll('[class]').forEach(function (e) {
      var c = e.getAttribute('class').split(/\s+/).filter(Boolean).map(function (k) { return /^(ph-|ph$|is-)/.test(k) ? k : 'ph_' + k; });
      e.setAttribute('class', c.join(' '));
    });

    var z = root.querySelector('.ph-z'), scr = root.querySelector('.ph-scr');
    var pill = root.querySelector('.ph-pill'), tabs = root.querySelectorAll('.ph-tab');
    var views = {};
    root.querySelectorAll('.ph-view').forEach(function (v) { views[v.getAttribute('data-screen')] = v; });

    var cur = null, lastSmart = 'accueil', t = 0, applied = 0, playing = opts.autoplay !== false, inView = true, raf = 0, last = 0, isStatic = false;

    function fit() { z.style.transform = 'scale(' + (root.clientWidth / 300) + ')'; }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(root);

    function q(v, sel) { return v.querySelectorAll(sel); }

    function reset(v) {
      q(v, '[data-at]').forEach(function (e) { e.classList.remove('is-in'); });
      q(v, '[data-out]').forEach(function (e) { e.classList.remove('is-out'); });
      q(v, '[data-on]').forEach(function (e) { e.classList.remove('is-on'); });
      q(v, '[data-off]:not([data-on])').forEach(function (e) { e.classList.add('is-on'); });
      q(v, '[data-type],[data-draw],[data-count]').forEach(function (e) { e._t0 = null; paint(e, 0); });
    }
    function paint(e, p) {
      if (e.hasAttribute('data-type')) {
        var s = e.getAttribute('data-text'), n = Math.round(s.length * p);
        e.firstChild.textContent = s.slice(0, n); e.lastChild.textContent = s.slice(n);
      } else if (e.hasAttribute('data-draw')) {
        e.style.strokeDashoffset = (1 - p).toFixed(4);
      } else {
        var dec = +e.getAttribute('data-dec'), to = +e.getAttribute('data-to');
        e.textContent = fmt(to * (1 - Math.pow(1 - p, 3)), dec);
      }
    }
    function step(v, n) {
      var s = '="' + n + '"';
      q(v, '[data-at' + s + ']').forEach(function (e) { e.classList.add('is-in'); });
      q(v, '[data-out' + s + ']').forEach(function (e) { e.classList.add('is-out'); });
      q(v, '[data-on' + s + ']').forEach(function (e) { e.classList.add('is-on'); });
      q(v, '[data-off' + s + ']').forEach(function (e) { e.classList.remove('is-on'); });
      q(v, '[data-type' + s + '],[data-draw' + s + '],[data-count' + s + ']').forEach(function (e) { e._t0 = t; });
    }
    function follow(v) { // fil de discussion ancré en bas, déplacé seulement par transform
      var chat = v.querySelector('.ph_chat');
      if (!chat) return;
      var shown = chat.querySelectorAll('.is-in:not(.is-out)'), lastEl = null, b = 0;
      shown.forEach(function (e) { var bb = e.offsetTop + e.offsetHeight + (!e.offsetParent || e.offsetParent === chat ? 0 : e.offsetParent.offsetTop); if (bb > b) { b = bb; lastEl = e; } });
      var y = lastEl ? Math.min(0, chat.parentNode.clientHeight - b - 12) : 0;
      chat.style.transform = 'translateY(' + y + 'px)';
    }
    function render(v, sc) {
      var steps = sc.steps, moved = false;
      while (applied < steps.length && t >= steps[applied]) { applied++; step(v, applied); moved = true; }
      q(v, '[data-type],[data-draw],[data-count]').forEach(function (e) {
        if (e._t0 == null) return;
        var dur = e.hasAttribute('data-type') ? e.getAttribute('data-text').length / (+e.getAttribute('data-cps') || 40) * 1000 : +e.getAttribute('data-dur');
        paint(e, Math.min(1, (t - e._t0) / dur));
      });
      if (sc.frame) sc.frame(views[cur], t);
      if (moved) follow(v);
    }
    function finalState() {
      var sc = SCREENS[cur], v = views[cur];
      reset(v); applied = 0; t = sc.end + 6000; render(v, sc); isStatic = true;
      q(v, '[data-type],[data-draw],[data-count]').forEach(function (e) { if (e._t0 != null) paint(e, 1); });
    }

    function active() { return playing && inView && !document.hidden && !RM.matches; }
    function loop(now) {
      raf = 0;
      if (!active()) return;
      var dt = last ? Math.min(64, now - last) : 16; last = now;
      var sc = SCREENS[cur], v = views[cur];
      t += dt;
      if (t > sc.end + sc.hold) { reset(v); applied = 0; t = 0; }
      render(v, sc);
      raf = requestAnimationFrame(loop);
    }
    function sync() {
      var on = active();
      root.classList.toggle('is-paused', !on);
      if (on && !raf) { if (isStatic) { reset(views[cur]); applied = 0; t = 0; isStatic = false; } last = 0; raf = requestAnimationFrame(loop); }
      if (!on && raf) { cancelAnimationFrame(raf); raf = 0; }
    }

    function describe() { root.setAttribute('aria-label', 'Simulation de l\'application Agri-Digit Bénin sur téléphone. ' + SCREENS[cur].label); }

    function show(name) {
      var sc = SCREENS[name];
      if (!sc) return api;
      var prev = cur, pv = prev && views[prev], nv = views[name];
      root.setAttribute('data-mode', sc.basic ? 'basic' : 'smart');
      if (!sc.basic) lastSmart = name;
      if (prev !== name) {
        if (pv && !SCREENS[prev].basic && !sc.basic) {
          var dir = ORDER.indexOf(name) >= ORDER.indexOf(prev) ? 1 : -1;
          pv.classList.add('is-leaving'); pv.classList.remove('is-active');
          pv.style.transform = 'translateX(' + (-dir * 8) + '%)';
          nv.style.transition = 'none'; nv.style.transform = 'translateX(' + (dir * 12) + '%)';
          void nv.offsetWidth;
          nv.style.transition = ''; nv.style.transform = '';
        } else if (pv) { pv.classList.remove('is-active'); }
        nv.classList.remove('is-leaving');
        nv.classList.add('is-active');
        if (pv) setTimeout(function () { if (cur !== prev) { pv.classList.remove('is-leaving'); pv.style.transform = ''; reset(pv); } }, 450);
      }
      cur = name;
      if (!sc.basic) {
        scr.setAttribute('data-tone', sc.tone);
        scr.setAttribute('data-nav', sc.nav === false ? 'off' : 'on');
        pill.style.transform = 'translateX(' + sc.tab * 100 + '%)';
        tabs.forEach(function (tb, i) { tb.classList.toggle('is-cur', i === sc.tab); });
      }
      describe();
      reset(nv); applied = 0; t = 0; isStatic = false;
      if (!active()) finalState(); else render(nv, sc);
      sync();
      return api;
    }

    var api = {
      el: root,
      show: show,
      mode: function (m) { return show(m === 'basic' ? 'ussd' : lastSmart); },
      pause: function () { playing = false; sync(); return api; },
      play: function () { playing = true; sync(); return api; }
    };

    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; sync(); }).observe(root);
    }
    document.addEventListener('visibilitychange', sync);
    if (RM.addEventListener) RM.addEventListener('change', function () { show(cur); });

    show(SCREENS[opts.screen] ? opts.screen : 'assistant');
    return api;
  }

  window.AgriPhone = { mount: mount, screens: ORDER.concat('ussd') };
})();
