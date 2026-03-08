# Module Analytics — Guide

Module de statistiques d'usage pour l'opérateur MiKL (Hub uniquement).

## Fonctionnalités

- **Vue d'ensemble** : clients actifs Lab/One, taux de graduation, activités tracées
- **Modules par usage** : classement des entity_types les plus fréquents dans `activity_logs`
- **Agent Élio** : conversations totales, feedbacks positifs/négatifs, moyenne/jour
- **Engagement** : clients les plus actifs, clients inactifs >7j
- **MRR** : revenus récurrents estimés depuis `billing_sync`

## Filtre période

4 périodes disponibles : 7j / 30j / 90j / 1an. La période filtre les `activity_logs` via `WHERE created_at > NOW() - {period}`.

## Source de données

Toutes les métriques sont calculées depuis la table `activity_logs` (append-only). Pas de table analytics séparée.

## Accès

Réservé aux opérateurs via RLS (`is_operator()`). Inaccessible aux clients.
