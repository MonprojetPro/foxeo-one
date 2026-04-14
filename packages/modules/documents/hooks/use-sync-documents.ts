'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { syncDocumentsToZip } from '../actions/sync-documents-to-zip'
import type { SyncDocumentsResult } from '../actions/sync-documents-to-zip'
import type { ActionResponse } from '@monprojetpro/types'

/**
 * Hook TanStack Query pour la mutation de synchronisation ZIP.
 * Invalide le cache ['documents', clientId] après succès pour refléter les last_synced_at mis à jour.
 *
 * AC2: Mutation + téléchargement
 * AC3: Invalidation cache → re-fetch documents pour afficher les badges "Syncé"
 */
export function useSyncDocuments(clientId: string) {
  const queryClient = useQueryClient()

  const syncMutation = useMutation<ActionResponse<SyncDocumentsResult>, Error, string>({
    mutationFn: (cId: string) => syncDocumentsToZip(cId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', clientId] })
    },
  })

  return {
    sync: syncMutation.mutate,
    syncAsync: syncMutation.mutateAsync,
    isPending: syncMutation.isPending,
    isSuccess: syncMutation.isSuccess,
    isError: syncMutation.isError,
    error: syncMutation.error,
    data: syncMutation.data,
  }
}
