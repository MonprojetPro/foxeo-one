import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getHousehold, getHouseholds } from '../actions/households'
import type {
  HouseholdDetail,
  HouseholdListItem,
  HouseholdsQuery,
  Paginated,
} from '../types'

/**
 * Page de la liste des foyers.
 *
 * MenuFacile vit dans une base séparée : aucun Realtime n'est possible via le
 * guichet, donc on rafraîchit par polling (comme les messages de contact).
 * `keepPreviousData` évite le clignotement de la table au changement de page
 * ou de filtre : l'ancienne page reste affichée pendant le chargement.
 */
export function useHouseholds(q: HouseholdsQuery) {
  return useQuery<Paginated<HouseholdListItem>>({
    queryKey: ['menu-facile', 'households', q],
    queryFn: async (): Promise<Paginated<HouseholdListItem>> => {
      const res = await getHouseholds(q)
      if (res.error || !res.data) throw new Error(res.error?.message ?? 'Foyers indisponibles')
      return res.data
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Fiche complète d'un foyer. `enabled` : la requête ne part que quand un foyer
 * est sélectionné. `retry: false` pour qu'un 404 remonte tout de suite à l'UI
 * au lieu d'être réessayé trois fois.
 */
export function useHousehold(id: string | null) {
  return useQuery<HouseholdDetail>({
    queryKey: ['menu-facile', 'household', id],
    enabled: !!id,
    retry: false,
    queryFn: async (): Promise<HouseholdDetail> => {
      const res = await getHousehold(id as string)
      if (res.error || !res.data) throw new Error(res.error?.message ?? 'Foyer introuvable')
      return res.data
    },
    staleTime: 30 * 1000,
  })
}
