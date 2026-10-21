import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getClientProjects } from '../actions/get-client-projects'
import { createClientProject } from '../actions/create-client-project'
import { deleteClientProject } from '../actions/delete-client-project'
import { assignDocumentProject } from '../actions/assign-document-project'
import type { ClientProject, CreateClientProjectInput } from '../types/crm.types'

// ============================================================
// T-063 — projets (chantiers) d'un client, chacun relie a un dossier local
// ============================================================

export function useClientProjects(clientId: string) {
  return useQuery({
    queryKey: ['client-projects', clientId],
    queryFn: async (): Promise<ClientProject[]> => {
      const result = await getClientProjects(clientId)
      if (result.error) throw new Error(result.error.message)
      return result.data ?? []
    },
    enabled: !!clientId,
  })
}

function useInvalidateProjects(clientId: string) {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['client-projects', clientId] })
  }
}

export function useCreateClientProject(clientId: string) {
  const invalidate = useInvalidateProjects(clientId)
  return useMutation({
    mutationFn: async (input: CreateClientProjectInput): Promise<ClientProject> => {
      const result = await createClientProject(input)
      if (result.error || !result.data) throw new Error(result.error?.message ?? 'Échec de la création')
      return result.data
    },
    onSuccess: invalidate,
  })
}

export function useDeleteClientProject(clientId: string) {
  const invalidate = useInvalidateProjects(clientId)
  return useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      const result = await deleteClientProject(projectId)
      if (result.error) throw new Error(result.error.message)
    },
    onSuccess: invalidate,
  })
}

export function useAssignDocumentProject(clientId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { documentId: string; projectId: string | null }): Promise<void> => {
      const result = await assignDocumentProject(input.documentId, input.projectId)
      if (result.error) throw new Error(result.error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-documents', clientId] }),
  })
}
