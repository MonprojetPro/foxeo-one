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
| GET | `/households` | Liste paginée des foyers (search, sort, order, activity, official) | ✅ onglet Foyers |
| GET | `/households/:id` | Fiche foyer (membres, plannings, signalements liés) | ⏳ spec livrée, à brancher (lot 2) |
| GET | `/users` | Liste paginée des utilisateurs | ⏳ spec livrée, à brancher (lot 2) |
| GET | `/metrics/households-distribution` | Répartition des foyers par taille | ⏳ lot 3 |
| GET | `/metrics/retention-cohorts` | Cohortes de rétention | ⏳ lot 3 |
| GET | `/reports?status=` | Signalements (+ `recipe` aperçu, `reporter_name`) | ✅ onglet Modération |
| GET | `/recipes/:id` | Détail complet d'une recette signalée (pour juger) | ⏳ consommé, attend MenuFacile |
| POST | `/moderation/hide` | Masquer une recette | ✅ |
| POST | `/moderation/ban` | Bannir / débannir un user | ✅ |
| POST | `/moderation/resolve-report` | Résoudre un signalement | ✅ |
| GET | `/official-recipes` | Liste recettes officielles | ✅ onglet Recettes |
| GET | `/official-recipes/:id` | Détail complet (pré-remplit l'édition) | ⏳ consommé, attend MenuFacile |
| POST | `/official-recipes` | Créer une recette | ✅ |
| PATCH | `/official-recipes/:id` | Éditer (remplace ingredients/steps si fournis) | ✅ |
| DELETE | `/official-recipes/:id` | Supprimer | ✅ |
| GET | `/contact-messages?status=` | Boîte Aide & Contact | ✅ onglet Messages |
| POST | `/contact-messages/resolve` | Marquer lu/résolu/rouvrir | ✅ |
| GET | `/contact-messages/:id` | Fil complet (bulles user/admin) | ✅ ThreadDialog |
| POST | `/contact-messages/:id/reply` | Réponse in-app (temps réel) | ✅ body `{ body }` |

## Messagerie support à deux sens (onglet Messages, v7)

- **Liste des fils** filtrable (status + topic), badge « à traiter » = `metrics.contact.new`.
- **Ouvrir le fil** → `ThreadDialog` style messagerie : bulles user (gauche) / admin
  (droite), auto-refresh 15s (les réponses entrantes de l'utilisateur remontent seules).
- **Répondre** : `POST /contact-messages/:id/reply` `{ body }` → arrive en temps réel
  dans l'app du client. Le brouillon peut être **ajusté par l'IA** (cerveau Élio,
  edge function `elio-chat`) avant envoi.
- Quand l'utilisateur répond, son fil repasse en `new` → remonte dans « à traiter ».
- **Auto-refresh** : liste messages 30s, signalements 30s, métriques 60s, fil ouvert 15s
  (base MenuFacile externe → pas de Realtime Supabase via le guichet).

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

## Liste des foyers (onglet Foyers)

```
Composant HouseholdsTab (client)
  └─ useHouseholds({ limit, offset, search, sort, order, activity, official })
       └─ getHouseholds()  [Server Action]
            └─ callMenuFacileAdmin('/households?…')
       ◀─ { data: { items, total, limit, offset } }
```

- **Recherche** debouncée à 350 ms — une frappe ne déclenche pas un appel guichet.
- **`keepPreviousData`** : la page précédente reste affichée pendant le chargement de
  la suivante (pas de clignotement de la table).
- Tout changement de critère (recherche, filtre, tri) **remet la pagination à zéro** —
  sinon on atterrit sur une page qui n'existe plus dans le résultat filtré.
- **Export CSV** : `getAllHouseholds()` enchaîne les pages de 100 côté serveur (le
  guichet n'a pas d'endpoint d'export). Un garde-fou stoppe à 5 000 lignes et renvoie
  `truncated: true` → l'UI le **dit** à l'utilisateur au lieu de livrer un fichier
  silencieusement incomplet.
- **Dates** : le guichet renvoie le format `+00:00` (et non `Z`). `new Date()` les lit
  correctement — ne pas comparer de littéraux `Z` dans un test.

## Réponses

- Succès : `{ data: … }` ou `{ ok: true }`
- Erreur : `{ error: "…" }` + status HTTP 400/401/404/500/503 → converti en
  `ActionError` côté Server Action.
```
