# Registre des activités de traitement

Base : article 435 de la loi n° 2017-20. Rédigé à partir de la configuration du prototype (modules `backend/apps/`, table `retention_policy`) ; à compléter et tenir à jour par le MAEP.

- Responsable du traitement : Ministère de l'Agriculture, de l'Élevage et de la Pêche (MAEP), [adresse, contact] (à compléter).
- Délégué à la protection des données : [à désigner, art. 430].
- Sous-traitant : prestataire de développement et d'hébergement, [à compléter].
- Transferts hors du Bénin : aucun dans la configuration par défaut. L'API Anthropic, facultative et désactivée sans clé, constituerait un transfert (art. 391).

| # | Traitement | Finalité | Base | Personnes | Données | Destinataires | Conservation (défaut) | Module |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Comptes et connexion | authentifier les utilisateurs | mission de service public | agents, producteurs | téléphone, nom, rôle, périmètre, codes à usage unique hachés | administrateur MAEP | durée du compte ; codes : 10 min | `accounts` |
| 2 | Registre des producteurs | identifier les producteurs et cibler l'appui | consentement | producteurs, titulaires de l'autorité parentale (moins de 16 ans) | NPI, nom, prénom, sexe, date de naissance, commune, téléphone, langue, versions | agents ATDA du périmètre, administrateur | durée de l'inscription + à fixer | `producers` |
| 3 | Consentements | prouver le consentement et son retrait | obligation légale (art. 390) | producteurs | type, version du texte, date, canal, date de retrait | DPO, auditeur | durée du traitement + à fixer | `producers` |
| 4 | Parcelles et campagnes | suivre la production | consentement | producteurs | géométrie, surface, statut foncier, culture, stade | agents du périmètre | à fixer | `parcels` |
| 5 | Assistant | conseil technique | consentement | utilisateurs | question sans donnée personnelle, fiches citées, escalade | agronomes (escalade) | à fixer | `assistant` |
| 6 | Alertes et notifications | informer les producteurs | mission de service public | producteurs | téléphone (masqué dans l'affichage), message, statut | agents | à fixer | `alerts` |
| 7 | Programmes, candidatures, sélection | attribuer des appuis | mission de service public | producteurs | candidature, décision motivée, contestation, score de sélection | responsable de programme, agents | durée du programme + à fixer | `programs` |
| 8 | Score de crédit | aider l'accès au crédit | consentement explicite | producteurs ayant consenti | facteurs du score, consultations | agent financier autorisé | jusqu'au retrait du consentement | `programs` / crédit (P1) |
| 9 | Journal d'audit | traçabilité, art. 495 | obligation légale | tous les utilisateurs | auteur, action, objet, date | auditeur CoPil, administrateur | 5 ans (paramétrable) | `audit` |
| 10 | Exports | transmission à des partenaires | mission de service public | selon jeu exporté | jeu exporté, motif | administrateur, partenaire autorisé | fichier non conservé par la plateforme | `exports` |
| 11 | Données POC d'exploitations | pilotage et sélection | à qualifier (source à documenter) | exploitations, sans identité | polygone, superficie, détection du maïs | agents, responsables | à fixer | `farms` |

Mesures de sécurité communes : contrôle d'accès par rôle et périmètre vérifié côté serveur, journal d'audit dans la même transaction que l'action, journaux techniques sans donnée personnelle, jetons courts, cookies `HttpOnly`, limitation de débit sur la connexion.
