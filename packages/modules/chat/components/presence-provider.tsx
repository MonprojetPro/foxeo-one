'use client'

import { createContext, useContext } from 'react'
import { useChatPresence } from '../hooks/use-chat-presence'
import type { PresenceStateMap } from '../types/presence.types'

// ---- Context ----

export interface PresenceContextValue {
  presenceState: PresenceStateMap
  operatorId: string
}

export const PresenceContext = createContext<PresenceContextValue>({
  presenceState: {},
  operatorId: '',
})

export function usePresenceContext(): PresenceContextValue {
  return useContext(PresenceContext)
}

// ---- Provider ----

interface PresenceProviderProps {
  /** Hub : operators.id ; client : clients.id — devient la cle de presence */
  userId: string
  /** 'client' for client dashboard, 'operator' for hub */
  userType: 'client' | 'operator'
  /** Operator record UUID — Hub : soi-meme ; client : son operateur */
  operatorId: string
  /** Hub uniquement (T-064) : clients dont on suit la presence, du plus recent au plus ancien */
  clientIds?: string[]
  children: React.ReactNode
}

/**
 * Mount ONCE in the dashboard layout (hub or client).
 * Registers current user's presence and provides presence state to all children.
 * AC2: auto-sync on mount, cleanup on unmount.
 * AC4: operatorId exposed for sub-components that need to filter by operator.
 */
export function PresenceProvider({
  userId,
  userType,
  operatorId,
  clientIds,
  children,
}: PresenceProviderProps) {
  const { presenceState } = useChatPresence(operatorId, userId, userType, clientIds)

  return (
    <PresenceContext.Provider value={{ presenceState, operatorId }}>
      {children}
    </PresenceContext.Provider>
  )
}
