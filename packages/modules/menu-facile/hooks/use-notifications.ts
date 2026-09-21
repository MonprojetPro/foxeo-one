import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getNotificationAudienceCount,
  sendNotification,
  deleteNotification,
} from '../actions/notifications'
import type { MenuFacileNotification, MenuFacileNotificationInput } from '../types'

const KEY = ['menu-facile', 'notifications'] as const
const AUDIENCE_KEY = ['menu-facile', 'notifications', 'audience-count'] as const

/** Historique des envois. Rechargé à l'ouverture de l'onglet et après chaque action. */
export function useNotifications() {
  return useQuery<MenuFacileNotification[]>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await getNotifications()
      if (res.error) {
        throw new Error(res.error.message)
      }
      return res.data ?? []
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Nombre de destinataires, pour la confirmation AVANT envoi.
 *
 * `staleTime` court (60 s) : le chiffre doit être frais au moment où MiKL
 * confirme — un compteur périmé affiché dans une confirmation est pire qu'un
 * compteur absent, il donne l'assurance d'un chiffre faux.
 */
export function useNotificationAudienceCount() {
  return useQuery<number>({
    queryKey: AUDIENCE_KEY,
    queryFn: async () => {
      const res = await getNotificationAudienceCount()
      if (res.error) {
        throw new Error(res.error.message)
      }
      return res.data ?? 0
    },
    staleTime: 60 * 1000,
  })
}

/**
 * Envoi et suppression.
 *
 * Les deux invalident l'historique ET le compteur d'audience : un envoi ne
 * change pas le nombre d'utilisateurs, mais laisser TanStack servir un cache de
 * plusieurs minutes ferait afficher un chiffre daté à la confirmation suivante.
 */
export function useNotificationActions() {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: KEY })
    qc.invalidateQueries({ queryKey: AUDIENCE_KEY })
  }

  const send = useMutation({
    mutationFn: async (input: MenuFacileNotificationInput) => {
      const res = await sendNotification(input)
      if (res.error || !res.data) {
        throw new Error(res.error?.message ?? "L'envoi a échoué")
      }
      return res.data
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteNotification(id)
      if (res.error) throw new Error(res.error.message)
      return res.data
    },
    onSuccess: invalidate,
  })

  return { send, remove }
}
