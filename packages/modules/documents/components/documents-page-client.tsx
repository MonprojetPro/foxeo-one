'use client'

import { useCallback, useMemo, useState } from 'react'
import { useDocuments } from '../hooks/use-documents'
import { useFolders } from '../hooks/use-folders'
import { useUndoableAction } from '../hooks/use-undo-action'
import { restoreDocument } from '../actions/restore-document'
import { DocumentUpload } from './document-upload'
import { DocumentList } from './document-list'
import { DocumentSkeleton } from './document-skeleton'
import { FolderTree } from './folder-tree'
import { FolderTreeSkeleton } from './folder-tree-skeleton'
import { DocumentSearch } from './document-search'
import type { Document } from '../types/document.types'
import { filterByOrigin, groupDocuments, type OriginFilter } from '../utils/origin-filter'

interface DocumentsPageClientProps {
  clientId: string
  operatorId: string
  uploadedBy: 'client' | 'operator'
  initialDocuments: Document[]
  showVisibility?: boolean
  showBatchActions?: boolean
  viewerBaseHref?: string
  isOperator?: boolean
  /** Date ISO de graduation Lab → One. Si présente, active le filtre Origine. */
  graduatedAt?: string
  /** True si le client a un historique Lab (graduation_source='lab'). */
  hasLabBackground?: boolean
}

export function DocumentsPageClient({
  clientId,
  operatorId,
  uploadedBy,
  initialDocuments,
  showVisibility = true,
  showBatchActions = false,
  viewerBaseHref,
  isOperator = false,
  graduatedAt,
  hasLabBackground = false,
}: DocumentsPageClientProps) {
  const {
    documents,
    isPending,
    upload,
    isUploading,
    deleteDocument,
    isDeleting,
  } = useDocuments(clientId)

  const { execute: executeUndo } = useUndoableAction()

  const handleUndoableDelete = useCallback(
    (documentId: string) => {
      executeUndo(
        async () => { deleteDocument(documentId) },
        async () => { await restoreDocument({ documentId }) },
        { successMessage: 'Document supprimé' }
      )
    },
    [deleteDocument, executeUndo]
  )

  const { folders, isPending: foldersPending } = useFolders(clientId)

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all')

  const displayDocuments = isPending ? initialDocuments : documents

  const filteredDocuments = useMemo(() => {
    let docs = displayDocuments

    // Filtre par dossier actif
    if (activeFolderId === 'uncategorized') {
      docs = docs.filter((d) => d.folderId === null)
    } else if (activeFolderId !== null) {
      docs = docs.filter((d) => d.folderId === activeFolderId)
    }

    // Filtre par origine (utilise la fonction extraite)
    docs = filterByOrigin(docs, originFilter, graduatedAt)

    return docs
  }, [displayDocuments, activeFolderId, originFilter, graduatedAt])

  // Sections groupées pour la vue "Tous" avec historique Lab
  const { labBriefs, livrables, autresDocuments } = useMemo(() => {
    if (originFilter !== 'all') return { labBriefs: [], livrables: [], autresDocuments: [] }
    return groupDocuments(filteredDocuments)
  }, [filteredDocuments, originFilter])

  const handleUpload = (file: File) => {
    const formData = new FormData()
    formData.set('file', file)
    formData.set('clientId', clientId)
    formData.set('operatorId', operatorId)
    formData.set('uploadedBy', uploadedBy)
    formData.set('visibility', 'private')
    upload(formData)
  }

  if (isPending && initialDocuments.length === 0) {
    return <DocumentSkeleton />
  }

  const showOriginFilter = hasLabBackground || !!graduatedAt
  const ORIGIN_LABELS: Record<OriginFilter, string> = {
    all: 'Tous',
    lab: 'Lab',
    one: 'One',
  }

  return (
    <div className="flex flex-col gap-6 p-4" data-testid="documents-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents</h1>
      </div>

      <DocumentUpload
        onUpload={handleUpload}
        isUploading={isUploading}
      />

      {/* Filtre Origine — visible uniquement pour les clients avec historique Lab */}
      {showOriginFilter && (
        <div className="flex gap-2" data-testid="origin-filter">
          {(['all', 'lab', 'one'] as OriginFilter[]).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setOriginFilter(filter)}
              className={[
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                originFilter === filter
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              ].join(' ')}
              aria-pressed={originFilter === filter}
            >
              {ORIGIN_LABELS[filter]}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        {/* Arborescence dossiers — colonne gauche */}
        <aside className="w-64 shrink-0" data-testid="folder-tree-aside">
          {foldersPending ? (
            <FolderTreeSkeleton />
          ) : (
            <FolderTree
              folders={folders}
              selectedFolderId={activeFolderId}
              onSelectFolder={setActiveFolderId}
              clientId={clientId}
              operatorId={operatorId}
              isOperator={isOperator}
            />
          )}
        </aside>

        {/* Contenu principal — colonne droite */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <DocumentSearch
            value={searchQuery}
            onChange={setSearchQuery}
          />

          {/* Vue groupée par sections (filter = all + hasLabBackground) */}
          {originFilter === 'all' && hasLabBackground ? (
            <div className="flex flex-col gap-6">
              {labBriefs.length > 0 && (
                <section data-testid="section-briefs-lab">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Briefs Lab
                  </h2>
                  <DocumentList
                    documents={labBriefs}
                    clientId={clientId}
                    onDelete={handleUndoableDelete}
                    isDeleting={isDeleting}
                    showVisibility={showVisibility}
                    showBatchActions={showBatchActions}
                    viewerBaseHref={viewerBaseHref}
                    searchQuery={searchQuery}
                    isOperator={isOperator}
                    folders={folders}
                  />
                </section>
              )}
              {livrables.length > 0 && (
                <section data-testid="section-livrables">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Livrables
                  </h2>
                  <DocumentList
                    documents={livrables}
                    clientId={clientId}
                    onDelete={handleUndoableDelete}
                    isDeleting={isDeleting}
                    showVisibility={showVisibility}
                    showBatchActions={showBatchActions}
                    viewerBaseHref={viewerBaseHref}
                    searchQuery={searchQuery}
                    isOperator={isOperator}
                    folders={folders}
                  />
                </section>
              )}
              {autresDocuments.length > 0 && (
                <section data-testid="section-autres">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Autres documents
                  </h2>
                  <DocumentList
                    documents={autresDocuments}
                    clientId={clientId}
                    onDelete={handleUndoableDelete}
                    isDeleting={isDeleting}
                    showVisibility={showVisibility}
                    showBatchActions={showBatchActions}
                    viewerBaseHref={viewerBaseHref}
                    searchQuery={searchQuery}
                    isOperator={isOperator}
                    folders={folders}
                  />
                </section>
              )}
            </div>
          ) : (
            <DocumentList
              documents={filteredDocuments}
              clientId={clientId}
              onDelete={handleUndoableDelete}
              isDeleting={isDeleting}
              showVisibility={showVisibility}
              showBatchActions={showBatchActions}
              viewerBaseHref={viewerBaseHref}
              searchQuery={searchQuery}
              isOperator={isOperator}
              folders={folders}
            />
          )}
        </div>
      </div>
    </div>
  )
}
