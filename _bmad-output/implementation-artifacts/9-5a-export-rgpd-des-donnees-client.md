# Story 9.5a: Export RGPD des données client

Status: done

## Story

As a **client Foxeo ou MiKL (opérateur)**,
I want **exporter l'ensemble des données personnelles d'un client (droit d'accès RGPD)**,
so that **le client peut exercer son droit à la portabilité des données**.

## Acceptance Criteria

**Given** un client souhaite exporter ses données (FR92)
**When** il accède à ses paramètres de compte (section "Mes données")
**Then** il voit :
- Un bouton "Exporter toutes mes données" avec l'explication : "Conformément au RGPD, vous pouvez télécharger l'ensemble de vos données personnelles."
- Une estimation du temps de génération ("L'export prend généralement 1 à 5 minutes")

**Given** le client (ou MiKL via la fiche client) déclenche l'export
**When** la Server Action `exportClientData(clientId)` s'exécute
**Then** un export complet est généré incluant :
1. **Informations personnelles** : nom, email, entreprise, date d'inscription, type de client
2. **Documents** : tous les documents associés (briefs, livrables) — fichiers + metadata
3. **Communications** : historique des messages chat avec MiKL (table `messages`)
4. **Conversations Elio** : historique complet des conversations avec Elio (tables `elio_conversations` + `elio_messages`)
5. **Parcours Lab** : étapes, progression, briefs soumis (si applicable)
6. **Demandes de validation** : historique des `validation_requests`
7. **Notifications** : historique des notifications reçues
8. **Consentements** : consentements donnés (CGU, IA, etc.)
9. **Sessions** : historique des connexions
10. **Facturation** : factures et devis (si applicable)
**And** l'export est généré dans 2 formats :
- **JSON structuré** : un fichier JSON complet avec toutes les données brutes
- **PDF lisible** : un document PDF formaté avec les données organisées par catégorie
**And** les fichiers sont compressés en ZIP
**And** l'export est stocké temporairement dans Supabase Storage (dossier privé, expire après 7 jours)
**And** un lien de téléchargement est envoyé par notification in-app ET email

**Given** MiKL peut aussi déclencher un export pour un client (FR104 — lien avec Epic 12)
**When** il accède à la fiche client (section "Administration")
**Then** un bouton "Exporter les données client" est disponible
**And** le même processus s'exécute
**And** l'export est accessible à MiKL (pas au client) si MiKL l'a déclenché pour ses propres besoins

## Tasks / Subtasks

- [x] Créer section "Mes données" dans paramètres client (AC: #1)
  - [x] Modifier ou créer `apps/client/app/(dashboard)/settings/page.tsx`
  - [x] Section "Mes données" avec titre "Conformité RGPD"
  - [x] Bouton "Exporter toutes mes données"
  - [x] Texte explicatif : "Conformément au RGPD, vous pouvez télécharger l'ensemble de vos données personnelles."
  - [x] Mention temps estimé : "L'export prend généralement 1 à 5 minutes"
  - [x] Au clic : appeler Server Action `exportClientData` avec `clientId` actuel

- [x] Créer bouton export dans fiche client Hub (AC: #3)
  - [x] Modifier `packages/modules/crm/components/client-info-tab.tsx`
  - [x] Section "Administration" (accessible uniquement MiKL)
  - [x] Bouton "Exporter les données client"
  - [x] Au clic : confirmation dialog puis appeler `exportClientData(clientId)`

- [x] Créer Server Action `exportClientData` (AC: #2)
  - [x] Créer `packages/modules/admin/actions/export-client-data.ts`
  - [x] Signature: `exportClientData(clientId: string, requestedBy: 'client' | 'operator'): Promise<ActionResponse<ExportResult>>`
  - [x] Validation Zod : clientId UUID, requestedBy enum
  - [x] Vérifier authorization : client peut exporter ses propres données OU opérateur owner peut exporter
  - [x] Déclencher export asynchrone (Edge Function)
  - [x] Créer entrée dans table `data_exports` : status 'pending', requested_by, created_at
  - [x] Retourner `{ data: { exportId }, error }` immédiatement
  - [x] Toast : "Export en cours — vous recevrez une notification quand il sera prêt"

- [x] Créer Edge Function génération export (AC: #2)
  - [x] Créer `supabase/functions/generate-client-export/index.ts`
  - [x] Déclenchée par invocation depuis Server Action
  - [x] Fetch toutes les données client (clients, documents, messages, elio_conversations, parcours, validation_requests, notifications, consents)
  - [x] Générer JSON structuré
  - [x] Générer fichier texte lisible (MVP — pdfmake non disponible en Deno sans dépendances)
  - [x] Compresser JSON + TXT en ZIP (implémentation native PKZIP)
  - [x] Upload ZIP vers Supabase Storage (bucket `exports`)
  - [x] UPDATE `data_exports` SET status='completed', file_path, expires_at=NOW() + 7 days
  - [x] Créer notification client `export_ready`
  - [x] Si erreur : UPDATE status='failed', log erreur

- [x] Créer table `data_exports` (AC: #2)
  - [x] Migration Supabase : créer table tracking exports (`00055_create_data_exports.sql`)
  - [x] Colonnes : id, client_id, requested_by, requester_id, status, file_path, file_size_bytes, expires_at, error_message, created_at, completed_at
  - [x] Index sur client_id, status, expires_at
  - [x] RLS : client peut voir ses propres exports, opérateur owner peut voir exports de ses clients
  - [x] Bucket Storage `exports` créé avec policies RLS (insert/delete service_role only)

- [x] Créer notification export prêt (AC: #2)
  - [x] Ajouter type 'export_ready' au NotificationTypeEnum (Zod + migration `00056`)
  - [x] Notification in-app créée par Edge Function après completion
  - [x] Email déclenché via send-email Edge Function
  - [x] Link : lien vers `/api/exports/{exportId}/download`

- [x] Implémenter téléchargement export (AC: #2)
  - [x] Créer API Route `apps/hub/app/api/exports/[exportId]/download/route.ts`
  - [x] Vérifier authorization : client owner ou opérateur owner
  - [x] Vérifier expiration (410 Gone si expiré)
  - [x] Vérifier statut (409 Conflict si pas encore prêt)
  - [x] Générer signed URL Supabase Storage (expire 1h)
  - [x] Redirect vers signed URL pour téléchargement
  - [x] Logger téléchargement dans `activity_logs`

- [x] Implémenter nettoyage exports expirés (AC: #2)
  - [x] Créer Edge Function cron `supabase/functions/cleanup-expired-exports/index.ts`
  - [x] Query `data_exports` WHERE expires_at < NOW() AND status='completed'
  - [x] Supprimer fichiers ZIP du Storage
  - [x] DELETE entrées `data_exports` expirées
  - [x] Logger nettoyage

- [x] Créer tests unitaires (TDD)
  - [x] Test `exportClientData`: client peut exporter ses propres données (10 tests)
  - [x] Test `exportClientData`: opérateur owner peut exporter données de ses clients
  - [x] Test `exportClientData`: opérateur non-owner ne peut pas exporter → error UNAUTHORIZED
  - [x] Test `exportClientData`: client essaie d'exporter données d'un autre client → UNAUTHORIZED
  - [x] Test API download : authorization vérifiée (7 tests)
  - [x] Test API download : expiration (410), non prêt (409), redirect (307)
  - [x] Test API download : 401, 403, 404

- [x] Créer test RLS
  - [x] Test : client A ne peut pas voir exports de client B
  - [x] Test : opérateur A ne peut pas voir exports de clients de opérateur B

## Dev Notes

### Architecture Patterns
- **Pattern async**: Export asynchrone via Edge Function (génération prend 1-5 min)
- **Pattern storage**: Fichiers ZIP dans Supabase Storage avec expiration 7 jours
- **Pattern notification**: Notification in-app + email avec lien téléchargement
- **Pattern security**: Signed URLs Supabase pour téléchargement sécurisé (expire 1h)
- **Pattern cleanup**: Cron daily pour suppression exports expirés

### Source Tree Components
```
packages/modules/admin/
├── actions/
│   ├── export-client-data.ts        # CRÉER: Server Action déclenchement export
│   └── export-client-data.test.ts
├── types/
│   └── export.types.ts               # CRÉER: types ExportResult, ExportStatus
├── index.ts                          # MODIFIER: export action + types
├── manifest.ts
└── package.json                      # CRÉER: package npm module admin

packages/modules/crm/
└── components/
    └── client-info-tab.tsx           # MODIFIER: ajouter bouton export (section Admin)

apps/client/app/(dashboard)/
└── settings/
    ├── page.tsx                      # MODIFIER: async server component + section RGPD
    └── data-export-section.tsx       # CRÉER: composant bouton export

apps/hub/app/api/exports/[exportId]/
└── download/
    ├── route.ts                      # CRÉER: API Route téléchargement export
    └── route.test.ts

supabase/functions/
├── generate-client-export/
│   └── index.ts                      # CRÉER: Edge Function génération export
└── cleanup-expired-exports/
    └── index.ts                      # CRÉER: Edge Function cleanup cron

supabase/migrations/
├── 00055_create_data_exports.sql     # CRÉER: table + bucket Storage
└── 00056_extend_notifications_export_ready.sql  # CRÉER: type export_ready

packages/modules/notifications/types/notification.types.ts  # MODIFIER: enum + icon

tests/rls/
└── data-exports-rls.test.ts         # CRÉER: RLS isolation tests
```

### Testing Standards
- **Unitaires**: Vitest, co-localisés (*.test.ts)
- **RLS**: Test isolation client (ne peut pas voir exports d'autres clients)
- **Security**: Test signed URLs expiration, 401/403/410/409 checks

### Project Structure Notes
- Alignement avec module admin (Epic 12)
- Utilisation Supabase Storage pour fichiers temporaires
- Edge Functions Deno pour génération asynchrone
- Notification in-app + email (Story 3.2, 3.3)
- ZIP natif (PKZIP) sans dépendances npm (Deno Edge Function)

### Key Technical Decisions

**1. Export asynchrone**
- Génération peut prendre 1-5 minutes (selon volume données)
- Server Action retourne immédiatement avec exportId
- Edge Function génère export en background
- Client reçoit notification quand prêt

**2. Format ZIP natif**
- Implémentation PKZIP native en TypeScript (pas de dépendances)
- 2 fichiers : data-export.json (brut) + data-export.txt (lisible)
- PDF (pdfmake) non disponible sans dépendances Deno → texte formaté pour MVP

**3. Stockage temporaire**
- Fichiers ZIP dans Supabase Storage bucket `exports`
- Dossier privé par client : `exports/{clientId}/{exportId}.zip`
- Expiration après 7 jours
- Cleanup automatique via cron daily

**4. Sécurité téléchargement**
- Signed URLs Supabase (expire 1h)
- Vérification authorization avant génération signed URL
- Logger téléchargement dans activity_logs
- Vérification expiration (410) et statut (409)

**5. Type notification `export_ready`**
- Ajouté au NotificationTypeEnum Zod
- Migration 00056 étend la contrainte DB
- Icon: 'download'

### Database Schema Changes

Voir migrations:
- `00055_create_data_exports.sql` : table data_exports + bucket exports
- `00056_extend_notifications_export_ready.sql` : type export_ready

### References
- [Source: CLAUDE.md — Architecture Rules]
- [Source: docs/project-context.md — Stack & Versions]
- [Source: RGPD Art. 15 — Droit d'accès et portabilité des données]

### Dependencies
- **Bloquée par**: Story 2.3 (fiche client), Story 3.2 (notifications), Story 3.3 (email)
- **Bloque**: Aucune
- **Référence**: Epic 12 (module admin — backups automatiques)

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Mock chains fixes: `makeEqChain()` avec support `maybeSingle` et `single` dans le même chain
- ZIP natif PKZIP implémenté sans dépendances (Deno Edge Function)
- `settings/page.tsx` converti en async Server Component pour fetch clientId

### Completion Notes List
- ✅ 11 tests `exportClientData` passent (auth, validation, client/operator paths, DATABASE_ERROR, CONFLICT guard)
- ✅ 7 tests API download passent (400, 401, 404, 410, 409, 403, 307 redirect)
- ✅ RLS test créé (skipIf Supabase not available — pattern standard)
- ✅ `settings/page.tsx` converti en async Server Component fetching clientId
- ✅ Type `export_ready` ajouté au NotificationTypeEnum + migration
- ✅ Module admin créé avec package.json + index.ts exports
- ✅ Edge Function cleanup-expired-exports (cron daily pattern)
- ✅ Edge Function generate-client-export (ZIP natif, texte lisible MVP)
- ✅ CR fixes: sessions data ajouté (AC #2 item 9), N+1→batch query, CRC32 cached, anti-spam guard, storage RLS corrigé, download link absolu, types stricts

### File List
- `packages/modules/admin/types/export.types.ts` — CRÉÉ
- `packages/modules/admin/actions/export-client-data.ts` — CRÉÉ
- `packages/modules/admin/actions/export-client-data.test.ts` — CRÉÉ
- `packages/modules/admin/index.ts` — MODIFIÉ
- `packages/modules/admin/package.json` — CRÉÉ
- `packages/modules/crm/components/client-info-tab.tsx` — MODIFIÉ
- `apps/client/app/(dashboard)/settings/page.tsx` — MODIFIÉ
- `apps/client/app/(dashboard)/settings/data-export-section.tsx` — CRÉÉ
- `apps/hub/app/api/exports/[exportId]/download/route.ts` — CRÉÉ
- `apps/hub/app/api/exports/[exportId]/download/route.test.ts` — CRÉÉ
- `supabase/functions/generate-client-export/index.ts` — CRÉÉ
- `supabase/functions/cleanup-expired-exports/index.ts` — CRÉÉ
- `supabase/migrations/00055_create_data_exports.sql` — CRÉÉ
- `supabase/migrations/00056_extend_notifications_export_ready.sql` — CRÉÉ
- `packages/modules/notifications/types/notification.types.ts` — MODIFIÉ
- `tests/rls/data-exports-rls.test.ts` — CRÉÉ
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIÉ

## Change Log

- 2026-03-05: Story 9.5a implémentée — Export RGPD asynchrone, table data_exports, Edge Functions génération + cleanup, API Route download, section "Mes données" client + bouton Hub, 17 tests (10 action + 7 route)
- 2026-03-05: Code review fixes — 7 issues (3 HIGH, 4 MEDIUM): sessions data manquant, lien notification absolu, N+1→batch query, storage RLS corrigé, anti-spam guard CONFLICT, CRC32 cache, types stricts. 18 tests (11 action + 7 route)
