# monthly-billing — Edge Function

Facturation mensuelle du coaching One+ (chantier Élio Hub / Coaching, 2026-07-06).
Tourne **le 1er du mois** via pg_cron, en service_role.

## Deux jobs

### ① Accrual des crédits coaching (clients One+)

Pour chaque client avec `client_configs.elio_tier = 'one_plus'` ET `clients.status = 'active'` :

- INSERT `coaching_credit_ledger` `{ delta: coaching_monthly_credits, reason: 'monthly_accrual', created_by: 'monthly-billing' }`
- **Idempotent** : skip si un accrual `monthly_accrual` existe déjà pour le mois courant
  (check `created_at >= début du mois`). Relancer la fonction dans le mois est sans effet.
- Skip si `coaching_monthly_credits <= 0`.

### ② Facturation des séances hors forfait

Pour chaque client ayant des `billable_items` `status='pending'` créés **avant le 1er du
mois courant** (= mois écoulé) :

1. **UNE** facture Pennylane par client (`POST /customer_invoices`, pattern
   `send-lab-invoice.ts`) — N lignes de 45 € HT (une par séance), échéance +30 jours,
   `pdf_invoice_free_text` = `[FOXEO_COACHING] Séances coaching supplémentaires — {mois}`.
2. Envoi email Pennylane best-effort (`/send_by_email`, non bloquant).
3. Mirror `billing_sync` **AVEC `client_id`** (sinon la row est invisible pour le
   client — RLS `billing_sync_select_owner`).
4. Items passés en `status='invoiced'` + `pennylane_invoice_id` + `invoiced_at`
   (filtre `.eq('status','pending')` → pas de double facturation).
5. Notification client `type='payment'` (`recipient_id` = `auth_user_id`, insert
   service_role sans `.select()`).
6. `activity_logs` : `action='coaching_invoice_created'` (succès) ou
   `type='monthly_billing_error'` (échec, pattern billing-sync).

**Un échec sur un client ne bloque pas les autres** (try/catch par client + log).

Cas non géré volontairement : client sans `pennylane_customer_id` → skip + log
(pas d'auto-création de compte Pennylane dans un cron ; le compte est créé par les
flows opérateur — devis, abonnement, facture Lab).

## Configuration cron (pg_cron)

Exécuter dans le SQL Editor Supabase après déploiement (voir aussi `docs/prod-checklist.md`) :

```sql
SELECT cron.schedule(
  'monthly-billing-cron',
  '0 5 1 * *',  -- le 1er du mois à 05:00 UTC ≈ 6h Paris (hiver) / 7h (été)
  $$SELECT net.http_post(
    url:='https://<PROJECT_REF>.supabase.co/functions/v1/monthly-billing',
    headers:='{"Authorization":"Bearer <ANON_OR_SERVICE_KEY>","Content-Type":"application/json"}'::jsonb,
    body:='{}'::jsonb
  )$$
);
```

## Variables d'environnement requises

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Injectée automatiquement |
| `SUPABASE_SERVICE_ROLE_KEY` | Injectée automatiquement (bypass RLS) |
| `PENNYLANE_API_TOKEN` | Token API Pennylane v2 — **secret Edge Functions ≠ env Vercel** |
| `PENNYLANE_API_URL` | Optionnel — défaut `https://app.pennylane.com/api/external/v2` |

## Tests

La logique pure (fenêtre temporelle, agrégation par client, lignes de facture)
vit dans `monthly-billing-logic.ts`, testée par vitest
(`monthly-billing-logic.test.ts`) — même pattern que `health-check-cron`.

## Dépendances schéma

- `billable_items` (migration `20260706121000_billable_items.sql` — équipier Billing)
- `coaching_credit_ledger` + `client_configs.coaching_monthly_credits`
  (migration `20260706120000_coaching_credits.sql` — équipier Coaching)
