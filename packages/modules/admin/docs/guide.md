# Module Admin — Guide

Module d'administration système pour les opérateurs MonprojetPro (MiKL).

## Fonctionnalités

- **Provisioning instances One** : création d'instances Supabase + Vercel dédiées lors de la graduation
- **Monitoring instances** : surveillance santé, usage CPU/mémoire et seuils d'alerte (Story 12.7)
- **Logs d'activité** : audit trail global par client — filtrage, recherche, export (Story 12.1)
- **Export données client** : génération ZIP RGPD complet à la demande (Story 12.2)
- **Mode maintenance** : blocage temporaire d'accès pour maintenance planifiée
- **Templates** : gestion des parcours Lab réutilisables et emails automatiques (Story 12.3)
- **Analytics** : métriques usage et tableaux de bord Hub (Story 12.4)

## Provisioning Instance One

Le provisioning crée une instance One dédiée pour un client diplômé du Lab.

**Flux complet (Story 12.6)** :
1. MiKL déclenche la graduation depuis la fiche client CRM
2. `provisionOneInstance()` appelle l'API Supabase Management pour créer un projet
3. Les migrations DB sont lancées sur le nouveau projet
4. Un déploiement Vercel est créé sur `{slug}.monprojet-pro.com`
5. Un health check valide l'activation — status → `active`

**Stub MVP** (avant Story 12.6) : crée directement l'entrée `client_instances` avec status `active`.

## Monitoring & Alertes

Le monitoring surveille en temps réel les instances One actives.

**Métriques surveillées** :
- CPU et mémoire (seuils configurables dans `system_config`)
- Uptime et latence API
- Nombre d'utilisateurs actifs

**Alertes** :
- Création automatique dans `system_alerts` si seuil dépassé
- Notification in-app MiKL
- Email d'escalade si l'alerte n'est pas acquittée dans les 30 minutes

## Logs d'Activité

Audit trail complet de toutes les actions sur la plateforme.

**Filtrage disponible** :
- Par client (recherche par nom ou email)
- Par type d'action (`data_export_requested`, `module_activated`, etc.)
- Par plage de dates

**Mode maintenance** :
- Activé/désactivé via `system_config.maintenance_mode`
- Redirige tous les accès client vers la page `/maintenance`
- MiKL reste accessible (middleware vérifie `is_operator()`)
