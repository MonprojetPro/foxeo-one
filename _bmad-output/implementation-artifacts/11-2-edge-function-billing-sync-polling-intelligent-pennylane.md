# Story 11.2: Edge Function billing-sync — Polling intelligent Pennylane

Status: done

## Story

As a **MiKL (operateur)**,
I want **que les donnees de facturation Pennylane soient synchronisees automatiquement dans MonprojetPro**,
so that **le Hub et les dashboards clients affichent des donnees de facturation a jour sans action manuelle**.

## Acceptance Criteria

**Given** Pennylane n'a pas de webhooks publics
**When** la strategie de synchronisation est mise en place
**Then** une Supabase Edge Function `billing-sync` est creee :
- Execution cron toutes les 5 minutes
- Utilise les changelog endpoints Pennylane (`/changelogs/customer_invoices`, `/changelogs/customers`) avec `start_date` = dernier sync
- Compare avec la table miroir `billing_sync` dans Supabase
- UPSERT des enregistrements modifies
- Supabase Realtime propage les changements (via `updated_at` trigger)

**Given** la table miroir `billing_sync` n'existe pas
**When** la migration `00063` est creee
**Then** :
```sql
CREATE TABLE billing_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('quote','invoice','subscription','customer')),
  pennylane_id TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  status TEXT NOT NULL,
  data JSONB NOT NULL,
  amount INTEGER,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, pennylane_id)
);
CREATE INDEX idx_billing_sync_client ON billing_sync(client_id);
CREATE INDEX idx_billing_sync_type_status ON billing_sync(entity_type, status);
ALTER TABLE billing_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY billing_sync_select_operator ON billing_sync FOR SELECT USING (is_operator());
CREATE POLICY billing_sync_select_owner ON billing_sync FOR SELECT USING (
  client_id = (SELECT id FROM clients WHERE auth_user_id = auth.uid())
);
CREATE TRIGGER trg_billing_sync_updated_at BEFORE UPDATE ON billing_sync
  FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();
```

**Given** l'Edge Function s'execute
**When** elle detecte un changement (operation: 'insert' | 'update' | 'delete')
**Then** :
1. UPSERT dans `billing_sync` avec les nouvelles donnees
2. Realtime notifie les frontends (via trigger `updated_at`)
3. TanStack Query invalide les queries `['billing', ...]`

**Given** l'Edge Function rencontre une erreur
**When** Pennylane API est indisponible ou rate-limite (429)
**Then** :
1. L'erreur est loggee dans `activity_logs` (type 'billing_sync_error')
2. L'Edge Function retente au prochain cycle (5 min)
3. Si 3 echecs consecutifs → notification MiKL : "Alerte — synchronisation facturation en erreur"

**Given** un bouton "Rafraichir" est clique
**When** une Server Action `triggerBillingSync(clientId?)` s'execute
**Then** un sync immediat est declenche (invoke Edge Function) pour le client specifique ou tous les clients

## Tasks / Subtasks

- [x] Creer la migration `00063` — table `billing_sync` (AC: #2)
  - [x] Creer `supabase/migrations/00063_create_billing_sync.sql`
  - [x] Table avec tous les champs, index, RLS, trigger `updated_at`

- [x] Creer l'Edge Function `billing-sync` (AC: #1, #3)
  - [x] Creer `supabase/functions/billing-sync/index.ts`
  - [x] Lire `billing_sync_state` depuis `system_config` (last_sync_at par entity_type)
  - [x] Appeler `GET /changelogs/customer_invoices?start_date={lastSync}` avec cursor pagination
  - [x] Appeler `GET /changelogs/customers?start_date={lastSync}`
  - [x] Batch fetch des entites modifiees : `GET /customer_invoices?filter=[{"field":"id","operator":"in","value":[...]}]`
  - [x] UPSERT dans `billing_sync` pour chaque entite modifiee
  - [x] Mettre a jour `last_sync_at` dans `system_config`
  - [x] Gestion erreur 429 : respecter `retry-after` header
  - [x] Logging `activity_logs` pour erreurs

- [x] Configurer le cron pg_cron (AC: #1)
  - [x] Ajouter dans la migration 00063 ou dans un fichier SQL de setup :
    ```sql
    SELECT cron.schedule('billing-sync-cron','*/5 * * * *',
      $$SELECT net.http_post(url:='<SUPABASE_URL>/functions/v1/billing-sync',
        headers:='{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb)$$);
    ```
  - [x] Documenter la config cron dans `supabase/functions/billing-sync/README.md`

- [x] Creer la Server Action `triggerBillingSync` (AC: #5)
  - [x] Creer `packages/modules/facturation/actions/trigger-billing-sync.ts`
  - [x] Auth check : `is_operator()` seulement
  - [x] Invoke Edge Function billing-sync via `supabase.functions.invoke('billing-sync', ...)`
  - [x] Retourner `ActionResponse<{ synced: number }>`

- [x] Creer les tests unitaires
  - [x] Test Edge Function billing-sync : parsing changelog, UPSERT, gestion 429, 3 echecs consecutifs (17 tests)
  - [x] Test `triggerBillingSync` : auth check, invocation, erreur (4 tests)

## Dev Notes

### Architecture Patterns

- **Pattern changelog Pennylane** : `GET /changelogs/customer_invoices?start_date={ts}` → `operation: 'insert'|'update'|'delete'`. Pour les `delete`, marquer `billing_sync.status='deleted'` (ne pas supprimer la ligne — audit trail).
- **Pattern batch fetch** : collecter les IDs depuis le changelog, puis 1 seul appel avec `filter=[{"field":"id","operator":"in","value":[id1,id2,...]}]` (max 100 IDs par batch). Reduire les appels API Pennylane.
- **Rate limiting** : 25 req/5s. Le cron toutes les 5 min avec ~10 entites modifiees → jamais problematique. Monitorer `ratelimit-remaining` quand on approche les limites.
- **Header migration 2026** : ajouter `X-Use-2026-API-Changes: true` sur tous les appels (deadline 1er juillet 2026).
- **Pagination changelog** : utiliser `has_more` + `next_cursor` (cursor-based, max 1000 items). Ne pas utiliser `start_date` ET `cursor` ensemble (contrainte Pennylane).
- **Realtime** : le trigger `updated_at` sur `billing_sync` sufffit pour declencher le Realtime Postgres Changes. Le front s'abonne via `supabase.channel('billing_sync').on('postgres_changes', ...)`.
- **system_config** : table cree en Story 12.1. Pour cette story, si `system_config` n'existe pas encore, stocker `last_sync_at` dans un fichier JSON dans Supabase Storage (workaround temporaire) ou dans une table `billing_sync_state` simple.

### Source Tree

```
supabase/migrations/
└── 00063_create_billing_sync.sql             # CREER

supabase/functions/billing-sync/
└── index.ts                                  # CREER: Edge Function cron

packages/modules/facturation/actions/
├── trigger-billing-sync.ts                   # CREER: Server Action
└── trigger-billing-sync.test.ts              # CREER: tests
```

### Existing Code Findings

- **Pattern Edge Function cron** : voir `supabase/functions/check-inactivity/index.ts` et `supabase/functions/elio-alerts-cron/index.ts` — meme pattern `Deno.serve()` + `createClient(URL, SERVICE_ROLE_KEY)`.
- **Pattern cron pg_cron** : `SELECT cron.schedule('job-name', '*/5 * * * *', $$SELECT net.http_post(...)$$)` — voir doc existante dans check-inactivity.
- **fn_update_updated_at()** : trigger existant (migration 00006), utiliser pour `billing_sync`.
- **billing-proxy.ts** (Story 11.1) : les fonctions `listInvoices`, `listQuotes` seront reutilisees par l'Edge Function pour les batch fetches.
- **Client Pennylane** : `packages/modules/facturation/config/pennylane.ts` (Story 11.1) — importer dans l'Edge Function (attention : Edge Function = Deno, pas Node. Utiliser `fetch` natif plutot que le client module si import ESM complexe).

### Technical Constraints

- **Edge Function = Deno** : pas de `require()`, utiliser `import` ESM. Le client HTTP Pennylane cree en Story 11.1 est Node/Next.js — dans l'Edge Function, reimplementer les appels Pennylane avec `fetch` natif Deno pour eviter les complications d'import.
- **SERVICE_ROLE_KEY dans Edge Function** : bypass RLS pour les UPSERTs dans `billing_sync`. Normal pour un cron systeme.
- **Retention changelog Pennylane** : 4 semaines max. Si le cron ne tourne pas pendant >4 semaines, faire un full sync (sans `start_date`).
- **Premier sync** : sans `start_date`, Pennylane retourne les changements des 4 dernières semaines. Pour le seed initial, faire un `GET /customer_invoices` complet (pas le changelog).

### References

- [Source: epic-11-facturation-abonnements-stories-detaillees.md#Story 11.2]
- [Pennylane Changelog: https://pennylane.readme.io/docs/tracking-data-changes-with-pennylane-api]
- [Source: supabase/functions/elio-alerts-cron/index.ts] — pattern Edge Function cron reference
- [Source: supabase/migrations/00006_create_updated_at_triggers.sql] — fn_update_updated_at()

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage.

### Completion Notes List

- Migration `00063` créée : table `billing_sync` (entity_type, pennylane_id, client_id, status, data, amount, RLS, trigger updated_at) + table `billing_sync_state` (RLS, trigger updated_at — workaround system_config Story 12.1)
- Edge Function `billing-sync` (Deno) : polling changelog invoices + customers avec cursor pagination, batch fetch 100 IDs, UPSERT `billing_sync`, soft delete (status='deleted'), gestion 429 avec retry-after, logging `activity_logs`, notification opérateur après 3 erreurs consécutives
- Logique métier extraite dans `billing-sync-logic.ts` (testable Node/Vitest sans imports Deno)
- Server Action `triggerBillingSync` : auth check is_operator() (pattern assertOperator), invoke Edge Function avec clientId optionnel, retour `ActionResponse<{ synced: number }>`
- README avec config pg_cron et variables d'env documentées
- 21 tests : 17 (billing-sync-logic) + 4 (triggerBillingSync)
- **CR fixes (Opus 4.6)** : H1 — clientId résolu en pennylane_customer_id + filtrage entités, H2 — erreur state isolée par entity_type (pas d'incrémentation globale), M1 — RLS + trigger updated_at sur billing_sync_state, M2 — try/catch global dans handler, M3 — fetchChangelog signale les erreurs (champ error), M4 — pattern assertOperator aligné sur billing-proxy.ts

### File List

- supabase/migrations/00063_create_billing_sync.sql (NEW)
- supabase/functions/billing-sync/index.ts (NEW)
- supabase/functions/billing-sync/README.md (NEW)
- packages/modules/facturation/actions/trigger-billing-sync.ts (NEW)
- packages/modules/facturation/actions/trigger-billing-sync.test.ts (NEW)
- packages/modules/facturation/utils/billing-sync-logic.ts (NEW)
- packages/modules/facturation/utils/billing-sync-logic.test.ts (NEW)
- _bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIED)
