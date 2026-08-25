'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { DataTable, type ColumnDef } from '@monprojetpro/ui'
import { Badge, Button, Checkbox } from '@monprojetpro/ui'
import { Download, Eye, FolderInput, MoreVertical, Trash2 } from 'lucide-react'
import { formatFileSize } from '@monprojetpro/utils'
import { DocumentIcon } from './document-icon'
import { DocumentShareButton } from './document-share-button'
import { DocumentSyncBadge } from './document-sync-badge'
import { DocumentExportMenu } from './document-export-menu'
import { DocumentPreviewModal } from './document-preview-modal'
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

/** Déclenche le téléchargement d'un document via la route API (mêmes droits que partout). */
function triggerDownload(documentId: string) {
  const a = window.document.createElement('a')
  a.href = `/api/documents/download/${documentId}`
  a.style.display = 'none'
  window.document.body.appendChild(a)
  a.click()
  window.document.body.removeChild(a)
}

interface DocumentActionsMenuProps {
  doc: Document
  /** Si fourni (+ onMove), affiche la section « Déplacer vers ». */
  folders?: DocumentFolder[]
  onMove?: (folderId: string | null) => void
  isMovePending?: boolean
  /** Si fourni, affiche l'action « Supprimer ». */
  onDelete?: (documentId: string) => void
  isDeleting?: boolean
}

/**
 * Menu d'actions secondaires « ⋯ » : Télécharger + Déplacer + Supprimer en un seul point
 * (évite d'étaler les boutons sur plusieurs colonnes — cause du scroll latéral, retour MiKL).
 * Rendu dans un PORTAL en position `fixed` : sinon le menu est rogné par l'`overflow-auto`
 * de la DataTable (menu tronqué — retour MiKL). Position calculée depuis le bouton, ouverture
 * vers le haut si l'espace sous le bouton est insuffisant.
 */
function DocumentActionsMenu({
  doc,
  folders,
  onMove,
  isMovePending = false,
  onDelete,
  isDeleting = false,
}: DocumentActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pos, setPos] = useState<{ right: number; top?: number; bottom?: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const canMove = !!folders && !!onMove

  const close = () => setIsOpen(false)

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        close()
      }
    }
    // Le menu est en position fixed : il ne suit pas le scroll → on le ferme.
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [isOpen])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      const right = window.innerWidth - r.right
      // ~280px = hauteur max du menu : si l'espace sous le bouton est insuffisant, on ouvre vers le haut.
      const dropUp = window.innerHeight - r.bottom < 280
      setPos(dropUp ? { right, bottom: window.innerHeight - r.top + 4 } : { right, top: r.bottom + 4 })
    }
    setIsOpen((v) => !v)
  }

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground"
        onClick={handleToggle}
        disabled={isMovePending || isDeleting}
        aria-label={`Actions pour ${doc.name}`}
        data-testid={`actions-doc-${doc.id}`}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {isOpen && pos && createPortal(
        <div
          ref={menuRef}
          // pointerEvents:'auto' indispensable : le menu est porté sur <body>, hors du contenu
          // d'un éventuel dialogue Radix modal (ex: « Gestion des documents » du CRM) qui met
          // pointer-events:none sur tout l'extérieur → sinon les éléments ne sont pas cliquables.
          style={{ position: 'fixed', right: pos.right, top: pos.top, bottom: pos.bottom, pointerEvents: 'auto' }}
          className="z-[60] min-w-[190px] max-h-[280px] overflow-y-auto rounded-md border bg-popover p-1 shadow-lg"
        >
          {/* Télécharger — toujours disponible */}
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
            onClick={() => { triggerDownload(doc.id); close() }}
            data-testid={`download-doc-${doc.id}`}
          >
            <Download className="h-3.5 w-3.5" />
            Télécharger
          </button>

          {canMove && (
            <>
              <div className="my-1 h-px bg-border" />
              <p className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-muted-foreground">
                <FolderInput className="h-3.5 w-3.5" />
                Déplacer vers
              </p>
              <button
                type="button"
                className="w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                onClick={() => { onMove?.(null); close() }}
                disabled={isMovePending}
              >
                Non classé
              </button>
              {folders!.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={[
                    'w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors',
                    doc.folderId === folder.id ? 'text-muted-foreground' : '',
                  ].join(' ')}
                  onClick={() => { onMove?.(folder.id); close() }}
                  disabled={isMovePending || doc.folderId === folder.id}
                >
                  {folder.name}
                </button>
              ))}
            </>
          )}

          {onDelete && (
            <>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => { onDelete(doc.id); close() }}
                disabled={isDeleting}
                data-testid={`delete-doc-${doc.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </>
          )}
        </div>,
        window.document.body
      )}
    </>
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
  const [previewDocId, setPreviewDocId] = useState<string | null>(null)
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
            // JSX inline (et non une fonction) : la DataTable rend `column.header` directement
            // — un header-fonction n'est pas un ReactNode valide et ne s'affichait pas.
            header: (
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
          // Pas de page viewer dédiée (ex: dialogue « Gestion des documents » du CRM) :
          // le nom ouvre l'aperçu EN PLACE plutôt qu'un texte mort non cliquable.
          <button
            type="button"
            className="font-medium truncate max-w-xs text-left text-primary hover:underline"
            title={`Lire ${doc.name}`}
            onClick={(e) => { e.stopPropagation(); setPreviewDocId(doc.id) }}
            data-testid={`doc-link-${doc.id}`}
          >
            {doc.name}
          </button>
        ),
    },
    {
      id: 'tags',
      header: 'Tags',
      accessorKey: 'tags',
      className: 'hidden sm:table-cell',
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
      className: 'hidden lg:table-cell',
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
      className: 'hidden md:table-cell',
      cell: (doc) => (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
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
    ...(isOperator
      ? [
          {
            id: 'sync',
            header: 'Sync BMAD',
            accessorKey: 'lastSyncedAt' as const,
            className: 'hidden xl:table-cell',
            cell: (doc: Document) => (
              <DocumentSyncBadge lastSyncedAt={doc.lastSyncedAt} />
            ),
          } satisfies ColumnDef<Document>,
        ]
      : []),
    // Colonne d'actions UNIQUE, alignée à droite : Lire (toujours) + Partage (opérateur)
    // + menu ⋯ (Déplacer / Supprimer). Regroupe ce qui était éparpillé sur 3 colonnes
    // → supprime le scroll latéral (retour MiKL).
    {
      id: 'actions',
      header: '',
      accessorKey: 'id' as const,
      className: 'text-right',
      cell: (doc: Document) => (
        <div className="flex items-center justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); setPreviewDocId(doc.id) }}
            aria-label={`Lire ${doc.name}`}
            data-testid={`read-doc-${doc.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {showBatchActions && clientId && (
            <DocumentShareButton document={doc} clientId={clientId} compact />
          )}
          {((folders && clientId) || onDelete) && (
            <DocumentActionsMenu
              doc={doc}
              folders={folders && clientId ? folders : undefined}
              onMove={
                folders && clientId
                  ? (folderId) => useMoveDocument.mutate({ documentId: doc.id, folderId })
                  : undefined
              }
              isMovePending={useMoveDocument.isPending}
              onDelete={onDelete}
              isDeleting={isDeleting}
            />
          )}
        </div>
      ),
    } satisfies ColumnDef<Document>,
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
      <DocumentPreviewModal
        documentId={previewDocId}
        onClose={() => setPreviewDocId(null)}
      />
    </div>
  )
}
