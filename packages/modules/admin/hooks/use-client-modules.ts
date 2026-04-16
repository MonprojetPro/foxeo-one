'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createBrowserSupabaseClient } from '@monprojetpro/supabase'
import { toggleClientModule, type ToggleClientModuleResult } from '../actions/toggle-client-module'
import { applyClientModuleConfig, type ApplyConfigResult } from '../actions/apply-client-module-config'
import { showSuccess, showError } from '@monprojetpro/ui'

export function useClientModules(clientId: string) {
  return useQuery({
    queryKey: ['client-modules', clientId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient()
      const { data, error } = await supabase
        .from('client_configs')
        .select('active_modules')
        .eq('client_id', clientId)
        .single()

      if (error) throw new Error(error.message)
      return (data?.active_modules as string[]) ?? []
    },
    enabled: !!clientId,
  })
}

export function useToggleClientModule(clientId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ moduleKey, enable }: { moduleKey: string; enable: boolean }) => {
      const result = await toggleClientModule(clientId, moduleKey, enable)
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-modules', clientId] })
      if (data.enabled) {
        const msg = data.cascaded.length > 0
          ? `Module "${data.enabled}" activé (+ ${data.cascaded.join(', ')} en cascade)`
          : `Module "${data.enabled}" activé`
        showSuccess(msg)
      } else if (data.disabled) {
        showSuccess(`Module "${data.disabled}" désactivé`)
      }
    },
    onError: (error: Error) => {
      showError(error.message)
    },
  })
}

export function useApplyClientModuleConfig(clientId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (moduleKeys: string[]) => {
      const result = await applyClientModuleConfig(clientId, moduleKeys)
      if (result.error) throw new Error(result.error.message)
      return result.data!
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['client-modules', clientId] })
      const msg = data.cascaded.length > 0
        ? `Configuration appliquée (${data.applied.length} modules, ${data.cascaded.length} ajoutés en cascade)`
        : `Configuration appliquée (${data.applied.length} modules)`
      showSuccess(msg)
    },
    onError: (error: Error) => {
      showError(error.message)
    },
  })
}

export type { ToggleClientModuleResult, ApplyConfigResult }
