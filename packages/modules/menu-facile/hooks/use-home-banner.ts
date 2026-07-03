import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getHomeBanner, updateHomeBanner } from '../actions/home-banner'
import type { HomeBanner, HomeBannerInput } from '../types'

/**
 * Charge l'état actuel de l'encart d'accueil via la Server Action (→ guichet).
 * Pas de refetchInterval : c'est un réglage éditorial, on recharge à l'ouverture
 * de l'onglet et après chaque déploiement (invalidation).
 */
export function useHomeBanner() {
  return useQuery<HomeBanner>({
    queryKey: ['menu-facile', 'home-banner'],
    queryFn: async (): Promise<HomeBanner> => {
      const res = await getHomeBanner()
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? 'Erreur lors du chargement de l\'encart d\'accueil')
      }
      return res.data
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Déploiement de l'encart (PUT partiel). Sert aussi bien au bouton « Déployer »
 * (patch calculé côté composant) qu'au bouton « Désactiver » (`{ enabled:false }`).
 * Après succès, on invalide la query pour resynchroniser l'état de référence.
 */
export function useHomeBannerActions() {
  const qc = useQueryClient()

  const deploy = useMutation({
    mutationFn: async (patch: HomeBannerInput) => {
      const res = await updateHomeBanner(patch)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-facile', 'home-banner'] })
    },
  })

  return { deploy }
}
