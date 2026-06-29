'use client'

import { useEffect, useState } from 'react'
import { ElioChat, ELIO_MODEL_MICRO } from '@monprojetpro/module-elio'
import { Dialog, DialogContent, DialogTitle } from '@monprojetpro/ui'
import { subscribeElioOnePopup } from './use-elio-one-popup'
import { ElioVeille } from './elio-veille'

interface ElioOnePopupProps {
  clientId: string
  /** Consentement IA (RGPD) — sinon Élio reste en veille dans la pop-up. */
  iaConsentGranted: boolean
}

/**
 * Pop-up Élio One UNIQUE, montée une seule fois dans le layout One. Ouvrable de partout via
 * `openElioOnePopup()` (bandeau accueil + widget sidebar). Rend exactement le même chat
 * éphémère vert que l'accueil : `ElioChat` SANS `userId` → pas de liste de conversations ni
 * d'historique. Le client pose sa question, lit la réponse, ferme — la conversation disparaît.
 */
export function ElioOnePopup({ clientId, iaConsentGranted }: ElioOnePopupProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => subscribeElioOnePopup(() => setOpen(true)), [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <DialogTitle className="sr-only">Élio One</DialogTitle>
        <div className="h-[70vh]">
          {iaConsentGranted ? (
            <ElioChat dashboardType="one" clientId={clientId} model={ELIO_MODEL_MICRO} />
          ) : (
            <ElioVeille />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
