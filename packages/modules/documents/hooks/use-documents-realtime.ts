'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'

/**
 * Abonnement Realtime aux changements de documents d'un client, via BROADCAST depuis la base
 * (trigger `trg_broadcast_documents_change`).
 *
 * Pourquoi broadcast et non postgres_changes : au retrait de partage (shared -> private),
 * la RLS `documents_select_merged` masque la ligne au client → un event postgres_changes ne
 * lui serait PAS livré (Realtime applique la RLS sur la ligne). Le broadcast contourne cette
 * visibilité de ligne et permet d'invalider le cache TanStack Query dans tous les cas
 * (partage, retrait de partage, ajout, suppression).
 *
 * Monté dans DocumentsPageClient → couvre la vue client (Lab/One) ET la vue opérateur (Hub).
 */
export function useDocumentsRealtime(clientId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!clientId) return
    const supabase = createBrowserSupabaseClient()

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['documents', clientId] })
      queryClient.invalidateQueries({ queryKey: ['all-documents'] })
    }

    const channel = supabase
      .channel(`documents:${clientId}`)
      .on('broadcast', { event: 'documents_changed' }, invalidate)
      .subscribe((status: string, err?: Error) => {
        if (status === 'SUBSCRIBED') {
          // Rattrape un éventuel changement survenu juste avant l'abonnement.
          invalidate()
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[DOCUMENTS:REALTIME] Channel error:', err)
        }
      })

    // Reconnexion : rafraîchir au retour en ligne.
    window.addEventListener('online', invalidate)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('online', invalidate)
    }
  }, [clientId, queryClient])
}
