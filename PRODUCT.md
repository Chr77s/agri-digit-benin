# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Petits producteurs du Bénin (maïs, coton, soja, riz… ; nord et sud), souvent sur un téléphone modeste, parfois hors réseau, parfois peu lettrés : s'inscrire avec leur numéro, déclarer et suivre leurs parcelles du semis à la récolte, recevoir conseils et alertes, toucher leurs appuis, vendre.
- Agents ATDA : valider les fiches producteurs de leur secteur, alerter un département, tracer les remises d'appui.
- Coopératives, transformateurs, distributeurs : suivre les membres, regrouper l'offre, acheter.
- MAEP, MTDI, responsables de programme, partenaires : piloter avec des indicateurs à jour, sélectionner les bénéficiaires en transparence, auditer.

La landing parle aux producteurs et à l'institution à parts égales (confirmé le 2026-10-18).

## Product Purpose

Réunir en une plateforme publique le registre des producteurs, le suivi des parcelles et des campagnes, le conseil agricole, les alertes, les programmes d'appui et le marché. Succès : des producteurs inscrits et validés, des appuis remis sans perte, des décisions de pilotage fondées sur des données fraîches.

Cadre (TDR, `C:\Users\Chris Nahum\Downloads\TDR_Agri-Digit_Benin_Rev.docx`) : Stratégie de transformation agricole « Bénin Vert » 2026–2033, Priorité 7 « Agriculture numérique et IA », Programme 18. MAEP maître d'ouvrage, MTDI copilote technique (corpus des langues nationales), ATDA et INRAB fournisseurs du contenu agronomique, SONAMA et interprofessions parties prenantes, FNDA et institutions financières pour le scoring et le crédit.

Fonctions attendues par le TDR :
- assistant conversationnel IA « type ChatGPT » spécialisé en agriculture béninoise, alimenté par les fiches d'itinéraires techniques INRAB/ATDA, les données des parcelles et la météo ; en français, fon, yoruba, dendi et bariba, à l'écrit et si possible à la voix ;
- diagnostic phytosanitaire par photo (état, maladie probable, niveau de risque, recommandations) ;
- analyses prédictives : rendements, sols et usage des terres, risques climatiques (sécheresse, inondation, stress hydrique), détection précoce des ravageurs, scoring crédit ;
- toute la chaîne de valeur par filière : aménagements et parcelles (GPS), production (semences, intrants, mécanisation, stockage), transformation, distribution (stocks, prix), gouvernance (interprofessions, coopératives), suivi-évaluation ;
- services : météo, prix, disponibilités, mise en relation producteurs–transformateurs–distributeurs, appui à la vente, suivi du revenu, paiement en un clic ; scoring pour les institutions financières ;
- canaux : application mobile, SMS, USSD, vocal ; interopérabilité X-Road, SONAMA, FNDA ;
- filières : riz, maïs, soja, manioc, niébé, maraîchage, anacarde, ananas, coton, filières animales et halieutiques ;
- SEA : producteurs et hectares suivis, rendements, adoption, accès aux intrants et au crédit, participation des femmes et des jeunes.

## Positioning

Plateforme du ministère (MAEP), conforme à la loi n° 2017-20 : consentement explicite et retirable, aucune décision automatisée seule, journal d'accès non modifiable, aucune donnée hors du Bénin. Pensée pour le terrain : hors connexion, langues nationales (fon, bariba, yoruba, dendi, en cours de validation), alertes par SMS prévues.

## Operating Context

Saison culturale (semis, croissance, floraison, récolte), Banikoara et l'Alibori comme exemple de bassin de maïs, agents ATDA sur le terrain, marchés (Parakou), téléphones d'entrée de gamme, réseau intermittent.

## Capabilities and Constraints

- Prototype (POC) : identité ANIP, SMS, Mobile Money, satellite et diagnostic photo sont simulés ; données non officielles.
- Frontend Vite + React + TypeScript + Tailwind ; three.js installé pour la landing.
- Délégué à la protection des données et identité de l'exploitant à désigner par le MAEP.

## Brand Commitments

- Nom : Agri-Digit Bénin. Logo : grain de maïs dont le germe pousse (`frontend/public/icon.svg`).
- Ton : français clair, au « vous », concret, sans promesse fausse.
- Thème principal imposé par l'utilisateur (2026-10-18) : le vert, la nature, les champs. La landing montre une simulation de l'application mobile du producteur sur un téléphone, comme la référence https://agri-dpi-bn.vercel.app.

## Evidence on Hand

- Chiffres du POC : 200 873 fermes, 12 départements, 77 communes, 13 filières prioritaires (données de démonstration) ; agrégats par département dans `frontend/src/features/landing/relief.json`.
- Textes : `frontend/src/i18n/fr.json` (`landing.*`, `legal.*`).
- Photos : 3 vignettes Wikimedia CC BY-SA 4.0 dans `frontend/public/landing/` (crédits dans `gallery.ts`).
- Aucun témoignage, client, partenaire ou presse réel : ne pas en inventer.
- Images générées par IA autorisées comme illustrations, signalées comme telles (confirmé le 2026-10-18).

## Product Principles

1. Le producteur d'abord : chaque écran doit être utilisable sur un petit téléphone, hors réseau.
2. Dire vrai : ce qui est simulé ou non officiel est présenté comme tel.
3. Confiance publique : la donnée appartient au producteur ; chaque accès se justifie.
4. Ancré au Bénin : cultures, lieux, langues et matières réels du pays.

## Accessibility & Inclusion

Contraste ≥ 4,5, cibles tactiles 44 px, mouvement réduit respecté, langues nationales, lisibilité pour un public peu lettré.
