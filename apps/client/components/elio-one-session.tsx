'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useElioChat, ELIO_MODEL_MICRO, type ElioChatSession } from '@monprojetpro/module-elio'

/**
 * Session Élio One PARTAGÉE — une seule conversation éphémère pour tout le dashboard One.
 *
 * Pourquoi : le widget Élio (bas de sidebar) et la pop-up Élio One doivent partager la MÊME
 * conversation, pour que « Voir dans Élio » montre ce qui a déjà été échangé dans le widget
 * (refonte 2026-06-29). On monte donc UN seul `useElioChat` ici, au niveau layout, et widget
 * + pop-up le consomment via ce contexte. Pas de persistance DB : éphémère par design (la
 * conversation vit le temps de la session de navigation, comme la pop-up d'accueil).
 */
const ElioOneSessionContext = createContext<ElioChatSession | null>(null)

export function ElioOneSessionProvider({
  clientId,
  children,
}: {
  clientId: string
  children: ReactNode
}) {
  // micro (Haiku) = réponses rapides depuis la sidebar / pop-up. clientId → contexte One complet.
  const session = useElioChat({ dashboardType: 'one', clientId, model: ELIO_MODEL_MICRO })
  return (
    <ElioOneSessionContext.Provider value={session}>{children}</ElioOneSessionContext.Provider>
  )
}

/** Accès à la session Élio One partagée. Renvoie null hors d'un `ElioOneSessionProvider`. */
export function useElioOneSession(): ElioChatSession | null {
  return useContext(ElioOneSessionContext)
}
