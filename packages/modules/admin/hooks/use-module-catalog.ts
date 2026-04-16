'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listModuleCatalog, type ListModuleCatalogFilters, type ModuleCatalogEntry } from '../actions/list-module-catalog'
import { upsertModuleCatalog, type UpsertModuleCatalogInput } from '../actions/upsert-module-catalog'
import { deleteModuleCatalog } from '../actions/delete-module-catalog'
import { syncModuleCatalogFromManifests } from '../actions/sync-module-catalog-from-manifests'
import { showSuccess, showError } from '@monprojetpro/ui'

export function useModuleCatalog(filters?: ListModuleCatalogFilters) {
  return useQuery({
    queryKey: ['module-catalog', filters],
    queryFn: async () => {
      const result = await listModuleCatalog(filters)
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
  })
}

export function useUpsertModuleCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpsertModuleCatalogInput) => {
      const result = await upsertModuleCatalog(input)
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-catalog'] })
      showSuccess(variables.id ? 'Module mis à jour' : 'Module créé')
    },
    onError: (error: Error) => {
      showError(error.message)
    },
  })
}

export function useDeleteModuleCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (moduleId: string) => {
      const result = await deleteModuleCatalog(moduleId)
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-catalog'] })
      showSuccess('Module supprimé')
    },
    onError: (error: Error) => {
      showError(error.message)
    },
  })
}

export function useSyncModuleCatalog() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result = await syncModuleCatalogFromManifests()
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['module-catalog'] })
      const msg = `Sync terminée : ${data.added.length} ajoutés, ${data.orphaned.length} orphelins`
      showSuccess(msg)
    },
    onError: (error: Error) => {
      showError(error.message)
    },
  })
}

export type { ModuleCatalogEntry, ListModuleCatalogFilters }
