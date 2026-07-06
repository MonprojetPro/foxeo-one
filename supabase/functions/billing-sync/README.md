# billing-sync — Edge Function

Polling incrémental des changelogs Pennylane → UPSERT `billing_sync` → Supabase Realtime.

## Déclenchement

- **Cron automatique** : toutes les 5 minutes via pg_cron
- **Manuel** : `triggerBillingSync(clientId?)` Server Action (opérateur seulement)

## Configuration cron (pg_cron)

Exécuter dans le SQL Editor Supabase après déploiement :

```sql
SELECT cron.schedule(
  'billing-sync-cron',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url:='https://<PROJECT_REF>.supabase.co/functions/v1/billing-sync',
    headers:='{"Authorization":"Bearer <SERVICE_ROLE_KEY>","Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  )$$
);
```

Remplacer `<PROJECT_REF>` et `<SERVICE_ROLE_KEY>` par les valeurs du projet Supabase.

## Variables d'environnement requises

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL du projet Supabase (injectée automatiquement) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (bypass RLS) (injectée automatiquement) |
| `PENNYLANE_API_TOKEN` | Token API Pennylane v2 |

Configurer `PENNYLANE_API_TOKEN` via :
```bash
supabase secrets set PENNYLANE_API_TOKEN=your_token_here
```

## Logique de sync

1. Lit `billing_sync_state` pour `last_sync_at` par entity_type
2. Appelle `/changelogs/customer_invoices?start_date={last_sync_at}` (pagination cursor)
3. Appelle `/changelogs/customers?start_date={last_sync_at}`
4. Batch fetch des entités modifiées (max 100 IDs par requête)
5. **Subscriptions (chantier 2026-07-06)** : Pennylane n'expose pas de changelog
   `/changelogs/billing_subscriptions` → fetch direct **paginé complet** de
   `/billing_subscriptions` à chaque sync (volumétrie faible). Pas de soft delete
   pour cette entité (un abonnement arrêté remonte en `stopped`/`finished`).
6. **Résolution `client_id`** : chaque UPSERT résout `pennylane_customer_id` →
   `clients.id` (cache Map par run, y compris les miss). Sans `client_id`, les
   rows sont invisibles côté client (RLS `billing_sync_select_owner`) et pour
   les hooks filtrés par client.
7. UPSERT dans `billing_sync` (`entity_type + pennylane_id` = clé unique)
8. Soft delete pour `operation: 'delete'` (status → 'deleted') — invoice/customer
9. Met à jour `billing_sync_state.last_sync_at`

La logique pure (résolution client_id, montants subscription) vit dans
`sync-logic.ts`, testée par vitest (`sync-logic.test.ts`).

## Gestion des erreurs

- **429 Rate Limit** : retente au prochain cycle (5 min), incrémente `consecutive_errors`
- **3 échecs consécutifs** : notification MiKL dans `notifications` + log dans `activity_logs`
- **Erreurs loggées** dans `activity_logs` avec `type: 'billing_sync_error'`

## Realtime

Le trigger `trg_billing_sync_updated_at` sur la table `billing_sync` déclenche automatiquement Supabase Realtime Postgres Changes. Le frontend s'abonne via :

```typescript
supabase
  .channel('billing_sync')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'billing_sync' }, () => {
    queryClient.invalidateQueries({ queryKey: ['billing'] })
  })
  .subscribe()
```

## Header API 2026

Tous les appels Pennylane incluent `X-Use-2026-API-Changes: true` (deadline : 1er juillet 2026).
