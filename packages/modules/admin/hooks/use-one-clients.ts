'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listOneClients, type OneClientEntry } from '../actions/list-one-clients'
import { setOneStatus } from '../actions/set-one-status'
import { applyClientModuleConfig } from '../actions/apply-client-module-config'
import { showSuccess, showError } from '@monprojetpro/ui'

/**
 * Setup One complet — vision v2 : tous les modules One / One+ d'un coup
 * (pas de distinction ② / ③ pour l'instant, décision MiKL 2026-07-03).
 * Les modules is_default du catalogue + dépendances sont ajoutés en cascade
 * par applyClientModuleConfig.
 */
export const ONE_SETUP_MODULES = [
  'core-dashboard',
  'chat',
  'documents',
  'visio',
  'facturation',
  'support',
  'elio',
  'suivi-outil',
] as const

export function useOneClients() {
  return useQuery({
    queryKey: ['one-clients'],
    queryFn: async () => {
      const result = await listOneClients()
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
  })
}

export function useSetOneStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, oneStatus }: { clientId: string; oneStatus: 'construction' | 'delivered' }) => {
      const result = await setOneStatus(clientId, oneStatus)
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['one-clients'] })
      showSuccess(
        data.oneStatus === 'delivered'
          ? 'Outil marqué comme livré — les cockpits s\'allument côté client'
          : 'Outil repassé « en chantier »'
      )
    },
    onError: (error: Error) => {
      showError(error.message)
    },
  })
}

export function useApplyOneSetup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (clientId: string) => {
      const result = await applyClientModuleConfig(clientId, [...ONE_SETUP_MODULES])
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['one-clients'] })
      queryClient.invalidateQueries({ queryKey: ['client-modules'] })
      showSuccess(`Setup One appliqué — ${data.applied.length} modules actifs`)
    },
    onError: (error: Error) => {
      showError(error.message)
    },
  })
}

export type { OneClientEntry }
