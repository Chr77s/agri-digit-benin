/* Agri-Digit Bénin · écrans, parcours 1 à 8 (premier lancement → météo et prix). */
(function () {
  'use strict';
  var H = M.H, ic = H.ic, add = M.add, group = M.group;
  var tb = H.tb, btn = H.btn, row = H.row, ico = H.ico, chip = H.chip, fld = H.fld, inp = H.inp, cta = H.cta;

  /* ================= 1. Premier lancement ================= */
  group('lancement', 'Premier lancement', 'Choisir sa langue en l\'entendant, comprendre en trois images ce que fait l\'application, puis accorder les autorisations une par une en sachant pourquoi.');

  function lang(name, sub, on, ok) {
    return '<div class="lang' + (on ? ' on' : '') + '"><span class="radio' + (on ? ' on' : '') + '"></span><div class="tx"><b>' + name + '</b><span>' + sub + '</span></div>' +
      (ok ? '' : chip('À valider', 'sun')) + '<button class="say" aria-label="Écouter ' + name + '">' + ic('speaker') + '</button></div>';
  }
  add('langue', {
    t: 'Choix de la langue', i: 'Premier écran, avant tout texte : chaque langue s\'écoute ; seules les langues validées s\'affichent sans réserve.',
    html: '<div class="scroll" style="padding-top:22px;gap:10px">' +
      '<div class="row-x" style="gap:12px;margin-bottom:4px"><span style="width:48px;height:48px;display:block">' + H.LOGO + '</span><div><p class="tiny" style="font-weight:700">Agri-Digit Bénin</p><h1 class="big-t">Choisissez votre langue</h1></div></div>' +
      '<p class="lead" style="font-size:16px">Touchez le haut-parleur pour entendre chaque langue.</p>' +
      lang('Français', 'Texte et voix', true, true) +
      lang('Fɔngbè', 'Fon') + lang('Baatonum', 'Bariba') + lang('Yorùbá', 'Yoruba') + lang('Dendi', 'Dendi') +
      '<p class="tiny row-x" style="align-items:flex-start">' + ic('info') + 'Fon, bariba, yoruba, dendi : traduction en cours de validation.</p>' +
      '</div>' + cta(btn('Continuer en français', 'chev'))
  });

  function intro(n, img, credit, overlay, title, text) {
    return '<div class="tb nob" style="justify-content:flex-end;padding-right:8px"><span class="grow"></span>' + H.listen() + '<button class="btn ghost sm">Passer</button></div>' +
      '<div class="illus ' + img + '"><span class="cr">' + credit + '</span><div class="ov">' + overlay + '</div></div>' +
      '<div class="scroll" style="padding-top:20px;gap:10px"><h1 class="big-t">' + title + '</h1><p class="lead">' + text + '</p></div>' +
      '<div class="cta" style="gap:16px">' + H.dots(n, 3) + btn(n < 3 ? 'Suivant' : 'Commencer', 'chev') + '</div>';
  }
  add('intro-1', {
    t: 'Présentation 1 · Conseil', i: 'Une image réelle d\'un champ du Bénin et la promesse en une phrase : poser sa question, à l\'écrit ou à la voix.',
    html: intro(1, 'img-mais', 'Photo R. Sanoussi, CC BY-SA 4.0',
      '<div class="msg me" style="margin-left:auto;font-size:14.5px">Quand semer le maïs ?</div><div class="msg bot" style="margin-top:8px;font-size:14.5px">Au début des pluies, sol humide sur 10 cm.</div>',
      'Un conseiller dans votre poche', 'Posez votre question à l\'écrit ou à la voix. Les réponses viennent des fiches de l\'INRAB et de l\'ATDA.')
  });
  add('intro-2', {
    t: 'Présentation 2 · Photo', i: 'Le diagnostic expliqué par l\'image : on photographie la feuille, on reçoit un avis et quoi faire.',
    html: intro(2, 'img-mais-leaf', 'Photo R. Sanoussi, CC BY-SA 4.0',
      '<div class="card" style="padding:12px 14px"><div class="row-x"><span class="ico lat">' + ic('alert') + '</span><div><b style="font-size:15px;display:block;line-height:1.25">Chenille légionnaire probable</b><span class="tiny">Risque élevé · 3 conseils</span></div></div></div>',
      'Une photo de la feuille, un conseil', 'Photographiez une plante malade. L\'application dit ce que c\'est sans doute et ce qu\'il faut faire.')
  });
  add('intro-3', {
    t: 'Présentation 3 · Vendre et appuis', i: 'Ce que le producteur y gagne : vendre, être payé par Mobile Money, recevoir ses appuis, même sans réseau.',
    html: intro(3, 'img-riz2', 'Photo Africa Rice Center, CC BY-SA 3.0',
      '<div class="card" style="padding:12px 14px"><div class="row-x"><span class="okmark" style="width:40px;height:40px;margin:0;box-shadow:none">' + ic('check') + '</span><div class="grow"><b class="num" style="font-size:17px;display:block">290 000 F reçus</b><span class="tiny">Mobile Money</span></div>' + H.sim('Simulation') + '</div></div>',
      'Vendre, être payé, recevoir vos appuis', 'Publiez votre récolte, choisissez l\'acheteur, recevez l\'argent en un clic. Ça marche aussi hors réseau.')
  });

  function perm(n, title, why, state) {
    var end = state === 'ok' ? chip('Autorisé', 'ok', 'check') : state === 'no' ? chip('Refusé', '') : '<button class="btn sec sm" style="height:48px;padding:0 16px">Autoriser</button>';
    return '<div class="row" style="align-items:flex-start;padding-top:14px;padding-bottom:14px">' + ico(n) + '<div class="tx"><b>' + title + '</b><span>' + why + '</span></div>' + end + '</div>';
  }
  var permList = '<div class="list">' +
    perm('pin', 'Position', 'Pour mesurer vos parcelles et donner la météo de votre village.', 'ask') +
    perm('camera', 'Appareil photo', 'Pour photographier une feuille malade ou votre récolte.', 'ask') +
    perm('mic', 'Micro', 'Pour poser vos questions à voix haute.', 'ask') +
    perm('bell', 'Notifications', 'Pour recevoir les alertes pluie et ravageurs.', 'ask') + '</div>';
  add('autorisations', {
    t: 'Autorisations', i: 'Les quatre accès expliqués en une phrase chacun, demandés un par un ; aucun n\'est obligatoire pour continuer.',
    html: tb('Autorisations', 'Étape facultative', { back: true }) +
      '<div class="scroll" style="gap:14px"><p class="lead" style="font-size:16px">L\'application vous demande quatre accès. Vous pouvez dire non : elle marchera quand même, avec moins de services.</p>' + permList +
      '<p class="tiny">Vous pourrez changer d\'avis plus tard dans Profil, puis Autorisations.</p></div>' +
      cta(btn('Tout autoriser, un par un', 'check') + '<button class="btn ghost">Plus tard</button>')
  });
  add('autorisation-systeme', {
    t: 'Demande Android : position', i: 'La fenêtre du système Android qui suit le bouton « Autoriser » ; l\'écran de l\'application reste visible derrière.',
    html: tb('Autorisations', 'Étape facultative') + '<div class="scroll" style="gap:14px"><p class="lead" style="font-size:16px">L\'application vous demande quatre accès.</p>' + permList + '</div>' +
      '<div class="scrim"></div><div class="dlg" role="dialog" aria-label="Autoriser la position">' +
      '<span style="color:var(--leaf);align-self:center">' + ic('pin') + '</span><h2 class="center">Autoriser Agri-Digit Bénin à accéder à la position de cet appareil ?</h2>' +
      '<div class="btns" style="gap:12px"><div class="col" style="align-items:center;gap:6px"><span class="map" style="width:96px;height:96px;border-radius:50%;box-shadow:inset 0 0 0 3px var(--leaf)">' + H.field(96, 96, { trees: [], gps: [48, 48] }) + '</span><b class="small">Exacte</b></div>' +
      '<div class="col" style="align-items:center;gap:6px"><span class="map" style="width:96px;height:96px;border-radius:50%;opacity:.7">' + H.field(96, 96, { trees: [] }) + '</span><span class="small">Approximative</span></div></div>' +
      '<div class="col" style="gap:6px"><button class="btn sec" style="height:48px;font-size:15.5px">Lorsque vous utilisez l\'appli</button><button class="btn sec" style="height:48px;font-size:15.5px">Uniquement cette fois-ci</button><button class="btn ghost" style="font-size:15.5px">Ne pas autoriser</button></div></div>'
  });

  /* ================= 2. Compte ================= */
  group('compte', 'Compte et inscription', 'S\'identifier par son numéro et un code SMS, puis s\'inscrire en trois étapes courtes ; le consentement est séparé, lisible et audible, et un mineur passe par son tuteur.');

  add('numero', {
    t: 'Numéro de téléphone', i: 'Un seul champ, l\'indicatif +229 déjà posé, le pavé numérique ouvert ; pas de mot de passe.',
    html: tb('Connexion', null) +
      '<div class="scroll" style="gap:14px"><h1 class="big-t">Quel est votre numéro de téléphone ?</h1><p class="lead" style="font-size:16px">Nous envoyons un code par SMS. C\'est gratuit.</p>' +
      fld('Numéro de téléphone', inp('<span class="pre">' + ic('phone') + '+229</span><span class="num">01 97 12 34 56</span><span class="caret"></span>', 'focus'), { hint: '10 chiffres, commence par 01' }) + '</div>' +
      cta(btn('Recevoir le code', 'sms')) + H.kbd()
  });
  add('otp', {
    t: 'Code SMS à 6 chiffres', i: 'Six cases larges, le renvoi possible après le délai, le SMS simulé affiché pour la démonstration.',
    html: tb('Code reçu par SMS', null) +
      '<div class="scroll" style="gap:14px"><h1 class="big-t">Entrez le code à 6 chiffres</h1>' +
      '<p class="small">Envoyé au <b class="num">+229 01 97 •• •• 56</b>. <a style="color:var(--leaf);font-weight:700">Changer de numéro</a></p>' +
      '<div class="otp num" aria-label="Code, 4 chiffres sur 6"><span class="f">4</span><span class="f">8</span><span class="f">2</span><span class="f">9</span><span class="cur"></span><span></span></div>' +
      '<div class="row-x tiny" style="min-height:40px">' + ic('clock') + '<span>Renvoyer le code dans <b class="num">0:42</b> · valable 10 minutes</span></div>' +
      '<div class="ban sun">' + ic('sms') + '<span>' + '<b>SMS simulé</b>Votre code Agri-Digit : 482917</span></div></div>' +
      cta(btn('Valider le code', 'check', 'dis')) + H.kbd()
  });
  add('inscription-identite', {
    t: 'Inscription 1/3 · Identité', i: 'Le NPI vérifié auprès de l\'ANIP (simulé) pré-remplit nom et naissance ; le producteur confirme plutôt qu\'il ne tape.',
    html: tb('Inscription', 'Étape 1 sur 3 · Identité') +
      '<div class="scroll" style="gap:14px">' + H.steps(1, 3) +
      fld('NPI (numéro personnel d\'identification)', inp('<span class="num grow">3 041 728 659</span>' + ic('check', 'last'), 'ok'), { hint: 'Vérifié auprès de l\'ANIP · simulé' }) +
      '<div class="btns">' + fld('Prénom', inp('Bio')) + fld('Nom', inp('GOUNOU')) + '</div>' +
      fld('Date de naissance', inp('<span class="num grow">12 / 03 / 1984</span>' + ic('calendar'))) +
      fld('Sexe', '<div class="picks"><span class="pick">Femme</span><span class="pick on">' + ic('check') + 'Homme</span></div>') +
      '</div>' + cta(btn('Continuer', 'chev'))
  });
  function vc(name, on) { return '<span class="pick' + (on ? ' on' : '') + '">' + (on ? ic('check') : ic('sprout')) + name + '</span>'; }
  add('inscription-lieu', {
    t: 'Inscription 2/3 · Lieu et cultures', i: 'Où il cultive et quoi : listes déroulantes courtes, filières en grosses pastilles à toucher.',
    html: tb('Inscription', 'Étape 2 sur 3 · Lieu et cultures') +
      '<div class="scroll" style="gap:14px">' + H.steps(2, 3) +
      '<div class="btns">' + fld('Département', inp('Alibori', 'sel')) + fld('Commune', inp('Banikoara', 'sel')) + '</div>' +
      fld('Village ou quartier', inp('Founougo')) +
      '<div class="fld"><label>Vos cultures</label><div class="picks">' + vc('Maïs', 1) + vc('Coton', 1) + vc('Soja') + vc('Riz') + vc('Niébé') + vc('Manioc') + vc('Maraîchage') + '</div><span class="hint">Touchez toutes celles que vous cultivez.</span></div>' +
      '</div>' + cta(btn('Continuer', 'chev'))
  });
  add('consentement', {
    t: 'Inscription 3/3 · Consentement', i: 'Le texte réduit à cinq points, lisible à voix haute ; deux accords séparés, le second facultatif et décoché.',
    html: tb('Votre accord', 'Étape 3 sur 3') +
      '<div class="scroll" style="gap:12px">' + H.steps(3, 3) + H.audio('Écouter le texte en entier', '2:10') +
      '<div class="card" style="padding:6px 16px"><ul class="recs" style="gap:0">' +
      [['user', '<b>Qui :</b> le ministère de l\'Agriculture (MAEP)'], ['doc', '<b>Quoi :</b> identité, téléphone, commune, parcelles'], ['bulb', '<b>Pour :</b> conseils, alertes, appuis, marché'], ['shield', '<b>Où :</b> vos données restent au Bénin'], ['x', '<b>Retrait :</b> possible à tout moment, en un clic']]
        .map(function (x, i) { return '<li style="padding:9px 0;align-items:center;' + (i ? 'box-shadow:0 -1px 0 var(--line)' : '') + '"><span style="color:var(--leaf)">' + ic(x[0]) + '</span><span>' + x[1] + '</span></li>'; }).join('') +
      '</ul></div><a class="small" style="color:var(--leaf);font-weight:700;min-height:32px;display:flex;align-items:center">Lire le texte complet (version 1)</a>' +
      '<div class="col" style="gap:0">' + H.chk('J\'accepte l\'usage de mes données pour les services agricoles. <b>Obligatoire</b>', true) +
      H.chk('J\'accepte de partager mon profil avec les banques et le FNDA pour un crédit. <b>Facultatif</b>', false) + '</div>' +
      '</div>' + cta(btn('Envoyer l\'inscription', 'send'))
  });
  add('tuteur', {
    t: 'Producteur de moins de 16 ans', i: 'Si la date de naissance donne moins de 16 ans, l\'inscription bascule vers l\'accord du parent ou tuteur légal.',
    html: tb('Accord du tuteur', 'Moins de 16 ans') +
      '<div class="scroll" style="gap:14px"><div class="ban sun">' + ic('users') + '<span><b>Un parent ou tuteur doit accepter</b>Le producteur a moins de 16 ans (loi n° 2017-20, art. 446).</span></div>' +
      fld('Nom complet du parent ou tuteur', inp('Orou GOUNOU')) +
      fld('NPI du parent ou tuteur', inp('<span class="num grow">2 118 904 337</span>' + ic('check', 'last'), 'ok'), { hint: 'Vérifié auprès de l\'ANIP · simulé' }) +
      fld('Lien avec l\'enfant', '<div class="picks"><span class="pick on">' + ic('check') + 'Père</span><span class="pick">Mère</span><span class="pick">Tuteur</span></div>') +
      H.chk('Je suis le parent ou tuteur légal et j\'accepte l\'inscription de cet enfant.', true) +
      '</div>' + cta(btn('Continuer', 'chev'))
  });
  add('attente-validation', {
    t: 'Fiche en attente de validation', i: 'Ce qui se passe après l\'envoi, en trois étapes datées ; le code producteur est donné tout de suite.',
    html: '<div class="scroll" style="padding-top:28px;gap:16px;align-items:stretch">' +
      '<span class="okmark wait">' + ic('clock') + '</span><h1 class="big-t center">Inscription envoyée</h1>' +
      '<p class="lead center" style="font-size:16px">Votre fiche attend la validation de l\'agent ATDA de Banikoara.</p>' +
      '<div class="card row-x" style="justify-content:space-between"><div><span class="tiny">Code producteur</span><b class="num" style="display:block;font-size:19px;letter-spacing:.02em">BJ-BAN-004127</b></div>' + H.demo() + '</div>' +
      '<ul class="tl card">' +
      '<li class="done"><span class="p">' + ic('check') + '</span><div><b>Inscription envoyée</b><span>Aujourd\'hui, 08:10</span></div></li>' +
      '<li class="cur"><span class="p"></span><div><b>Vérification par l\'agent ATDA</b><span>Sous 3 à 7 jours. Vous recevrez un SMS.</span></div></li>' +
      '<li class="todo"><span class="p"></span><div><b>Carte de producteur disponible</b><span>Après validation</span></div></li></ul>' +
      '</div>' + cta(btn('Aller à l\'accueil', 'home') + '<p class="tiny">En attendant, le conseil et la météo marchent déjà.</p>')
  });

  /* ================= 3. Accueil ================= */
  group('accueil', 'Accueil', 'Tout ce qui compte aujourd\'hui en un regard : le temps, l\'alerte, où en est le champ, quoi faire cette semaine ; hors réseau, la file d\'envoi rassure.');

  function hero(offline) {
    return '<div class="hero"><div class="hello"><div class="grow"><h1>Bonjour, Bio</h1><p>' + ic('pin') + 'Banikoara · Alibori</p></div>' +
      H.ib('bell', 'Mes messages', '', '2') + H.listen('on-dark') + '</div>' +
      '<div class="wx" style="margin-top:10px;padding:8px 14px"><span class="sunico">' + ic('sun') + '</span><span class="deg">31°</span><span class="t"><b>Ensoleillé ce matin</b>' +
      (offline ? 'Mis à jour hier, 18:40' : 'Fortes pluies jeudi') + '</span></div></div>';
  }
  function stage(small) {
    return '<div class="card" style="padding:14px 14px 12px"><div class="row-x" style="gap:12px">' + ico('sprout') + '<div class="grow"><b style="display:block;font-size:16px;line-height:1.3">Maïs · Champ de Founougo</b><span class="tiny">2,4 ha · semé le 12 août · jour 38</span></div>' + ic('chev', 'chev') + '</div>' +
      '<div class="track"><span class="rail"></span><span class="fill" style="width:calc(50% - 7px)"></span><span class="tdots"><span class="done"></span><span class="done"></span><span class="cur"></span><span></span><span></span></span></div>' +
      '<div class="track-l"><span>Semis</span><span>Levée</span><b>Croissance</b><span>Floraison</span><span>Récolte</span></div></div>';
  }
  function tiles() {
    return '<div class="tiles">' + [['gift', 'Mes appuis'], ['users', 'Coopérative'], ['idcard', 'Ma carte'], ['trend', 'Prix']].map(function (t) { return '<a class="tile"><i>' + ic(t[0]) + '</i>' + t[1] + '</a>'; }).join('') + '</div>';
  }
  function task(t, s, done, end) { return '<div class="task' + (done ? ' done' : '') + '"><span class="cb">' + (done ? ic('check') : '') + '</span><div class="tx"><b>' + t + '</b><span>' + s + '</span></div>' + (end || '') + '</div>'; }
  add('accueil', {
    t: 'Accueil', i: 'Météo, alerte, stade de la parcelle, tâches et raccourcis ; l\'alerte passe avant tout le reste.',
    nav: 'accueil', sbDark: true,
    html: hero() + '<div class="scroll" style="padding-top:12px;gap:10px">' +
      '<div class="ban lat" style="align-items:center"><span class="dotico">' + ic('alert') + '</span><span class="grow"><b>Fortes pluies jeudi</b>Reportez l\'épandage d\'engrais.</span>' + ic('chev') + '</div>' +
      stage() +
      H.sec('Cette semaine', 'Tout voir') +
      '<div class="list">' + task('Sarclage et buttage', 'Avant jeudi', false, chip('2 jours', 'sun')) + task('Inspecter 20 plants', 'Chenille légionnaire', false) + '</div>' +
      tiles() + '</div>'
  });
  function qrow(n, t, s) { return row(ico(n), t, s, '<span class="chip sun" aria-label="En attente">' + ic('clock') + '</span>'); }
  add('accueil-hors-ligne', {
    t: 'Accueil hors ligne', i: 'Sans réseau, l\'application reste utilisable : un bandeau le dit, la file d\'envoi montre ce qui partira.',
    nav: 'accueil', sbDark: true, offline: true,
    html: hero(true) + '<div class="ban off" style="margin-top:10px;margin-left:16px;margin-right:16px;border-radius:14px">' + ic('wifioff') + '<span class="grow"><b>Hors ligne</b>3 saisies seront envoyées au retour du réseau.</span><a style="color:var(--maize);font-weight:800;min-height:48px;display:flex;align-items:center">Voir</a></div>' +
      '<div class="scroll" style="padding-top:10px;gap:10px">' + stage() +
      H.sec('En attente d\'envoi', '') +
      '<div class="list">' + qrow('map', 'Parcelle du marigot', 'Mesurée hier, 17:05') +
      qrow('bag', 'Récolte : 1 850 kg de maïs', 'Aujourd\'hui, 07:52') + '</div>' + '</div>'
  });
  add('file-envoi', {
    t: 'File d\'envoi', i: 'Chaque saisie gardée sur le téléphone, son état, et la seule qui demande une action : celle refusée par le serveur.',
    offline: true,
    html: tb('File d\'envoi', '3 saisies en attente') +
      '<div class="scroll" style="gap:12px"><p class="small row-x">' + ic('wifioff') + 'Pas de réseau. Envoi automatique au retour, rien n\'est perdu.</p>' + H.sec('En attente', '') +
      '<div class="list">' + qrow('map', 'Parcelle du marigot', 'Hier, 17:05 · 1,6 ha') +
      qrow('bag', 'Récolte de maïs', 'Aujourd\'hui, 07:52 · 1 850 kg') +
      qrow('camera', 'Photo d\'une feuille', 'Aujourd\'hui, 08:01 · 1,2 Mo') + '</div>' +
      H.sec('À corriger', '') +
      '<div class="card" style="padding:14px"><div class="row-x" style="gap:12px;align-items:flex-start">' + ico('map', 'lat') + '<div class="grow"><b style="display:block">Parcelle « Bas-fond »</b><span class="errm" style="margin-top:4px">Refusée : elle chevauche une autre parcelle de plus de 20 %.</span></div></div>' +
      '<div class="btns" style="margin-top:12px">' + btn('Supprimer', 'trash', 'ghost sm') + btn('Corriger', 'edit', 'sec sm') + '</div></div></div>' +
      cta(btn('Envoyer maintenant', 'sync', 'dis') + '<p class="tiny">Dernier essai il y a 2 minutes</p>')
  });

  /* ================= 4. Parcelles ================= */
  group('parcelles', 'Parcelles', 'Mesurer son champ en marchant son contour, voir sa surface se calculer, retrouver chaque parcelle avec son statut foncier, son historique et son suivi satellite.');

  var P1 = [[70, 60], [210, 40], [250, 140], [196, 216], [60, 190]];
  function thumb(poly) { return '<span class="map" style="width:64px;height:64px;border-radius:14px">' + H.field(64, 64, { trees: [], road: false, poly: poly }) + '</span>'; }
  add('parcelles', {
    t: 'Mes parcelles', i: 'La liste : forme du champ, surface, culture en cours et statut, avec le bouton pour en mesurer une nouvelle.',
    nav: 'parcelles',
    html: tb('Mes parcelles', '3 parcelles · 4,8 ha', { back: false }) +
      '<div class="scroll" style="gap:12px"><div class="list">' +
      row(thumb([[14, 14], [50, 10], [54, 36], [44, 54], [12, 48]]), 'Champ de Founougo', '2,4 ha · Maïs, croissance', chip('Propriété', 'ok')) +
      row(thumb([[10, 20], [40, 8], [56, 30], [30, 56]]), 'Champ du marigot', '1,6 ha · Coton, levée', chip('Coutumier', '')) +
      row(thumb([[16, 12], [52, 18], [48, 52], [14, 44]]), 'Bas-fond de Kokey', '0,8 ha · Riz · à vérifier', chip('Chevauche', 'lat')) +
      '</div><p class="tiny">Surfaces mesurées au GPS. La surface officielle est recalculée par le serveur.</p>' +
      '<div class="card tint row-x" style="gap:12px">' + ico('walk', 'dk') + '<span class="small">Pour mesurer, faites le tour du champ à pied, le téléphone à la main.</span></div></div>' +
      cta(btn('Mesurer une nouvelle parcelle', 'walk'))
  });
  var TR = [[70, 70], [200, 44], [248, 150], [208, 236]];
  add('trace-gps', {
    t: 'Tracé GPS en marchant', i: 'Le point suit le producteur, le contour se dessine, surface, distance et précision se mettent à jour.',
    html: tb('Nouvelle parcelle', 'Marchez le long de la limite', { back: 'x' }) +
      '<div class="map" style="height:350px;margin:0 16px;border-radius:20px">' + H.field(328, 350, { poly: TR, closed: false, ghost: true, verts: true, gps: [208, 236] }) +
      '<span class="float mchip" style="left:12px;top:12px"><span class="spin dk" style="width:14px;height:14px;border-width:2px;animation:none;border-color:var(--lat);border-top-color:var(--lat);background:var(--lat)"></span>Enregistrement</span>' +
      '<button class="float mbtn" style="right:12px;top:12px" aria-label="Recentrer">' + ic('target') + '</button><span class="float scale"><span>50 m</span><i></i></span></div>' +
      '<div class="scroll" style="padding-top:12px;gap:10px"><div class="card measure">' +
      '<div><span class="k">Surface</span><span class="v"><span class="mark-sun">1,7</span><small>ha</small></span></div>' +
      '<div><span class="k">Distance</span><span class="v">480<small>m</small></span></div>' +
      '<div><span class="k">Précision</span><span class="v">± 3<small>m</small></span></div></div>' +
      '<p class="small row-x" style="align-items:flex-start">' + ic('info') + 'Revenez au point de départ pour fermer le contour.</p></div>' +
      cta('<div class="btns">' + btn('Pause', 'pause', 'sec') + btn('Terminer', 'check') + '</div>')
  });
  add('trace-fin', {
    t: 'Contour fermé, enregistrement', i: 'Le champ fermé et mesuré ; il reste à le nommer et à dire à qui est la terre.',
    html: tb('Contour fermé', 'Founougo · Banikoara') +
      '<div class="map" style="height:200px;margin:0 16px;border-radius:20px">' + H.field(328, 200, { poly: [[70, 40], [210, 24], [250, 100], [206, 172], [60, 150]], verts: true }) +
      '<span class="float mchip dk" style="left:12px;top:12px">' + ic('check') + 'Contour fermé</span></div>' +
      '<div class="scroll" style="padding-top:12px;gap:12px"><div class="card measure">' +
      '<div><span class="k">Surface</span><span class="v"><span class="mark-sun">2,4</span><small>ha</small></span></div>' +
      '<div><span class="k">Périmètre</span><span class="v">630<small>m</small></span></div>' +
      '<div><span class="k">Précision</span><span class="v">± 3<small>m</small></span></div></div>' +
      fld('Nom de la parcelle', inp('Champ de Founougo')) +
      fld('Statut foncier', '<div class="picks"><span class="pick on">' + ic('check') + 'Propriété</span><span class="pick">Location</span><span class="pick">Prêt</span><span class="pick">Coutumier</span></div>') +
      '</div>' + cta(btn('Enregistrer la parcelle', 'check'))
  });
  add('parcelle-detail', {
    t: 'Détail d\'une parcelle', i: 'Surface, terrain, statut foncier vérifié, campagne en cours et ce qui a poussé là les années passées.',
    nav: 'parcelles',
    html: tb('Champ de Founougo', 'Founougo · Banikoara', { acts: H.ib('edit', 'Modifier') }) +
      '<div class="map" style="height:150px;margin:0 16px;border-radius:20px">' + H.field(328, 150, { poly: [[90, 24], [220, 14], [256, 76], [214, 132], [80, 116]], trees: [[30, 30, 10], [300, 120, 11]] }) + '</div>' +
      '<div class="scroll" style="padding-top:12px;gap:10px"><div class="card" style="padding:4px 16px">' +
      H.kv([['Surface', '2,4 ha'], ['Terrain', 'Pluvial (plateau)'], ['Statut foncier', '<span class="chip ok">' + ic('check') + 'Propriété, vérifiée</span>']]) + '</div>' +
      H.sec('Historique', '') +
      '<div class="card" style="padding:14px 16px 2px"><ul class="tl">' +
      '<li class="cur"><span class="p"></span><div><b>2026 · Maïs</b><span>En cours · croissance, jour 38</span></div></li>' +
      '<li class="done"><span class="p">' + ic('check') + '</span><div><b>2025 · Coton</b><span>2 100 kg récoltés</span></div></li>' +
      '<li class="done"><span class="p">' + ic('check') + '</span><div><b>2024 · Maïs</b><span>3 400 kg récoltés</span></div></li></ul></div>' +
      btn('Voir le suivi satellite', 'layers', 'sec') + '</div>'
  });
  add('satellite', {
    t: 'Suivi satellite', i: 'La vigueur de la culture en couleurs sur le contour du champ, la zone faible signalée et quoi y vérifier.',
    nav: 'parcelles',
    html: tb('Suivi satellite', 'Champ de Founougo', { acts: '' }) +
      '<div class="map" style="height:230px;margin:0 16px;border-radius:20px">' + H.field(328, 230, { sat: true, ndvi: true, poly: [[60, 40], [230, 22], [290, 118], [236, 206], [50, 180]], trees: [[20, 30, 10], [310, 200, 12]] }) +
      '<span class="float" style="left:12px;top:12px">' + H.sim('Indice simulé') + '</span></div>' +
      '<div class="scroll" style="padding-top:10px;gap:10px">' +
      '<div><div class="ndvi-legend"><i style="background:#B4532D"></i><i style="background:#D9A35A"></i><i style="background:#F3C54A"></i><i style="background:#A9CC74"></i><i style="background:#6FA83A"></i><i style="background:#2F7A3E"></i></div>' +
      '<div class="row-x tiny" style="justify-content:space-between;margin-top:4px"><span>Plante faible</span><span>Plante vigoureuse</span></div></div>' +
      '<div class="ban sun" style="align-items:center">' + ic('target') + '<span><b>Zone faible au sud-est</b>Allez voir : manque d\'eau ou ravageurs ?</span></div>' +
      '<div class="card" style="padding:12px 16px"><div class="row-x" style="justify-content:space-between"><b>Vigueur moyenne</b>' + H.demo() + '</div>' +
      '<div class="bars">' + [[.38, 'Août'], [.47, ''], [.55, 'Sept.'], [.6, ''], [.62, '']].map(function (b, i, arr) { return '<div' + (i === arr.length - 1 ? ' class="hi"' : '') + '><span>' + b[0].toFixed(2).replace('.', ',') + '</span><i style="height:' + Math.round(b[0] * 100) + 'px"></i></div>'; }).join('') + '</div>' +
      '<p class="tiny" style="margin-top:6px">Image du 14 septembre · 10 m par point</p></div></div>'
  });

  /* ================= 5. Campagne ================= */
  group('campagne', 'Campagne', 'Ouvrir la saison d\'une parcelle, suivre ses stades sur un calendrier préparé depuis la fiche technique, cocher ses tâches et déclarer sa récolte.');

  add('campagne-nouvelle', {
    t: 'Ouvrir une campagne', i: 'Trois choix seulement : la culture, la variété, la date de semis ; le reste est préparé à partir de la fiche INRAB.',
    html: tb('Nouvelle campagne', 'Champ de Founougo · 2,4 ha') +
      '<div class="scroll" style="gap:14px">' +
      '<div class="fld"><label>Culture</label><div class="tiles big">' + [['Maïs', 1], ['Coton'], ['Soja'], ['Riz']].map(function (c) { return '<a class="tile" style="' + (c[1] ? 'box-shadow:inset 0 0 0 2.5px var(--leaf)' : '') + '"><i>' + ic('sprout') + '</i>' + c[0] + '</a>'; }).join('') + '</div></div>' +
      fld('Variété', inp('EVDT 97 STR', 'sel'), { hint: 'Variétés conseillées par l\'INRAB pour Banikoara' }) +
      fld('Date de semis', inp('<span class="grow">Mercredi 12 août 2026</span>' + ic('calendar'))) +
      '<div class="ban info">' + ic('doc') + '<span>Le calendrier et les tâches viennent de la <b style="display:inline;font-size:inherit">fiche technique INRAB · maïs</b>.</span></div>' +
      '</div>' + cta(btn('Ouvrir la campagne', 'check'))
  });
  add('calendrier', {
    t: 'Calendrier des stades', i: 'Où en est la culture et ce qui vient, avec des dates estimées ; le stade se change d\'un geste.',
    nav: 'parcelles',
    html: tb('Maïs · saison 2026', 'Champ de Founougo') +
      '<div class="scroll" style="gap:12px">' + stage() +
      '<div class="card" style="padding:16px 16px 4px"><ul class="tl">' +
      '<li class="done"><span class="p">' + ic('check') + '</span><div><b>Semis</b><span>12 août</span></div></li>' +
      '<li class="done"><span class="p">' + ic('check') + '</span><div><b>Levée</b><span>18 août</span></div></li>' +
      '<li class="cur"><span class="p"></span><div><b>Croissance</b><span>Jour 38 · jusque vers le 25 septembre</span></div></li>' +
      '<li class="todo"><span class="p"></span><div><b>Floraison</b><span>Vers le 1er octobre</span></div></li>' +
      '<li class="todo"><span class="p"></span><div><b>Récolte</b><span>Vers le 10 novembre</span></div></li></ul></div>' +
      '<p class="tiny">Dates estimées à partir de la fiche INRAB · maïs, variété extra-précoce.</p></div>' +
      cta(btn('Passer au stade suivant', 'chev', 'sec'))
  });
  add('taches', {
    t: 'Tâches de la campagne', i: 'Les travaux à faire, triés par urgence ; la météo peut décaler une tâche et le dit.',
    nav: 'parcelles',
    html: tb('Tâches', 'Maïs · Champ de Founougo') +
      '<div class="scroll" style="gap:12px"><div class="picks scrollx"><span class="pick on">Cette semaine</span><span class="pick">Plus tard</span><span class="pick">Faites</span></div>' +
      '<div class="list">' + task('Sarclage et buttage', 'Avant jeudi', false, chip('2 jours', 'sun')) +
      task('Apport d\'urée', 'Décalé : fortes pluies jeudi', false, chip('Reporté', 'lat')) +
      task('Inspecter 20 plants', 'Chenille légionnaire · chaque semaine', false) +
      task('Premier sarclage', 'Fait le 2 septembre', true) + '</div>' +
      '<p class="small row-x muted">' + ic('speaker') + 'Touchez une tâche pour l\'écouter.</p></div>' +
      cta(btn('Ajouter une tâche', 'plus', 'sec'))
  });
  function stepper(v) { return '<div class="inp" style="padding:0 4px;justify-content:space-between"><button class="ib" aria-label="Moins">' + ic('minus') + '</button><span class="num" style="font-size:22px;font-weight:800">' + v + '</span><button class="ib" aria-label="Plus">' + ic('plus') + '</button></div>'; }
  add('recolte', {
    t: 'Déclarer la récolte', i: 'Quantité au kilo ou en sacs, part stockée et vendue, comparée à l\'estimation ; un écart fort sera vérifié par l\'agent.',
    html: tb('Déclarer la récolte', 'Maïs · Champ de Founougo') +
      '<div class="scroll" style="gap:12px">' + fld('Date de récolte', inp('<span class="grow">Mardi 10 novembre 2026</span>' + ic('calendar'))) +
      fld('Quantité récoltée', stepper('1 850 kg'), { hint: 'Soit 18 sacs et demi de 100 kg' }) +
      '<div class="btns">' + fld('Stockée', inp('<span class="num">1 000 kg</span>')) + fld('Vendue', inp('<span class="num">850 kg</span>')) + '</div>' +
      '<div class="card tint"><div class="row-x" style="justify-content:space-between"><b>Estimé : 1 900 à 2 300 kg</b>' + H.demo() + '</div><p class="small row-x" style="margin-top:6px;color:var(--ok-ink)">' + ic('check') + 'Votre récolte est cohérente.</p></div>' +
      '</div>' + cta(btn('Enregistrer la récolte', 'check'))
  });

  /* ================= 6. Assistant ================= */
  group('assistant', 'Assistant agricole', 'Poser sa question en écrivant ou en parlant, dans sa langue ; la réponse cite sa fiche, se lit à voix haute, et passe la main à l\'agent dès qu\'il s\'agit d\'un dosage.');

  function langbar(cur) { return '<div class="langbar">' + ['Français', 'Fon', 'Bariba', 'Yoruba', 'Dendi'].map(function (l) { return '<span class="pick' + (l === cur ? ' on' : '') + '">' + l + '</span>'; }).join('') + '</div>'; }
  function composer(rec) {
    return '<div class="composer"><div class="field">Écrivez ou parlez</div><button class="mic" aria-label="Dicter la question">' + ic('mic') + '</button></div>';
  }
  var abar = tb('Conseil agricole', 'Fiches INRAB et ATDA', { back: false, acts: H.ib('history', 'Mes questions') });
  add('assistant', {
    t: 'Conversation écrite', i: 'La réponse vient d\'une fiche publiée, qu\'on voit et qu\'on peut ouvrir ; elle se lit à voix haute.',
    nav: 'conseil',
    html: abar + langbar('Français') + '<div class="chat"><span class="daysep">Aujourd\'hui</span>' +
      '<div class="msg me">Quand semer le maïs à Banikoara ?</div>' +
      '<div class="msg bot">Au début de la saison des pluies, quand le sol est humide sur 10 cm. Votre agent ATDA vous donne la date pour votre commune.' +
      '<div class="cite">' + ic('doc') + 'Fiche INRAB · maïs<span>version 3</span></div>' +
      '<div class="disc">' + ic('info') + 'Conseil indicatif, vérifiez avec votre agent ATDA</div>' +
      '<button class="lst">' + ic('speaker') + 'Écouter la réponse</button></div></div>' + composer()
  });
  add('assistant-vocal', {
    t: 'Question vocale en fon', i: 'On parle, on s\'arrête, ça part ; la réponse revient en voix, avec la mention de validation de la traduction.',
    nav: 'conseil',
    html: abar + langbar('Fon') + '<div class="chat">' +
      '<div class="msg me" style="display:flex;align-items:center;gap:10px"><span class="vplay">' + ic('play') + '</span>' + H.wave(16, 2.3) + '<small class="num" style="font-size:13px">0:07</small></div>' +
      '<span class="msg-cap">Question vocale · fon</span>' +
      '<div class="msg bot"><div class="row-x" style="gap:10px"><span class="vplay">' + ic('play') + '</span><span style="color:var(--maize)">' + H.wave(18, 1.3) + '</span><small class="num" style="font-size:13px;color:var(--ink2)">0:12</small></div>' +
      '<p class="tiny" style="margin-top:8px;color:var(--ink)"><b style="color:var(--leaf)">Réponse vocale en fon</b> · traduction en cours de validation</p></div></div>' +
      '<div class="composer" style="padding-top:12px;flex-direction:column;gap:10px"><div class="row-x" style="color:var(--lat);font-weight:700;gap:10px"><span style="width:10px;height:10px;border-radius:50%;background:var(--lat)"></span>Parlez maintenant…<span class="num" style="margin-left:auto">0:05</span></div>' +
      '<div class="row-x" style="width:100%;justify-content:space-between"><button class="btn ghost sm">' + ic('x') + 'Annuler</button><button class="mic rec" style="width:64px;height:64px" aria-label="Arrêter et envoyer">' + ic('stop') + '</button><button class="btn ghost sm">Envoyer' + ic('send') + '</button></div></div>'
  });
  function lrow(name, sub, on, ok) { return '<div class="row" style="padding-left:4px;padding-right:0"><span class="radio' + (on ? ' on' : '') + '"></span><div class="tx"><b>' + name + '</b><span>' + sub + '</span></div>' + (ok ? '' : chip('À valider', 'sun')) + '<button class="ib" style="color:var(--leaf)" aria-label="Écouter ' + name + '">' + ic('speaker') + '</button></div>'; }
  add('assistant-langue', {
    t: 'Changer de langue', i: 'Une feuille basse au-dessus de la conversation ; les langues nationales sont proposées, marquées « à valider ».',
    nav: 'conseil',
    html: abar + langbar('Français') + '<div class="chat"><div class="msg me">Quand semer le maïs à Banikoara ?</div></div>' + composer() +
      '<div class="scrim"></div><div class="sheet"><span class="grab"></span><h2>Langue de la conversation</h2>' +
      '<div class="col" style="gap:0">' + lrow('Français', 'Texte et voix', false, true) + lrow('Fon', 'Voix · traduction en cours de validation', true) + lrow('Bariba', 'Voix · traduction en cours de validation') + lrow('Yoruba', 'Voix · traduction en cours de validation') + lrow('Dendi', 'Voix · traduction en cours de validation') + '</div>' +
      '<p class="tiny">Les réponses en langues nationales sont relues avant validation (corpus du MTDI).</p>' + btn('Parler en fon', 'check') + '<div class="gest"><i></i></div></div>'
  });
  add('assistant-agent', {
    t: 'Dosage : renvoi vers l\'agent', i: 'Sur un dosage ou un produit de traitement, l\'assistant ne répond pas : il transmet à l\'agent ATDA et le dit.',
    nav: 'conseil',
    html: abar + langbar('Français') + '<div class="chat">' +
      '<div class="msg me">Combien d\'engrais NPK par hectare pour mon maïs ?</div>' +
      '<div class="msg bot">La dose dépend de votre sol. Je ne donne pas de dosage : <b>votre question est transmise à votre agent ATDA.</b>' +
      '<div class="cite" style="color:var(--ink)">' + ic('usercheck') + 'Agent ATDA · Banikoara<span>réponse sous 48 h</span></div>' +
      '<button class="lst">' + ic('phone') + 'Appeler mon agent</button></div>' +
      '<span class="daysep">Hier, 16:20</span>' +
      '<div class="msg agent"><b style="display:block;font-size:13.5px">Votre agent ATDA</b>Passez mardi au marché avec votre carnet : je vous explique les doses pour votre sol.</div></div>' + composer()
  });
  add('assistant-historique', {
    t: 'Mes questions', i: 'L\'historique, cherchable, avec la source de chaque réponse et les questions encore chez l\'agent.',
    nav: 'conseil',
    html: tb('Mes questions', '12 questions') +
      '<div class="scroll" style="gap:12px">' + inp(ic('search') + '<span class="ph">Chercher une question</span>') +
      '<div class="list">' +
      row(ico('chat'), 'Quand semer le maïs ?', 'Aujourd\'hui · fiche INRAB maïs') +
      row(ico('usercheck', 'sun'), 'Combien de NPK par hectare ?', 'Hier · réponse de l\'agent') +
      row(ico('mic'), 'Question vocale (fon)', 'Hier · réponse vocale, 0:12') +
      row(ico('chat'), 'Chenilles dans le cornet', '12 sept. · fiche ATDA ravageurs') +
      row(ico('chat'), 'Stocker le maïs sans charançons', '3 sept. · fiche INRAB stockage') +
      '</div></div>'
  });

  /* ================= 7. Diagnostic photo ================= */
  group('diagnostic', 'Diagnostic photo', 'Photographier une feuille bien cadrée, attendre une analyse courte, lire la maladie probable avec son niveau de risque et quoi faire ; en cas de doute, un agronome regarde.');

  var camBar = '<header class="tb" style="color:#fff"><button class="ib glass" aria-label="Fermer">' + ic('x') + '</button><div class="t" style="text-shadow:0 1px 6px rgba(0,0,0,.6)"><h1>Photo d\'une feuille</h1><p style="color:rgba(255,255,255,.85)">Maïs · Champ de Founougo</p></div><button class="ib glass" aria-label="Flash">' + ic('zap') + '</button><button class="ib listen on-dark" style="background:rgba(0,0,0,.34)" aria-label="Écouter">' + ic('speaker') + '</button></header>';
  add('viseur', {
    t: 'Viseur', i: 'L\'appareil photo plein écran, un cadre et une consigne qui change selon ce que voit l\'appareil.',
    tone: 'black', sbOver: true, gestOver: true, gestDark: true,
    html: '<div class="finder"></div><div style="height:28px"></div>' + camBar +
      '<div class="frame-box"><i></i><i></i><i></i><i></i></div>' +
      '<span class="cam-tip" style="top:480px">' + ic('target') + 'Approchez : la feuille doit remplir le cadre</span>' +
      '<div class="shutter-row"><span class="side"><span class="thumb"></span>Galerie</span><button class="shutter" aria-label="Prendre la photo"></button><span class="side"><button class="ib glass" aria-label="Conseils">' + ic('help') + '</button>Conseils</span></div>'
  });
  function tip(n, t, s) { return '<li style="align-items:flex-start"><span class="ico" style="width:40px;height:40px">' + ic(n) + '</span><span><b style="display:block">' + t + '</b><span class="tiny">' + s + '</span></span></li>'; }
  add('diag-conseils', {
    t: 'Conseils de cadrage', i: 'Quatre gestes simples pour une photo utile, en feuille basse sur le viseur, à écouter.',
    tone: 'black', sbOver: true,
    html: '<div class="finder"></div><div style="height:28px"></div>' + camBar +
      '<div class="scrim" style="background:rgba(6,22,12,.35)"></div><div class="sheet"><span class="grab"></span><div class="row-x"><h2 class="grow">Pour une bonne photo</h2>' + H.listen() + '</div>' +
      '<ul class="recs" style="gap:12px">' + tip('sun', 'À la lumière du jour', 'Pas de flash, pas de contre-jour.') + tip('target', 'La partie abîmée remplit le cadre', 'Approchez-vous à une main de la feuille.') +
      tip('hand', 'Tenez le téléphone immobile', 'Attendez que l\'image soit nette.') + tip('camera', 'Faites aussi le dessous', 'Les œufs et chenilles s\'y cachent.') + '</ul>' +
      btn('J\'ai compris', 'check') + '<div class="gest"><i></i></div></div>'
  });
  add('diag-analyse', {
    t: 'Analyse en cours', i: 'Le temps d\'attente montre ce qui se passe, étape par étape ; sans réseau, la photo attend dans la file d\'envoi.',
    tone: 'black', sbOver: true, gestOver: true, gestDark: true,
    html: '<div class="finder"></div><div style="height:28px"></div>' + camBar +
      '<div class="frame-box ok"><i></i><i></i><i></i><i></i></div><i class="spot" style="left:150px;top:260px"></i><i class="spot" style="left:220px;top:330px"></i><i class="spot" style="left:120px;top:370px"></i>' +
      '<div class="sheet" style="padding-top:16px"><div class="row-x" style="gap:12px"><span class="spin dk"></span><h2 class="grow">Analyse de la feuille…</h2>' + H.sim('Analyse simulée') + '</div>' +
      '<ul class="tl" style="margin-top:4px">' +
      '<li class="done"><span class="p">' + ic('check') + '</span><div><b>Photo nette</b></div></li>' +
      '<li class="cur"><span class="p"></span><div><b>Recherche des signes</b><span>Trous, taches, sciure</span></div></li>' +
      '<li class="todo"><span class="p"></span><div><b>Comparaison avec les fiches</b></div></li></ul><div class="gest"><i></i></div></div>'
  });
  add('diag-resultat', {
    t: 'Résultat du diagnostic', i: 'Maladie probable, niveau de risque en barres et en mots, trois gestes concrets ; jamais de dosage.',
    html: tb('Résultat', 'Photo du 19 sept. · 08:14') +
      '<div class="scroll" style="gap:12px"><div class="photo img-mais-leaf" style="height:120px;position:relative"><span style="position:absolute;left:10px;bottom:10px">' + H.sim('Analyse simulée') + '</span></div>' +
      '<div><h2 style="font-size:21px;font-weight:800;line-height:1.2">Chenille légionnaire d\'automne probable</h2><p class="tiny" style="font-style:italic">Spodoptera frugiperda · trous et sciure sur les feuilles</p></div>' +
      '<div class="row-x" style="gap:12px"><span class="small" style="font-weight:700">Risque</span><span class="meter"><i class="on"></i><i class="on"></i><i class="on"></i></span>' + chip('Élevé', 'lat') + '</div>' +
      '<ol class="recs card" style="padding:14px">' +
      '<li><span class="n">1</span>Inspectez 20 plants par endroit, chaque semaine.</li>' +
      '<li><span class="n">2</span>Écrasez les œufs, retirez les chenilles visibles.</li>' +
      '<li><span class="n">3</span>Traitez seulement sur avis de votre agent ATDA.</li></ol></div>' +
      cta(btn('Écouter les conseils', 'speaker') + btn('Pas sûr ? Demander un agronome', 'usercheck', 'ghost'))
  });
  add('diag-agronome', {
    t: 'Envoyer à un agronome', i: 'La photo part avec un mot (écrit ou dicté) et la parcelle ; le délai de réponse est annoncé.',
    html: tb('Demander un agronome', 'Maïs · Champ de Founougo') +
      '<div class="scroll" style="gap:14px"><div class="fld"><label>Photos</label><div class="row-x" style="gap:10px"><span class="photo img-mais-leaf" style="width:88px;height:88px"></span><span class="photo img-mais" style="width:88px;height:88px"></span>' +
      '<button style="width:88px;height:88px;border-radius:14px;box-shadow:inset 0 0 0 2px var(--field-line);display:grid;place-items:center;color:var(--leaf)" aria-label="Ajouter une photo">' + ic('plus') + '</button></div></div>' +
      fld('Ce que vous voyez (facultatif)', '<div class="inp area" style="position:relative"><span>Les feuilles du centre sont trouées depuis 3 jours.</span></div>', {}) +
      '<button class="audio" style="background:#fff;box-shadow:inset 0 0 0 1.5px var(--field-line)"><span class="pb">' + ic('mic') + '</span>Dicter au lieu d\'écrire</button>' +
      H.chk('Joindre la position de la parcelle', true) +
      '<div class="ban info">' + ic('clock') + '<span>Un agronome de l\'ATDA ou de l\'INRAB répond sous 72 h, par message et SMS.</span></div></div>' +
      cta(btn('Envoyer la demande', 'send'))
  });
  function prow(img, t, s, end) { return row('<span class="photo ' + img + '" style="width:56px;height:56px;border-radius:12px"></span>', t, s, end); }
  add('diag-historique', {
    t: 'Mes photos', i: 'Chaque diagnostic avec sa photo, sa date et où en est la réponse de l\'agronome.',
    nav: 'photo',
    html: tb('Mes photos', '4 diagnostics', { back: false }) +
      '<div class="scroll" style="gap:12px"><div class="list">' +
      prow('img-mais-leaf', 'Chenille légionnaire probable', '19 sept. · Maïs · risque élevé', chip('Chez l\'agronome', 'sun')) +
      prow('img-mais', 'Feuille saine', '2 sept. · Maïs', chip('Rien à faire', 'ok')) +
      prow('img-coton', 'Taches sur le coton', '28 août · Coton', chip('Réponse reçue', 'ok')) +
      prow('img-riz2', 'Feuilles jaunes', '20 août · Riz · en attente', chip('À envoyer', '', 'clock')) +
      '</div></div>' + cta(btn('Prendre une photo', 'camera'))
  });

  /* ================= 8. Météo et prix ================= */
  group('meteo-prix', 'Météo et prix', 'Le temps sur sept jours avec la pluie en millimètres, l\'alerte expliquée et ce qu\'il faut faire ; les prix par marché et par filière, toujours datés et étiquetés.');

  function d7(d, n, hi, lo, mm, al) { return '<div class="d7' + (al ? ' al' : '') + '"><b>' + d + '</b>' + ic(n) + '<span class="rain"><i style="width:' + Math.min(100, Math.round(mm / 50 * 100)) + '%"></i></span><span class="mm">' + mm + ' mm</span><span class="tp">' + hi + '° <span>' + lo + '°</span></span></div>'; }
  add('meteo', {
    t: 'Météo sur 7 jours', i: 'Le temps du jour en grand, puis la semaine : la pluie compte plus que la température, elle a sa barre.',
    nav: 'accueil', sbDark: true, sbBg: 'var(--leaf)',
    html: '<div class="hero leaf" style="padding-bottom:16px"><div class="hello"><div class="grow"><h1>Météo</h1><p>' + ic('pin') + 'Banikoara · prévisions locales</p></div>' + H.listen('on-dark') + '</div>' +
      '<div class="row-x" style="gap:14px;margin-top:10px"><span class="deg num" style="font-size:52px;font-weight:800;letter-spacing:-.04em;line-height:1">31°</span><span class="t small" style="color:#E3EEDB"><b style="color:#fff;display:block;font-size:16px">Ensoleillé</b>Ressenti 34° · humidité 58 %</span><span style="margin-left:auto;color:var(--sun)">' + ic('sun', 'big') + '</span></div></div>' +
      '<div class="scroll" style="padding-top:12px;gap:10px"><div class="card" style="padding:4px 16px"><div class="days7">' +
      d7('Auj.', 'sun', 33, 22, 0) + d7('Lun.', 'cloudsun', 32, 22, 2) + d7('Mar.', 'cloud', 30, 21, 6) + d7('Mer.', 'rain', 28, 21, 14) + d7('Jeu.', 'storm', 26, 20, 42, 1) + d7('Ven.', 'rain', 27, 20, 18) + d7('Sam.', 'cloudsun', 30, 21, 3) +
      '</div></div><p class="tiny row-x" style="justify-content:space-between">Source : Météo-Bénin · mis à jour 07:00' + H.sim() + '</p></div>'
  });
  add('meteo-alerte', {
    t: 'Alerte climatique', i: 'Une alerte = un risque, quand, où, et trois gestes ; elle s\'écoute et part aussi par SMS.',
    html: tb('Alerte pluie', 'ATDA Alibori · 07:30') +
      '<div class="scroll" style="gap:12px"><div class="card" style="background:var(--lat-bg);box-shadow:none"><div class="row-x" style="gap:14px"><span class="ico lg" style="background:var(--lat);color:#fff">' + ic('storm') + '</span><div><b style="display:block;font-size:20px;line-height:1.2;color:#5A2410">Fortes pluies jeudi</b><span class="small" style="color:var(--lat-ink)">40 à 60 mm à Banikoara, l\'après-midi</span></div></div>' +
      '<div class="row-x" style="margin-top:12px;gap:8px">' + chip('Avertissement', 'lat', 'alert') + chip('Jeudi 24 sept.', '') + '</div></div>' +
      H.audio('Écouter l\'alerte', '0:24') + H.sec('Que faire', '') +
      '<ol class="recs card" style="padding:14px"><li><span class="n">1</span>Reportez l\'épandage d\'engrais après la pluie.</li><li><span class="n">2</span>Dégagez les rigoles autour du champ.</li><li><span class="n">3</span>Mettez récoltes et sacs d\'engrais à l\'abri.</li></ol>' +
      '<p class="tiny row-x">' + ic('sms') + 'Aussi envoyée par SMS aux producteurs de Banikoara.</p></div>' + cta(btn('J\'ai compris', 'check'))
  });
  function pr(m, d, pts, p, ch, dn) { return '<div class="prow"><span class="mk"><b>' + m + '</b><span>' + d + '</span></span>' + H.spark(pts, dn) + '<span class="pr num">' + p + ' F<small class="' + (dn ? 'dn' : 'up') + '">' + ch + '</small></span></div>'; }
  add('prix', {
    t: 'Prix par marché et filière', i: 'Le prix au kilo de la filière choisie dans les marchés proches, avec la tendance de la semaine.',
    nav: 'marche',
    html: tb('Prix du marché', 'Relevés du 14 au 18 sept.', { back: true }) +
      '<div class="scroll" style="gap:12px"><div class="picks scrollx">' + vc('Maïs', 1) + '<span class="pick">Soja</span><span class="pick">Riz</span><span class="pick">Coton</span><span class="pick">Niébé</span></div>' +
      '<div class="row-x" style="justify-content:space-between"><b>Maïs grain · prix au kilo</b>' + H.demo() + '</div>' +
      '<div class="list">' + pr('Banikoara', 'Alibori · 4 km', [16, 15, 16, 14, 14, 13, 13], 255, '+1 %') + pr('Kandi', 'Alibori · 62 km', [18, 16, 17, 15, 14, 12, 12], 270, '+3 %') +
      pr('Malanville', 'Alibori', [8, 9, 7, 11, 12, 13, 15], 260, '−2 %', 1) + pr('Parakou', 'Borgou', [18, 16, 17, 13, 11, 7, 6], 285, '+4 %') + pr('Bohicon', 'Zou', [19, 17, 14, 15, 10, 8, 5], 310, '+6 %') + '</div>' +
      '<p class="tiny">Prix relevés par les agents ATDA et SONAMA · non officiels</p></div>'
  });
})();
