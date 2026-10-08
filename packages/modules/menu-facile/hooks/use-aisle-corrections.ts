import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAisleCorrections,
  promoteAisleCorrection,
  revokeAisleCorrection,
  dismissAisleCorrection,
  restoreAisleCorrection,
} from '../actions/aisle-corrections'
import type { MenuFacileAisleCorrection } from '../types'

const KEY = ['menu-facile', 'aisle-corrections'] as const

/**
 * F-049 — corrections de rayon faites par les foyers de MenuFacile.
 *
 * Auto-refresh toutes les 60s : MenuFacile vit dans une base séparée, le Realtime
 * n'arrive pas jusqu'ici. Un rythme plus lent que les messages (30s) suffit — une
 * correction de rangement n'attend pas une réponse, contrairement à un message.
 */
export function useAisleCorrections() {
  return useQuery<MenuFacileAisleCorrection[]>({
    queryKey: KEY,
    queryFn: async (): Promise<MenuFacileAisleCorrection[]> => {
      const res = await getAisleCorrections()
      if (res.error) throw new Error(res.error.message)
      return res.data ?? []
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/** Valider un rangement pour tous les foyers, ou retirer cette validation. */
export function useAisleCorrectionActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: KEY })
  }

  return {
    promote: useMutation({
      mutationFn: async (input: {
        ingredientKey: string
        ingredientLabel: string
        aisle: string
        householdId?: string | null
      }) => {
        const res = await promoteAisleCorrection(input)
        if (res.error) throw new Error(res.error.message)
        return true
      },
      onSuccess: invalidate,
    }),
    revoke: useMutation({
      mutationFn: async (input: { ingredientKey: string }) => {
        const res = await revokeAisleCorrection(input)
        if (res.error) throw new Error(res.error.message)
        return true
      },
      onSuccess: invalidate,
    }),
    // F-049a — écarter / remettre à l'étude. Ces deux-là prennent le foyer en
    // plus de l'ingrédient : la décision vaut pour CE choix, pas pour tous.
    dismiss: useMutation({
      mutationFn: async (input: { householdId: string; ingredientKey: string }) => {
        const res = await dismissAisleCorrection(input)
        if (res.error) throw new Error(res.error.message)
        return true
      },
      onSuccess: invalidate,
    }),
    restore: useMutation({
      mutationFn: async (input: { householdId: string; ingredientKey: string }) => {
        const res = await restoreAisleCorrection(input)
        if (res.error) throw new Error(res.error.message)
        return true
      },
      onSuccess: invalidate,
    }),
  }
}
