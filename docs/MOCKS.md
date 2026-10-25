# Simulations (mocks) du prototype

Règle : tout ce qui est simulé est signalé dans l'interface par un bandeau **Simulation** et listé ici. Aucune clé réelle, aucun appel à un service externe. Chaque intégration passe par une interface dans `backend/integrations/` avec une version simulée et une version réelle vide.

| Intégration | Interface | Implémentation du prototype | Version réelle | Où le voir dans l'interface |
| --- | --- | --- | --- | --- |
| Identité ANIP | `AnipClient` | fiches fictives en mémoire | vide, attend l'habilitation ANIP | formulaire d'inscription (bandeau Simulation sous le champ NPI) |
| Mobile Money | `PaymentProvider` | `FakePay` | adaptateurs vides FedaPay, KKiaPay, CinetPay | écran de paiement, reçu marqué Simulation |
| SMS | `NotificationChannel` | `SmsChannel` écrit dans la table `outbox` | vide, attend fournisseur et identifiant ARCEP | boîte d'envoi (admin, agent), page de connexion pour le code |
| Vocal | `NotificationChannel` | `VoiceChannel` écrit dans `outbox` ; lecture locale par Web Speech API | vide | boîte d'envoi |
| Notification in-app | `NotificationChannel` | `InAppChannel` réel (base locale) | | cloche de notifications |
| X-Road | `XRoadAdapter` | interface documentée, aucun appel | vide | aucun écran |
| Diagnostic photo | `DiagnosisBackend` | 10 pathologies de démonstration, confiance fixe | vide, attend un modèle validé INRAB | écran diagnostic, bandeau Simulation |
| Assistant | `LLMBackend` | mode extractif (réel, sans modèle) ; Ollama ou Anthropic si disponibles | | réponse indique `backend` |
| Données satellite | import POC | fichiers `backend/data/poc/` | | tableau de bord, mention "données de démonstration" |

## AnipClient : NPI de démonstration

Format : 10 chiffres (regex `NPI_REGEX` dans `.env`, format à confirmer avec l'ANIP).

| NPI | Prénom | Nom | Naissance | Cas couvert |
| --- | --- | --- | --- | --- |
| 1000000001 | Bio | GOUNOU | 1985-03-12 | valide, déjà inscrit (producteur de démo 0197000001) |
| 1000000002 | Awa | SABI | 1990-07-01 | valide, libre : scénario d'inscription |
| 1000000003 | Koffi | HOUNSOU | 1978-11-20 | valide, libre |
| 1000000004 | Mariam | ZATO | 2011-05-04 | mineure (< 16 ans) : consentement parental exigé |
| 1000000005 à 1000000045 | | | | fiches des ~40 producteurs du seed |
| 8xxxxxxxxx | calculé | calculé | calculée | fiches de démonstration libres, servies par `GET /api/v1/demo/registration` (si `DEMO_MODE=true`) au bouton « Démo » de l'inscription : un NPI et un téléphone neufs à chaque clic |
| 9999999999 | | | | service indisponible (503 `anip_unavailable`) |
| tout autre NPI | | | | inconnu (400 `npi_unknown`) |

Nom différent : 400 `name_mismatch`. Date de naissance différente : 400 `birthdate_mismatch`.

## FakePay

- Statuts : `en_attente`, `reussi`, `echoue`, `rembourse`, avec un délai simulé.
- Montants en FCFA (XOF, entiers). Plafond par transaction paramétrable, 500 000 par défaut.
- Reçu généré avec la mention Simulation. Aucune somme réelle ne circule.

## SMS et vocal

- Écrits dans la table `outbox` : `{channel, to (masqué 01****0001), body, segments, encoding, status}`.
- Découpage : 160 caractères en GSM-7, 70 en UCS-2 (Unicode) ; au-delà, plusieurs segments.
- Statuts simulés : `livre`, `echoue`, `lu`.
- Code de connexion (6 chiffres) : visible dans la boîte d'envoi et sur la page de connexion si `DEMO_MODE=true` (`GET /api/v1/demo/otp-inbox`).

## USSD, SMS entrants, météo et prix

Passerelles `POST /ussd/gateway` et `POST /sms/inbound` : aucune connexion à un opérateur ; le simulateur de la boîte d'envoi joue le rôle du téléphone. Le code `*000#` est un exemple. Météo : **réelle** depuis le 20 octobre 2026, Open-Meteo (données ouvertes, `GET /api/v1/weather`, réglage `WEATHER_BACKEND`) ; sans réponse du service, valeurs de démonstration étiquetées « Prévision simulée ». Prix : **relevés réels** depuis le 20 octobre 2026 (saisis par les agents et les acteurs, `GET /api/v1/prices`, `apps/markets/prices.py`) ; seule une filière sans aucun relevé de moins de 30 jours garde des valeurs de démonstration (`integrations/market_data.py` et `features/weather/demo.ts`), toujours étiquetées « démonstration » (`simulated: true`, « (demonstration) » au téléphone). Le SIM n'est pas raccordé.

## Diagnostic

Réponse choisie parmi 10 pathologies de démonstration, confiance fixe. Sous le seuil (0,6), la photo est transmise à un agronome. Image enregistrée sans métadonnées de position ; aucun visage conservé.

## Données POC

200 873 exploitations et le total de maïs détecté, voir `DONNEES.md`. Toujours affichées comme "données de démonstration", avec source et date.

## Bandeau Simulation

Composant unique du design system (`frontend/src/shared/ui`), affiché sur : connexion (code visible), inscription (ANIP), boîte d'envoi, paiement, diagnostic, tableau de bord (données POC). Texte type : "Simulation : ce service n'est pas raccordé. Les données affichées sont fictives." Le pied de page de toutes les pages indique : "Prototype de démonstration, données non officielles".
