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
 * Mutations de modération.
 *
 * ⚠️ Une action de modération est lue par bien plus d'écrans que l'onglet
 * Modération : bannir un membre change son statut dans la liste des
 * utilisateurs, dans la fiche de son foyer, et peut faire basculer le foyer
 * entier en « banni » dans la liste des foyers. On invalide donc TOUTES les
 * vues concernées — sinon MiKL bannit quelqu'un et le voit encore « actif »
 * deux onglets plus loin.
 */
export function useModerationActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['menu-facile', 'reports'] })
    qc.invalidateQueries({ queryKey: ['menu-facile', 'metrics'] })
    qc.invalidateQueries({ queryKey: ['menu-facile', 'official-recipes'] })
    qc.invalidateQueries({ queryKey: ['menu-facile', 'households'] })
    qc.invalidateQueries({ queryKey: ['menu-facile', 'household'] })
    qc.invalidateQueries({ queryKey: ['menu-facile', 'users'] })
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
