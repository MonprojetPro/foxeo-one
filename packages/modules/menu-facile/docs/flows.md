# MenuFacile — Flux

## Lecture des métriques (Tableau de bord)

```
Composant MetricsTab (client)
  └─ useMenuFacileMetrics()  [TanStack Query]
       └─ getMenuFacileMetrics()  [Server Action 'use server']
            └─ callMenuFacileAdmin('/metrics')  [server-only]
                 └─ fetch GET {URL}/metrics  + Authorization: Bearer {secret}
                      └─ guichet admin-api → base MenuFacile
       ◀─ { data: MenuFacileMetrics } | { error }
```

## Contrat du guichet (résumé)

| Méthode | Endpoint | Usage | Statut module |
|---------|----------|-------|---------------|
| GET | `/metrics` | KPIs globaux | ✅ branché |
| GET | `/reports?status=` | Signalements | ✅ onglet Modération |
| POST | `/moderation/hide` | Masquer une recette | ✅ |
| POST | `/moderation/ban` | Bannir / débannir un user | ✅ |
| POST | `/moderation/resolve-report` | Résoudre un signalement | ✅ |
| GET | `/official-recipes` | Liste recettes officielles | ✅ onglet Recettes |
| GET | `/official-recipes/:id` | Détail complet (pré-remplit l'édition) | ⏳ consommé, attend MenuFacile |
| POST | `/official-recipes` | Créer une recette | ✅ |
| PATCH | `/official-recipes/:id` | Éditer (remplace ingredients/steps si fournis) | ✅ |
| DELETE | `/official-recipes/:id` | Supprimer | ✅ |

Après chaque mutation (modération ou recette), le client invalide les queries
`reports` / `official-recipes` **et** `metrics` → les compteurs du Tableau de bord
se mettent à jour immédiatement.

## Aperçu de recette dans les signalements (Option B)

Pour pouvoir **voir** la recette signalée et **bannir l'auteur en un clic**, le Hub
consomme un champ `recipe` optionnel dans chaque entrée de `GET /reports` :

```
recipe?: { id, name?, photo_url?, is_public?, is_hidden?, author_id?, author_name? }
```

Le Hub est rétro-compatible : tant que MenuFacile n'envoie pas ce champ, l'UI affiche
le `recipe_id` brut et masque le bouton « Bannir l'auteur ». Dès que le champ arrive,
l'aperçu (photo + nom + statut + auteur) et le bouton apparaissent automatiquement.

## Réponses

- Succès : `{ data: … }` ou `{ ok: true }`
- Erreur : `{ error: "…" }` + status HTTP 400/401/404/500/503 → converti en
  `ActionError` côté Server Action.
```
