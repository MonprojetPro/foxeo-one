'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { ElioChat, type ElioOnePopupConfig } from '@monprojetpro/module-elio'
import { Dialog, DialogContent, DialogTitle } from '@monprojetpro/ui'
import { subscribeElioOnePopup, type ElioOnePopupSeed } from './use-elio-one-popup'
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
  // Amorce d'ouverture ponctuelle (ex : « Non, pas trop » sur la prise de nouvelles). Elle
  // surcharge l'accueil configuré par MiKL le temps de CETTE ouverture seulement.
  const [seed, setSeed] = useState<ElioOnePopupSeed | null>(null)
  const session = useElioOneSession()

  useEffect(
    () =>
      subscribeElioOnePopup((nextSeed) => {
        setSeed(nextSeed ?? null)
        setOpen(true)
      }),
    [],
  )

  // À la fermeture, on oublie l'amorce : la prochaine ouverture « normale » (widget sidebar,
  // bouton du bandeau) doit retrouver l'accueil configuré, pas le contexte d'un incident passé.
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSeed(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Cadre « pop-up » vert One (essai avant généralisation Hub/Lab — 2026-08-20).
          La couleur est passée en littéral : le portail Radix est rendu hors de l'arbre
          où vit `--brand-accent`, une variable de thème n'y arriverait pas. */}
      {/* Hauteur BORNÉE, jamais fixe : `h-[70vh]` sur le contenu ignorait le reste du Dialog
          (en-tête du chat, marges), si bien que la pop-up dépassait du haut de l'écran — son
          en-tête sortait du viewport et la barre de défilement se collait au bord.
          On plafonne donc la boîte à 85% de la hauteur RÉELLE (`dvh`, barre d'URL mobile
          comprise) et le chat occupe simplement ce qu'on lui donne. */}
      <DialogContent
        className="sm:max-w-2xl p-0 overflow-hidden mpp-popup-frame rounded-2xl h-[min(78dvh,44rem)] max-h-[85dvh]"
        style={{ '--mpp-popup-accent': '#16a34a' } as CSSProperties}
      >
        <DialogTitle className="sr-only">Élio One</DialogTitle>
        {/* `min-h-0` : sans lui, un enfant de grid/flex refuse de rétrécir sous la taille de
            son contenu et reprend à déborder malgré le plafond ci-dessus. */}
        <div className="h-full min-h-0 overflow-hidden rounded-2xl">
          {iaConsentGranted ? (
            <ElioChat
              dashboardType="one"
              clientId={clientId}
              externalSession={session ?? undefined}
              greeting={seed?.greeting ?? popupConfig.greeting}
              suggestions={seed?.suggestions ?? popupConfig.suggestions}
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
