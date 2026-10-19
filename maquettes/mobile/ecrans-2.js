/* Agri-Digit Bénin · écrans, parcours 9 à 16 (marché → états). */
(function () {
  'use strict';
  var H = M.H, ic = H.ic, add = M.add, group = M.group;
  var tb = H.tb, btn = H.btn, row = H.row, ico = H.ico, chip = H.chip, fld = H.fld, inp = H.inp, cta = H.cta;
  function photo(img, s) { return '<span class="photo ' + img + '" style="width:' + s + 'px;height:' + s + 'px"></span>'; }
  function pick(t, on) { return '<span class="pick' + (on ? ' on' : '') + '">' + (on ? ic('check') : '') + t + '</span>'; }
  function stepper(v) { return '<div class="inp" style="padding:0 4px;justify-content:space-between"><button class="ib" aria-label="Moins">' + ic('minus') + '</button><span class="num" style="font-size:22px;font-weight:800">' + v + '</span><button class="ib" aria-label="Plus">' + ic('plus') + '</button></div>'; }
  var FAKEPAY = '<div class="ban sun" style="align-items:center">' + ic('info') + '<span>Simulation FakePay : aucun argent réel n\'est échangé.</span></div>';

  /* ================= 9. Marché ================= */
  group('marche', 'Marché et paiement', 'Publier sa récolte avec une photo, voir qui est intéressé, se mettre d\'accord sur le prix, être payé par Mobile Money en un clic et garder le reçu. Tout paiement est une simulation.');

  add('mes-offres', {
    t: 'Mes offres', i: 'Les offres du producteur avec leur état et le nombre d\'acheteurs intéressés ; publier est l\'action principale.',
    nav: 'marche', dot: 'marche',
    html: tb('Marché', 'Mes offres', { back: false, acts: H.ib('trend', 'Prix du marché') }) +
      '<div class="scroll" style="gap:12px"><div class="picks">' + pick('Mes offres', 1) + '<span class="pick">Demandes</span><span class="pick">Mes ventes</span></div>' +
      '<div class="list">' +
      row(photo('img-mais', 56), 'Maïs grain sec · 1,2 t', '290 F le kg · Founougo', chip('3 intéressés', 'ok')) +
      row(photo('img-riz2', 56), 'Riz paddy · 400 kg', '230 F le kg · Kokey', chip('Ouverte', '')) +
      row(photo('img-coton', 56), 'Coton graine · 2 t', 'Vendue le 3 sept.', chip('Conclue', 'dk')) + '</div>' + FAKEPAY + '</div>' +
      cta(btn('Publier une offre', 'plus'))
  });
  add('offre-nouvelle', {
    t: 'Publier une offre', i: 'Photo, produit, quantité, prix et lieu ; le prix du jour est rappelé pour aider à fixer le sien.',
    html: tb('Publier une offre', null) +
      '<div class="scroll" style="gap:12px"><div class="row-x" style="gap:10px">' + photo('img-mais', 80) +
      '<button style="width:80px;height:80px;border-radius:14px;box-shadow:inset 0 0 0 2px var(--field-line);display:grid;place-items:center;color:var(--leaf)" aria-label="Ajouter une photo">' + ic('camera') + '</button><span class="tiny grow">Une photo du sac ou du tas aide l\'acheteur à décider.</span></div>' +
      fld('Produit', '<div class="picks scrollx">' + pick('Maïs', 1) + '<span class="pick">Soja</span><span class="pick">Riz</span><span class="pick">Coton</span></div>') +
      fld('Quantité', stepper('1 200 kg')) +
      fld('Votre prix', inp('<span class="num grow">290</span><span class="muted" style="font-weight:600">F le kg</span>', 'focus'), { hint: 'Aujourd\'hui : Banikoara 255 F · Parakou 285 F (démonstration)' }) +
      fld('Lieu de retrait', inp('Founougo, Banikoara', 'sel')) + '</div>' +
      cta(btn('Publier l\'offre', 'check'))
  });
  function buyer(av, who, what, d) {
    return '<div class="card" style="padding:14px"><div class="row-x" style="gap:12px"><span class="ava sun">' + av + '</span><div class="grow"><b style="display:block">' + who + '</b><span class="small muted">' + what + '</span></div><span class="tiny">' + d + '</span></div>' +
      '<div class="btns" style="margin-top:12px">' + btn('Refuser', '', 'ghost sm') + btn('Discuter', 'chat', 'sm') + '</div></div>';
  }
  add('acheteurs', {
    t: 'Acheteurs intéressés', i: 'Chaque demande dit qui, combien et à quel prix ; le numéro n\'est partagé qu\'après accord.',
    nav: 'marche',
    html: tb('Acheteurs intéressés', 'Maïs grain sec · 1,2 t') +
      '<div class="scroll" style="gap:10px">' + buyer('TP', 'Transformateur · Parakou', 'Veut 1 t à 270 F le kg', '08:02') +
      buyer('UC', 'Union de coopératives · Kandi', 'Veut 1,2 t à 280 F le kg', 'Hier') +
      buyer('DB', 'Distributeur · Bohicon', 'Veut 500 kg à 290 F le kg', 'Hier') +
      '<p class="tiny row-x">' + ic('lock') + 'Les numéros s\'affichent seulement après votre accord.</p></div>'
  });
  function offer(who, price, qty, mine, state) {
    return '<div class="msg ' + (mine ? 'me' : 'bot') + '" style="min-width:210px"><span class="tiny" style="color:inherit;opacity:.85;font-weight:700">' + who + '</span>' +
      '<b class="num" style="display:block;font-size:22px;line-height:1.2">' + price + ' F le kg</b><span style="font-size:14px">' + qty + '</span>' + (state ? '<div style="margin-top:6px">' + state + '</div>' : '') + '</div>';
  }
  add('negociation', {
    t: 'Négociation', i: 'Des propositions de prix plutôt qu\'une conversation libre ; l\'accord final se confirme en un bouton.',
    nav: 'marche',
    html: tb('Transformateur · Parakou', 'Maïs grain sec · 1 t', { acts: H.ib('phone', 'Appeler') }) +
      '<div class="chat">' + offer('Sa proposition', 270, '1 000 kg · retrait à Founougo') +
      offer('Ma proposition', 290, '1 000 kg', true) +
      '<div class="msg bot">Je peux monter à 285 F si je retire samedi.</div>' +
      '<div class="card" style="align-self:stretch;padding:14px;box-shadow:inset 0 0 0 2px var(--leaf)"><div class="row-x" style="justify-content:space-between"><b>Accord proposé</b>' + H.sim() + '</div>' +
      '<p class="num" style="font-size:15px;margin-top:4px">1 000 kg × 285 F = <b style="font-size:19px">285 000 F</b></p>' +
      '<div class="btns" style="margin-top:10px">' + btn('Contre-proposer', '', 'sec sm') + btn('Accepter', 'check', 'sm') + '</div></div></div>' +
      '<div class="composer"><div class="field">Écrivez un message</div><button class="mic" aria-label="Dicter">' + ic('mic') + '</button></div>'
  });
  add('paiement', {
    t: 'Paiement Mobile Money en un clic', i: 'Le montant en très grand, le détail, le compte qui reçoit ; un seul bouton, et la mention de simulation.',
    html: tb('Être payé', 'Accord du 20 sept.', { back: 'x' }) +
      '<div class="scroll" style="gap:12px"><div class="center" style="padding:6px 0 2px"><span class="tiny">Vous allez recevoir</span><div class="amount">285 000<small>F CFA</small></div></div>' +
      '<div class="card" style="padding:4px 16px">' + H.kv([['Acheteur', 'Transformateur · Parakou'], ['Quantité', '1 000 kg'], ['Prix', '285 F le kg'], ['Frais', '0 F']]) + '</div>' +
      '<div class="fld"><label>Sur le compte</label><div class="list">' +
      row(ico('wallet', 'dk'), 'MTN Mobile Money', '+229 01 97 •• •• 56', '<span class="radio on"></span>') +
      row(ico('wallet'), 'Moov Money', 'Ajouter ce compte', '<span class="radio"></span>') + '</div></div>' + FAKEPAY + '</div>' +
      cta(btn('Recevoir 285 000 F', 'wallet') + '<p class="tiny">L\'acheteur valide de son côté. Aucun code à donner.</p>')
  });
  add('recu', {
    t: 'Reçu de paiement', i: 'La preuve : montant, référence, date, parties ; à partager ou garder, et lisible à voix haute.',
    html: tb('Reçu', null, { back: 'x' }) +
      '<div class="scroll" style="gap:14px;padding-top:8px"><span class="okmark">' + ic('check') + '</span>' +
      '<div class="center"><div class="amount">285 000<small>F</small></div><p class="small" style="margin-top:6px">reçus sur MTN Mobile Money</p><div style="margin-top:8px">' + H.sim('Paiement simulé') + '</div></div>' +
      '<div class="card" style="padding:4px 16px">' + H.kv([['Référence', 'SIM-0427'], ['Date', '20 sept. 2026, 10:14'], ['De', 'Transformateur · Parakou'], ['Pour', 'Maïs grain sec, 1 000 kg'], ['Vers', '+229 01 97 •• •• 56']]) + '</div></div>' +
      cta('<div class="btns">' + btn('Écouter', 'speaker', 'sec') + btn('Partager', 'share') + '</div>')
  });

  /* ================= 10. Appuis ================= */
  group('appuis', 'Appuis et programmes', 'Voir les appuis attribués et confirmer leur réception, trouver les programmes ouverts, candidater, lire une décision motivée et la contester.');

  add('appuis', {
    t: 'Mes appuis', i: 'Ce qui a été remis, ce qui reste à confirmer, ce qui est prévu ; la confirmation se fait d\'un bouton.',
    nav: 'accueil',
    html: tb('Mes appuis', '3 appuis cette saison') +
      '<div class="scroll" style="gap:12px"><div class="picks">' + pick('Reçus', 1) + '<span class="pick">Programmes</span><span class="pick">Candidatures</span></div>' +
      '<div class="card" style="padding:14px;box-shadow:inset 0 0 0 2px var(--sun),var(--shadow-card)"><div class="row-x" style="gap:12px">' + ico('gift', 'sun') + '<div class="grow"><b style="display:block">Engrais NPK · 4 sacs</b><span class="tiny">Remis le 18 sept. par l\'agent ATDA</span></div></div>' +
      '<div style="margin-top:12px">' + btn('Confirmer la réception', 'check', 'sm" style="width:100%') + '</div></div>' +
      '<div class="list">' + row(ico('sprout'), 'Semences de maïs · 25 kg', 'Kits semences 2026 · confirmé le 3 août', chip('Confirmé', 'ok')) +
      row(ico('gift'), 'Urée · 2 sacs', 'Prévu fin septembre', chip('Prévu', '')) + '</div>' +
      '<p class="tiny row-x" style="justify-content:space-between">Valeur totale : 61 000 F CFA, dont 46 000 F à rembourser' + '</p>' + H.demo() + '</div>'
  });
  add('appui-confirmer', {
    t: 'Confirmer la réception', i: 'Trois réponses en gros boutons, dont « il manque quelque chose » ; la question s\'écoute.',
    nav: 'accueil',
    html: tb('Mes appuis', '3 appuis cette saison') + '<div class="scroll"></div>' +
      '<div class="scrim"></div><div class="sheet"><span class="grab"></span><div class="row-x" style="gap:12px">' + ico('gift', 'sun lg') + '<h2 class="grow">Avez-vous reçu 4 sacs d\'engrais NPK ?</h2></div>' +
      H.audio('Écouter la question', '0:06') +
      btn('Oui, j\'ai tout reçu', 'check') + btn('Il en manque', 'minus', 'sec') + btn('Non, rien reçu', 'x', 'ghost') +
      '<p class="tiny">Votre réponse est envoyée à l\'agent et au programme.</p><div class="gest"><i></i></div></div>'
  });
  function prog(t, s, st, open) {
    return '<div class="card" style="padding:14px"><div class="row-x" style="gap:12px;align-items:flex-start">' + ico('gift') + '<div class="grow"><b style="display:block;font-size:16px;line-height:1.3">' + t + '</b><span class="tiny">' + s + '</span></div>' + st + '</div>' +
      (open ? '<div class="btns" style="margin-top:12px">' + btn('Conditions', 'doc', 'ghost sm') + btn('Candidater', 'chev', 'sm') + '</div>' : '') + '</div>';
  }
  add('programmes', {
    t: 'Programmes ouverts', i: 'Les programmes accessibles au producteur, leur date limite et leurs filières ; un programme clos le dit.',
    nav: 'accueil',
    html: tb('Programmes d\'appui', 'Pour Banikoara') +
      '<div class="scroll" style="gap:10px">' + prog('Kits semences maïs 2026', 'Jusqu\'au 30 sept. · maïs · Alibori', chip('Ouvert', 'ok'), 1) +
      prog('Crédit intrants avec le FNDA', 'Jusqu\'au 15 oct. · toutes filières', chip('Ouvert', 'ok'), 1) +
      prog('Motopompes pour le maraîchage', 'Clos depuis le 31 août', chip('Clos', '')) + '</div>'
  });
  function cond(t) { return '<li style="align-items:center"><span style="color:var(--ok-ink)">' + ic('check') + '</span>' + t + '</li>'; }
  add('candidature', {
    t: 'Candidater', i: 'Les conditions déjà vérifiées s\'affichent cochées ; il ne reste qu\'à confirmer.',
    html: tb('Candidater', 'Kits semences maïs 2026') +
      '<div class="scroll" style="gap:12px"><div class="card"><b>Vous remplissez les conditions</b><ul class="recs" style="margin-top:10px">' + cond('Fiche producteur validée') + cond('Vous cultivez le maïs') + cond('Moins de 5 ha de maïs') + '</ul></div>' +
      fld('Parcelle concernée', inp('Champ de Founougo · 2,4 ha', 'sel')) +
      H.chk('Je confirme que ces informations sont exactes.', true) +
      '<div class="ban info">' + ic('usercheck') + '<span>La décision est prise par une personne et toujours motivée. Vous serez prévenu par SMS.</span></div></div>' +
      cta(btn('Déposer ma candidature', 'send'))
  });
  add('decision', {
    t: 'Décision motivée', i: 'Un refus dit pourquoi, qui a décidé et quand ; le droit de contester est proposé tout de suite.',
    html: tb('Ma candidature', 'Kits semences maïs 2026') +
      '<div class="scroll" style="gap:12px;padding-top:6px"><span class="okmark lat" style="width:72px;height:72px">' + ic('x') + '</span><h1 class="big-t center" style="font-size:23px">Candidature non retenue</h1>' +
      '<div class="card"><span class="tiny">Motif</span><p style="font-size:16.5px;font-weight:600;margin-top:2px">Le nombre de kits pour Banikoara est atteint (120 bénéficiaires).</p><p class="tiny" style="margin-top:8px">Décision de l\'agent ATDA de Banikoara · 22 sept.</p></div>' +
      H.audio('Écouter la décision', '0:14') +
      '<div class="ban info">' + ic('flag') + '<span>Vous pouvez contester cette décision pendant 30 jours (loi n° 2017-20, art. 401).</span></div></div>' +
      cta(btn('Contester la décision', 'flag', 'sec') + '<button class="btn ghost">Voir d\'autres programmes</button>')
  });
  add('contestation', {
    t: 'Contester une décision', i: 'Dire en une phrase, ou à la voix, pourquoi la décision semble injuste ; un agent répond avec un motif.',
    html: tb('Contester', 'Kits semences maïs 2026') +
      '<div class="scroll" style="gap:14px">' + fld('Identifiant de la ferme', inp('<span class="num">F-BAN-08812</span>', 'ok'), { hint: 'Il figure dans le message de l\'agent.' }) +
      fld('Pourquoi contestez-vous ?', '<div class="inp area focus">Je me suis inscrit avant la date limite, le 12 septembre.</div>') +
      '<button class="audio" style="background:#fff;box-shadow:inset 0 0 0 1.5px var(--field-line)"><span class="pb">' + ic('mic') + '</span>Dicter au lieu d\'écrire</button>' +
      '<div class="ban info">' + ic('usercheck') + '<span>Un agent examine votre demande et vous répond avec un motif.</span></div></div>' +
      cta(btn('Déposer la contestation', 'send'))
  });

  /* ================= 11. Coopératives ================= */
  group('coops', 'Coopératives', 'Retrouver sa coopérative, en rejoindre une autre en sachant ce qui est partagé, et ajouter sa part à une offre groupée pour vendre mieux.');

  add('coops', {
    t: 'Mes coopératives', i: 'La coopérative du producteur, son gestionnaire et la prochaine réunion ; les autres coopératives proches en dessous.',
    nav: 'accueil',
    html: tb('Mes coopératives', null) +
      '<div class="scroll" style="gap:12px"><div class="card"><div class="row-x" style="gap:12px">' + ico('users', 'dk lg') + '<div class="grow"><b style="display:block;font-size:17px;line-height:1.25">Union des producteurs de maïs de Founougo</b><span class="tiny">86 membres · membre depuis 2024</span></div></div>' +
      '<div style="margin-top:8px">' + H.kv([['Gestionnaire', 'Mariam BIO'], ['Prochaine réunion', 'Mardi 29 sept., 9 h']]) + '</div>' +
      '<div class="btns" style="margin-top:8px">' + btn('Appeler', 'phone', 'sec sm') + btn('Offre groupée', 'bag', 'sm') + '</div></div>' +
      '<div class="h-sec"><h2>Près de chez vous</h2></div><div class="list">' +
      row(ico('users'), 'Coopérative soja de Kokey', '41 membres · 6 km', btn('Adhérer', '', 'sec sm')) +
      row(ico('users'), 'Femmes maraîchères de Banikoara', '58 membres · 9 km', btn('Adhérer', '', 'sec sm')) + '</div>' +
      '<p class="tiny">Coopératives et membres : données de démonstration.</p></div>'
  });
  add('coop-adhesion', {
    t: 'Adhérer à une coopérative', i: 'Ce qu\'apporte la coopérative, ce qu\'elle coûte et ce qu\'elle verra de la fiche, avant d\'envoyer la demande.',
    nav: 'accueil',
    html: tb('Adhérer', 'Coopérative soja de Kokey') +
      '<div class="scroll" style="gap:12px"><div class="card" style="padding:4px 16px">' + H.kv([['Membres', '41'], ['Filières', 'Soja, maïs'], ['Cotisation', '5 000 F par an'], ['Gestionnaire', 'Séidou KORA']]) + '</div>' +
      '<div class="card"><b>La coopérative verra</b><ul class="recs" style="margin-top:10px"><li style="align-items:center"><span style="color:var(--leaf)">' + ic('user') + '</span>Votre nom et votre téléphone</li><li style="align-items:center"><span style="color:var(--leaf)">' + ic('map') + '</span>Vos surfaces et vos cultures</li><li style="align-items:center"><span style="color:var(--leaf)">' + ic('lock') + '</span>Pas vos appuis ni vos paiements</li></ul></div>' +
      H.chk('J\'accepte de partager ces informations avec la coopérative.', true) + '</div>' +
      cta(btn('Demander l\'adhésion', 'send') + '<p class="tiny">Le gestionnaire valide votre demande.</p>')
  });
  add('offre-groupee', {
    t: 'Offre groupée', i: 'La coopérative réunit les récoltes pour un acheteur ; on voit où en est le volume et on ajoute sa part.',
    nav: 'marche',
    html: tb('Offre groupée', 'Union de Founougo') +
      '<div class="scroll" style="gap:12px"><div class="card"><div class="row-x" style="justify-content:space-between"><b style="font-size:17px">Maïs grain sec</b>' + H.demo() + '</div>' +
      '<p class="num" style="margin-top:8px;font-size:15px"><b style="font-size:24px">24 t</b> réunies sur 30 t</p>' +
      '<div style="height:12px;border-radius:6px;background:var(--light);margin-top:8px;overflow:hidden"><i style="display:block;height:100%;width:80%;background:var(--maize);border-radius:6px"></i></div>' +
      '<div style="margin-top:8px">' + H.kv([['Prix négocié', '295 F le kg'], ['Acheteur', 'Transformateur · Parakou'], ['Livraison', 'Magasin de Founougo, avant le 15 nov.']]) + '</div></div>' +
      fld('Ma part', stepper('1 000 kg'), { hint: 'Vous avez déclaré 1 850 kg, dont 1 000 kg stockés.' }) + '</div>' +
      cta(btn('Ajouter ma part', 'plus'))
  });

  /* ================= 12. Carte producteur ================= */
  group('carte', 'Carte de producteur', 'Une carte numérique avec QR code, utilisable hors ligne, à partager ; la personne qui la scanne voit seulement si elle est valide.');

  function pcard() {
    return '<div class="pcard"><div class="rep"><span class="flag"><i></i><span><i></i><i></i></span></span>République du Bénin · MAEP</div>' +
      '<div class="who"><span class="pic">' + ic('user') + '</span><div><span class="tiny" style="color:var(--on-dark-2)">Carte de producteur</span><h2>Bio GOUNOU</h2><span class="code">BJ-BAN-004127</span></div></div>' +
      '<div class="row-x" style="margin-top:12px;gap:6px;flex-wrap:wrap">' + chip('Maïs', 'ondk') + chip('Coton', 'ondk') + chip('Banikoara', 'ondk') + '</div></div>';
  }
  add('carte', {
    t: 'Ma carte de producteur', i: 'La carte et son QR code lisibles même sans réseau ; le code de vérification sert à qui n\'a pas de scanner.',
    nav: 'accueil',
    html: tb('Ma carte', 'Délivrée le 26 sept. 2026') +
      '<div class="scroll" style="gap:14px">' + pcard() + '<div class="qr">' + H.qr(11) + '</div>' +
      '<p class="center small">Code de vérification <b class="num" style="letter-spacing:.06em">7K4-Q9M</b></p>' +
      '<p class="tiny center row-x" style="justify-content:center">' + ic('wifioff') + 'Disponible sans réseau</p></div>' +
      cta('<div class="btns">' + btn('Imprimer', 'download', 'sec') + btn('Partager', 'share') + '</div>')
  });
  add('carte-partage', {
    t: 'Partager la carte', i: 'Les façons de montrer la carte, la plus simple d\'abord : le QR en plein écran.',
    nav: 'accueil',
    html: tb('Ma carte', 'Délivrée le 26 sept. 2026') + '<div class="scroll">' + pcard() + '</div>' +
      '<div class="scrim"></div><div class="sheet"><span class="grab"></span><h2>Montrer ou envoyer la carte</h2><div class="list" style="box-shadow:none">' +
      row(ico('qr'), 'Afficher le QR code en grand', 'Pour un agent ou un acheteur') +
      row(ico('sms'), 'Envoyer par SMS', 'Le lien de vérification') +
      row(ico('image'), 'Enregistrer en image', 'Dans la galerie du téléphone') +
      row(ico('share'), 'Autre application', '') + '</div>' +
      '<p class="tiny">Seuls le nom, le code et la commune sont partagés.</p><div class="gest"><i></i></div></div>'
  });
  add('carte-verif', {
    t: 'Vérification d\'une carte', i: 'Ce que voit la personne qui scanne : valide ou non, et le strict minimum pour reconnaître le producteur.',
    html: tb('Vérification', 'Carte de producteur', { back: 'x' }) +
      '<div class="scroll" style="gap:14px;padding-top:12px"><span class="okmark">' + ic('check') + '</span><h1 class="big-t center">Carte valide</h1>' +
      '<div class="card" style="padding:4px 16px">' + H.kv([['Nom', 'Bio G.'], ['Code producteur', 'BJ-BAN-004127'], ['Commune', 'Banikoara'], ['Filières', 'Maïs, coton'], ['Fiche validée le', '26 sept. 2026']]) + '</div>' +
      '<p class="tiny row-x">' + ic('shield') + 'Vérifiée à 08:20. Cette consultation est inscrite au journal d\'accès.</p>' + H.demo() + '</div>' +
      cta(btn('Scanner une autre carte', 'qr', 'sec'))
  });

  /* ================= 13. Messages et profil ================= */
  group('profil', 'Messages, profil et réglages', 'Les messages et notifications ; le profil, la langue, les consentements qu\'on peut retirer, les données gardées hors ligne et l\'aide, avec un accès direct à son agent.');

  add('messages', {
    t: 'Mes messages', i: 'Alertes, décisions et réponses au même endroit, les non lus marqués ; chaque message s\'écoute.',
    nav: 'accueil',
    html: tb('Mes messages', '2 non lus') +
      '<div class="scroll" style="gap:12px"><div class="picks">' + pick('Tout', 1) + '<span class="pick">Alertes</span><span class="pick">Décisions</span></div><div class="list">' +
      row(ico('storm', 'lat'), 'Alerte pluie : jeudi', 'Reportez l\'épandage · 07:30', '', 'unread') +
      row(ico('wallet', 'sun'), 'Un acheteur intéressé', 'Maïs grain sec, 1 t · 08:02', '', 'unread') +
      row(ico('usercheck'), 'Fiche validée', 'Votre carte est disponible · 26 sept.', '') +
      row(ico('chat'), 'Réponse de votre agent', 'Doses d\'engrais · 25 sept.', '') +
      row(ico('gift'), 'Appui à confirmer', '4 sacs de NPK · 18 sept.', '') + '</div></div>'
  });
  add('notifications', {
    t: 'Notifications Android', i: 'Ce que le producteur voit sans ouvrir l\'application : l\'alerte avec « Écouter », le paiement, le SMS.',
    tone: 'dark', sbOver: true,
    html: '<div style="position:absolute;inset:0;background:radial-gradient(120% 70% at 30% 0%, #1F5A32 0%, #0A2415 70%)"></div>' +
      '<div class="scroll" style="position:relative;padding-top:56px;gap:10px"><div style="color:#fff;margin-bottom:10px"><div class="num" style="font-size:64px;font-weight:600;letter-spacing:-.03em;line-height:1">08:12</div><div style="font-size:16px;color:var(--on-dark-2)">Dimanche 20 septembre</div></div>' +
      '<div class="notif"><span class="app">' + H.LOGO + '</span><div class="grow"><span class="top">Agri-Digit Bénin · 07:30</span><b style="color:var(--lat)">Alerte pluie</b><p>Fortes pluies jeudi à Banikoara : reportez l\'épandage.</p><div class="na"><span>Écouter</span><span>Voir</span></div></div></div>' +
      '<div class="notif"><span class="app">' + H.LOGO + '</span><div class="grow"><span class="top">Agri-Digit Bénin · hier</span><b>285 000 F reçus (simulation)</b><p>Vente de maïs, 1 000 kg. Reçu SIM-0427.</p></div></div>' +
      '<div class="notif"><span class="app" style="background:#4A5E4F;color:#fff">' + ic('sms') + '</span><div class="grow"><span class="top">Messages · AGRIDIGIT</span><b>Appui à confirmer</b><p>4 sacs NPK remis. Repondez 1 pour confirmer.</p></div></div></div>'
  });
  add('profil', {
    t: 'Profil', i: 'Qui je suis, l\'état de ma fiche, et l\'accès à tout ce qui n\'est pas dans la barre du bas.',
    nav: 'accueil',
    html: tb('Profil', null) +
      '<div class="scroll" style="gap:12px"><div class="card row-x" style="gap:14px"><span class="ava" style="width:56px;height:56px;font-size:18px;background:var(--leaf);color:#fff">BG</span><div class="grow"><b style="display:block;font-size:18px">Bio GOUNOU</b><span class="tiny num">BJ-BAN-004127</span><div style="margin-top:6px">' + chip('Fiche validée', 'ok', 'check') + '</div></div></div>' +
      '<div class="list">' + row(ico('idcard'), 'Ma carte de producteur', '') + row(ico('users'), 'Mes coopératives', '') + row(ico('globe'), 'Langue et lecture', 'Français · lecture à voix haute') +
      row(ico('shield'), 'Mes consentements', '2 actifs') + row(ico('download'), 'Données hors ligne', '38 Mo sur le téléphone') + row(ico('help'), 'Aide et mon agent', '') + '</div>' +
      '<button class="btn ghost">' + ic('logout') + 'Se déconnecter</button></div>'
  });
  function lr(name, sub, on, ok) { return '<div class="row"><span class="radio' + (on ? ' on' : '') + '"></span><div class="tx"><b>' + name + '</b><span>' + sub + '</span></div><button class="ib" style="color:var(--leaf)" aria-label="Écouter">' + ic('speaker') + '</button></div>'; }
  add('reglage-langue', {
    t: 'Langue et lecture', i: 'Changer de langue à tout moment, régler la lecture à voix haute et la taille du texte.',
    nav: 'accueil',
    html: tb('Langue et lecture', null) +
      '<div class="scroll" style="gap:12px"><div class="list">' + lr('Français', 'Texte et voix', true) + lr('Fon', 'Traduction à valider') + lr('Bariba', 'Traduction à valider') + lr('Yoruba', 'Traduction à valider') + lr('Dendi', 'Traduction à valider') + '</div>' +
      '<div class="list">' + row(ico('speaker'), 'Lire chaque écran à voix haute', 'À l\'ouverture', '<span class="sw on"></span>') + '</div>' +
      fld('Taille du texte', '<div class="picks scrollx"><span class="pick">Normale</span><span class="pick on">Grande</span><span class="pick">Très grande</span></div>') + '</div>'
  });
  function consent(t, s, active) {
    return '<div class="card" style="padding:14px"><div class="row-x" style="gap:12px;align-items:flex-start">' + ico('shield', active ? '' : 'lat') + '<div class="grow"><b style="display:block;line-height:1.3">' + t + '</b><span class="tiny">' + s + '</span></div>' + (active ? chip('Actif', 'ok') : chip('Retiré', 'lat')) + '</div>' +
      (active ? '<div style="margin-top:10px">' + btn('Retirer ce consentement', 'x', 'sec sm" style="width:100%;color:var(--lat-ink);box-shadow:inset 0 0 0 1.5px var(--lat)') + '</div>' : '') + '</div>';
  }
  add('consentements', {
    t: 'Mes consentements', i: 'Chaque accord, sa version, sa date, et le retrait en un bouton ; le journal d\'accès montre qui a vu la fiche.',
    nav: 'accueil',
    html: tb('Mes consentements', null) +
      '<div class="scroll" style="gap:10px"><p class="small muted">Vous pouvez retirer chaque accord à tout moment (loi n° 2017-20, art. 389 et 390).</p>' +
      consent('Données personnelles', 'Texte v1, donné le 19 sept. 2026, dans l\'application', true) +
      consent('Partage avec le crédit (FNDA, banques)', 'Donné le 19 sept., retiré le 2 oct. 2026', false) +
      '<div class="list">' + row(ico('eye'), 'Qui a consulté ma fiche', 'Agent ATDA Banikoara · 26 sept., validation') + '</div></div>'
  });
  add('consentement-retrait', {
    t: 'Retrait : confirmation', i: 'Avant de retirer, on dit ce qui s\'arrête ; le retrait reste possible, sans piège.',
    nav: 'accueil',
    html: tb('Mes consentements', null) + '<div class="scroll" style="gap:10px">' + consent('Données personnelles', 'Texte v1, donné le 19 sept. 2026', true) + '</div>' +
      '<div class="scrim"></div><div class="dlg" role="alertdialog"><span class="ico lat" style="align-self:flex-start">' + ic('shield') + '</span><h2>Retirer l\'accord sur vos données personnelles ?</h2>' +
      '<p class="small">Conseils, alertes, appuis et marché s\'arrêteront. Votre fiche sera archivée, puis supprimée selon la loi. Vous pourrez vous réinscrire.</p>' +
      '<div class="acts"><button class="btn ghost sm">Annuler</button><button class="btn ghost sm" style="color:var(--lat-ink)">Retirer</button></div></div>'
  });
  function dl(t, s, on) { return row(ico(on ? 'download' : 'cloud'), t, s, '<span class="sw' + (on ? ' on' : '') + '"></span>'); }
  add('donnees-hors-ligne', {
    t: 'Données hors ligne', i: 'Ce qui est gardé sur le téléphone pour marcher sans réseau, sa taille, et le choix de n\'envoyer qu\'en Wi-Fi.',
    nav: 'accueil',
    html: tb('Données hors ligne', null) +
      '<div class="scroll" style="gap:12px"><div class="card"><div class="row-x" style="justify-content:space-between"><b>38 Mo utilisés</b><span class="tiny">120 Mo libres</span></div>' +
      '<div style="height:10px;border-radius:5px;background:var(--light);margin-top:8px;overflow:hidden"><i style="display:block;width:24%;height:100%;background:var(--leaf)"></i></div></div>' +
      '<div class="list">' + dl('Fiches techniques', 'Maïs, coton · 12 Mo', true) + dl('Cartes de mes parcelles', '18 Mo', true) + dl('Météo et prix', 'Rafraîchis chaque matin · 2 Mo', true) + dl('Toutes les filières', '64 Mo', false) + '</div>' +
      '<div class="list">' + row(ico('sync'), 'Envoyer seulement en Wi-Fi', 'Pour économiser le crédit', '<span class="sw"></span>') + '</div>' +
      '<p class="tiny">Dernière mise à jour : aujourd\'hui, 07:02</p></div>' + cta(btn('Mettre à jour maintenant', 'sync', 'sec'))
  });
  add('aide', {
    t: 'Aide et mon agent', i: 'L\'agent ATDA d\'abord, joignable en un geste ; puis le guide audio et l\'usage sans internet.',
    nav: 'accueil',
    html: tb('Aide', null) +
      '<div class="scroll" style="gap:12px"><div class="card"><div class="row-x" style="gap:12px"><span class="ava sun" style="width:52px;height:52px">' + ic('usercheck') + '</span><div class="grow"><b style="display:block;font-size:17px">Votre agent ATDA</b><span class="tiny">Secteur Founougo · marché de Banikoara le mardi</span></div></div>' +
      '<div class="btns" style="margin-top:12px">' + btn('Message', 'chat', 'sec sm') + btn('Appeler', 'phone', 'sm') + '</div></div>' +
      '<div class="list">' + row(ico('speaker'), 'Écouter le guide de l\'application', '6 minutes, en français') + row(ico('phone'), 'Sans internet : *000#', 'Code d\'exemple, sur tout téléphone') +
      row(ico('help'), 'Questions fréquentes', '') + row(ico('flag'), 'Signaler un problème', '') + '</div></div>'
  });

  /* ================= 14. Mode agent terrain ================= */
  group('agent', 'Mode agent terrain (ATDA)', 'Le même téléphone, un autre rôle : tout le secteur disponible hors ligne, l\'inscription d\'un producteur sur place, la validation de fiche, la remise d\'un appui avec preuve, puis la synchronisation.');

  var AB = '<div class="agentbar">' + ic('usercheck') + 'Agent ATDA · Founougo' + H.demo() + '</div>';
  function pr(av, t, s, end) { return row('<span class="ava">' + av + '</span>', t, s, end); }
  add('agent-accueil', {
    t: 'Producteurs du secteur', i: 'Tout le secteur sur le téléphone, filtré par ce qui attend l\'agent ; le hors-ligne est l\'état normal.',
    agent: 'producteurs', offline: true,
    html: AB + tb('Producteurs', '214 · données du 20 sept.', { back: false, acts: H.ib('search', 'Chercher') }) +
      '<div class="scroll" style="gap:12px"><div class="ban info" style="align-items:center">' + ic('wifioff') + '<span>Hors ligne : tout le secteur est sur ce téléphone.</span></div>' +
      '<div class="picks scrollx">' + pick('À valider · 12', 1) + '<span class="pick">Validés</span><span class="pick">Rejetés</span></div><div class="list">' +
      pr('AO', 'Alassane ORO', 'Kokey · maïs, coton · 18 sept.', chip('À valider', 'sun')) +
      pr('AS', 'Awa SABI', 'Founougo · soja · 17 sept.', chip('À valider', 'sun')) +
      pr('ZG', 'Zakari GADO', 'Founougo · maïs · aujourd\'hui', chip('Sur ce tél.', '', 'clock')) +
      pr('RK', 'Rékiatou KORA', 'Kokey · maraîchage · 15 sept.', chip('À valider', 'sun')) + '</div></div>'
  });
  add('agent-inscrire', {
    t: 'Inscrire sur le terrain', i: 'Photo, NPI et position du domicile capturés sur place, sans réseau ; l\'ANIP vérifie à la synchronisation.',
    agent: 'inscrire', offline: true,
    html: AB + tb('Inscrire un producteur', 'Étape 2 sur 4 · Identité') +
      '<div class="scroll" style="gap:12px">' + H.steps(2, 4) +
      '<div class="row-x" style="gap:14px;align-items:flex-end"><span class="photo-id taken"><span style="position:absolute;inset:auto 0 0;height:60%;background:radial-gradient(60% 70% at 50% 100%, #3A2A1E, transparent)"></span><span style="position:absolute;top:18px;left:28px;width:40px;height:46px;border-radius:50%;background:#3A2A1E"></span></span>' +
      '<div class="col grow"><span class="tiny">Photo du producteur</span>' + btn('Reprendre', 'camera', 'sec sm') + '</div></div>' +
      fld('NPI', inp('<span class="num grow">4 207 551 930</span>' + ic('clock')), { hint: 'Vérifié par l\'ANIP à la prochaine synchronisation' }) +
      fld('Nom et prénom', inp('ORO Alassane')) +
      '<div class="card row-x" style="gap:12px;padding:12px 14px">' + ico('pin') + '<div class="grow"><b style="display:block">Position du domicile</b><span class="tiny num">11,302° N · 2,436° E · ± 4 m</span></div>' + chip('Prise', 'ok', 'check') + '</div></div>' +
      cta(btn('Continuer', 'chev'))
  });
  add('agent-valider', {
    t: 'Valider une fiche', i: 'Tout ce qu\'il faut pour décider sur un écran ; rejeter demande un motif, que le producteur recevra.',
    agent: 'producteurs',
    html: AB + tb('Fiche à valider', 'Inscrit le 18 sept. par l\'application') +
      '<div class="scroll" style="gap:10px"><div class="card row-x" style="gap:14px"><span class="photo-id taken" style="width:64px;height:76px;border-radius:12px"></span><div class="grow"><b style="display:block;font-size:18px">Alassane ORO</b><span class="tiny">Né le 4 mai 1990 · Homme</span><div style="margin-top:6px">' + chip('NPI vérifié', 'ok', 'check') + '</div></div></div>' +
      '<div class="card" style="padding:4px 16px">' + H.kv([['NPI', '4 207 551 930'], ['Commune', 'Banikoara · Kokey'], ['Filières', 'Maïs, coton'], ['Parcelles', '2 · 3,1 ha'], ['Doublon', 'Aucun']]) + '</div>' +
      '<div class="ban sun">' + ic('map') + '<span>Une parcelle chevauche celle d\'un voisin de 8 %. Sous le seuil de 20 %.</span></div></div>' +
      cta('<div class="btns">' + btn('Rejeter', 'x', 'sec') + btn('Valider', 'check') + '</div>')
  });
  add('agent-remise', {
    t: 'Remise d\'un appui', i: 'La preuve de la remise : quoi, à qui, photo et signature au doigt ; le producteur confirme aussi de son côté.',
    agent: 'remises', offline: true,
    html: AB + tb('Remise d\'un appui', 'Kits semences maïs 2026') +
      '<div class="scroll" style="gap:10px"><div class="list">' + pr('BG', 'Bio GOUNOU', 'BJ-BAN-004127 · carte scannée', ic('check', 'chev" style="color:var(--ok-ink)')) +
      row(ico('gift', 'sun'), 'Engrais NPK · 4 sacs de 50 kg', 'Valeur 46 000 F · à rembourser', '') + '</div>' +
      '<div class="row-x" style="gap:10px"><span class="photo img-fonio" style="width:72px;height:72px"></span><span class="small grow">Photo de la remise · 08:41<br><span class="tiny">Position enregistrée</span></span></div>' +
      '<div class="sigpad"><svg viewBox="0 0 280 100" aria-hidden="true"><path d="M10 70c20-40 34-56 44-40s-12 44 6 40 24-50 40-46 0 42 18 40 18-26 34-24 12 20 30 14 30-30 50-28" fill="none" stroke="#13261A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div>' +
      cta(btn('Enregistrer la remise', 'check') + '<p class="tiny">Le producteur recevra une demande de confirmation (appli, SMS ou USSD).</p>')
  });
  add('agent-sync', {
    t: 'Synchronisation', i: 'Au retour du réseau, ce qui part, ce qui reste, et le seul conflit à trancher par l\'agent.',
    agent: 'envoi',
    html: AB + tb('Synchronisation', 'Réseau retrouvé · 3G', { back: false }) +
      '<div class="scroll" style="gap:12px"><div class="sync-ring" style="width:112px;height:112px"><svg viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="56" fill="none" stroke="#DCE6D3" stroke-width="12"/><circle cx="66" cy="66" r="56" fill="none" stroke="#6FA83A" stroke-width="12" stroke-linecap="round" stroke-dasharray="352" stroke-dashoffset="88"/></svg><div class="c">18/24<small>envoyés</small></div></div>' +
      '<div class="list">' + row(ico('user'), 'Fiches producteurs', '5 envoyées · 2 en cours') + row(ico('gift'), 'Remises d\'appui', '9 sur 9 envoyées') + row(ico('camera'), 'Photos', '3 en attente · 4 Mo') + '</div>' +
      '<div class="card" style="padding:14px;box-shadow:inset 0 0 0 2px var(--lat)"><div class="row-x" style="gap:12px">' + ico('alert', 'lat') + '<div class="grow"><b style="display:block">1 conflit à régler</b><span class="tiny">Fiche d\'Awa SABI modifiée aussi par un autre agent</span></div></div>' +
      '<div style="margin-top:10px">' + btn('Choisir la bonne version', 'chev', 'sec sm" style="width:100%') + '</div></div></div>'
  });

  /* ================= 15. Téléphone simple ================= */
  group('telephone-simple', 'Téléphone simple : USSD et SMS', 'Sans smartphone ni internet : un code USSD (*000#, exemple) donne météo, prix, conseil et appuis par menus numérotés ; les alertes et codes arrivent par SMS. Textes sans accents (GSM-7).');

  function lcdMenu(title, items, sel, soft) { return '<div class="inv">' + title + '</div>' + items.map(function (x, i) { return '<div' + (i === sel ? ' class="sel"' : '') + '>' + x + '</div>'; }).join('') + '<div class="soft"><span>' + (soft || 'Repondre') + '</span><span>Retour</span></div>'; }
  add('ussd-code', { t: 'Composer le code', i: 'Le producteur compose *000# (code d\'exemple) puis appuie sur appel ; aucun crédit internet.', basic: true,
    html: H.fp('<div class="bigd">*000#<span>_</span></div><div class="c" style="font-size:17px;margin-top:8px">code exemple</div><div class="soft"><span>Appeler</span><span>Effacer</span></div>', 'call', 'Code USSD d\'exemple : le vrai code sera attribué par l\'opérateur.') });
  add('ussd-menu', { t: 'Menu principal', i: 'Cinq choix numérotés, les plus utiles en haut ; on répond par un chiffre.', basic: true,
    html: H.fp(lcdMenu('AGRI-DIGIT BENIN', ['1 Meteo', '2 Prix', '3 Conseil', '4 Mes appuis', '5 Langue'], 3), '4') });
  add('ussd-appui', { t: 'Confirmer un appui par USSD', i: 'La confirmation de réception marche aussi sans smartphone : un chiffre suffit.', basic: true,
    html: H.fp(lcdMenu('MES APPUIS', ['4 sacs NPK', 'remis le 18/09.', '1 Je confirme', '2 Il en manque', '3 Rien recu'], 2), '1') });
  add('ussd-prix', { t: 'Prix par USSD', i: 'Les prix du jour pour sa filière, sur un écran de quelques lignes, étiquetés démonstration.', basic: true,
    html: H.fp(lcdMenu('PRIX MAIS (F/kg)', ['Banikoara 255', 'Parakou   285', 'Bohicon   310', '(demonstration)'], -1, 'Suite'), '') });
  add('sms-alerte', { t: 'SMS d\'alerte', i: 'L\'alerte climatique arrive par SMS sur tout téléphone, avec le rappel de voir l\'agent.', basic: true,
    html: H.fp('<div class="inv">De : AGRIDIGIT</div><div style="font-size:18px">Fortes pluies jeudi a Banikoara : reportez l\'epandage. Conseil indicatif, voir agent ATDA.</div><div class="soft"><span>Options</span><span>Retour</span></div>', 'ok') });
  add('sms-code', { t: 'SMS de code', i: 'Le code de connexion à 6 chiffres, avec sa durée et la mise en garde de ne pas le donner.', basic: true,
    html: H.fp('<div class="inv">De : AGRIDIGIT</div><div style="font-size:18px">Votre code Agri-Digit : 482917. Valable 10 min. Ne le donnez a personne, meme a un agent.</div><div class="soft"><span>Options</span><span>Retour</span></div>', '') });

  /* ================= 16. États ================= */
  group('etats', 'États', 'Les états communs à tous les écrans : chargement en squelette, vide qui apprend quoi faire, erreur réseau qui rassure, hors ligne qui laisse travailler, succès qui donne la suite.');

  function sk(w, h, r) { return '<span class="sk" style="display:block;width:' + w + ';height:' + h + 'px' + (r ? ';border-radius:' + r + 'px' : '') + '"></span>'; }
  function skrow() { return '<div class="row">' + sk('64px', 64, 14) + '<div class="tx col" style="gap:8px">' + sk('70%', 16) + sk('45%', 13) + '</div></div>'; }
  add('etat-chargement', {
    t: 'Chargement', i: 'Un squelette à la forme du contenu attendu, jamais une roue au milieu de l\'écran.',
    nav: 'parcelles',
    html: tb('Mes parcelles', 'Chargement en cours', { back: false }) + '<div class="scroll" style="gap:12px"><div class="list">' + skrow() + skrow() + skrow() + '</div>' + sk('60%', 13) + '</div>'
  });
  add('etat-vide', {
    t: 'Vide', i: 'Un écran vide dit pourquoi et propose l\'action qui le remplit.',
    nav: 'marche',
    html: tb('Marché', 'Mes offres', { back: false }) + '<div class="state"><span class="art">' + ic('bag') + '</span><h2>Aucune offre pour le moment</h2><p>Publiez votre récolte : les acheteurs de votre région la verront.</p></div>' +
      cta(btn('Publier une offre', 'plus'))
  });
  add('etat-erreur', {
    t: 'Erreur réseau', i: 'L\'erreur nomme le problème et la solution, rappelle que rien n\'est perdu et propose les données d\'hier.',
    nav: 'marche', offline: true,
    html: tb('Prix du marché', null, { back: false }) + '<div class="state"><span class="art lat">' + ic('wifioff') + '</span><h2>Les prix n\'ont pas pu se charger</h2><p>Vérifiez la connexion, puis réessayez. Vos offres restent sur le téléphone.</p></div>' +
      cta(btn('Réessayer', 'sync') + '<button class="btn ghost">Voir les prix d\'hier</button>')
  });
  add('etat-hors-ligne', {
    t: 'Hors ligne', i: 'L\'assistant sans réseau : la question attend et partira seule, les fiches gardées restent lisibles.',
    nav: 'conseil', offline: true,
    html: tb('Conseil agricole', 'Hors ligne', { back: false }) +
      '<div class="ban off">' + ic('wifioff') + '<span>Hors ligne : votre question partira au retour du réseau.</span></div>' +
      '<div class="chat"><div class="msg bot">Les fiches gardées sur le téléphone restent lisibles.<div class="cite">' + ic('doc') + 'Fiche INRAB · maïs<span>hors ligne</span></div></div>' +
      '<div class="msg me">Mes feuilles jaunissent, que faire ?</div><span class="msg-cap row-x" style="gap:4px">' + ic('clock') + 'En attente d\'envoi</span></div>' +
      '<div class="composer"><div class="field">Écrivez ou parlez</div><button class="mic" aria-label="Dicter">' + ic('mic') + '</button></div>'
  });
  add('etat-succes', {
    t: 'Succès', i: 'Le succès confirme ce qui a été fait, avec le chiffre du serveur, et propose l\'étape suivante.',
    nav: 'parcelles',
    html: '<div class="state"><span class="okmark">' + ic('check') + '</span><h2>Parcelle enregistrée</h2><p>Champ de Founougo : <b class="num" style="color:var(--ink)">2,4 ha</b>, surface recalculée par le serveur.</p>' +
      '<div class="card tint row-x" style="gap:12px;text-align:left;width:100%">' + ico('sprout', 'dk') + '<span class="small"><b style="display:block">Suite</b>Ouvrez une campagne pour cette parcelle.</span></div></div>' +
      cta(btn('Ouvrir une campagne', 'chev') + '<button class="btn ghost">Plus tard</button>')
  });
})();
