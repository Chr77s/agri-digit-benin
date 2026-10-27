# Déploiement : Supabase, conteneur et Vercel

Architecture visée : la base PostgreSQL sur Supabase, le backend Django dans un conteneur chez un hébergeur de conteneurs (Render, Railway, Fly ou équivalent), le frontend sur Vercel. Vercel n'héberge pas le backend : Django y fonctionne mal (fonctions courtes, disque temporaire).

## 1. Base de données (Supabase)

Dans Supabase : Project Settings, Database, Connection string, **Session pooler** (port 5432). Évitez le Transaction pooler (port 6543). Cette adresse devient la variable `DATABASE_URL` du conteneur ; le code source n'est pas modifié (`settings.py` la lit déjà).

## 2. Backend (conteneur)

Construction, depuis la racine du dépôt :

```bash
docker build -t agri-digit-api .
```

Variables à définir chez l'hébergeur : voir `backend/.env.supabase.example`. Au démarrage, `docker/entrypoint.sh` :

1. refuse de démarrer sans `SECRET_KEY`, sans adresse PostgreSQL, ou avec `DEMO_MODE=true` (sauf `ALLOW_DEMO_MODE=true`) ;
2. applique les migrations (`RUN_MIGRATIONS=true` par défaut) ;
3. charge les données de démonstration si `SEED_DEMO=true` (une seule fois, sur une base neuve) ;
4. lance gunicorn sur le port `PORT` (8000 par défaut).

Les fermes du POC (200 873) ne sont pas dans l'image : le fichier de 77 Mo n'est pas dans Git. L'import se fait à part (`python manage.py import_poc_farms`), depuis un poste qui a le fichier et qui a accès à la base.

## 3. Frontend (Vercel)

Projet Vercel : dossier racine `frontend`. Dans `frontend/vercel.json`, remplacez `https://VOTRE-API.exemple.com` par l'adresse du backend : les appels `/api/...` sont ainsi renvoyés vers l'API sur le même domaine, ce qui évite les problèmes de cookie de session entre deux domaines. Mettez ensuite l'adresse du frontend dans `CORS_ALLOWED_ORIGINS` du backend.

## 4. Limites connues (non traitées par ces fichiers)

- **Photos du diagnostic** : elles sont écrites sur le disque du conteneur (`MEDIA_ROOT`) et disparaissent à chaque redéploiement. Les conserver demande un volume persistant ou un stockage objet (Supabase Storage), donc une modification du code.
- **PostgreSQL n'a jamais été testé avec ce projet** : lancez `pytest -q` avec `DATABASE_URL` pointant vers une base de test avant la mise en service.
- **Limites de débit** : les compteurs sont en mémoire de chaque processus (plusieurs workers ou instances : limites non partagées).
- **Tâches de maintenance** (`purge_retention`, `verify_audit_chain`, `check_stock_alerts`, `remind_claims`) : rien ne les planifie ; à lancer par une tâche planifiée de l'hébergeur.
- **Fichiers statiques de l'administration Django** : non servis (pas de WhiteNoise). L'API n'en a pas besoin.
- **Image non construite à ce jour** : Docker n'était pas démarré sur le poste de développement ; seule la syntaxe et la logique de contrôle du script de démarrage ont été vérifiées.

## 5. Suivi satellite (Copernicus)

Variables du backend (`backend/.env` en local, variables d'environnement de l'hébergeur en ligne ; **jamais** dans Git, Vercel ou le frontend) :

| Variable | Rôle |
|---|---|
| `SATELLITE_BACKEND` | `auto` (défaut : Copernicus si les deux clés existent, sinon démonstration), `cdse` ou `demo` |
| `CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET` | client OAuth créé dans le tableau de bord Copernicus Data Space (User settings, OAuth clients) |
| `CDSE_TOKEN_URL`, `CDSE_STATS_URL` | adresses de l'API, à ne changer que si Copernicus les modifie |

Mise en service : `python manage.py migrate`, puis `python manage.py satellite_check --department alibori` (affiche « jeton OK » et la réponse brute), puis une tâche planifiée toutes les 12 h : `python manage.py refresh_satellite` (les observations sont gardées 24 h ; le premier chargement sans préchauffage peut durer jusqu'à 20 s).

Coût mesuré en unités de traitement Copernicus (27/10/2026) : environ 620 pour un premier remplissage des 12 départements (17 s), environ 170 par rafraîchissement ensuite, car seuls les 2 derniers intervalles et ceux jamais stockés sont redemandés. Vérifiez votre quota mensuel dans le tableau de bord Copernicus.
