'use client'

import { useEffect, useRef, useState } from 'react'
import { DataTable, type ColumnDef } from '@monprojetpro/ui'
import { Badge, Button, Checkbox } from '@monprojetpro/ui'
import { FolderInput, Trash2 } from 'lucide-react'
import { formatFileSize } from '@monprojetpro/utils'
import { DocumentIcon } from './document-icon'
import { DocumentShareButton } from './document-share-button'
import { DocumentSyncBadge } from './document-sync-badge'
import { DocumentExportMenu } from './document-export-menu'
import { useShareDocument } from '../hooks/use-share-document'
import { useFolderMutations } from '../hooks/use-folder-mutations'
import type { Document } from '../types/document.types'
import type { DocumentFolder } from '../types/folder.types'

interface DocumentListProps {
  documents: Document[]
  clientId?: string
  onDelete?: (documentId: string) => void
  isDeleting?: boolean
  showVisibility?: boolean
  viewerBaseHref?: string
  showBatchActions?: boolean
  searchQuery?: string
  isOperator?: boolean
  folders?: DocumentFolder[]
}

interface DocumentMoveDropdownProps {
  doc: Document
  folders: DocumentFolder[]
  onMove: (folderId: string | null) => void
  isPending: boolean
}

function DocumentMoveDropdown({ doc, folders, onMove, isPending }: DocumentMoveDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={(e) => { e.stopPropagation(); setIsOpen((v) => !v) }}
        disabled={isPending}
        aria-label={`Déplacer ${doc.name}`}
        data-testid={`move-doc-${doc.id}`}
      >
        <FolderInput className="h-4 w-4" />
      </Button>
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-md border bg-popover p-1 shadow-md">
          <p className="px-3 py-1 text-xs font-medium text-muted-foreground">Déplacer vers</p>
          <button
            type="button"
            className="w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
            onClick={() => { onMove(null); setIsOpen(false) }}
            disabled={isPending}
          >
            Non classé
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              className={[
                'w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors',
                doc.folderId === folder.id ? 'text-muted-foreground' : '',
              ].join(' ')}
              onClick={() => { onMove(folder.id); setIsOpen(false) }}
              disabled={isPending || doc.folderId === folder.id}
            >
              {folder.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DocumentList({
  documents,
  clientId,
  onDelete,
  isDeleting = false,
  showVisibility = true,
  viewerBaseHref,
  showBatchActions = false,
  searchQuery = '',
  isOperator = false,
  folders,
}: DocumentListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { shareBatch, isBatchSharing } = useShareDocument(clientId ?? '')
  const { useMoveDocument } = useFolderMutations(clientId ?? '')

  const filteredDocuments = searchQuery.trim()
    ? documents.filter((d) => {
        const q = searchQuery.toLowerCase()
        return (
          d.name.toLowerCase().includes(q) ||
          d.fileType.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q))
        )
      })
    : documents

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredDocuments.map((d) => d.id)))
    }
  }

  const handleBatchShare = () => {
    if (!clientId || selectedIds.size === 0) return
    shareBatch(
      { documentIds: Array.from(selectedIds), clientId },
      { onSuccess: () => setSelectedIds(new Set()) }
    )
  }

  const columns: ColumnDef<Document>[] = [
    ...(showBatchActions
      ? [
          {
            id: 'select',
            header: () => (
              <Checkbox
                checked={filteredDocuments.length > 0 && selectedIds.size === filteredDocuments.length}
                onCheckedChange={toggleAll}
                aria-label="Tout sélectionner"
                data-testid="select-all-checkbox"
              />
            ),
            accessorKey: 'id' as const,
            cell: (doc: Document) => (
              <Checkbox
                checked={selectedIds.has(doc.id)}
                onCheckedChange={() => toggleSelection(doc.id)}
                aria-label={`Sélectionner ${doc.name}`}
                data-testid={`select-${doc.id}`}
                onClick={(e) => e.stopPropagation()}
              />
            ),
          } satisfies ColumnDef<Document>,
        ]
      : []),
    {
      id: 'type',
      header: '',
      accessorKey: 'fileType',
      cell: (doc) => <DocumentIcon fileType={doc.fileType} />,
    },
    {
      id: 'name',
      header: 'Nom',
      accessorKey: 'name',
      cell: (doc) =>
        viewerBaseHref ? (
          <a
            href={`${viewerBaseHref}/${doc.id}`}
            className="font-medium truncate max-w-xs text-primary hover:underline"
            title={doc.name}
            data-testid={`doc-link-${doc.id}`}
          >
            {doc.name}
          </a>
        ) : (
          <span className="font-medium truncate max-w-xs" title={doc.name}>
            {doc.name}
          </span>
        ),
    },
    {
      id: 'tags',
      header: 'Tags',
      accessorKey: 'tags',
      cell: (doc) => (
        <div className="flex flex-wrap gap-1">
          {doc.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {doc.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{doc.tags.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'size',
      header: 'Taille',
      accessorKey: 'fileSize',
      cell: (doc) => (
        <span className="text-muted-foreground text-sm">
          {formatFileSize(doc.fileSize)}
        </span>
      ),
    },
    {
      id: 'date',
      header: 'Date',
      accessorKey: 'createdAt',
      cell: (doc) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(doc.createdAt)}
        </span>
      ),
    },
    ...(showVisibility
      ? [
          {
            id: 'visibility',
            header: 'Visibilité',
            accessorKey: 'visibility' as const,
            cell: (doc: Document) => (
              <Badge variant={doc.visibility === 'shared' ? 'default' : 'outline'}>
                {doc.visibility === 'shared' ? 'Partagé' : 'Privé'}
              </Badge>
            ),
          } satisfies ColumnDef<Document>,
        ]
      : []),
    ...(showBatchActions && clientId
      ? [
          {
            id: 'share',
            header: '',
            accessorKey: 'id' as const,
            cell: (doc: Document) => (
              <DocumentShareButton document={doc} clientId={clientId} />
            ),
          } satisfies ColumnDef<Document>,
        ]
      : []),
    ...(isOperator
      ? [
          {
            id: 'sync',
            header: 'Sync BMAD',
            accessorKey: 'lastSyncedAt' as const,
            cell: (doc: Document) => (
              <DocumentSyncBadge lastSyncedAt={doc.lastSyncedAt} />
            ),
          } satisfies ColumnDef<Document>,
        ]
      : []),
    ...(folders && clientId
      ? [
          {
            id: 'move',
            header: '',
            accessorKey: 'id' as const,
            cell: (doc: Document) => (
              <DocumentMoveDropdown
                doc={doc}
                folders={folders}
                onMove={(folderId) => useMoveDocument.mutate({ documentId: doc.id, folderId })}
                isPending={useMoveDocument.isPending}
              />
            ),
          } satisfies ColumnDef<Document>,
        ]
      : []),
    ...(onDelete
      ? [
          {
            id: 'actions',
            header: '',
            accessorKey: 'id' as const,
            cell: (doc: Document) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(doc.id)
                }}
                disabled={isDeleting}
                aria-label={`Supprimer ${doc.name}`}
                data-testid={`delete-doc-${doc.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ),
          } satisfies ColumnDef<Document>,
        ]
      : []),
  ]

  return (
    <div data-testid="document-list">
      {clientId && (
        <div className="flex justify-end mb-2" data-testid="document-list-toolbar">
          <DocumentExportMenu clientId={clientId} />
        </div>
      )}
      {showBatchActions && selectedIds.size > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-2 mb-2 bg-muted rounded-md"
          data-testid="batch-actions-bar"
        >
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} document{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            onClick={handleBatchShare}
            disabled={isBatchSharing}
            data-testid="batch-share-btn"
          >
            Partager la sélection ({selectedIds.size})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            data-testid="clear-selection-btn"
          >
            Annuler
          </Button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={filteredDocuments}
        emptyMessage={searchQuery.trim() ? 'Aucun document trouvé' : 'Aucun document'}
      />
    </div>
  )
}
