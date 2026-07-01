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

## Réponses

- Succès : `{ data: … }` ou `{ ok: true }`
- Erreur : `{ error: "…" }` + status HTTP 400/401/404/500/503 → converti en
  `ActionError` côté Server Action.
```
