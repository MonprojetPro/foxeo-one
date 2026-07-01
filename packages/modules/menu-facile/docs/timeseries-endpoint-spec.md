# Spec — Endpoint « séries temporelles » pour les graphiques du cockpit MenuFacile

> **À implémenter côté MenuFacile (admin-api)**, pas côté Hub.
> Une fois cet endpoint en ligne, le Hub branche les graphiques (comptes/jour, DAU, temps passé) en un seul lot.
> Auteur : cockpit Hub MonprojetPro — 2026-07-01.

---

## Pourquoi ce document

Le cockpit Hub veut afficher des **graphiques temporels** :
- nouveaux comptes par jour,
- utilisateurs actifs par jour (DAU),
- temps passé moyen sur l'appli.

Le guichet actuel (`GET /metrics`) ne renvoie que des **totaux instantanés** (pas de série jour-par-jour). Il faut donc un **nouvel endpoint** qui renvoie une valeur **par jour**.

⚠️ **Important** : certaines de ces données n'existent que si MenuFacile les **enregistre**. Les nouveaux comptes se reconstruisent depuis les dates de création existantes, mais le DAU et le temps passé doivent être **loggés à partir de maintenant** — on ne peut pas les recalculer dans le passé.

---

## Endpoint demandé

```
GET /metrics/timeseries?days=30
Authorization: Bearer <MENUFACILE_ADMIN_API_SECRET>
```

- Même authentification que les autres endpoints admin (header `Authorization: Bearer <secret>`).
- Paramètre `days` (optionnel, défaut 30, max conseillé 90) = fenêtre en jours glissants.
- Fuseau horaire de référence : **Europe/Paris** (pour que la frontière « jour » soit cohérente).

### Réponse attendue (même enveloppe `{ data }` que les autres endpoints)

```json
{
  "data": {
    "range": { "from": "2026-06-02", "to": "2026-07-01", "days": 30 },
    "series": [
      {
        "date": "2026-06-02",
        "new_users": 12,
        "active_users": 87,
        "new_recipes": 5,
        "recipe_copies": 23,
        "avg_session_minutes": 7.4
      }
      // … une entrée par jour, ordre chronologique
    ]
  }
}
```

### Règles de format

- **Une entrée par jour civil**, ordre chronologique croissant.
- Les jours **sans activité** sont présents quand même avec des `0` (pas de trous — sinon le graphe saute des jours).
- `date` au format `YYYY-MM-DD`.
- En cas d'erreur : même format que les autres endpoints → `{ "error": "message" }` + code HTTP adapté.

---

## Détail des champs (par ordre de faisabilité)

### 🟢 Phase 1 — faisable tout de suite (données déjà en base)

Ces valeurs se reconstruisent depuis les colonnes `created_at` existantes — **rien à instrumenter**, elles existent déjà rétroactivement.

| Champ | Définition | Source |
|---|---|---|
| `new_users` | Nb de comptes créés ce jour | `COUNT(users WHERE created_at::date = jour)` |
| `new_recipes` | Nb de recettes créées ce jour | `COUNT(recipes WHERE created_at::date = jour)` |
| `recipe_copies` | Nb de copies de recettes ce jour | table des copies `WHERE created_at::date = jour` |

➡️ **Le graphique « nouveaux comptes par jour » que tu veux est dans cette phase = livrable rapidement.**

### 🟠 Phase 2 — nécessite un tracking à démarrer (pas rétroactif)

| Champ | Définition | Ce qu'il faut mettre en place |
|---|---|---|
| `active_users` | Utilisateurs uniques ayant ouvert l'appli ce jour (DAU) | Enregistrer l'activité : soit une colonne `last_active_at` mise à jour à chaque ouverture, soit une petite table `daily_activity (user_id, day)` en `UPSERT` à chaque session. **À partir du jour où c'est déployé** — les jours passés resteront à 0. |

### 🔴 Phase 3 — analytics (optionnel, le plus lourd)

| Champ | Définition | Ce qu'il faut mettre en place |
|---|---|---|
| `avg_session_minutes` | Durée moyenne d'une session ce jour | Tracking de sessions (début/fin ou heartbeat). Si absent, **omettre simplement le champ** : l'endpoint reste valide sans lui, le Hub n'affichera pas cette courbe. |

> Le champ `avg_session_minutes` est **facultatif**. Livrer l'endpoint avec seulement Phase 1 (+ Phase 2 si prête) est parfaitement suffisant pour démarrer.

---

## Ce qui se passe côté Hub une fois l'endpoint livré

Dès que `GET /metrics/timeseries` répond, le Hub (moi) :
1. Ajoute le type `MenuFacileTimeseries` au contrat.
2. Ajoute la Server Action + le hook TanStack (`useMenuFacileTimeseries`).
3. Branche 2-3 graphiques (recharts) dans l'onglet Tableau de bord : courbe nouveaux comptes/jour, courbe DAU, (option) temps passé.
4. Gère proprement l'état « pas encore de donnée » (jours à 0) pour ne jamais afficher de fausse courbe.

**Rien à faire de plus de ton côté après l'endpoint** — tu me dis « c'est en ligne » et je branche.

---

## Résumé pour le dev MenuFacile (version courte)

> Créer `GET /metrics/timeseries?days=30` (auth Bearer identique aux autres endpoints admin), renvoyant `{ data: { range, series[] } }` avec une entrée par jour civil (Europe/Paris, zéros inclus).
> **Priorité 1** (données déjà présentes via `created_at`) : `new_users`, `new_recipes`, `recipe_copies`.
> **Priorité 2** (à instrumenter, non rétroactif) : `active_users` (DAU) via `last_active_at` ou table `daily_activity`.
> **Priorité 3** (optionnel) : `avg_session_minutes` via tracking de sessions — omettre le champ si non dispo.
