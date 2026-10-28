'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@monprojetpro/supabase'
import type { PresenceEntry, PresenceStateMap } from '../types/presence.types'
import {
  clientPresenceTopic,
  operatorPresenceTopic,
  MAX_HUB_CLIENT_PRESENCE_CHANNELS,
} from '../utils/presence-topics'

interface PresenceSubscription {
  topic: string
  /** Titulaire du sujet : seul a pouvoir y ecrire (policy realtime.messages) */
  ownerId: string
  ownerType: 'client' | 'operator'
  /** true = on publie sa propre presence sur ce sujet ; false = ecoute seule */
  track: boolean
}

/**
 * Canaux a ouvrir selon le profil (T-064).
 * - Client : son propre sujet (il y publie) + le sujet de son operateur (ecoute seule).
 *   Il ne rejoint jamais le sujet d'un autre client.
 * - Operateur : son propre sujet (il y publie) + le sujet de chacun de ses clients (ecoute
 *   seule, aucune publication : 5 appels de presence max par client et par 30 s).
 */
export function buildPresenceSubscriptions(
  operatorId: string,
  userId: string,
  userType: 'client' | 'operator',
  clientIds: string[]
): PresenceSubscription[] {
  if (userType === 'client') {
    return [
      { topic: clientPresenceTopic(userId), ownerId: userId, ownerType: 'client', track: true },
      { topic: operatorPresenceTopic(operatorId), ownerId: operatorId, ownerType: 'operator', track: false },
    ]
  }

  return [
    { topic: operatorPresenceTopic(operatorId), ownerId: operatorId, ownerType: 'operator', track: true },
    ...clientIds.map((clientId) => ({
      topic: clientPresenceTopic(clientId),
      ownerId: clientId,
      ownerType: 'client' as const,
      track: false,
    })),
  ]
}

/**
 * L'identite vient du SUJET (protege par la base), jamais du contenu publie : sur
 * presence:client:X seul le client X peut ecrire, donc toute entree y est la sienne,
 * quoi qu'elle declare comme user_id.
 */
function toEntries(
  state: Record<string, unknown[]>,
  subscription: PresenceSubscription
): PresenceEntry[] {
  return Object.values(state)
    .flat()
    .map((meta) => {
      const onlineAt = (meta as { online_at?: unknown } | null)?.online_at
      return {
        user_id: subscription.ownerId,
        user_type: subscription.ownerType,
        online_at: typeof onlineAt === 'string' ? onlineAt : '',
      }
    })
}

/**
 * Presence Realtime sur canaux PRIVES (T-064, faille C-01).
 * Doit etre utilise dans PresenceProvider — ne pas le monter directement dans un composant.
 *
 * @param operatorId  operateur suivi (Hub : soi-meme ; client : son operateur)
 * @param userId      Hub : operatorId ; client : clients.id
 * @param userType    'operator' (Hub) ou 'client'
 * @param clientIds   Hub uniquement : clients dont on suit la presence, du plus recent au plus ancien
 */
export function useChatPresence(
  operatorId: string,
  userId: string,
  userType: 'client' | 'operator',
  clientIds: string[] = []
): { presenceState: PresenceStateMap } {
  const [presenceState, setPresenceState] = useState<PresenceStateMap>({})

  // Cle stable : un nouveau tableau aux memes valeurs (router.refresh) ne reabonne rien.
  const clientIdsKey = useMemo(() => {
    if (userType !== 'operator') return ''
    const unique = [...new Set(clientIds.filter(Boolean))]
    if (unique.length > MAX_HUB_CLIENT_PRESENCE_CHANNELS) {
      console.warn(
        `[presence] ${unique.length} clients a suivre, plafond ${MAX_HUB_CLIENT_PRESENCE_CHANNELS} : ` +
          'les plus anciens ne sont pas suivis en presence (100 canaux max par connexion Supabase).'
      )
    }
    return unique.slice(0, MAX_HUB_CLIENT_PRESENCE_CHANNELS).sort().join(',')
  }, [clientIds, userType])

  useEffect(() => {
    if (!operatorId || !userId) return

    const subscriptions = buildPresenceSubscriptions(
      operatorId,
      userId,
      userType,
      clientIdsKey ? clientIdsKey.split(',') : []
    )
    const supabase = createClient()
    const channels: Array<ReturnType<typeof supabase.channel>> = []
    const refusedTopics = new Set<string>()
    let cancelled = false

    async function subscribeAll() {
      // Canal prive : le jeton de l'utilisateur doit etre pose AVANT la jonction, sinon
      // elle part avec la cle anon et la policy la refuse (presence vue hors ligne).
      // Un echec ici n'est pas bloquant : la jonction est alors refusee, rien ne fuit.
      await supabase.realtime.setAuth().catch(() => undefined)
      if (cancelled) return

      for (const subscription of subscriptions) {
        const channel = supabase.channel(subscription.topic, {
          config: subscription.track
            ? { private: true, presence: { key: userId } }
            : { private: true },
        })

        const syncState = () => {
          const entries = toEntries(channel.presenceState(), subscription)
          setPresenceState((previous) => {
            const next = { ...previous }
            if (entries.length > 0) next[subscription.ownerId] = entries
            else delete next[subscription.ownerId]
            return next
          })
        }

        channel
          .on('presence', { event: 'sync' }, syncState)
          .on('presence', { event: 'join' }, syncState)
          .on('presence', { event: 'leave' }, syncState)
          .subscribe(async (status) => {
            // Un refus de la policy ne doit pas passer en silence (ex. migration absente).
            if (status === 'CHANNEL_ERROR' && !refusedTopics.has(subscription.topic)) {
              refusedTopics.add(subscription.topic)
              console.warn(`[presence] canal prive refuse : ${subscription.topic}`)
            }
            if (status === 'SUBSCRIBED' && subscription.track) {
              await channel.track({
                user_id: userId,
                user_type: userType,
                online_at: new Date().toISOString(),
              })
            }
          })

        channels.push(channel)
      }
    }

    void subscribeAll()

    // Fermeture de page ou demontage : la presence disparait avec les canaux.
    return () => {
      cancelled = true
      channels.forEach((channel) => {
        supabase.removeChannel(channel)
      })
      setPresenceState({})
    }
  }, [operatorId, userId, userType, clientIdsKey])

  return { presenceState }
}
