import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getContactMessages, resolveContactMessage } from '../actions/contact-messages'
import type { ContactMessage, ContactStatus } from '../types'

/** Liste des messages Aide & Contact (status optionnel). */
export function useContactMessages(status?: ContactStatus) {
  return useQuery<ContactMessage[]>({
    queryKey: ['menu-facile', 'contact-messages', status ?? 'all'],
    queryFn: async (): Promise<ContactMessage[]> => {
      const res = await getContactMessages(status)
      if (res.error) throw new Error(res.error.message)
      return res.data ?? []
    },
    staleTime: 60 * 1000,
  })
}

/** Mutation : changer le statut d'un message. Invalide la liste + les métriques. */
export function useContactActions() {
  const qc = useQueryClient()

  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: ContactStatus }) => {
      const res = await resolveContactMessage(input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-facile', 'contact-messages'] })
      qc.invalidateQueries({ queryKey: ['menu-facile', 'metrics'] })
    },
  })

  return { setStatus }
}
