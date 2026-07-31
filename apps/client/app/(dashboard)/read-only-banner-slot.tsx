'use client'

import { usePathname } from 'next/navigation'
import { ReadOnlyBanner } from '@monprojetpro/ui'

/**
 * Bandeau « abonnement terminé » — affiché SEULEMENT là où Élio ne parle pas.
 *
 * INTENTION — un seul porteur de message par écran. Élio (le Concierge côté Lab,
 * Élio One côté One) annonce déjà la fin d'abonnement avec ses mots, en tête de page :
 * empiler le bandeau ambre global par-dessus donnait deux — parfois trois — encarts
 * disant la même chose à quelques centimètres d'écart.
 *
 * Sur les écrans SANS Élio (documents, factures, support, réglages, chat…), le bandeau
 * reste indispensable : sans lui, un client résilié n'aurait plus AUCUNE indication de
 * son état. On ne supprime donc pas le bandeau, on lui retire seulement les écrans où
 * Élio tient déjà le rôle.
 */

/** Écrans dont Élio est le porteur de message (bandeau masqué). */
const ELIO_OWNED_ROUTES = [
  '/', // accueil One → OneConciergeBanner
  '/modules/parcours', // parcours Lab + détail d'étape → ElioParcoursPanel / StepElioChat
  '/modules/elio', // le chat Élio lui-même
]

function isElioOwned(pathname: string): boolean {
  return ELIO_OWNED_ROUTES.some(
    route => pathname === route || (route !== '/' && pathname.startsWith(`${route}/`))
  )
}

export function ReadOnlyBannerSlot() {
  const pathname = usePathname()

  if (isElioOwned(pathname ?? '/')) return null

  return (
    <div className="mb-6">
      <ReadOnlyBanner />
    </div>
  )
}

export { isElioOwned }
