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
   modération, top recettes. ✅ disponible.
2. **Modération** — signalements + actions (masquer / bannir / résoudre). 🔜
3. **Recettes officielles** — liste + création / édition / suppression. 🔜

## Configuration

Deux variables d'environnement **côté serveur uniquement** (jamais `NEXT_PUBLIC_`) :

| Variable | Rôle |
|----------|------|
| `MENUFACILE_ADMIN_API_URL` | URL de base du guichet admin-api |
| `MENUFACILE_ADMIN_API_SECRET` | Secret Bearer fourni par MenuFacile |

Le helper `callMenuFacileAdmin()` (fichier `actions/admin-client.ts`, protégé par
`import 'server-only'`) est le **seul** point d'accès au guichet.
