# API

- Contrat de référence, écrit avant le code et suivi par le backend et le frontend : [`API_CONTRACT.md`](API_CONTRACT.md).
- Description OpenAPI 3 générée par drf-spectacular et figée : [`openapi.json`](openapi.json). Pour la régénérer :

```
cd backend
py -3.11 manage.py spectacular --file ../docs/openapi.json
```

- En local, documentation interactive (si activée dans `config/urls.py`) : `http://127.0.0.1:8000/api/schema/` et l'interface Swagger associée.

Conventions : base `/api/v1`, JSON, dates ISO 8601, UUID, montants en XOF entiers, erreurs `{"detail", "code", "fields"}`, pagination par curseur `{"next", "previous", "results"}`. Une valeur d'indicateur absente vaut `null` et s'affiche "non disponible".

En cas d'écart entre `API_CONTRACT.md` et `openapi.json`, `openapi.json` décrit le code livré ; l'écart est à corriger dans le code ou consigné dans `DECISIONS.md`.
