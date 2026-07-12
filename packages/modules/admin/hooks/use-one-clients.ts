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

/**
 * Applique un jeu de modules ARBITRAIRE à un client (activer/désactiver à la carte).
 * `applyClientModuleConfig` réinjecte automatiquement les modules `is_default` + dépendances :
 * certains modules ne peuvent donc pas être désactivés (ils reviennent en cascade). Le résultat
 * renvoyé (`applied`) reflète l'état RÉEL appliqué — c'est lui qui fait foi.
 */
export function useApplyClientModules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ clientId, moduleKeys }: { clientId: string; moduleKeys: string[] }) => {
      // injectDefaults:false → gestion à la carte : le choix de l'opérateur est respecté à la lettre
      // (sinon les modules is_default décochés reviendraient aussitôt).
      const result = await applyClientModuleConfig(clientId, moduleKeys, { injectDefaults: false })
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['one-clients'] })
      queryClient.invalidateQueries({ queryKey: ['client-modules'] })
      const cascadedNote =
        data.cascaded.length > 0 ? ` (${data.cascaded.length} réactivé(s) en cascade)` : ''
      showSuccess(`Modules mis à jour — ${data.applied.length} actif(s)${cascadedNote}`)
    },
    onError: (error: Error) => {
      showError(error.message)
    },
  })
}

export type { OneClientEntry }
