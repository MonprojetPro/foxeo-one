import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getContactMessages,
  getContactThread,
  resolveContactMessage,
  replyToContactMessage,
} from '../actions/contact-messages'
import type { ContactMessage, ContactStatus, ContactThread } from '../types'

/**
 * Liste des messages Aide & Contact (status optionnel).
 * Auto-refresh toutes les 30s (MenuFacile = base séparée → pas de Realtime
 * possible via le guichet ; le polling remplace le rafraîchissement manuel).
 */
export function useContactMessages(status?: ContactStatus) {
  return useQuery<ContactMessage[]>({
    queryKey: ['menu-facile', 'contact-messages', status ?? 'all'],
    queryFn: async (): Promise<ContactMessage[]> => {
      const res = await getContactMessages(status)
      if (res.error) throw new Error(res.error.message)
      return res.data ?? []
    },
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Fil complet d'un message (bulles user/admin). Auto-refresh 15s tant qu'il est
 * ouvert → les réponses entrantes de l'utilisateur apparaissent seules.
 */
export function useContactThread(id: string | null) {
  return useQuery<ContactThread>({
    queryKey: ['menu-facile', 'contact-thread', id],
    enabled: !!id,
    retry: false,
    queryFn: async (): Promise<ContactThread> => {
      const res = await getContactThread(id as string)
      if (res.error || !res.data) throw new Error(res.error?.message ?? 'Fil introuvable')
      return res.data
    },
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  })
}

/** Mutations : statut + réponse in-app. Invalident fil + liste + métriques. */
export function useContactActions() {
  const qc = useQueryClient()
  const invalidate = (id?: string) => {
    qc.invalidateQueries({ queryKey: ['menu-facile', 'contact-messages'] })
    qc.invalidateQueries({ queryKey: ['menu-facile', 'metrics'] })
    if (id) qc.invalidateQueries({ queryKey: ['menu-facile', 'contact-thread', id] })
  }

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: ContactStatus }) => {
      const res = await resolveContactMessage(input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: (_d, v) => invalidate(v.id),
  })

  const reply = useMutation({
    mutationFn: async (input: { id: string; body: string }) => {
      const res = await replyToContactMessage(input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: (_d, v) => invalidate(v.id),
  })

  return { setStatus, reply }
}
