'use client'

import { useEffect, useState } from 'react'
import { ElioChat, type ElioOnePopupConfig } from '@monprojetpro/module-elio'
import { Dialog, DialogContent, DialogTitle } from '@monprojetpro/ui'
import { subscribeElioOnePopup } from './use-elio-one-popup'
import { useElioOneSession } from './elio-one-session'
import { ElioVeille } from './elio-veille'

interface ElioOnePopupProps {
  clientId: string
  /** Consentement IA (RGPD) — sinon Élio reste en veille dans la pop-up. */
  iaConsentGranted: boolean
  /** Personnalisation pop-up résolue (global + surcharge client) — accueil, suggestions, invite. */
  popupConfig: ElioOnePopupConfig
}

/**
 * Pop-up Élio One UNIQUE, montée une seule fois dans le layout One. Ouvrable de partout via
 * `openElioOnePopup()` (bandeau accueil + widget sidebar + cockpit). Elle rend le chat éphémère
 * vert branché sur la SESSION PARTAGÉE (`useElioOneSession`) : elle affiche donc exactement la
 * même conversation que le widget sidebar — « Voir dans Élio » montre ce qui a déjà été échangé.
 */
export function ElioOnePopup({ clientId, iaConsentGranted, popupConfig }: ElioOnePopupProps) {
  const [open, setOpen] = useState(false)
  const session = useElioOneSession()

  useEffect(() => subscribeElioOnePopup(() => setOpen(true)), [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Élio One</DialogTitle>
        <div className="h-[70vh]">
          {iaConsentGranted ? (
            <ElioChat
              dashboardType="one"
              clientId={clientId}
              externalSession={session ?? undefined}
              greeting={popupConfig.greeting}
              suggestions={popupConfig.suggestions}
              placeholder={popupConfig.placeholder}
            />
          ) : (
            <ElioVeille />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
