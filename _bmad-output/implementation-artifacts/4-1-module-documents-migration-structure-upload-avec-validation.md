# Story 4.1: Module Documents — Migration, structure & upload avec validation

Status: done

## Story

As a **utilisateur (MiKL ou client)**,
I want **uploader des documents sur la plateforme avec validation automatique du type et de la taille**,
So that **seuls les fichiers autorisés et de taille raisonnable sont stockés sur la plateforme**.

## Acceptance Criteria

1. **AC1 — Migration DB** : Table `documents` créée avec : id (UUID PK), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), name (TEXT NOT NULL), file_path (TEXT NOT NULL — chemin Supabase Storage), file_type (TEXT NOT NULL), file_size (INTEGER NOT NULL — octets), folder_id (UUID nullable), tags (TEXT[] DEFAULT ARRAY[]::TEXT[]), visibility (TEXT CHECK 'private'/'shared' DEFAULT 'private'), uploaded_by (TEXT CHECK 'client'/'operator' NOT NULL), created_at, updated_at. RLS : `documents_select_owner`, `documents_select_operator`, `documents_insert_authenticated`, `documents_update_operator`.

2. **AC2 — Module Documents structure** : Module `packages/modules/documents/` structuré. Manifest id: `documents`, targets: `['hub', 'client-lab', 'client-one']`, requiredTables: `['documents']`. Composants: document-list, document-upload. Hook: use-documents. Action: upload-document. Types: document.types.ts.

3. **AC3 — Validation upload** : Component document-upload (drag & drop ou bouton). Valide AVANT upload (FR145) : type de fichier (PDF, DOCX, XLSX, PNG, JPG, SVG, MD, TXT, CSV), taille max 10 Mo (constante MAX_FILE_SIZE dans @monprojetpro/utils). Message d'erreur clair si invalide.

4. **AC4 — Upload Supabase Storage** : Fichier valide → upload vers `documents/{operatorId}/{clientId}/`. Barre de progression. Server Action `uploadDocument()` crée enregistrement table `documents`. Pattern `{ data, error }`. Toast "Document uploadé". Invalidation `['documents', clientId]`.

5. **AC5 — Liste documents** : Chaque document : nom, type (icône), taille formatée, date, tag visibilité. DataTable de @monprojetpro/ui. Skeleton loader.

6. **AC6 — Tests** : Tests unitaires co-localisés. Tests RLS. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Migration Supabase (AC: #1)
  - [x] 1.1 Créer migration `00027_create_documents.sql`
  - [x] 1.2 Table `documents` avec tous les champs
  - [x] 1.3 Index : `idx_documents_client_id`, `idx_documents_operator_id`, `idx_documents_visibility`
  - [x] 1.4 Trigger updated_at
  - [x] 1.5 RLS policies + DELETE policies

- [x] Task 2 — Module Documents scaffold (AC: #2)
  - [x] 2.1 `packages/modules/documents/manifest.ts`
  - [x] 2.2 `index.ts`, `package.json`, `tsconfig.json`, `vitest.config.ts`
  - [x] 2.3 `types/document.types.ts` + `utils/to-document.ts`
  - [x] 2.4 `docs/guide.md`, `faq.md`, `flows.md`

- [x] Task 3 — Constantes validation (AC: #3)
  - [x] 3.1 Dans `@monprojetpro/utils` : `MAX_FILE_SIZE = 10 * 1024 * 1024` (10 Mo)
  - [x] 3.2 `ALLOWED_FILE_TYPES = ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'svg', 'md', 'txt', 'csv']`
  - [x] 3.3 Fonction `validateFile(file: File)` + `formatFileSize(bytes)`

- [x] Task 4 — Server Actions (AC: #4)
  - [x] 4.1 `actions/upload-document.ts` — Upload Supabase Storage + insert DB + cleanup on error
  - [x] 4.2 `actions/get-documents.ts` — Récupérer documents (filtré par RLS)
  - [x] 4.3 `actions/delete-document.ts` — Supprimer document + fichier Storage

- [x] Task 5 — Hooks TanStack Query (AC: #4)
  - [x] 5.1 `hooks/use-documents.ts` — queryKey `['documents', clientId]`
  - [x] 5.2 Mutations upload + delete avec optimistic updates

- [x] Task 6 — Composants UI (AC: #3, #5)
  - [x] 6.1 `components/document-upload.tsx` — Drag & drop + bouton parcourir, validation
  - [x] 6.2 `components/document-list.tsx` — DataTable avec colonnes
  - [x] 6.3 `components/document-icon.tsx` — Icône par type (PDF, DOCX, etc.)
  - [x] 6.4 `components/document-skeleton.tsx` — Skeleton loader
  - [x] 6.5 `components/documents-page-client.tsx` — Page complète

- [x] Task 7 — Routes (AC: #5)
  - [x] 7.1 Hub : `apps/hub/app/(dashboard)/modules/documents/page.tsx`
  - [x] 7.2 Hub : `apps/hub/app/(dashboard)/modules/documents/[clientId]/page.tsx`
  - [x] 7.3 Client : `apps/client/app/(dashboard)/modules/documents/page.tsx`
  - [x] 7.4 Loading.tsx et error.tsx (Hub + Client + [clientId])

- [x] Task 8 — Supabase Storage (AC: #4)
  - [x] 8.1 Créer bucket `documents` (public: false, RLS activé) — dans migration 00027
  - [x] 8.2 Policies Storage : 5 policies (select/insert/delete pour client + opérateur)

- [x] Task 9 — Tests (AC: #6)
  - [x] 9.1 Tests validation : 22 tests (types invalides, taille dépassée, empty, case-insensitive)
  - [x] 9.2 Tests Server Actions : upload (8), get (5), delete (6)
  - [x] 9.3 Tests composants : DocumentUpload (5), DocumentList (4), DocumentIcon (6)
  - [x] 9.4 Tests RLS : document-isolation.test.ts (8 tests, skip if no Supabase)
  - [x] 9.5 Tests hooks : useDocuments (4 tests)

- [x] Task 10 — Documentation (AC: #6)
  - [x] 10.1 `docs/guide.md`, `faq.md`, `flows.md`

## Dev Notes

### Architecture — Règles critiques

- **NOUVEAU MODULE** : `packages/modules/documents/` — `manifest.ts` en premier.
- **Supabase Storage** : Bucket `documents` avec RLS. Chemins : `{operatorId}/{clientId}/{filename}`.
- **Validation côté client** : Avant upload, pas de round-trip serveur pour validation type/taille.
- **Response format** : `{ data, error }` — JAMAIS throw.
- **Logging** : `[DOCUMENTS:UPLOAD]`, `[DOCUMENTS:DELETE]`

### Base de données

**Migration `00026`** :
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  folder_id UUID REFERENCES document_folders(id),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  uploaded_by TEXT NOT NULL CHECK (uploaded_by IN ('client', 'operator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_documents_operator_id ON documents(operator_id);
CREATE INDEX idx_documents_visibility ON documents(visibility);
```

**RLS policies** :
```sql
-- Client ne voit que ses docs + docs partagés
CREATE POLICY documents_select_owner ON documents FOR SELECT
  USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    AND (visibility = 'shared' OR uploaded_by = 'client')
  );

-- Opérateur voit tous les docs de ses clients
CREATE POLICY documents_select_operator ON documents FOR SELECT
  USING (operator_id = auth.uid());

-- Authentifié peut insérer
CREATE POLICY documents_insert_authenticated ON documents FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seul l'opérateur peut modifier
CREATE POLICY documents_update_operator ON documents FOR UPDATE
  USING (operator_id = auth.uid());
```

### Supabase Storage — Setup bucket

```sql
-- Créer le bucket (via Supabase Dashboard ou SQL)
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- RLS policies sur storage.objects
CREATE POLICY "Client access own files" ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = current_setting('request.jwt.claims')::json->>'sub');

CREATE POLICY "Operator access all client files" ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND auth.uid() IN (SELECT id FROM operators));
```

### Validation fichier

```typescript
// packages/utils/src/file-validation.ts
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 Mo
export const ALLOWED_FILE_TYPES = ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'svg', 'md', 'txt', 'csv']

export function validateFile(file: File): { valid: boolean; error?: string } {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_FILE_TYPES.includes(ext)) {
    return { valid: false, error: 'Type de fichier non autorisé. Types acceptés : PDF, DOCX, XLSX, PNG, JPG, SVG, MD, TXT, CSV' }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Fichier trop volumineux (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} Mo)` }
  }
  return { valid: true }
}
```

### Upload — Pattern

```typescript
// actions/upload-document.ts
'use server'
export async function uploadDocument(formData: FormData): Promise<ActionResponse<Document>> {
  const file = formData.get('file') as File
  const clientId = formData.get('clientId') as string

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifié', 'UNAUTHORIZED')

  // Upload Storage
  const filename = `${crypto.randomUUID()}-${file.name}`
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(`${operatorId}/${clientId}/${filename}`, file)

  if (uploadError) return errorResponse('Échec upload', 'STORAGE_ERROR', uploadError)

  // Insert DB
  const { data, error } = await supabase.from('documents').insert({
    client_id: clientId,
    operator_id: operatorId,
    name: file.name,
    file_path: uploadData.path,
    file_type: file.type,
    file_size: file.size,
    uploaded_by: userType, // 'client' ou 'operator'
  }).select().single()

  if (error) return errorResponse('Échec création', 'DATABASE_ERROR', error)
  return successResponse(data)
}
```

### Fichiers à créer

**Module documents :**
```
packages/modules/documents/
├── manifest.ts, index.ts, package.json, tsconfig.json
├── docs/guide.md, faq.md, flows.md
├── types/document.types.ts
├── actions/upload-document.ts, get-documents.ts, delete-document.ts
├── hooks/use-documents.ts
└── components/document-upload.tsx, document-list.tsx, document-icon.tsx, document-skeleton.tsx
```

**Routes :**
- `apps/hub/app/(dashboard)/modules/documents/page.tsx`
- `apps/hub/app/(dashboard)/modules/documents/[clientId]/page.tsx`
- `apps/client/app/(dashboard)/modules/documents/page.tsx`

**Migration :**
- `supabase/migrations/00026_create_documents.sql`

**Utils :**
- `packages/utils/src/file-validation.ts`

### Dépendances

- Table `clients`, `operators`
- Supabase Storage
- `@monprojetpro/ui` — DataTable

### Anti-patterns — Interdit

- NE PAS uploader sans validation côté client (économiser bande passante)
- NE PAS stocker les fichiers en base64 en DB (Storage uniquement)
- NE PAS exposer les chemins Storage publiquement (signed URLs)
- NE PAS throw dans les Server Actions

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-4-*.md#Story 4.1]
- [Source: docs/project-context.md]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- All 1512 tests pass (0 failures), 73 skipped (RLS tests requiring local Supabase)

### Completion Notes List
- Migration 00027 (not 00026 as in story — 00026 already taken by support_tickets)
- Added DELETE RLS policies for both operator and client (not in original AC, but needed for delete action)
- Added `formatFileSize()` utility beyond AC requirements for better UX
- Storage bucket creation + 5 RLS policies included in migration (not separate)
- `DocumentsPageClient` component added as shared page component for Hub and Client routes
- Hub documents index redirects to CRM (need to select a client first)

### File List
- `supabase/migrations/00027_create_documents.sql` (new)
- `packages/modules/documents/manifest.ts` (new)
- `packages/modules/documents/index.ts` (new)
- `packages/modules/documents/package.json` (new)
- `packages/modules/documents/tsconfig.json` (new)
- `packages/modules/documents/vitest.config.ts` (new)
- `packages/modules/documents/types/document.types.ts` (new)
- `packages/modules/documents/utils/to-document.ts` (new)
- `packages/modules/documents/actions/upload-document.ts` (new)
- `packages/modules/documents/actions/upload-document.test.ts` (new)
- `packages/modules/documents/actions/get-documents.ts` (new)
- `packages/modules/documents/actions/get-documents.test.ts` (new)
- `packages/modules/documents/actions/delete-document.ts` (new)
- `packages/modules/documents/actions/delete-document.test.ts` (new)
- `packages/modules/documents/hooks/use-documents.ts` (new)
- `packages/modules/documents/hooks/use-documents.test.ts` (new)
- `packages/modules/documents/components/document-upload.tsx` (new)
- `packages/modules/documents/components/document-upload.test.tsx` (new)
- `packages/modules/documents/components/document-list.tsx` (new)
- `packages/modules/documents/components/document-list.test.tsx` (new)
- `packages/modules/documents/components/document-icon.tsx` (new)
- `packages/modules/documents/components/document-icon.test.tsx` (new)
- `packages/modules/documents/components/document-skeleton.tsx` (new)
- `packages/modules/documents/components/documents-page-client.tsx` (new)
- `packages/modules/documents/docs/guide.md` (new)
- `packages/modules/documents/docs/faq.md` (new)
- `packages/modules/documents/docs/flows.md` (new)
- `packages/utils/src/file-validation.ts` (new)
- `packages/utils/src/file-validation.test.ts` (new)
- `packages/utils/src/index.ts` (modified — added file-validation exports)
- `apps/hub/app/(dashboard)/modules/documents/page.tsx` (new)
- `apps/hub/app/(dashboard)/modules/documents/loading.tsx` (new)
- `apps/hub/app/(dashboard)/modules/documents/error.tsx` (new)
- `apps/hub/app/(dashboard)/modules/documents/[clientId]/page.tsx` (new)
- `apps/hub/app/(dashboard)/modules/documents/[clientId]/loading.tsx` (new)
- `apps/hub/app/(dashboard)/modules/documents/[clientId]/error.tsx` (new)
- `apps/client/app/(dashboard)/modules/documents/page.tsx` (new)
- `apps/client/app/(dashboard)/modules/documents/loading.tsx` (new)
- `apps/client/app/(dashboard)/modules/documents/error.tsx` (new)
- `tests/rls/document-isolation.test.ts` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
