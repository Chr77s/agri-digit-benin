# Langues à valider

Statut au 16/10/2026 : seul le français est complet. Aucun texte fon, bariba, yoruba ou dendi n'a été rédigé pour éviter des traductions inexactes.

| Langue | Fichier | Contenu | Statut | Action attendue |
| --- | --- | --- | --- | --- |
| Français | `frontend/src/i18n/fr.json` | navigation, accueil producteur, statuts, stades | référence | aucune |
| Fon | `frontend/src/i18n/fon.json` | aucun texte, repli automatique sur le français | `non_valide` | traduction puis relecture par des locuteurs natifs (MTDI) |
| Bariba | `frontend/src/i18n/bba.json` | aucun texte, repli automatique sur le français | `non_valide` | traduction puis relecture par des locuteurs natifs (MTDI) |
| Yoruba | `frontend/src/i18n/yo.json` | vide | prévu | plus tard |
| Dendi | `frontend/src/i18n/dnd.json` | vide | prévu | plus tard |

Procédure : traduire chaque clé de `fr.json` dans le fichier de la langue, ajouter `"_meta": {"language_validation": "non_valide"}` tant que la relecture n'est pas faite, puis passer à `valide` après relecture. Le sélecteur de langue de l'en-tête affiche « (à valider) » pour fon et bariba. La lecture vocale (Web Speech API) reste en français.

Écran de validation (UC-15) : les représentants du MTDI se connectent (`0197000011`), ouvrent « Traductions », saisissent le texte de chaque clé en fon ou en bariba, puis un autre représentant le note de 1 à 5 (4 et plus : validé, 2 et moins : rejeté). Une langue s'ouvre aux producteurs quand 80 % des clés sont validées (`LANGUAGE_OPEN_THRESHOLD`). Le frontend charge alors `GET /api/v1/i18n/<langue>.json` et garde le français pour les clés manquantes.
