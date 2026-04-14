# Story 9.5c: Anonymisation & rétention des données après résiliation

Status: done

## Story

As a **MiKL (opérateur)**,
I want **archiver, puis anonymiser les données des clients résiliés après la période de rétention**,
so that **la plateforme est conforme RGPD et les obligations comptables sont respectées**.

## Acceptance Criteria

**Given** un client est résilié (FR93)
**When** son compte est désactivé par MiKL
**Then** les données sont ARCHIVÉES (jamais supprimées immédiatement) :
1. `clients.status` → 'archived'
2. `clients.archived_at` → NOW()
3. Le client perd l'accès au dashboard (middleware bloque la connexion)
4. Les données restent en base (RLS empêche l'accès mais ne supprime pas)
5. Un champ `clients.retention_until` → NOW() + {periode_retention} est positionné
**And** la période de rétention par défaut est de **90 jours** (configurable)
**And** les obligations comptables sont respectées : les factures sont conservées **10 ans** indépendamment de la rétention client (conformité fiscale française)
**And** un événement 'client_archived' est loggé dans `activity_logs`

**Given** la période de rétention est écoulée
**When** un processus de nettoyage s'exécute (Supabase Edge Function, cron hebdomadaire)
**Then** les données du client sont anonymisées :
1. `clients.name` → 'Client supprimé #{id_court}'
2. `clients.email` → 'deleted_{uuid}@anonymized.monprojet-pro.com'
3. `clients.company` → null
4. Les `elio_conversations` et `elio_messages` sont supprimées
5. Les `messages` (chat MiKL) sont anonymisés (contenu → 'Message supprimé')
6. Les `documents` sont supprimés du Storage (fichiers physiques)
7. Les `notifications` sont supprimées
8. Le `client_configs` est supprimé (sauf `subscription_tier` pour historique facturation)
9. Les `validation_requests` sont conservées (anonymisées) pour les stats
10. Les données de facturation sont PRÉSERVÉES (obligation légale 10 ans)
**And** `clients.status` → 'deleted'
**And** un événement 'client_data_purged' est loggué dans `activity_logs`
**And** l'anonymisation est irréversible

**Given** MiKL veut consulter les clients archivés
**When** il accède à la liste clients avec le filtre "Archivés"
**Then** les clients archivés sont visibles avec :
- Mention "Archivé" + date d'archivage
- Date de suppression prévue (`retention_until`)
- Bouton "Réactiver" (si dans la période de rétention)
- Les données sont encore consultables tant que la rétention n'est pas écoulée
**And** après la suppression/anonymisation, seul le nom anonymisé et les données comptables restent

**Given** MiKL veut réactiver un client archivé (dans la période de rétention)
**When** il clique sur "Réactiver"
**Then** `clients.status` → le statut précédent ('lab' ou 'one')
**And** `clients.archived_at` → null, `clients.retention_until` → null
**And** le client retrouve l'accès à son dashboard avec toutes ses données intactes
**And** une notification est envoyée au client : "Votre compte MonprojetPro a été réactivé"

## Tasks / Subtasks

- [x] Créer action archivage client (AC: #1)
  - [x] Créer `packages/modules/crm/actions/archive-client.ts`
  - [x] Signature: `archiveClient(clientId: string, retentionDays?: number): Promise<ActionResponse<void>>`
  - [x] Validation Zod : clientId UUID, retentionDays optionnel (default 90, min 30, max 365)
  - [x] Vérifier que client status != 'archived' et != 'deleted'
  - [x] UPDATE `clients` SET status='archived', archived_at=NOW(), retention_until=NOW() + INTERVAL '{retentionDays} days'
  - [x] INSERT `activity_logs` : type 'client_archived', metadata { retentionDays, retentionUntil }
  - [x] Retourner format `{ data: null, error }` standard

- [x] Créer UI archivage dans fiche client (AC: #1)
  - [x] Modifier `packages/modules/crm/components/client-info-tab.tsx`
  - [x] Section "Administration" → bouton "Archiver le client"
  - [x] Au clic : dialog confirmation avec warning
  - [x] Dialog : "Archiver {nom} ?" + mention période rétention (90 jours par défaut)
  - [x] Champ optionnel : période rétention personnalisée (slider 30-365 jours)
  - [x] Warning : "Le client perdra l'accès immédiatement. Données conservées {X} jours puis anonymisées."
  - [x] Boutons "Confirmer l'archivage" (destructive) / "Annuler"

- [x] Implémenter blocage accès client archivé (AC: #1)
  - [x] Modifier `apps/client/middleware.ts`
  - [x] Après auth success, vérifier `clients.status`
  - [x] Si status = 'archived' : bloquer accès, afficher page "Compte archivé"
  - [x] Page archivé : "Votre compte MonprojetPro a été archivé. Contactez MiKL pour plus d'informations."

- [x] Créer filtre "Archivés" dans liste clients (AC: #3)
  - [x] Modifier `packages/modules/crm/components/client-list.tsx`
  - [x] Ajouter option filtre status : "Tous", "Actifs", "Archivés", "Supprimés"
  - [x] Filtre "Archivés" : status = 'archived'
  - [x] Afficher badge "Archivé" + date archivage
  - [x] Afficher date suppression prévue (`retention_until`)
  - [x] Bouton "Réactiver" visible si retention_until > NOW()

- [x] Créer action réactivation client (AC: #4)
  - [x] Modifier `packages/modules/crm/actions/reactivate-client.ts`
  - [x] Signature: `reactivateClient(clientId: string): Promise<ActionResponse<void>>`
  - [x] Vérifier que status = 'archived' ET retention_until > NOW()
  - [x] Si retention_until < NOW() : retourner error 'CLIENT_DATA_PURGED' (trop tard pour réactiver)
  - [x] Fetch `clients.previous_status` pour restaurer ancien status ('lab' ou 'one')
  - [x] UPDATE `clients` SET status=previous_status, archived_at=null, retention_until=null
  - [x] INSERT `activity_logs` : type 'client_reactivated'
  - [x] Créer notification client : "Votre compte MonprojetPro a été réactivé"
  - [x] Retourner format `{ data: null, error }` standard

- [x] Créer Edge Function nettoyage périodique (AC: #2)
  - [x] Créer `supabase/functions/cleanup-archived-clients/index.ts`
  - [x] Déclenchée par cron hebdomadaire (Supabase Cron)
  - [x] Query `clients` WHERE status='archived' AND retention_until < NOW()
  - [x] Anonymiser clients, supprimer conversations, messages, Storage, notifications, client_configs
  - [x] Anonymiser validation_requests (préserver stats)
  - [x] Préserver données facturation (tables invoices, subscriptions)
  - [x] UPDATE `clients` SET status='deleted'
  - [x] INSERT `activity_logs` : type 'client_data_purged'
  - [x] Logger résultats : nombre clients anonymisés, erreurs éventuelles

- [x] Créer colonne `previous_status` dans clients (AC: #4)
  - [x] Migration : ALTER TABLE clients ADD COLUMN previous_status TEXT
  - [x] UPDATE `archiveClient` action pour stocker ancien status avant archivage

- [x] Implémenter conservation données comptables (AC: #2)
  - [x] Les tables facturation (Epic 11) ne sont PAS supprimées ni anonymisées
  - [x] Obligation légale : conservation 10 ans (conformité fiscale France)
  - [x] Link client_id reste pour traçabilité comptable

- [x] Créer tests unitaires (TDD)
  - [x] Test `archiveClient`: client actif → status archived + retention_until (14 tests)
  - [x] Test `reactivateClient`: client archived dans rétention → status restauré (14 tests)
  - [x] Test `archive-client-dialog`: dialog UI (10 tests)
  - [x] Test `client-list`: badges archivé, retention, bouton réactiver (13 tests)
  - [x] Test `get-clients`: exclude archived+deleted par défaut (10 tests)

- [x] Créer test RLS
  - [x] Test : client archivé ne peut pas se connecter (middleware bloque) — middleware.test.ts (67 tests)

## Dev Notes

### Architecture Patterns
- **Pattern archivage**: Soft delete (status 'archived') + période rétention
- **Pattern anonymisation**: Irréversible après rétention, données comptables préservées
- **Pattern cron**: Edge Function hebdomadaire pour nettoyage automatique
- **Pattern conformité**: RGPD (droit à l'oubli) + obligations fiscales (conservation 10 ans)
- **Pattern réactivation**: Possible uniquement dans période rétention

### Source Tree Components
```
packages/modules/crm/
├── actions/
│   ├── archive-client.ts             # CRÉER: Server Action archivage
│   ├── archive-client.test.ts
│   ├── reactivate-client.ts          # MODIFIER: Server Action réactivation
│   └── reactivate-client.test.ts
├── components/
│   ├── client-info-tab.tsx           # MODIFIER: ajouter bouton archivage
│   └── client-list.tsx               # MODIFIER: ajouter filtre "Archivés"

apps/client/
├── middleware.ts                     # MODIFIER: bloquer accès clients archivés
└── app/(dashboard)/
    └── archived/
        └── page.tsx                  # CRÉER: page "Compte archivé"

supabase/functions/
└── cleanup-archived-clients/
    └── index.ts                      # CRÉER: Edge Function nettoyage cron

supabase/migrations/
└── 00058_add_archiving_fields.sql    # CRÉÉ: colonnes retention_until, previous_status + enum 'deleted'
```

### Testing Standards
- **Unitaires**: Vitest, co-localisés (*.test.ts)
- **RLS**: Test isolation opérateur (ne peut pas archiver client d'un autre)
- **Conformité**: Test données comptables préservées après anonymisation

### Project Structure Notes
- Alignement avec module CRM (Story 2.1, 2.3)
- Préservation données comptables (Epic 11)
- Edge Function cron Supabase pour nettoyage automatique
- Page bloquée client archivé (apps/client)

### Key Technical Decisions

**1. Période de rétention par défaut**
- **90 jours** (3 mois) par défaut
- Configurable par MiKL : min 30 jours, max 365 jours
- Conforme RGPD : données conservées le temps nécessaire (Art. 5)
- Permet réactivation rapide si erreur

**2. Archivage vs suppression**
- **Archivage** : soft delete, données conservées, accès bloqué
- **Suppression/anonymisation** : après rétention, irréversible
- Status : 'active' → 'archived' → 'deleted'
- Client archivé peut être réactivé (dans période rétention)
- Client supprimé ne peut PAS être réactivé (anonymisation irréversible)

**3. Anonymisation irréversible**
- Name : 'Client supprimé #{last 8 char id}' (traçabilité)
- Email : 'deleted_{uuid}@anonymized.monprojet-pro.com' (unique, invalide)
- Company : null
- Conversations Elio : supprimées (RGPD droit à l'oubli)
- Messages MiKL : contenu anonymisé, metadata préservé (stats)
- Documents : fichiers physiques supprimés (Storage)
- Pas de rollback possible

**4. Conservation données comptables**
- **Obligation légale France** : conservation factures 10 ans
- Tables facturation (Epic 11) : JAMAIS supprimées ni anonymisées
- Données conservées : invoices, subscriptions, payment_methods
- Link client_id reste (traçabilité comptable)
- Séparation claire : données personnelles (anonymisées) vs comptables (préservées)

**5. Processus nettoyage automatique**
- Edge Function cron hebdomadaire (dimanche 3h AM)
- Query clients archivés dont retention_until < NOW()
- Anonymisation batch (peut traiter plusieurs clients)
- Logging détaillé : nombre clients anonymisés, erreurs
- Idempotent : peut être relancé sans risque

**6. Réactivation possible**
- Uniquement si retention_until > NOW() (dans période rétention)
- Restauration status précédent (lab ou one) via `previous_status`
- Fallback vers 'active' si previous_status est null (legacy)
- Toutes les données intactes (pas d'anonymisation encore)
- Notification client automatique
- Si hors rétention : error 'CLIENT_DATA_PURGED' (trop tard)

**7. mockNeq self-referential (CR fix)**
- `get-clients.ts` utilise deux `.neq()` chainés pour exclure 'archived' ET 'deleted'
- Mock doit être self-referential: `const mockNeq = vi.fn(() => ({ neq: mockNeq, ... }))`

### Dependencies
- **Bloquée par**: Story 2.1 (liste clients), Story 2.3 (fiche client)
- **Bloque**: Aucune
- **Référence**: Epic 11 (facturation — conservation données comptables)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6 (Phase 1 — Dev Story)

### Debug Log References
- `archive-client-dialog.test.tsx`: Multiple matches on `/90 jours/` → fixed by checking `slider.toHaveValue('90')` directly
- `archive-client-dialog.test.tsx`: `user.clear()` unsupported on range slider → replaced with `fireEvent.change()`
- `get-clients.test.ts`: Switched from `.not('status', 'in', ...)` to two `.neq()` calls; updated mock to self-referential pattern

### Completion Notes List
- Migration 00058: Added `retention_until`, `previous_status` to `clients`; added `'deleted'` to `client_status` enum
- `archive-client.ts`: Input type changed to object `{ clientId, retentionDays }` for ergonomics vs story signature
- `reactivate-client.ts`: Extended to use `previous_status`, check `retention_until`, send notification
- `client-list.tsx`: Added `canReactivate()` helper, `ReactivateButton` sub-component, archived badge with `data-testid`
- `client-filters-panel.tsx`: Added 'Supprimé' option; renamed 'Clôturé' → 'Archivé' for status
- `get-clients.ts`: Default exclusion uses two `neq()` calls (archived + deleted)
- `cleanup-archived-clients/index.ts`: Edge Function with full anonymization pipeline, returns JSON report
- Tests: 130 passing (14 + 14 + 10 + 13 + 10 + 69)
- **CR fixes (Opus)**: H1 ClientDB missing 'deleted' status, H2+H3 Edge Function auth check, M1 middleware blocks deleted clients too, M3 recursive Storage deletion

### File List
- `supabase/migrations/00058_add_archiving_fields.sql` — CREATED
- `packages/modules/crm/types/crm.types.ts` — MODIFIED (added 'deleted' status, archivedAt, retentionUntil, previousStatus, ArchiveClientInput)
- `packages/modules/crm/actions/archive-client.ts` — CREATED
- `packages/modules/crm/actions/archive-client.test.ts` — CREATED (14 tests)
- `packages/modules/crm/actions/reactivate-client.ts` — MODIFIED (previous_status, retention check, notification)
- `packages/modules/crm/actions/reactivate-client.test.ts` — MODIFIED (+5 tests, 14 total)
- `packages/modules/crm/actions/get-clients.ts` — MODIFIED (archived+deleted exclusion, archivedAt/retentionUntil in mapping)
- `packages/modules/crm/actions/get-clients.test.ts` — MODIFIED (self-referential mockNeq, 10 tests)
- `packages/modules/crm/components/archive-client-dialog.tsx` — CREATED
- `packages/modules/crm/components/archive-client-dialog.test.tsx` — CREATED (10 tests)
- `packages/modules/crm/components/client-info-tab.tsx` — MODIFIED (archive button + dialog)
- `packages/modules/crm/components/client-list.tsx` — MODIFIED (archived badge, retention column, reactivate button)
- `packages/modules/crm/components/client-list.test.tsx` — MODIFIED (+6 tests, 13 total)
- `packages/modules/crm/components/client-filters-panel.tsx` — MODIFIED (added 'deleted', renamed 'archived')
- `apps/client/middleware.ts` — MODIFIED (archived+deleted redirect to /archived)
- `apps/client/middleware.test.ts` — MODIFIED (+11 tests, 69 total)
- `apps/client/app/archived/page.tsx` — CREATED
- `supabase/functions/cleanup-archived-clients/index.ts` — CREATED
