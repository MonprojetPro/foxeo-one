# Module Admin — FAQ

## Q: Pourquoi le provisioning est-il un stub ?

Le provisioning complet (création Supabase project, migrations, déploiement Vercel, health check) est complexe et fait l'objet de la Story 12.6. Le stub MVP permet de valider le flux graduation de bout en bout sans bloquer l'Epic 9.

## Q: Que fait `provisionOneInstance` en MVP ?

Il crée une entrée dans `client_instances` avec status='active' et une URL simulée `{slug}.monprojet-pro.com`. Aucune infrastructure réelle n'est créée.

## Q: Comment activer le mode maintenance ?

Via l'interface Admin → Paramètres → Mode Maintenance, ou directement en DB :
```sql
UPDATE system_config SET value = 'true' WHERE key = 'maintenance_mode';
```
La désactivation se fait de la même manière ou depuis l'interface.

## Q: Les logs d'activité sont-ils illimités ?

Non. Les logs sont conservés 90 jours par défaut (configurable dans `system_config.log_retention_days`). Un job de nettoyage automatique supprime les entrées expirées chaque nuit.

## Q: Que contient l'export RGPD d'un client ?

L'export ZIP inclut : informations personnelles (JSON structuré), messages chat, conversations Élio, documents (métadonnées), parcours Lab, demandes de validation, notifications, consentements, historique des sessions, et depuis la Story 12.8, la documentation de tous les modules actifs du client.

## Q: Comment fonctionne le monitoring des seuils ?

Un Edge Function (`check-instance-health`) tourne toutes les 5 minutes et interroge les métriques de chaque instance. Si une métrique dépasse le seuil configuré dans `client_instances.alert_thresholds`, une alerte est créée dans `system_alerts` et une notification MiKL est envoyée.

## Q: Peut-on exporter les données d'un client archivé ?

Oui, tant que les données n'ont pas été anonymisées. Après la résiliation, les données sont conservées 30 jours avant anonymisation (Story 9.5c). Pendant cette période, MiKL peut déclencher un export via l'interface Admin.
