# Module Admin — Guide

Module d'administration système pour les opérateurs Foxeo (MiKL).

## Fonctionnalités

- **Provisioning instances One** : création d'instances Supabase + Vercel dédiées lors de la graduation
- **Monitoring instances** : surveillance santé et usage (Story 12.7)
- **Logs d'activité** : audit trail global (Story 12.1)

## Provisioning (MVP)

Pour l'instant (Story 9.1), `provisionOneInstance()` est un **stub MVP** qui :
1. Génère un slug depuis le nom d'entreprise
2. Crée une entrée `client_instances` avec status='active' (simulation)
3. Retourne l'URL de l'instance

L'implémentation complète (création Supabase, migrations DB, déploiement Vercel, health check) est prévue en **Story 12.6**.
