# MenuFacile — Guide

Module **cockpit** du Hub MonprojetPro permettant à MiKL d'administrer le produit
externe **MenuFacile** (application de recettes) sans jamais accéder directement à
sa base de données.

## Principe

MenuFacile possède sa **propre base Supabase**, totalement séparée du Hub. Toute
l'administration passe par un **guichet** : une API sécurisée `admin-api` exposée
par MenuFacile. Le Hub n'envoie qu'un seul secret (header `Authorization: Bearer …`)
et ne reçoit que du JSON. Aucune clé Supabase n'est partagée.

```
Hub (ce module) ──HTTP + Bearer──▶ guichet admin-api ──▶ base MenuFacile
```

## Écrans (page unique à onglets `/modules/menu-facile`)

1. **Tableau de bord** — KPIs (`GET /metrics`) : utilisateurs, recettes, foyers,
   modération, top recettes. ✅
2. **Foyers** — liste des foyers (`GET /households`) : nom, membres, recettes, repas
   planifiés, amitiés, date de création, dernière activité, statut (actif/dormant/banni)
   et marqueur « officiel ». Recherche (nom ou email d'un membre), filtres d'activité
   (7 j / 30 j / dormants / officiels), tri sur 5 colonnes, pagination 50 par page,
   export CSV. ✅
   > **Convention `null` ≠ `0`** : le guichet renvoie `null` pour « non calculable » et
   > un nombre pour une vraie valeur, y compris zéro. L'affichage montre « — » sur `null`.
   > Ne jamais écrire `?? 0` sur ces compteurs : cela ferait passer « inconnu » pour
   > « aucun », ce qui est un mensonge silencieux dans un cockpit de pilotage.
3. **Modération** — signalements (`GET /reports`) + actions : masquer/réafficher une
   recette, résoudre un signalement, bannir/débannir un utilisateur. ✅
4. **Recettes officielles** — liste (`GET /official-recipes`) + création (POST),
   édition (PATCH), suppression (DELETE), avec ingrédients & étapes dynamiques. ✅

> Note édition : un PATCH ne remplace les ingrédients/étapes que s'ils sont fournis.
> Le formulaire ne les envoie donc qu'avec le toggle « Remplacer la liste » activé,
> pour ne jamais écraser l'existant par erreur.

5. **Messages** — boîte Aide & Contact (`GET /contact-messages`) : filtres par statut
   (nouveaux/lus/résolus) et par sujet (bug/amélioration/autre), marquer lu/résolu/rouvrir
   (`POST /contact-messages/resolve`), répondre par email (`mailto:`). ✅
   Le compteur « messages à traiter » remonte aussi sur le Tableau de bord (`metrics.contact`).

## Configuration

Deux variables d'environnement **côté serveur uniquement** (jamais `NEXT_PUBLIC_`) :

| Variable | Rôle |
|----------|------|
| `MENUFACILE_ADMIN_API_URL` | URL de base du guichet admin-api |
| `MENUFACILE_ADMIN_API_SECRET` | Secret Bearer fourni par MenuFacile |

Le helper `callMenuFacileAdmin()` (fichier `actions/admin-client.ts`, protégé par
`import 'server-only'`) est le **seul** point d'accès au guichet.
