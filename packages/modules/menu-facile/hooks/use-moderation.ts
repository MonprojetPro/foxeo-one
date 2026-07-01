import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getMenuFacileReports } from '../actions/get-reports'
import { getRecipeFull } from '../actions/get-recipe'
import { hideRecipe, banUser, resolveReport } from '../actions/moderation'
import type { MenuFacileReport, ReportStatus, OfficialRecipeDetail } from '../types'

/** Liste des signalements (status optionnel). */
export function useReports(status?: ReportStatus) {
  return useQuery<MenuFacileReport[]>({
    queryKey: ['menu-facile', 'reports', status ?? 'all'],
    queryFn: async (): Promise<MenuFacileReport[]> => {
      const res = await getMenuFacileReports(status)
      if (res.error) throw new Error(res.error.message)
      return res.data ?? []
    },
    staleTime: 20 * 1000,
    refetchInterval: 30 * 1000, // auto-refresh (base MenuFacile externe → pas de Realtime)
  })
}

/**
 * Détail complet d'une recette signalée (pour juger). N'est appelé que lorsque
 * `enabled` passe à true (clic sur « Voir la recette complète »). Si l'endpoint
 * `GET /recipes/:id` n'existe pas encore, la query passe en erreur → message.
 */
export function useRecipeFull(id: string | null, enabled: boolean) {
  return useQuery<OfficialRecipeDetail>({
    queryKey: ['menu-facile', 'recipe-full', id],
    enabled: enabled && !!id,
    retry: false,
    queryFn: async (): Promise<OfficialRecipeDetail> => {
      const res = await getRecipeFull(id as string)
      if (res.error || !res.data) throw new Error(res.error?.message ?? 'Recette introuvable')
      return res.data
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Mutations de modération. Après succès, on invalide reports + metrics
 * (les compteurs du Tableau de bord doivent bouger immédiatement).
 */
export function useModerationActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['menu-facile', 'reports'] })
    qc.invalidateQueries({ queryKey: ['menu-facile', 'metrics'] })
    qc.invalidateQueries({ queryKey: ['menu-facile', 'official-recipes'] })
  }

  const hide = useMutation({
    mutationFn: async (input: { recipeId: string; hidden?: boolean; reason?: string }) => {
      const res = await hideRecipe(input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: invalidate,
  })

  const ban = useMutation({
    mutationFn: async (input: { userId: string; until?: string | null; reason?: string }) => {
      const res = await banUser(input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: invalidate,
  })

  const resolve = useMutation({
    mutationFn: async (input: { reportId: string; status: ReportStatus; reason?: string }) => {
      const res = await resolveReport(input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: invalidate,
  })

  return { hide, ban, resolve }
}
