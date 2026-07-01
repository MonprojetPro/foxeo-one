import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getContactMessages,
  resolveContactMessage,
  replyToContactMessage,
} from '../actions/contact-messages'
import type { ContactMessage, ContactStatus } from '../types'

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

/** Mutations : statut + réponse in-app. Invalident la liste + les métriques. */
export function useContactActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['menu-facile', 'contact-messages'] })
    qc.invalidateQueries({ queryKey: ['menu-facile', 'metrics'] })
  }

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: ContactStatus }) => {
      const res = await resolveContactMessage(input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: invalidate,
  })

  const reply = useMutation({
    mutationFn: async (input: { id: string; reply: string }) => {
      const res = await replyToContactMessage(input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: invalidate,
  })

  return { setStatus, reply }
}
