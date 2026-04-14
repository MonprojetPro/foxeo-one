# Story 4.4: Organisation en dossiers & recherche dans les documents

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **client MonprojetPro**,
I want **organiser mes documents en dossiers et rechercher rapidement dans mes documents**,
so that **je retrouve facilement un document specifique meme avec beaucoup de fichiers**.

## Acceptance Criteria

1. **AC1 — Migration DB** : La table `document_folders` est creee avec : id (UUID PK DEFAULT gen_random_uuid()), client_id (FK clients NOT NULL), operator_id (FK operators NOT NULL), name (TEXT NOT NULL), parent_id (UUID nullable FK document_folders — sous-dossiers), created_at (TIMESTAMP DEFAULT NOW()). La colonne `folder_id` dans `documents` reference `document_folders(id)` ON DELETE SET NULL. Policies RLS : `document_folders_select_owner` (client voit ses dossiers), `document_folders_select_operator` (operateur voit les dossiers de ses clients), `document_folders_insert_authenticated`, `document_folders_update_owner_operator`, `document_folders_delete_owner_operator`.

2. **AC2 — Arborescence de dossiers** : Un composant `FolderTree` s'affiche a gauche de la liste de documents (FR146). Les documents sans dossier apparaissent dans un dossier virtuel "Non classes". Un clic sur un dossier filtre la liste de documents. Client et MiKL peuvent creer un nouveau dossier (nom obligatoire, min 1 char). Client et MiKL peuvent renommer ou supprimer un dossier vide (avec confirmation AlertDialog).

3. **AC3 — Deplacement de documents** : Un menu contextuel "Deplacer vers..." (ou drag & drop) permet de deplacer un document dans un dossier. Server Action `moveDocument(documentId, folderId | null)` met a jour `folder_id`. Toast "Document deplace dans {nom_dossier}". Invalide cache.

4. **AC4 — Recherche** : Un champ de recherche dans la page documents filtre en temps reel (FR107) sur : nom du document, tags, type de fichier. Resultats < 1 seconde (NFR-P4). Recherche a travers tous les dossiers (pas limitee au dossier actif). Le filtre s'applique cote client sur les donnees TanStack Query deja chargees (pas de requete DB supplementaire pour la recherche).

5. **AC5 — Vue Hub (MiKL)** : MiKL voit la meme arborescence dans le Hub. MiKL peut creer des dossiers et deplacer des documents pour le client. Les memes composants sont reutilises avec `isOperator` prop.

6. **AC6 — Tests** : Tests unitaires co-localises pour toutes les nouvelles actions, hooks et composants. Coverage >80%.

## Tasks / Subtasks

- [x] Task 1 — Migration DB document_folders (AC: #1)
  - [x] 1.1 Creer `supabase/migrations/00028_document_folders.sql` — table `document_folders`, FK `documents.folder_id`, policies RLS
  - [x] 1.2 Creer `tests/rls/document-folders.test.ts` — test isolation : client A ne voit pas les dossiers client B (bloquant CI)

- [x] Task 2 — Types et schemas Zod (AC: #1, #2, #3)
  - [x] 2.1 Creer `types/folder.types.ts` — `DocumentFolder`, `DocumentFolderDB`, `CreateFolderInput` (Zod), `RenameFolderInput` (Zod), `MoveDocumentInput` (Zod : documentId UUID, folderId UUID nullable)
  - [x] 2.2 Tests schemas Zod (parse valid/invalid — 6 tests)

- [x] Task 3 — Server Actions dossiers (AC: #2)
  - [x] 3.1 Creer `actions/create-folder.ts` — `createFolder(input: CreateFolderInput)` : auth, insert dans `document_folders`, retourne `ActionResponse<DocumentFolder>`
  - [x] 3.2 Creer `actions/rename-folder.ts` — `renameFolder(input: RenameFolderInput)` : auth, update name, retourne `ActionResponse<DocumentFolder>`
  - [x] 3.3 Creer `actions/delete-folder.ts` — `deleteFolder(folderId: string)` : auth, verifie dossier vide (0 documents), delete, retourne `ActionResponse<void>`
  - [x] 3.4 Creer `actions/get-folders.ts` — `getFolders(clientId: string)` : auth, select * from document_folders WHERE client_id, retourne `ActionResponse<DocumentFolder[]>`
  - [x] 3.5 Tests pour chaque action (auth, not found, validation, succes — 4-5 tests chacune = ~18 tests)

- [x] Task 4 — Server Action moveDocument (AC: #3)
  - [x] 4.1 Creer `actions/move-document.ts` — `moveDocument(input: MoveDocumentInput)` : auth, update `folder_id` sur le document, retourne `ActionResponse<Document>`
  - [x] 4.2 Tests `actions/move-document.test.ts` — auth, document introuvable, dossier introuvable, deplacer vers null (Non classes), succes (5 tests)

- [x] Task 5 — Hooks dossiers (AC: #2, #3)
  - [x] 5.1 Creer `hooks/use-folders.ts` — `useFolders(clientId)` : TanStack Query `['folders', clientId]`, charge `getFolders()`
  - [x] 5.2 Creer `hooks/use-folder-mutations.ts` — mutations `useCreateFolder`, `useRenameFolder`, `useDeleteFolder`, `useMoveDocument` — invalident `['folders', clientId]` et `['documents', clientId]`
  - [x] 5.3 Tests (query success, mutations success, invalidation cache — 6 tests)

- [x] Task 6 — Composant FolderTree (AC: #2, #5)
  - [x] 6.1 Creer `components/folder-tree.tsx` — Props : `folders: DocumentFolder[]`, `selectedFolderId: string | null`, `onSelectFolder: (id: string | null) => void`, `isOperator?: boolean`. Affiche arborescence avec noeud "Tous les documents" (null) et "Non classes". Bouton "+ Nouveau dossier". Menu contextuel sur hover (renommer, supprimer) si `isOperator || ownedByClient`.
  - [x] 6.2 Creer `components/folder-tree-skeleton.tsx` — Skeleton loader 3-4 items
  - [x] 6.3 Creer `components/create-folder-dialog.tsx` — Dialog shadcn/ui avec input nom + validation
  - [x] 6.4 Tests `components/folder-tree.test.tsx` — rendu sans dossiers, rendu avec dossiers, selection dossier, menu contextuel, creation dossier (7 tests)

- [x] Task 7 — Recherche dans DocumentList (AC: #4)
  - [x] 7.1 Modifier `components/document-list.tsx` — ajouter prop `searchQuery?: string`. Filtrer les documents cote client : `documents.filter(d => d.name.toLowerCase().includes(q) || d.fileType.includes(q) || d.tags.some(t => t.includes(q)))`. Afficher "Aucun document trouve" si 0 resultats.
  - [x] 7.2 Creer `components/document-search.tsx` — Input debounce 200ms avec icone Search, efface avec X
  - [x] 7.3 Tests `components/document-search.test.tsx` — rendu, input, debounce, clear (4 tests)
  - [x] 7.4 Tests document-list filtre (5 tests supplementaires)

- [x] Task 8 — Integration page documents (AC: #2, #3, #4, #5)
  - [x] 8.1 Modifier `components/documents-page-client.tsx` — layout 2 colonnes : gauche `FolderTree` (w-64), droite `DocumentSearch` + `DocumentList` filtree. State local `activeFolderId` et `searchQuery`. Filtrer `documents` par `folderId` actif avant passage a `DocumentList`.
  - [x] 8.2 Mettre a jour `apps/hub/app/(dashboard)/modules/documents/[clientId]/page.tsx` — passer `isOperator={true}`
  - [x] 8.3 Mettre a jour `apps/client/app/(dashboard)/modules/documents/page.tsx` — `isOperator={false}`

- [x] Task 9 — Mise a jour barrel exports (AC: #6)
  - [x] 9.1 Mettre a jour `index.ts` — exporter `FolderTree`, `DocumentSearch`, `CreateFolderDialog`, `useFolders`, `useFolderMutations`, `createFolder`, `renameFolder`, `deleteFolder`, `getFolders`, `moveDocument` + types dossiers
  - [x] 9.2 Mettre a jour `types/document.types.ts` ou creer `types/folder.types.ts` (recommande : fichier separe)

- [x] Task 10 — Documentation (AC: #6)
  - [x] 10.1 Mettre a jour `docs/guide.md` — section dossiers et recherche
  - [x] 10.2 Mettre a jour `docs/faq.md` — FAQ : puis-je supprimer un dossier non vide ? la recherche est-elle en temps reel ?
  - [x] 10.3 Mettre a jour `docs/flows.md` — flux creation dossier, deplacement document, recherche

## Dev Notes

### Architecture — Regles critiques

- **MODULE EXISTANT** : Etendre `packages/modules/documents/` uniquement.
- **Nouvelle migration** : `supabase/migrations/00028_document_folders.sql`. Le numero 00028 suit 00027 (migration documents story 4.1). Verifier le dernier numero de migration existant avant d'ecrire.
- **FK ON DELETE SET NULL** : Quand un dossier est supprime, les documents qu'il contenait passent a `folder_id = NULL` (Non classes). Ne pas supprimer les documents.
- **Recherche cote client** : La recherche utilise `.filter()` sur les donnees deja en cache TanStack Query — PAS de requete DB supplementaire. Cela satisfait NFR-P4 < 1 seconde.
- **Pas de drag & drop externe** : Utiliser uniquement un menu contextuel "Deplacer vers..." (shadcn/ui DropdownMenu) pour le deplacement. Le drag & drop est optionnel si le temps le permet (ne pas bloquer la story dessus).

### Pattern migration SQL

```sql
-- supabase/migrations/00028_document_folders.sql

-- Table document_folders
CREATE TABLE document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(name) >= 1),
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_document_folders_client_id ON document_folders(client_id);

-- FK dans documents (deja creee en 00027 comme nullable)
-- Verifier si ALTER TABLE est necessaire ou deja en place
ALTER TABLE documents
  ADD CONSTRAINT fk_documents_folder_id
  FOREIGN KEY (folder_id) REFERENCES document_folders(id) ON DELETE SET NULL;

-- Policies RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY document_folders_select_owner ON document_folders
  FOR SELECT USING (client_id = (SELECT id FROM clients WHERE user_id = auth.uid()));

CREATE POLICY document_folders_select_operator ON document_folders
  FOR SELECT USING (operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid()));

CREATE POLICY document_folders_insert_authenticated ON document_folders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY document_folders_update_owner_operator ON document_folders
  FOR UPDATE USING (
    client_id = (SELECT id FROM clients WHERE user_id = auth.uid())
    OR operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid())
  );

CREATE POLICY document_folders_delete_owner_operator ON document_folders
  FOR DELETE USING (
    client_id = (SELECT id FROM clients WHERE user_id = auth.uid())
    OR operator_id IN (SELECT id FROM operators WHERE user_id = auth.uid())
  );
```

### Pattern types dossiers

```typescript
// types/folder.types.ts
import { z } from 'zod'

export interface DocumentFolder {
  id: string
  clientId: string
  operatorId: string
  name: string
  parentId: string | null
  createdAt: string
}

export interface DocumentFolderDB {
  id: string
  client_id: string
  operator_id: string
  name: string
  parent_id: string | null
  created_at: string
}

export const CreateFolderInput = z.object({
  clientId: z.string().uuid(),
  operatorId: z.string().uuid(),
  name: z.string().min(1, 'Le nom est requis').max(100),
  parentId: z.string().uuid().nullable().default(null),
})
export type CreateFolderInput = z.infer<typeof CreateFolderInput>

export const MoveDocumentInput = z.object({
  documentId: z.string().uuid(),
  folderId: z.string().uuid().nullable(), // null = "Non classes"
})
export type MoveDocumentInput = z.infer<typeof MoveDocumentInput>
```

### Pattern recherche cote client (performance)

```typescript
// Dans documents-page-client.tsx
const filteredDocuments = useMemo(() => {
  let docs = documents ?? []

  // Filtre par dossier actif
  if (activeFolderId === 'uncategorized') {
    docs = docs.filter(d => d.folderId === null)
  } else if (activeFolderId !== null) {
    docs = docs.filter(d => d.folderId === activeFolderId)
  }

  // Filtre par recherche
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    docs = docs.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.fileType.toLowerCase().includes(q) ||
      d.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  return docs
}, [documents, activeFolderId, searchQuery])
```

### Dependances existantes

- Table `documents` (migration 00027) avec colonne `folder_id UUID nullable`
- Module `packages/modules/documents/` — toutes les stories 4.1, 4.2, 4.3
- Types `Document`, `DocumentDB` — deja dans `types/document.types.ts`
- `toDocument()` dans `utils/to-document.ts` — ajouter `toDocumentFolder()` dans `utils/to-document-folder.ts`
- `@monprojetpro/types` — `ActionResponse`, `successResponse`, `errorResponse`
- `@monprojetpro/supabase` — `createServerSupabaseClient`

### Verification migration existante

Avant d'ecrire la migration 00028, verifier :
```bash
ls supabase/migrations/
```
Le dernier fichier doit etre `00027_documents.sql` (ou similaire). Adapter le numero si necessaire.

### Anti-patterns — Interdit

- NE PAS faire de requete DB pour la recherche — filtre cote client sur donnees en cache
- NE PAS supprimer les documents quand un dossier est supprime — ON DELETE SET NULL
- NE PAS stocker `activeFolderId` dans Zustand — useState local dans documents-page-client
- NE PAS implémenter le drag & drop si ca bloque la story (livrer le menu contextuel en priorite)

### Estimation tests

| Fichier | Tests |
|---------|-------|
| actions (create/rename/delete/get/move) | ~23 |
| hooks/use-folders + use-folder-mutations | 6 |
| components/folder-tree | 7 |
| components/document-search | 4 |
| document-list (supplementaires) | +5 |
| types schemas | 6 |
| tests/rls/document-folders | 3 |
| **Total nouveaux tests** | **~54** |

Projet post-4.3 : ~1608 tests. Objectif post-4.4 : **~1662 tests**.

### References

- [Source: _bmad-output/planning-artifacts/epics/epic-4-gestion-documentaire-stories-detaillees.md#Story 4.4]
- [Source: docs/project-context.md]
- [Source: _bmad-output/planning-artifacts/architecture/04-implementation-patterns.md]
- [Source: _bmad-output/implementation-artifacts/4-1-module-documents-migration-structure-upload-avec-validation.md]
- [Source: _bmad-output/implementation-artifacts/4-3-partage-de-documents-mikl-client-visibilite.md]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (dev) + Claude Sonnet 4.6 (code review)

### Debug Log References

### Completion Notes List

- **Implementation complete** — Tous les ACs (AC1-AC6) sont implementes et testes (1675 tests passing, 76 skipped)
- **Code review adversarial** — 2 HIGH + 4 MEDIUM issues trouves et fixes :
  - H2 : INSERT policy RLS renforcee (verification client_id/operator_id)
  - M1 : CreateFolderDialog accepte `defaultValue` pour pre-remplir lors du renommage
  - M2 : AlertDialog suppression message corrige (dossier doit etre vide)
  - M3 : deleteFolder verifie aussi les sous-dossiers enfants (FOLDER_HAS_CHILDREN)
  - M4 : useFolders conserve error.code et error.details dans l'objet Error
- **Refactoring** — DocumentSearch refactorise en uncontrolled input (defaultValue + ref) pour compatibilite React 19 + happy-dom + debounce
- **Tests** — 63 nouveaux tests ajoutes (RLS, actions, hooks, composants, schemas Zod)
- **Architecture** — Recherche cote client (filtre JavaScript sur cache TanStack Query) respecte NFR-P4 < 1s

### File List

**Nouveaux fichiers (25) :**
- `supabase/migrations/00028_document_folders.sql`
- `tests/rls/document-folders.test.ts`
- `packages/modules/documents/types/folder.types.ts`
- `packages/modules/documents/types/folder.types.test.ts`
- `packages/modules/documents/utils/to-document-folder.ts`
- `packages/modules/documents/actions/get-folders.ts`
- `packages/modules/documents/actions/get-folders.test.ts`
- `packages/modules/documents/actions/create-folder.ts`
- `packages/modules/documents/actions/create-folder.test.ts`
- `packages/modules/documents/actions/rename-folder.ts`
- `packages/modules/documents/actions/rename-folder.test.ts`
- `packages/modules/documents/actions/delete-folder.ts`
- `packages/modules/documents/actions/delete-folder.test.ts`
- `packages/modules/documents/actions/move-document.ts`
- `packages/modules/documents/actions/move-document.test.ts`
- `packages/modules/documents/hooks/use-folders.ts`
- `packages/modules/documents/hooks/use-folders.test.ts`
- `packages/modules/documents/hooks/use-folder-mutations.ts`
- `packages/modules/documents/hooks/use-folder-mutations.test.ts`
- `packages/modules/documents/components/folder-tree.tsx`
- `packages/modules/documents/components/folder-tree.test.tsx`
- `packages/modules/documents/components/folder-tree-skeleton.tsx`
- `packages/modules/documents/components/create-folder-dialog.tsx`
- `packages/modules/documents/components/document-search.tsx`
- `packages/modules/documents/components/document-search.test.tsx`

**Fichiers modifies (9) :**
- `packages/modules/documents/components/document-list.tsx` — ajout prop `searchQuery` + filtre cote client
- `packages/modules/documents/components/document-list.test.tsx` — 5 tests supplementaires filtre
- `packages/modules/documents/components/documents-page-client.tsx` — integration FolderTree + DocumentSearch
- `packages/modules/documents/index.ts` — exports dossiers + recherche
- `packages/modules/documents/docs/guide.md` — documentation dossiers + recherche
- `packages/modules/documents/docs/faq.md` — FAQ dossiers vides, recherche
- `packages/modules/documents/docs/flows.md` — flows 9-11 (creation, deplacement, recherche)
- `apps/hub/app/(dashboard)/modules/documents/[clientId]/page.tsx` — prop `isOperator={true}`
- `apps/client/app/(dashboard)/modules/documents/page.tsx` — prop `isOperator={false}`
