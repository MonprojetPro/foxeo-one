'use client'

import { Share2, EyeOff } from 'lucide-react'
import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@monprojetpro/ui'
import type { Document } from '../types/document.types'
import { useShareDocument } from '../hooks/use-share-document'
import { useUndoableAction } from '../hooks/use-undo-action'

interface DocumentShareButtonProps {
  document: Document
  clientId: string
  /** Mode icône seule (gain de largeur dans le tableau) — le libellé passe en tooltip. */
  compact?: boolean
}

export function DocumentShareButton({ document, clientId, compact = false }: DocumentShareButtonProps) {
  const { share, unshare, isSharing, isUnsharing, shareError, unshareError } = useShareDocument(clientId)
  const { execute: executeUndo } = useUndoableAction()

  const handleUndoableUnshare = () => {
    executeUndo(
      async () => { unshare(document.id) },
      async () => { share(document.id) },
      { successMessage: 'Partage retiré' }
    )
  }

  if (document.visibility === 'private') {
    return (
      <Button
        variant="ghost"
        size={compact ? 'icon' : 'sm'}
        className={compact ? 'h-8 w-8 text-muted-foreground hover:text-foreground' : 'gap-1.5'}
        onClick={() => share(document.id)}
        disabled={isSharing}
        title={shareError?.message ?? (compact ? 'Partager avec le client' : undefined)}
        aria-label={compact ? `Partager ${document.name}` : undefined}
        data-testid={`share-btn-${document.id}`}
      >
        <Share2 className="h-3.5 w-3.5" />
        {!compact && 'Partager'}
      </Button>
    )
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'sm'}
          className={compact ? 'h-8 w-8 text-green-500 hover:text-green-400' : 'gap-1.5 text-muted-foreground'}
          disabled={isUnsharing}
          title={unshareError?.message ?? (compact ? 'Retirer le partage' : undefined)}
          aria-label={compact ? `Retirer le partage de ${document.name}` : undefined}
          data-testid={`unshare-btn-${document.id}`}
        >
          <EyeOff className="h-3.5 w-3.5" />
          {!compact && 'Retirer le partage'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Retirer le partage ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le client ne pourra plus voir ce document. Vous pourrez annuler cette action
            pendant 5 secondes après confirmation.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleUndoableUnshare}>
            Confirmer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
