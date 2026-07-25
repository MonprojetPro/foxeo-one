'use client'

import { useState } from 'react'
import { ImpersonationBanner } from '@monprojetpro/ui'
import { endImpersonationClient } from './actions/end-impersonation-client'

// Story 13.3 (correctif 2026-07-25).
//
// Avant : ce composant lisait `?impersonation_session=<id>` dans l'URL et posait
// lui-même le cookie — n'importe qui pouvait donc afficher la bannière (ou l'effacer)
// sans la moindre session d'impersonation réelle. Désormais la session vient du layout
// serveur, qui lit le cookie httpOnly posé par /auth/impersonation.

export interface ImpersonationSessionInfo {
  sessionId: string
  expiresAt: string
}

interface ImpersonationWrapperProps {
  children: React.ReactNode
  session: ImpersonationSessionInfo | null
}

export function ImpersonationWrapper({ children, session }: ImpersonationWrapperProps) {
  const [ended, setEnded] = useState(false)

  const handleEndSession = async () => {
    if (!session) return

    // La Server Action clôt la session en base, déconnecte le compte client et
    // supprime le cookie httpOnly. On ne peut plus faire ça côté navigateur.
    const result = await endImpersonationClient(session.sessionId)
    if (result.error) {
      console.error('[IMPERSONATION:END] Error:', result.error.message)
    }

    setEnded(true)

    // L'onglet a été ouvert par le Hub via window.open() : on le referme au lieu de
    // rediriger vers le Hub, qui laissait deux onglets Hub ouverts (retour MiKL).
    // Si le navigateur refuse la fermeture programmatique, l'écran de confirmation
    // ci-dessous prend le relais — on ne redirige pas, pour ne pas recréer le doublon.
    window.close()
  }

  if (ended) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-lg font-medium text-foreground">Session support fermée</p>
        <p className="text-sm text-muted-foreground">
          Tu n&apos;es plus connecté au compte de ce client. Tu peux fermer cet onglet et
          revenir sur le Hub.
        </p>
      </div>
    )
  }

  return (
    <>
      {session && (
        <ImpersonationBanner
          sessionId={session.sessionId}
          onEndSession={handleEndSession}
        />
      )}
      {children}
    </>
  )
}
