# Conformité à la loi n° 2017-20 portant Code du numérique

Responsable du traitement : MAEP. Prestataire : sous-traitant. Articles vérifiés le 2026-10-16 dans le texte intégral de la loi (skill `droit-numerique-benin`). Seuls les articles listés en section 13 du MASTER_PROMPT sont traités.

Verdicts : **respecté** (le code le fait), **partiel** (le code le fait en partie, action restante), **administratif** (relève d'une démarche humaine, le code ne peut pas le régler).

| Article | Objet (résumé du texte) | Verdict | Nature | Fichier ou module concerné | Action restante |
| --- | --- | --- | --- | --- | --- |
| 389 | Le traitement est légitime si la personne consent (sauf exceptions listées). | respecté | code | `apps/producers` (table `consent`), `POST /producers/register` exige `consent_accepted` | Faire valider le texte du consentement v1 par le DPO. |
| 390 | Le responsable doit pouvoir démontrer le consentement ; présenté séparément des autres clauses, en termes clairs ; retirable. | respecté | code | `consent` (type, version du texte, horodatage, canal), `POST /consents/{id}/withdraw`, écran de retrait | Rédaction juridique finale du texte. |
| 391 | Pas de transfert vers un État tiers sans constat par l'Autorité d'un niveau de protection suffisant. | partiel | code et administratif | `apps/assistant` : contexte LLM sans nom, téléphone, NPI ni position ; Ollama local par défaut | L'API Anthropic (facultative) est hors du Bénin : ne l'activer qu'avec des questions anonymes et après avis APDP. Hébergement final à choisir avec le CoPil. |
| 394 | Interdiction de principe des données sensibles (origine, religion, opinions, santé, biométrie d'identification, etc.). | respecté | code | modèle `producer` sans champ sensible ; `DiagnosisBackend` ne conserve aucun visage ; identité par NPI | Vérifier que les champs libres (motifs, questions) ne servent pas à collecter ces données. |
| 401 | Aucune décision produisant des effets juridiques ou affectant significativement une personne sur le seul fondement d'un traitement automatisé (profilage). | respecté | code | `apps/programs` (sélection = proposition, validation motivée par un autre agent, contestation), crédit : score indicatif | Former les agents à motiver chaque décision. |
| 405 | Déclaration préalable à l'Autorité avant mise en œuvre (ou inscription au registre tenu par la personne désignée). | administratif | humain | `REGISTRE_TRAITEMENTS.md` (contenu préparé) | Le MAEP dépose la déclaration à l'APDP avant toute donnée réelle. |
| 424 | Protection dès la conception et par défaut. | partiel | code | minimisation des champs, journaux sans données personnelles, exports avec motif, téléphones masqués dans `outbox` | Pseudonymiser les jeux d'analyse (scoring) ; revue après le prototype. |
| 427 | Notification sans délai à l'Autorité et à la personne de toute rupture de sécurité ; le sous-traitant avertit sans délai le responsable. | partiel | administratif et code | `INCIDENTS.md` (registre et modèle), journal d'audit | Nommer qui notifie, tester la procédure. |
| 428 | Analyse d'impact avant un traitement à risque élevé. | partiel | administratif | `AIPD_brouillon.md` (scoring, assistant) | AIPD finale par le MAEP et le DPO. |
| 430 | Délégué à la protection des données obligatoire pour une autorité ou un organisme public. | administratif | humain | | Le MAEP désigne le DPO. |
| 433 | Pas de conservation au-delà de la durée nécessaire à la finalité. | partiel | code | table `retention_policy`, commande de purge (django-q2 non retenu : commande de gestion) | Fixer les durées par traitement avec le DPO ; planifier la purge. |
| 435 | Registre des activités de traitement tenu par le responsable. | partiel | code et administratif | `REGISTRE_TRAITEMENTS.md` | Le MAEP complète coordonnées du responsable et du DPO. |
| 446 | Moins de 16 ans : traitement licite seulement avec l'autorisation du titulaire de la responsabilité parentale. | respecté | code | `POST /producers/register` : `guardian_required` si moins de 16 ans (NPI 1000000004) | Définir comment vérifier l'identité du titulaire (NPI du titulaire). |
| 328 | Obligation générale d'information de celui qui exerce une activité de commerce électronique. | partiel | administratif et code | page mentions légales (frontend), offres et paiement simulé (UC-21) | Compléter l'identité de l'exploitant ; l'article vise le commerce électronique, il s'applique au module d'offres si des ventes réelles y passent. |
| 495 | Les fournisseurs de services en ligne conservent les données permettant d'identifier quiconque a contribué à un contenu. | respecté | code | `apps/audit` (journal non modifiable : auteur, action, objet, date) pour fiches, alertes, offres | Fixer la durée de conservation (5 ans par défaut, paramétrable). |

## Ce que le code ne peut pas régler

Déclaration APDP (405), désignation du DPO (430), AIPD finale (428), identité de l'exploitant (328), choix de l'hébergement (391), contrat de sous-traitance MAEP-prestataire, procédure de notification d'incident (427). Voir `ACTIONS_HUMAINES.md`.
