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

0. **Vues d'ensemble** (bas du Tableau de bord) — répartition des foyers par taille
   (`GET /metrics/households-distribution`) et cohortes de rétention
   (`GET /metrics/retention-cohorts`). ✅
   > Ces deux endpoints sont les plus récents du guichet. S'ils répondent 404, la
   > section affiche « le guichet n'expose pas encore cette donnée » **au lieu de
   > disparaître** : une section absente sans explication ressemble à un bug.
   > `retry: false` — inutile de rappeler trois fois un endpoint qui n'existe pas.
   > **Détail recettes — deux axes, jamais additionnés.** `official` se définit par
   > PROPRIÉTAIRE (le foyer officiel), `public` par VISIBILITÉ. Les deux valent 63
   > aujourd'hui par accident de données, pas par construction. Le bloc les sépare donc
   > en « à qui elles appartiennent » (officielles + chez les foyers = total) et « qui
   > peut les voir » (publiques, masquées). Empiler les cinq compteurs côte à côte
   > donnait envie de les additionner et faisait conclure à un double comptage.
   > « Chez les foyers » est dérivé (`total - official`) ; la répartition
   > créations / copies **n'est pas dérivable** et n'est donc pas affichée.
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

   **Fiche foyer** (clic sur une ligne, `GET /households/:id`) : membres (créateur
   repéré, bannis signalés, dernière connexion), 8 derniers plannings, signalements
   émis et reçus. Un bloc absent de la réponse est affiché comme « donnée non fournie
   par le guichet » — pas comme une liste vide, qui ferait croire à tort que le foyer
   n'a rien.
3. **Utilisateurs** — liste des comptes (`GET /users`) : email/pseudo, foyer de
   rattachement (cliquable → ouvre la fiche foyer), recettes créées, activité sur
   30 jours, inscription, dernière connexion, statut, email vérifié. Recherche,
   filtres (actifs / bannis / email non vérifié), tri, pagination. ✅
   > **Activité 30 j** : le guichet expose `sign_ins_30d` (aujourd'hui `null` —
   > l'historique de connexions n'est pas conservé) et `active_days_30d`. L'UI affiche
   > celui qui est disponible **en précisant lequel** (« 18 conn. » vs « 12 j actifs »),
   > plutôt qu'un chiffre nu dont personne ne saurait ce qu'il compte.
4. **Modération** — signalements (`GET /reports`) + actions : masquer/réafficher une
   recette, résoudre un signalement, bannir/débannir un utilisateur. ✅
5. **Recettes officielles** — liste (`GET /official-recipes`) + création (POST),
   édition (PATCH), suppression (DELETE), avec ingrédients & étapes dynamiques. ✅

> Note édition : un PATCH ne remplace les ingrédients/étapes que s'ils sont fournis.
> Le formulaire ne les envoie donc qu'avec le toggle « Remplacer la liste » activé,
> pour ne jamais écraser l'existant par erreur.

6. **Messages** — boîte Aide & Contact (`GET /contact-messages`) : filtres par statut
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
