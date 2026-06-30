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
| POST | `/official-recipes` | Créer une recette | ✅ |
| PATCH | `/official-recipes/:id` | Éditer (remplace ingredients/steps si fournis) | ✅ |
| DELETE | `/official-recipes/:id` | Supprimer | ✅ |

Après chaque mutation (modération ou recette), le client invalide les queries
`reports` / `official-recipes` **et** `metrics` → les compteurs du Tableau de bord
se mettent à jour immédiatement.

## Réponses

- Succès : `{ data: … }` ou `{ ok: true }`
- Erreur : `{ error: "…" }` + status HTTP 400/401/404/500/503 → converti en
  `ActionError` côté Server Action.
```
