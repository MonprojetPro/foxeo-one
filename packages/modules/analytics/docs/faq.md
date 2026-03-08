# Module Analytics — FAQ

## Les données sont-elles en temps réel ?

Non. Les métriques sont mises en cache 5 minutes (TanStack Query `staleTime`). Rechargez la page pour forcer un refresh.

## Pourquoi certains chiffres MRR sont nuls ?

Le MRR nécessite que le module Facturation (Epic 11) soit actif et que `billing_sync` soit alimenté par l'Edge Function `billing-sync`.

## Les données sont-elles anonymisées ?

Pour les stats globales (count par entity_type, conversations Élio), oui — aucun ID client n'est exposé. Pour l'engagement, les `actor_id` des clients les plus actifs sont affichés (tronqués à 8 chars). Seul MiKL voit ces données (RLS opérateur).

## Les requêtes sont-elles performantes ?

Un `LIMIT 10000` est appliqué sur toutes les requêtes. Pour les longues périodes (1 an) avec beaucoup de logs, une vue matérialisée pourra être ajoutée si nécessaire (hors MVP).
