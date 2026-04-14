import { toast } from '@monprojetpro/ui'

interface UseUndoableActionOptions {
  delay?: number
  successMessage?: string
  undoMessage?: string
}

/**
 * Hook for executing actions with undo capability via toast notification.
 *
 * @returns Object with execute function
 *
 * @example
 * ```tsx
 * const { execute } = useUndoableAction()
 *
 * const handleDelete = async () => {
 *   await execute(
 *     () => deleteDocument(documentId),
 *     () => restoreDocument(documentId),
 *     { successMessage: 'Document supprimé' }
 *   )
 * }
 * ```
 */
export function useUndoableAction() {
  const execute = async <T,>(
    action: () => Promise<T>,
    undoAction: () => Promise<void>,
    options: UseUndoableActionOptions = {}
  ): Promise<T> => {
    const { delay = 5000, successMessage = 'Action effectuée', undoMessage = 'Annulée' } = options

    try {
      // Exécuter l'action immédiatement
      const result = await action()

      // Afficher le toast avec bouton Annuler (duration gérée par sonner)
      toast.success(successMessage, {
        duration: delay,
        action: {
          label: 'Annuler',
          onClick: async () => {
            try {
              await undoAction()
              toast.success(undoMessage)
              console.info('[DOCUMENTS:UNDO] Action annulée')
            } catch (error) {
              console.error('[DOCUMENTS:UNDO] Erreur lors de l\'annulation:', error)
              toast.error("Impossible d'annuler l'action")
            }
          },
        },
      })

      return result
    } catch (error) {
      console.error('[DOCUMENTS:ACTION] Erreur lors de l\'exécution:', error)
      toast.error("Erreur lors de l'exécution de l'action")
      throw error
    }
  }

  return { execute }
}
