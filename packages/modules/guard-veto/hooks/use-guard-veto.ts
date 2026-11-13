import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getGuardVetoCabinets } from '../actions/get-cabinets'
import { getGuardVetoComptes } from '../actions/get-comptes'
import { actionCompteGuardVeto, type CompteActionInput } from '../actions/compte-action'
import type { CabinetsReponse, ComptesReponse } from '../types'

/**
 * 🔑 POURQUOI DU POLLING ET PAS DU REALTIME : la donnée vit dans la base de
 * GuardVeto, pas dans la nôtre. Le Realtime de Supabase ne traverse pas les
 * projets — on relit donc à intervalle, comme pour le cockpit MenuFacile.
 * Dit autrement : un changement fait dans GuardVeto met jusqu'à une minute à
 * se voir ici. C'est assumé, et c'est écrit pour que personne ne cherche un
 * bug là où il n'y en a pas.
 */

export function useGuardVetoCabinets() {
  return useQuery<CabinetsReponse>({
    queryKey: ['guard-veto', 'cabinets'],
    queryFn: async (): Promise<CabinetsReponse> => {
      const res = await getGuardVetoCabinets()
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? 'Cabinets indisponibles')
      }
      return res.data
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  })
}

export function useGuardVetoComptes(cabinetId: string | null) {
  return useQuery<ComptesReponse>({
    queryKey: ['guard-veto', 'comptes', cabinetId],
    enabled: Boolean(cabinetId),
    queryFn: async (): Promise<ComptesReponse> => {
      const res = await getGuardVetoComptes(cabinetId as string)
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? 'Comptes indisponibles')
      }
      return res.data
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })
}

/**
 * Renvoyer l'invitation ou réinitialiser l'accès.
 *
 * Après un succès on invalide les comptes ET les cabinets : l'état d'un compte
 * change (invitation en attente → …), et les compteurs d'équipe affichés sur
 * l'onglet Cabinets en dépendent. Invalider la seule liste ouverte laisserait
 * le compteur d'à côté mentir jusqu'au prochain passage — c'est exactement le
 * défaut du « consumer oublié » que le projet a déjà payé plusieurs fois.
 */
export function useActionCompteGuardVeto() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CompteActionInput) => {
      const res = await actionCompteGuardVeto(input)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['guard-veto', 'comptes'] })
      void queryClient.invalidateQueries({ queryKey: ['guard-veto', 'cabinets'] })
    },
  })
}
