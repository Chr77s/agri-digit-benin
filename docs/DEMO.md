# Script de démonstration

Lancement : double-clic sur `start.bat` (Windows) ou `./start.sh`, puis ouvrir `http://localhost:5173`. Données de démonstration chargées par `python manage.py seed_demo`.

Connexion : saisir le téléphone, demander le code ; le code à 6 chiffres s'affiche sur la page de connexion dans le bandeau **Simulation** (il est aussi dans la boîte d'envoi). Les agents et administrateurs saisissent en plus le mot de passe.

## Comptes

| Rôle | Téléphone | Mot de passe | Périmètre |
| --- | --- | --- | --- |
| producteur (Bio GOUNOU) | 0197000001 | code seul | Banikoara, Alibori |
| agent_atda | 0197000002 | AgriDemo-2026! | Alibori |
| agronome_inrab | 0197000003 | AgriDemo-2026! | national |
| responsable_programme | 0197000004 | AgriDemo-2026! | national |
| admin_maep | 0197000005 | AgriDemo-2026! | national |
| auditeur_copil | 0197000006 | AgriDemo-2026! | national |
| agent_financier | 0197000007 | AgriDemo-2026! | national |

NPI pour l'inscription : `1000000002` (Awa SABI, née le 1990-07-01). Autres cas : `MOCKS.md`.

## Étapes

1. **Inscription.** Sans être connecté, ouvrir "S'inscrire". NPI `1000000002`, Awa SABI, F, 1990-07-01, Alibori, Banikoara, téléphone `0197000099` (libre), langue français. Cocher le consentement (présenté à part). Résultat : fiche "en attente". Le bandeau Simulation sous le NPI rappelle que l'ANIP est simulée. Variante : NPI `1000000004` affiche la demande de consentement parental.
2. **Validation.** Se connecter en agent ATDA (`0197000002`). Liste des producteurs en attente de l'Alibori, ouvrir Awa SABI, "Valider". Le producteur reçoit une notification ; le SMS simulé apparaît dans la boîte d'envoi.
3. **Parcelle et campagne.** Se connecter en producteur (`0197000001`). "Mes parcelles", dessiner un polygone sur la carte : la surface s'affiche, recalculée par le serveur à l'enregistrement. Ouvrir une campagne : filière maïs, saison `2026-pluie-1`, stade semis.
4. **Assistant.** Poser "Quand semer le maïs à Banikoara ?". La réponse cite la fiche "Quand semer le maïs à Banikoara (Alibori, nord du Bénin)" avec sa source, et affiche "Conseil indicatif, vérifiez avec votre agent ATDA". Poser ensuite "Quelle dose d'insecticide pour la chenille légionnaire ?" : statut `escalated`, renvoi à un agent. Le champ `backend` indique le mode (`extractive` sans modèle).
5. **Alerte.** Agent ATDA : "Envoyer une alerte", catégorie ravageur, gravité avertissement, Alibori, filière maïs. Envoyer. Boîte d'envoi (bandeau Simulation) : un SMS par producteur concerné, nombre de segments et encodage, statut "livré".
6. **Sélection.** Responsable de programme (`0197000004`) : nouvelle sélection, 2 000 bénéficiaires, poids par défaut (confiance 0,4, route 0,3, superficie 0,3), sur les exploitations avec maïs détecté. Résultat : proposition. Agent ATDA : valider avec un motif (le lanceur ne peut pas valider). Contester une exploitation exclue avec un motif : contestation "déposée".
7. **Candidature.** Producteur : candidater au programme ouvert (succès), puis au programme clos : message "Ce programme est clos depuis le JJ/MM/AAAA. Les candidatures ne sont plus acceptées."
8. **Crédit (P1).** Producteur : donner le consentement au partage du profil. Agent financier (`0197000007`) : consulter le score et ses facteurs. La consultation apparaît dans le journal d'audit.
9. **Audit et export.** Auditeur (`0197000006`) : lire le journal (inscription, validation, alerte, sélection, consultation du score). Administrateur (`0197000005`) : exporter les producteurs en CSV avec un motif d'au moins 10 caractères ; l'export apparaît dans le journal avec son motif.
10. **Tableau de bord.** Administrateur : tableau de bord, filtre Alibori. Chaque chiffre affiche sa source et sa date ; les données POC sont marquées "données de démonstration" ; une valeur absente affiche "non disponible".

## Où lire le code (bandeau Simulation)

| Étape | Simulation visible | Code |
| --- | --- | --- |
| Connexion | code affiché | `backend/apps/accounts`, `GET /api/v1/demo/otp-inbox` (si `DEMO_MODE=true`) |
| 1 | ANIP | `backend/integrations/` (`AnipClient`), `backend/apps/producers` |
| 2, 5 | SMS et vocal | `backend/integrations/` (`NotificationChannel`), `backend/apps/alerts` |
| 4 | assistant extractif | `backend/apps/assistant`, fiches `backend/data/knowledge/` |
| 6, 10 | données POC | `backend/apps/farms`, `backend/data/poc/`, `docs/DONNEES.md` |
| 8 | score indicatif | `backend/apps/programs`, `docs/MODEL_CARD.md` |
| P1 | paiement FakePay, diagnostic | `backend/integrations/` |

Le test de bout en bout `backend/tests/e2e_backend.py` rejoue ce scénario par l'API.
