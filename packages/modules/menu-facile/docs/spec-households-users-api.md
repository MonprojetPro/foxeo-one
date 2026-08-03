# Spécification — endpoints « Foyers & Utilisateurs » du guichet admin-api MenuFacile

> Commande émise par le Hub MonprojetPro (module `menu-facile`) le 2026-08-02.
> Le cockpit Hub n'affiche aujourd'hui que les totaux de `GET /metrics`. Ces cinq
> endpoints débloquent les écrans « Foyers » et « Utilisateurs ».

## Règles transverses (identiques au contrat existant)

- **Auth** : `Authorization: Bearer <MENUFACILE_ADMIN_API_SECRET>` — même secret que les endpoints actuels.
- **Réponses** : `{ "data": … }` en succès, `{ "error": "message lisible" }` + code HTTP ≠ 2xx en échec.
- **Nommage** : `snake_case` pour tous les champs JSON.
- **Dates** : ISO 8601 UTC (`2026-08-02T16:57:51.000Z`).
- **Donnée non calculable** : renvoyer `null`, **jamais `0`**. Le Hub affiche « — » sur `null` et un vrai chiffre sur `0` : confondre les deux ferait afficher « 0 recette » à la place de « inconnu ».
- **Pagination** : `limit` (défaut 50, **plafonné à 100**), `offset` (défaut 0). L'enveloppe renvoie toujours `total` pour que le Hub calcule le nombre de pages.
- **Rétro-compatibilité** : le Hub tolère l'absence d'un champ optionnel (il masque la colonne). Livrer les P1 d'abord est parfaitement possible.

---

## 1. `GET /households` — liste des foyers  ⭐ P1

### Paramètres de requête

| Param | Valeurs | Défaut | Note |
|-------|---------|--------|------|
| `limit` | 1–100 | 50 | |
| `offset` | ≥ 0 | 0 | |
| `search` | texte libre | — | Cherche dans le **nom du foyer** ET l'**email de ses membres** |
| `sort` | `last_activity_at` \| `created_at` \| `name` \| `members_count` \| `recipes_count` | `last_activity_at` | |
| `order` | `asc` \| `desc` | `desc` | |
| `activity` | `7d` \| `30d` \| `dormant` \| `all` | `all` | `dormant` = aucune activité depuis > 30 jours |
| `official` | `true` \| `false` | — | Absent = tous |

### Réponse

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Famille Dupont",
        "created_at": "2026-03-14T09:12:00.000Z",
        "last_activity_at": "2026-08-01T19:40:00.000Z",
        "members_count": 4,
        "recipes_count": 27,
        "planned_meals_count": 138,
        "friendships_count": 3,
        "is_official": false,
        "status": "active"
      }
    ],
    "total": 128,
    "limit": 50,
    "offset": 0
  }
}
```

### Définitions à respecter (important — sinon les chiffres ne veulent rien dire)

- **`last_activity_at`** = date la plus récente parmi : dernière connexion d'un membre, création/modification d'une recette, modification du planning, génération d'une liste de courses. Si rien n'est traçable → `null`.
- **`status`** — dérivé, dans cet ordre de priorité :
  1. `"banned"` si **tous** les membres du foyer sont bannis ;
  2. `"dormant"` si `last_activity_at` > 30 jours ;
  3. `"active"` sinon.
- **`planned_meals_count`** = nombre total de repas positionnés dans le planning depuis la création (pas la semaine en cours).

---

## 2. `GET /households/:id` — fiche d'un foyer  ⭐ P1

Renvoie **tous les champs de l'item de liste**, plus :

```json
{
  "data": {
    "id": "uuid",
    "name": "Famille Dupont",
    "…": "(tous les champs de la liste)",

    "members": [
      {
        "id": "uuid",
        "email": "marie@exemple.fr",
        "display_name": "Marie",
        "role": "owner",
        "joined_at": "2026-03-14T09:12:00.000Z",
        "last_sign_in_at": "2026-08-01T19:40:00.000Z",
        "is_banned": false
      }
    ],

    "recent_plannings": [
      { "week_start": "2026-07-27", "meals_filled": 11, "updated_at": "2026-08-01T19:40:00.000Z" }
    ],

    "reports": {
      "emitted": [
        { "id": "uuid", "recipe_id": "uuid", "recipe_name": "Tarte aux poireaux",
          "reason": "inapproprié", "status": "pending", "created_at": "2026-07-30T…" }
      ],
      "received": []
    }
  }
}
```

- `role` : `"owner"` (créateur du foyer) ou `"member"`.
- `recent_plannings` : les **8 dernières semaines**, la plus récente en premier. `week_start` = lundi de la semaine, format `YYYY-MM-DD`.
- `reports.emitted` = signalements faits **par** un membre du foyer ; `reports.received` = signalements visant une recette **du** foyer. Mêmes champs que `GET /reports` existant, pour réutiliser l'affichage du Hub.
- 404 avec `{ "error": "Foyer introuvable" }` si l'id n'existe pas.

---

## 3. `GET /users` — liste des utilisateurs  ⭐ P1

### Paramètres de requête

| Param | Valeurs | Défaut |
|-------|---------|--------|
| `limit` / `offset` | idem foyers | 50 / 0 |
| `search` | email ou pseudo | — |
| `sort` | `last_sign_in_at` \| `created_at` \| `email` \| `recipes_count` | `last_sign_in_at` |
| `order` | `asc` \| `desc` | `desc` |
| `status` | `active` \| `banned` \| `all` | `all` |
| `verified` | `true` \| `false` | — |

### Réponse

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "email": "marie@exemple.fr",
        "display_name": "Marie",
        "household_id": "uuid",
        "household_name": "Famille Dupont",
        "created_at": "2026-03-14T09:12:00.000Z",
        "last_sign_in_at": "2026-08-01T19:40:00.000Z",
        "is_banned": false,
        "email_verified": true,
        "recipes_count": 12,
        "sign_ins_30d": 18
      }
    ],
    "total": 341,
    "limit": 50,
    "offset": 0
  }
}
```

- `household_id` / `household_name` : `null` si l'utilisateur n'est rattaché à aucun foyer.
- **`sign_ins_30d`** = nombre de connexions distinctes sur les 30 derniers jours. Si l'historique de connexions n'est pas conservé → renvoyer `null` (le Hub masquera la colonne). **Ne pas approximer.**

---

## 4. `GET /metrics/households-distribution` — répartition par taille  (P2)

```json
{
  "data": {
    "generated_at": "2026-08-02T16:57:51.000Z",
    "buckets": [
      { "size": "1",   "households": 42 },
      { "size": "2",   "households": 51 },
      { "size": "3-4", "households": 28 },
      { "size": "5+",  "households": 7  }
    ]
  }
}
```

Les 4 tranches exactement, toujours présentes même à 0. La somme doit égaler `households.total` de `GET /metrics`.

---

## 5. `GET /metrics/retention-cohorts` — cohortes de rétention  (P2, le plus lourd)

```json
{
  "data": {
    "generated_at": "2026-08-02T16:57:51.000Z",
    "unit": "household",
    "cohorts": [
      {
        "cohort": "2026-06",
        "signups": 120,
        "retained": [
          { "month_offset": 0, "active": 120 },
          { "month_offset": 1, "active": 68 },
          { "month_offset": 2, "active": 41 }
        ]
      }
    ]
  }
}
```

- **`cohort`** = mois d'inscription (`YYYY-MM`), les 12 derniers mois maximum.
- **`unit`** : `"household"` (préféré) ou `"user"` — le Hub affiche le libellé correspondant, il ne devine pas.
- **« actif »** = au moins une action tracée dans le mois considéré (même définition que `last_activity_at`). Cette définition doit être **écrite dans la réponse ou la doc** : c'est elle qui donne son sens au chiffre.
- `month_offset: 0` = le mois d'inscription lui-même, donc `active` y égale toujours `signups`.

---

---

## 6. Demandes complémentaires — actions depuis la fiche foyer (ajout du 2026-08-03)

Le cockpit sait déjà **bannir/débannir un membre**, **masquer/réafficher une recette
signalée** et **résoudre un signalement** : ces trois actions passent par les endpoints
`/moderation/*` existants. Deux actions restent impossibles faute d'endpoint.

### 6.1 `PATCH /households/:id` — marquer un foyer comme officiel

```
Corps : { "is_official": true }        // ou false pour retirer le marqueur
Réponse : { "data": { …le foyer mis à jour, même forme que GET /households/:id } }
```

Aujourd'hui `is_official` est en lecture seule : le cockpit l'affiche mais ne peut pas
le changer, il faut passer par la base. Un `PATCH` suffirait.

### 6.2 `POST /households/:id/message` — écrire au foyer depuis le Hub

```
Corps : { "body": "texte du message" }
Réponse : { "ok": true }
```

Le cockpit ne peut aujourd'hui que proposer un `mailto:` vers l'email du membre — donc
sortir de l'application et écrire depuis une boîte mail, sans trace dans MenuFacile.
Un message in-app arriverait dans le fil de l'utilisateur, exactement comme les réponses
de `POST /contact-messages/:id/reply`, avec l'historique conservé des deux côtés.

**Priorité** : 6.2 avant 6.1 — pouvoir joindre un utilisateur qui décroche vaut plus
qu'un marqueur de démonstration.

## Performance

Les listes seront triées et filtrées à chaque affichage. Prévoir des index sur : date de création du foyer, date de dernière connexion des utilisateurs, et le champ servant à `last_activity_at`. Les compteurs (`recipes_count`, `planned_meals_count`, `friendships_count`) sur des tables qui grossissent gagnent à être pré-agrégés plutôt que recalculés en `COUNT` à chaque requête.

## Ce que le Hub fait de son côté (rien à livrer)

- **Export CSV** : le Hub boucle sur les pages et génère le fichier lui-même. Aucun endpoint d'export à créer.
- **Rendu, tri visuel, pastilles de statut, graphiques** : entièrement côté cockpit.
