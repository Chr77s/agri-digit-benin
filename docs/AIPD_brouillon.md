# Analyse d'impact relative à la protection des données (brouillon)

Base : article 428 de la loi n° 2017-20 (analyse avant un traitement susceptible d'engendrer un risque élevé). Brouillon technique du prestataire ; l'analyse finale revient au MAEP, responsable du traitement, avec son délégué à la protection des données (art. 430).

Traitements couverts : (A) score de crédit et sélection de bénéficiaires ; (B) assistant conversationnel.

## A. Score de crédit et sélection de bénéficiaires

### Description

- Finalités : proposer une liste de bénéficiaires d'un programme (UC-17) ; aider un agent financier à apprécier un producteur qui y a consenti (UC-19, UC-20).
- Données : sélection : données POC d'exploitations (superficie, confiance de détection du maïs, distance à la route), sans nom ; crédit : historique de production, superficie déclarée, appuis reçus et remboursés, ancienneté de validation de la fiche. Détail dans `MODEL_CARD.md`.
- Personnes : producteurs inscrits ; exploitations du POC (non rattachées à une personne dans le prototype).
- Destinataires : responsable de programme, agents ATDA du périmètre, agent financier (seulement si consentement actif).
- Durée de conservation : durée du programme, puis archivage ; scores recalculés, pas d'historique au-delà de la durée fixée dans `retention_policy`.

### Nécessité et proportionnalité

- Grille transparente à facteurs et poids lisibles, pas de modèle opaque.
- Score de crédit seulement avec consentement explicite, distinct et révocable (art. 389, 390).
- Aucune décision automatique (art. 401) : le résultat est une proposition, validée et motivée par un agent différent du lanceur ; le producteur peut contester.
- Pondérations figées avant le calcul et conservées avec le résultat.

### Risques et mesures

| Risque | Gravité | Vraisemblance | Mesure | Risque résiduel |
| --- | --- | --- | --- | --- |
| Exclusion injuste (exploitations éloignées des routes défavorisées par le critère distance) | élevée | élevée | poids visibles et modifiables, validation humaine, contestation, revue des effets par zone | moyen |
| Biais de détection satellite (confiance plus faible sur certains sols ou cultures associées) | moyenne | moyenne | confiance affichée, seuil documenté, vérification terrain par l'ATDA | moyen |
| Consultation abusive du score | élevée | faible | consentement actif vérifié côté serveur, chaque consultation journalisée, visible par l'auditeur | faible |
| Décision de crédit déléguée de fait au score | élevée | moyenne | mention "le score est une aide", décision hors plateforme, formation des agents | moyen |
| Fuite des données de scoring | élevée | faible | contrôle d'accès par rôle, exports avec motif, pseudonymisation des jeux d'analyse (à faire) | faible |

## B. Assistant conversationnel

### Description

- Finalité : répondre aux questions techniques à partir des seules fiches publiées.
- Données : texte de la question, filière, commune, stade, saison. Le journal (`assistant_log`) garde la question sans donnée personnelle, les fiches citées et l'escalade éventuelle.
- Destinataires : le producteur ; agents en cas d'escalade.
- Traitement par un modèle : mode extractif local par défaut ; Ollama local ; API Anthropic seulement si une clé est configurée (transfert hors du Bénin, art. 391).

### Risques et mesures

| Risque | Gravité | Vraisemblance | Mesure | Risque résiduel |
| --- | --- | --- | --- | --- |
| Conseil erroné nuisible (dose de pesticide, médicament vétérinaire) | élevée | moyenne | refus et renvoi à un agent pour tout dosage, réponse seulement depuis des fiches publiées, citation de la fiche, mention "Conseil indicatif, vérifiez avec votre agent ATDA" | faible |
| Réponse inventée hors des fiches | moyenne | moyenne | "je ne sais pas" si aucune fiche ne couvre la question ; mode extractif sans génération | faible |
| Données personnelles saisies dans la question (nom, téléphone) | moyenne | moyenne | filtrage avant journalisation et avant envoi au modèle ; journal sans identifiant | faible |
| Transfert hors du pays via une API externe | élevée | faible | désactivé sans clé ; contexte anonyme ; avis APDP avant activation | faible |
| Traduction fon et bariba incorrecte | moyenne | élevée | textes `non_valide`, repli sur le français, validation MTDI | moyen |

## Avis à recueillir

Délégué à la protection des données du MAEP ; représentants de producteurs ; APDP si le risque résiduel reste élevé après mesures.
