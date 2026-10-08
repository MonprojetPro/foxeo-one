import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientContacts } from '../actions/get-client-contacts'
import { createClientContact } from '../actions/create-client-contact'
import { updateClientContact } from '../actions/update-client-contact'
import { deleteClientContact, type DeleteClientContactResult } from '../actions/delete-client-contact'
import type {
  ClientContact,
  CreateClientContactInput,
  UpdateClientContactInput,
} from '../types/crm.types'

// ============================================================
// T-039 — carnet de contacts
//
// Toutes les mutations invalident ['client-contacts', clientId] ET ['client',
// clientId] : `clients.contact` est un miroir d'affichage tenu par un trigger en
// base, donc l'en-tete de fiche change AUSSI quand on touche au carnet. Sans la
// seconde invalidation, MiKL verrait le nouveau contact dans la liste et l'ancien
// dans l'en-tete, sur le meme ecran.
// ============================================================

export function useClientContacts(clientId: string) {
  return useQuery({
    queryKey: ['client-contacts', clientId],
    queryFn: async (): Promise<ClientContact[]> => {
      const result = await getClientContacts(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    enabled: !!clientId,
  })
}

function useInvalidateContacts(clientId: string) {
  const queryClient = useQueryClient()
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['client-contacts', clientId] }),
      queryClient.invalidateQueries({ queryKey: ['client', clientId] }),
      queryClient.invalidateQueries({ queryKey: ['clients'] }),
    ])
  }
}

export function useCreateClientContact(clientId: string) {
  const invalidate = useInvalidateContacts(clientId)
  return useMutation({
    mutationFn: async (input: CreateClientContactInput): Promise<ClientContact> => {
      const result = await createClientContact(input)
      if (result.error || !result.data) throw new Error(result.error?.message ?? 'Échec de la création')
      return result.data
    },
    onSuccess: invalidate,
  })
}

export function useUpdateClientContact(clientId: string) {
  const invalidate = useInvalidateContacts(clientId)
  return useMutation({
    mutationFn: async (input: UpdateClientContactInput): Promise<ClientContact> => {
      const result = await updateClientContact(input)
      if (result.error || !result.data) throw new Error(result.error?.message ?? 'Échec de la modification')
      return result.data
    },
    onSuccess: invalidate,
  })
}

export function useDeleteClientContact(clientId: string) {
  const invalidate = useInvalidateContacts(clientId)
  return useMutation({
    mutationFn: async (contactId: string): Promise<DeleteClientContactResult> => {
      const result = await deleteClientContact(contactId)
      if (result.error || !result.data) throw new Error(result.error?.message ?? 'Échec de la suppression')
      return result.data
    },
    onSuccess: invalidate,
  })
}
