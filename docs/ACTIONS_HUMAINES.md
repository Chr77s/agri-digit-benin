# Actions que seul un humain peut faire

Ces points ne bloquent pas le prototype : chacun est remplacé par une simulation (voir `MOCKS.md`) ou consigné ici.

| # | Action | Responsable proposé | Ce que le prototype fait à la place |
| --- | --- | --- | --- |
| 1 | Habilitation ANIP et raccordement X-Road (conditions d'accès non publiques, demande à déposer auprès de l'ANIP). Confirmer le format exact du NPI. | MAEP, MTDI | `AnipClient` simulé, `XRoadAdapter` vide, NPI à 10 chiffres configurable |
| 2 | Pré-enregistrement ARCEP de l'identifiant d'expéditeur SMS, choix d'un fournisseur SMS et vocal. | MAEP | `SmsChannel` et `VoiceChannel` écrivent dans `outbox` |
| 3 | Ouverture d'un compte marchand chez un agrégateur Mobile Money (documents d'entreprise, plusieurs jours de délai). | MAEP ou opérateur désigné | `FakePay` |
| 4 | Déclaration des traitements à l'APDP (art. 405), désignation du délégué à la protection des données (art. 430), analyse d'impact finale (art. 428), mentions légales avec l'identité de l'exploitant (art. 328). | MAEP (responsable du traitement) | brouillons : `AIPD_brouillon.md`, `REGISTRE_TRAITEMENTS.md`, `INCIDENTS.md`, page mentions légales avec champs à compléter |
| 5 | Relecture des fiches par l'INRAB (fond) et les ATDA (adaptation locale). Les passages `a_sourcer` doivent être sourcés ou retirés. | INRAB, ATDA | passages marqués `brouillon_non_valide` ; sourcés marqués `publie` pour la démonstration seulement |
| 6 | Relecture du fon et du bariba par le MTDI. | MTDI | textes `non_valide`, repli sur le français |
| 7 | Accord sur la licence des modèles vocaux Meta MMS (voir avertissement ci-dessous). | MAEP, MTDI | module désactivé |
| 8 | Confirmation de la liste officielle des filières prioritaires (le MAEP parle de 13 filières) et de la source des données du POC (`DONNEES.md`). | MAEP | 10 filières, données POC marquées non officielles |
| 9 | Choix de l'hébergement final avec le CoPil et le CoTech (contrainte art. 391 sur les transferts hors du Bénin). | CoPil, CoTech | exécution locale, `docker-compose.yml` fourni |
| 10 | Contrat de sous-traitance entre le MAEP (responsable du traitement) et le prestataire. | MAEP, prestataire | non couvert par le code |
| 11 | Obtenir un code court USSD et une passerelle USSD et SMS entrants auprès d'un opérateur (MTN, Moov), avec la clé de passerelle (`USSD_GATEWAY_KEY`). | MAEP, opérateur | passerelles simulées, ouvertes en `DEMO_MODE` ; code d'exemple `*000#` |
| 12 | Raccorder une source de météo (Météo-Bénin) et de prix de marché (SIM) pour remplacer les valeurs de démonstration. | MAEP | `integrations/market_data.py` et `features/weather/demo.ts` |

## Avertissement : licence des modèles Meta MMS

Les modèles `facebook/mms-tts-fon` et `facebook/mms-1b-all` (voix et reconnaissance en fon et bariba) sont publiés sous licence **CC-BY-NC 4.0**, qui interdit l'usage commercial. Le module serveur qui les utiliserait est prévu mais **désactivé par défaut**. Ne pas l'activer sans un accord écrit du MAEP et du MTDI après analyse juridique de la licence (un service public gratuit peut rester ambigu au regard de la clause "non commerciale"). Alternatives à étudier : modèles sous licence permissive, ou enregistrements de voix réalisés avec des locuteurs natifs.

## Poste de développement : protection Windows "Dossiers contrôlés"

Sur le PC de développement, la protection contre les rançongiciels de Windows ("Accès contrôlé aux dossiers") empêche Python d'écrire dans `Documents` (base SQLite, migrations, cache). Le projet a donc été placé dans `C:\Users\Chris Nahum\Projets\agri-digit-benin` au lieu de `Documents\MTDI\Agri-Digit`. Aucun réglage de sécurité n'a été modifié. Pour travailler dans `Documents`, l'administrateur du poste doit autoriser explicitement `python.exe` dans les paramètres de sécurité Windows : décision humaine, non recommandée pour un gain aussi faible.

## Autres points constatés

- Le prototype n'utilise pas Docker : il tourne sur SQLite. Les fichiers de `infra/` sont gardés pour un déploiement ultérieur et n'ont pas été testés.
- Le fichier POC fait 77,5 Mo (et non 17,8 Mo) ; l'import doit se faire en flux sur un poste à faible mémoire.
- Le passage "quand semer le maïs à Banikoara" s'appuie sur un extrait WOCAT non ouvert directement : à confirmer par l'ATDA Alibori.
