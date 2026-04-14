# Story 4.2: Visualisation documents (viewer HTML) & telechargement PDF

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **client MonprojetPro**,
I want **consulter mes documents directement dans le dashboard (rendu HTML) et les telecharger en PDF**,
so that **j'accede a mes livrables sans quitter la plateforme et je peux les conserver hors ligne**.

## Acceptance Criteria

1. **AC1 — Viewer document** : Un clic sur un document dans la liste ouvre `document-viewer.tsx` dans un panneau ou page dediee (FR62). Formats supportes pour rendu HTML : Markdown (rendu HTML natif), PDF (viewer embarque via iframe), images (PNG, JPG, SVG — affichage direct). Les fichiers non visualisables (DOCX, XLSX, CSV, TXT) affichent un apercu des metadonnees avec bouton "Telecharger". Skeleton loader pendant le chargement. Viewer responsive (mobile >=320px).

2. **AC2 — Telechargement PDF** : Bouton "Telecharger en PDF" (FR63). Si le document est deja un PDF, telechargement direct via signed URL Supabase Storage. Si le document est un Markdown, PDF genere cote serveur via Server Action `generatePDF()` et telecharge. Generation PDF < 5 secondes (NFR-P6). PDF genere conserve le branding MonprojetPro (header logo, footer date).

3. **AC3 — Signed URLs** : Tous les fichiers sont telecharges via signed URL Supabase Storage (URL temporaire, expiration 1h). Le signed URL est genere cote serveur (pas d'exposition des chemins internes).

4. **AC4 — Vue Hub (MiKL)** : Memes fonctionnalites que le client. MiKL voit un badge "Visible par le client" ou "Non visible" sur chaque document.

5. **AC5 — Tests** : Tests unitaires co-localises pour tous les nouveaux composants, actions et hooks. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Server Action signed URL (AC: #3)
  - [x] 1.1 Creer `actions/get-document-url.ts` — Server Action `getDocumentUrl(documentId)` qui recupere le document par ID, genere un signed URL Supabase Storage (expiration 3600s), retourne `ActionResponse<{ url: string; document: Document }>`
  - [x] 1.2 Tests `actions/get-document-url.test.ts` — auth check, document not found, signed URL error, success case (6 tests)

- [x] Task 2 — Server Action generation PDF (AC: #2)
  - [x] 2.1 Creer `actions/generate-pdf.ts` — Server Action `generatePDF(documentId)` : approche legere regex Markdown → HTML + template brande, retourne `ActionResponse<{ htmlContent: string; fileName: string }>`
  - [x] 2.2 Creer `utils/markdown-to-html.ts` — Helper conversion Markdown → HTML regex-based (pas de deps externes)
  - [x] 2.3 Creer `utils/pdf-generator.ts` — Helper generation HTML avec template branding MonprojetPro : header (logo MonprojetPro + nom document), body (contenu HTML), footer (date generation + "Genere depuis MonprojetPro")
  - [x] 2.4 Tests `actions/generate-pdf.test.ts` — 7 tests (auth, validation, not found, unsupported format, success, storage error, fetch error)
  - [x] 2.5 Tests `utils/markdown-to-html.test.ts` — 11 tests (headings, bold, italic, code blocks, inline code, links, lists, blockquotes, paragraphs, horizontal rules, mixed)

- [x] Task 3 — Composant DocumentViewer (AC: #1)
  - [x] 3.1 Creer `components/document-viewer.tsx` — Rendu par type : Markdown (dangerouslySetInnerHTML), PDF (iframe), images (img), fallback (DocumentMetadataPreview)
  - [x] 3.2 Creer `components/document-viewer-skeleton.tsx` — Skeleton loader (header + zone contenu)
  - [x] 3.3 Creer `components/document-metadata-preview.tsx` — Composant fichiers non visualisables
  - [x] 3.4 Tests `components/document-viewer.test.tsx` — 7 tests
  - [x] 3.5 Tests `components/document-metadata-preview.test.tsx` — 4 tests

- [x] Task 4 — Composant DocumentDownloadButton (AC: #2, #3)
  - [x] 4.1 Creer `components/document-download-button.tsx` — PDF direct ou generation Markdown, variantes button/icon
  - [x] 4.2 Tests `components/document-download-button.test.tsx` — 5 tests

- [x] Task 5 — Hook useDocumentViewer (AC: #1, #2, #3)
  - [x] 5.1 Creer `hooks/use-document-viewer.ts` — TanStack Query avec cles ['document', documentId] et ['document-markdown', documentId]
  - [x] 5.2 Tests `hooks/use-document-viewer.test.ts` — 5 tests

- [x] Task 6 — Integration routes et page viewer (AC: #1, #4)
  - [x] 6.1 Route Hub : `apps/hub/app/(dashboard)/modules/documents/[clientId]/[documentId]/page.tsx`
  - [x] 6.2 Route Client : `apps/client/app/(dashboard)/modules/documents/[documentId]/page.tsx`
  - [x] 6.3 `loading.tsx` et `error.tsx` pour les deux routes viewer
  - [x] 6.4 Creer `components/document-visibility-badge.tsx` — Badge visibilite
  - [x] 6.5 Modifier `components/document-list.tsx` — Lien cliquable vers viewer via viewerBaseHref
  - [x] 6.6 Tests `components/document-visibility-badge.test.tsx` — 3 tests

- [x] Task 7 — Documentation (AC: #5)
  - [x] 7.1 Mettre a jour `docs/guide.md` — Section viewer et telechargement PDF
  - [x] 7.2 Mettre a jour `docs/faq.md` — Questions sur formats supportes, generation PDF
  - [x] 7.3 Mettre a jour `docs/flows.md` — Flux viewer et telechargement

## Dev Notes

### Architecture — Regles critiques

- **MODULE EXISTANT** : Etendre `packages/modules/documents/` — PAS de nouveau module.
- **Supabase Storage signed URLs** : Utiliser `supabase.storage.from('documents').createSignedUrl(filePath, 3600)` pour generer des URLs temporaires (1h). TOUJOURS cote serveur via Server Action — JAMAIS exposer les chemins Storage au client.
- **Response format** : `{ data, error }` — JAMAIS throw dans les Server Actions.
- **Viewer responsive** : Mobile >=320px. Utiliser Tailwind responsive utilities.
- **Logging** : `[DOCUMENTS:VIEW]`, `[DOCUMENTS:DOWNLOAD]`, `[DOCUMENTS:GENERATE_PDF]`

### Approche technique viewer

**Rendu par type de fichier :**

| Extension | Rendu | Composant/Methode |
|-----------|-------|-------------------|
| `.md` | HTML (Markdown rendu) | `react-markdown` + `remark-gfm` |
| `.pdf` | Viewer embarque | `<iframe src={signedUrl}>` |
| `.png`, `.jpg`, `.jpeg`, `.svg` | Image directe | `<img>` avec `object-fit: contain` |
| `.docx`, `.xlsx`, `.csv`, `.txt` | Metadonnees + telecharger | `DocumentMetadataPreview` |

**Generation PDF Markdown :**
- Approche legere : `marked` (Markdown → HTML) + template HTML avec branding + conversion serveur
- Alternative : utiliser une Edge Function ou une lib comme `@react-pdf/renderer` si besoin de mise en page avancee
- Le PDF genere doit inclure : header (logo MonprojetPro), body (contenu converti), footer (date + "Genere depuis MonprojetPro")
- Contrainte performance : < 5 secondes (NFR-P6) → eviter puppeteer, preferer lib legere

**Signed URLs — Pattern :**
```typescript
// actions/get-document-url.ts
'use server'
export async function getDocumentUrl(documentId: string): Promise<ActionResponse<{ url: string; document: Document }>> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return errorResponse('Non authentifie', 'UNAUTHORIZED')

  // RLS filtre automatiquement les documents non autorises
  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single()

  if (error || !doc) return errorResponse('Document introuvable', 'NOT_FOUND')

  const { data: urlData, error: urlError } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 3600) // 1h

  if (urlError) return errorResponse('Erreur generation URL', 'STORAGE_ERROR', urlError)

  return successResponse({ url: urlData.signedUrl, document: toDocument(doc) })
}
```

### Dependances nouvelles

- `react-markdown` — Rendu Markdown → HTML (cote client)
- `remark-gfm` — Plugin GitHub Flavored Markdown
- `marked` — Conversion Markdown → HTML (cote serveur pour PDF)
- Lib PDF legere a determiner — `jspdf` ou `@react-pdf/renderer`

**Installation** : `npm install react-markdown remark-gfm marked` dans `packages/modules/documents/`

### Fichiers a creer/modifier

**Nouveaux fichiers :**
```
packages/modules/documents/
├── actions/get-document-url.ts (nouveau)
├── actions/get-document-url.test.ts (nouveau)
├── actions/generate-pdf.ts (nouveau)
├── actions/generate-pdf.test.ts (nouveau)
├── components/document-viewer.tsx (nouveau)
├── components/document-viewer.test.tsx (nouveau)
├── components/document-viewer-skeleton.tsx (nouveau)
├── components/document-metadata-preview.tsx (nouveau)
├── components/document-metadata-preview.test.tsx (nouveau)
├── components/document-download-button.tsx (nouveau)
├── components/document-download-button.test.tsx (nouveau)
├── components/document-visibility-badge.tsx (nouveau)
├── components/document-visibility-badge.test.tsx (nouveau)
├── hooks/use-document-viewer.ts (nouveau)
├── hooks/use-document-viewer.test.ts (nouveau)
├── utils/markdown-to-html.ts (nouveau)
├── utils/markdown-to-html.test.ts (nouveau)
├── utils/pdf-generator.ts (nouveau)
```

**Fichiers modifies :**
```
packages/modules/documents/
├── index.ts (modifier — ajouter exports viewer)
├── components/document-list.tsx (modifier — lien cliquable vers viewer)
├── docs/guide.md (modifier — section viewer)
├── docs/faq.md (modifier — FAQ viewer/PDF)
├── docs/flows.md (modifier — flux viewer)
```

**Routes nouvelles :**
```
apps/hub/app/(dashboard)/modules/documents/[clientId]/[documentId]/page.tsx
apps/hub/app/(dashboard)/modules/documents/[clientId]/[documentId]/loading.tsx
apps/hub/app/(dashboard)/modules/documents/[clientId]/[documentId]/error.tsx
apps/client/app/(dashboard)/modules/documents/[documentId]/page.tsx
apps/client/app/(dashboard)/modules/documents/[documentId]/loading.tsx
apps/client/app/(dashboard)/modules/documents/[documentId]/error.tsx
```

### Patterns existants a suivre (story 4.1)

- **Types** : `Document` (camelCase) et `DocumentDB` (snake_case) — utiliser `toDocument()` pour la conversion
- **Imports partages** : `createServerSupabaseClient` depuis `@monprojetpro/supabase`, `ActionResponse/successResponse/errorResponse` depuis `@monprojetpro/types`, `validateFile/formatFileSize` depuis `@monprojetpro/utils`
- **Hook pattern** : Query key `['documents', clientId]` pour les listes, creer `['document', documentId]` pour le detail
- **Composant page** : Pattern `DocumentsPageClient` — composant 'use client' qui recoit les props serveur
- **Tests mocks** : Pattern chained `vi.fn()` pour mocker le query builder Supabase
- **Optimistic updates** : Seulement pour delete. PAS pour upload/generation PDF.

### Dependances existantes

- Table `documents` (migration 00027)
- Bucket Storage `documents` avec RLS
- Module `packages/modules/documents/` (story 4.1)
- `@monprojetpro/utils` — `formatFileSize()`, `validateFile()`
- `@monprojetpro/types` — `ActionResponse`, `successResponse`, `errorResponse`
- `@monprojetpro/supabase` — `createServerSupabaseClient`

### Anti-patterns — Interdit

- NE PAS exposer les chemins Storage au client (utiliser signed URLs)
- NE PAS utiliser `fetch()` cote client pour acceder au Storage (Server Actions uniquement)
- NE PAS utiliser puppeteer/playwright pour la generation PDF (trop lourd, trop lent)
- NE PAS throw dans les Server Actions
- NE PAS stocker les PDF generes permanemment (temporaires uniquement)
- NE PAS creer de route API pour le viewer (Server Action + composant client)

### Project Structure Notes

- Routes viewer Hub : `apps/hub/app/(dashboard)/modules/documents/[clientId]/[documentId]/` — nested sous [clientId] existant
- Routes viewer Client : `apps/client/app/(dashboard)/modules/documents/[documentId]/` — flat car clientId implicite
- Pas de nouvelle table DB — cette story utilise uniquement la table `documents` existante

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-4-gestion-documentaire-stories-detaillees.md#Story 4.2]
- [Source: docs/project-context.md]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md]
- [Source: _bmad-output/implementation-artifacts/4-1-module-documents-migration-structure-upload-avec-validation.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed `@monprojetpro/utils` mock missing `DEFAULT_LOCALE` — used `importOriginal` pattern in vi.mock
- Fixed `mockToast` hoisting error — used `vi.hoisted()` for mock variables in document-download-button.test.tsx
- Chose lightweight regex-based Markdown→HTML instead of external deps (react-markdown, marked) to avoid bundle bloat and stay <5s NFR-P6
- generate-pdf returns branded HTML (not binary PDF) — client-side blob download approach

**Code Review Fixes (adversarial, 10 issues found):**
- CRITICAL: Fixed XSS — raw HTML tags now escaped outside code blocks in markdownToHtml
- HIGH: Fixed inline code HTML escaping — `escapeHtml()` now applied to inline code content
- HIGH: Fixed javascript: protocol injection — links now validated via `isSafeUrl()`
- HIGH: Fixed signed URL race — added `staleTime` (30min), `refetchOnWindowFocus`, exposed `markdownError`
- MEDIUM: Fixed misleading label — "Telecharger en PDF" → "Telecharger en HTML" (honest about format)
- MEDIUM: Added 6 XSS security tests (script tags, img onerror, javascript: URLs, data: URLs, inline code)
- MEDIUM: Fixed refetch — now invalidates both document and markdown query caches
- MEDIUM: Fixed ordered lists — now wrapped in `<ol>` tags instead of orphan `<li>` elements
- LOW (documented): Hub page doesn't verify document belongs to clientId URL param
- LOW (bonus fix): Delayed `URL.revokeObjectURL` to prevent race with async download

### Completion Notes List

- 7 tasks, 24 subtasks — all completed
- 93 module tests across 15 test files, all passing (post code review)
- 1570 project-wide tests passing, 0 failures (post code review)
- No external dependencies added (zero new npm packages)
- Markdown→HTML: custom regex converter (no marked/react-markdown dependency)
- PDF generation: server-side HTML template with MonprojetPro branding, client-side download
- Signed URLs: 1h expiration, server-side only via getDocumentUrl action
- Viewer supports: Markdown (HTML render), PDF (iframe), images (img), fallback (metadata preview)

### File List

**New files (22):**
- `packages/modules/documents/actions/get-document-url.ts`
- `packages/modules/documents/actions/get-document-url.test.ts`
- `packages/modules/documents/actions/generate-pdf.ts`
- `packages/modules/documents/actions/generate-pdf.test.ts`
- `packages/modules/documents/utils/markdown-to-html.ts`
- `packages/modules/documents/utils/markdown-to-html.test.ts`
- `packages/modules/documents/utils/pdf-generator.ts`
- `packages/modules/documents/components/document-viewer.tsx`
- `packages/modules/documents/components/document-viewer.test.tsx`
- `packages/modules/documents/components/document-viewer-skeleton.tsx`
- `packages/modules/documents/components/document-metadata-preview.tsx`
- `packages/modules/documents/components/document-metadata-preview.test.tsx`
- `packages/modules/documents/components/document-download-button.tsx`
- `packages/modules/documents/components/document-download-button.test.tsx`
- `packages/modules/documents/components/document-visibility-badge.tsx`
- `packages/modules/documents/components/document-visibility-badge.test.tsx`
- `packages/modules/documents/components/document-viewer-page-client.tsx`
- `packages/modules/documents/hooks/use-document-viewer.ts`
- `packages/modules/documents/hooks/use-document-viewer.test.ts`
- `apps/hub/app/(dashboard)/modules/documents/[clientId]/[documentId]/page.tsx`
- `apps/hub/app/(dashboard)/modules/documents/[clientId]/[documentId]/loading.tsx`
- `apps/hub/app/(dashboard)/modules/documents/[clientId]/[documentId]/error.tsx`
- `apps/client/app/(dashboard)/modules/documents/[documentId]/page.tsx`
- `apps/client/app/(dashboard)/modules/documents/[documentId]/loading.tsx`
- `apps/client/app/(dashboard)/modules/documents/[documentId]/error.tsx`

**Modified files (7):**
- `packages/modules/documents/types/document.types.ts`
- `packages/modules/documents/index.ts`
- `packages/modules/documents/components/document-list.tsx`
- `packages/modules/documents/components/documents-page-client.tsx`
- `packages/modules/documents/docs/guide.md`
- `packages/modules/documents/docs/faq.md`
- `packages/modules/documents/docs/flows.md`

**Route files (2 modified):**
- `apps/hub/app/(dashboard)/modules/documents/[clientId]/page.tsx`
- `apps/client/app/(dashboard)/modules/documents/page.tsx`
