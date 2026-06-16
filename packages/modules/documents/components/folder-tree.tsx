'use client'

import { useState } from 'react'
import { Button, AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@monprojetpro/ui'
import { Folder, FolderOpen, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@monprojetpro/utils'
import type { DocumentFolder } from '../types/folder.types'
import { CreateFolderDialog } from './create-folder-dialog'
import { useFolderMutations } from '../hooks/use-folder-mutations'
import { useUndoableAction } from '../hooks/use-undo-action'

/** 'sidebar' = colonne verticale (défaut). 'horizontal' = barre de pilules au-dessus de la liste. */
type FolderTreeLayout = 'sidebar' | 'horizontal'

interface FolderTreeProps {
  folders: DocumentFolder[]
  selectedFolderId: string | null
  onSelectFolder: (id: string | null) => void
  clientId: string
  operatorId: string
  isOperator?: boolean
  layout?: FolderTreeLayout
}

// ── Classes selon le layout ──────────────────────────────────────────────────

function itemClass(layout: FolderTreeLayout, isSelected: boolean, extra = ''): string {
  if (layout === 'horizontal') {
    return cn(
      'group inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm cursor-pointer whitespace-nowrap hover:bg-accent transition-colors',
      isSelected ? 'bg-accent text-accent-foreground border-primary/50' : 'border-border',
      extra
    )
  }
  return cn(
    'group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-accent',
    isSelected && 'bg-accent text-accent-foreground',
    extra
  )
}

interface FolderItemProps {
  folder: DocumentFolder
  isSelected: boolean
  onSelect: () => void
  onRename: (folder: DocumentFolder) => void
  onDelete: (folder: DocumentFolder) => void
  layout: FolderTreeLayout
}

function FolderItem({ folder, isSelected, onSelect, onRename, onDelete, layout }: FolderItemProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={itemClass(layout, isSelected)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={onSelect}
      data-testid={`folder-item-${folder.id}`}
    >
      {isSelected ? (
        <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
      ) : (
        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
      <span className={cn('text-sm truncate', layout === 'sidebar' && 'flex-1')}>{folder.name}</span>
      {showActions && (
        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onRename(folder)}
            aria-label={`Renommer ${folder.name}`}
            data-testid={`rename-folder-${folder.id}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:text-destructive"
            onClick={() => onDelete(folder)}
            aria-label={`Supprimer ${folder.name}`}
            data-testid={`delete-folder-${folder.id}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  clientId,
  operatorId,
  isOperator = false,
  layout = 'sidebar',
}: FolderTreeProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<DocumentFolder | null>(null)
  const [folderToRename, setFolderToRename] = useState<DocumentFolder | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)

  const { useCreateFolder, useRenameFolder, useDeleteFolder } = useFolderMutations(clientId)
  const { execute: executeUndo } = useUndoableAction()

  const handleCreate = (name: string) => {
    useCreateFolder.mutate(
      { clientId, operatorId, name, parentId: null },
      { onSuccess: () => setCreateDialogOpen(false) }
    )
  }

  const handleRename = (name: string) => {
    if (!folderToRename) return
    useRenameFolder.mutate(
      { folderId: folderToRename.id, name },
      {
        onSuccess: () => {
          setFolderToRename(null)
          setRenameDialogOpen(false)
        },
      }
    )
  }

  const handleDeleteConfirm = () => {
    if (!folderToDelete) return
    const deletedFolder = folderToDelete
    executeUndo(
      async () => {
        useDeleteFolder.mutate(
          { folderId: deletedFolder.id },
          {
            onSuccess: () => {
              if (selectedFolderId === deletedFolder.id) {
                onSelectFolder(null)
              }
            },
          }
        )
      },
      async () => {
        useCreateFolder.mutate(
          { clientId, operatorId, name: deletedFolder.name, parentId: null }
        )
      },
      { successMessage: `Dossier "${deletedFolder.name}" supprimé` }
    )
    setFolderToDelete(null)
  }

  const containerClass =
    layout === 'horizontal'
      ? 'flex flex-wrap items-center gap-2'
      : 'flex flex-col gap-1'

  return (
    <div className={containerClass} data-testid="folder-tree">
      {/* Tous les documents */}
      <div
        className={itemClass(layout, selectedFolderId === null, 'font-medium')}
        onClick={() => onSelectFolder(null)}
        data-testid="folder-all"
      >
        <Folder className="h-4 w-4 shrink-0" />
        Tous les documents
      </div>

      {/* Non classés */}
      <div
        className={itemClass(layout, selectedFolderId === 'uncategorized')}
        onClick={() => onSelectFolder('uncategorized')}
        data-testid="folder-uncategorized"
      >
        <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">Non classés</span>
      </div>

      {/* Dossiers utilisateur */}
      {folders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          isSelected={selectedFolderId === folder.id}
          onSelect={() => onSelectFolder(folder.id)}
          onRename={(f) => {
            setFolderToRename(f)
            setRenameDialogOpen(true)
          }}
          onDelete={(f) => setFolderToDelete(f)}
          layout={layout}
        />
      ))}

      {/* Nouveau dossier */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'gap-2 text-muted-foreground hover:text-foreground',
          layout === 'horizontal' ? 'rounded-full border border-dashed' : 'mt-1 justify-start'
        )}
        onClick={() => setCreateDialogOpen(true)}
        data-testid="new-folder-btn"
      >
        <Plus className="h-4 w-4" />
        Nouveau dossier
      </Button>

      {/* Dialog créer */}
      <CreateFolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onConfirm={handleCreate}
        isLoading={useCreateFolder.isPending}
      />

      {/* Dialog renommer */}
      <CreateFolderDialog
        open={renameDialogOpen}
        onOpenChange={(open) => {
          setRenameDialogOpen(open)
          if (!open) setFolderToRename(null)
        }}
        onConfirm={handleRename}
        isLoading={useRenameFolder.isPending}
        defaultValue={folderToRename?.name ?? ''}
      />

      {/* Alert supprimer */}
      <AlertDialog
        open={!!folderToDelete}
        onOpenChange={(open) => { if (!open) setFolderToDelete(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le dossier &quot;{folderToDelete?.name}&quot; sera supprimé définitivement.
              Attention : ce dossier doit être vide (déplacez d&apos;abord les documents ailleurs).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              data-testid="confirm-delete-folder-btn"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
