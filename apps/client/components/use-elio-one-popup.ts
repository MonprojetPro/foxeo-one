'use client'

/**
 * Pop-up Élio One UNIQUE — ouverture déclenchée par événement global (refonte 2026-06-29).
 *
 * Pourquoi un événement plutôt qu'un store : la pop-up est montée une seule fois dans le
 * layout du dashboard (`ElioOnePopup`), mais elle doit être ouvrable depuis n'importe où —
 * le bandeau de l'accueil ET le widget Élio en bas de sidebar (présent sur toutes les pages).
 * Un simple `CustomEvent` sur `window` couvre ce besoin de « UI state » sans introduire de
 * dépendance (zustand n'est pas déclaré dans l'app client — règle anti-cache Turbo périmé).
 */
const ELIO_ONE_POPUP_OPEN_EVENT = 'elio-one-popup:open'

/**
 * Amorce d'ouverture (2026-08-20). Quand le client répond « Non, pas trop » à la prise de
 * nouvelles d'Élio, on n'ouvre pas un chat muet : Élio l'accueille sur le sujet précis, avec
 * des suggestions de démarrage adaptées.
 *
 * L'amorce ne remplace que l'écran d'accueil (état vide) de la pop-up. Si une conversation
 * est déjà en cours, elle est ignorée — on ne réécrit jamais un échange commencé.
 */
export interface ElioOnePopupSeed {
  greeting?: string
  suggestions?: string[]
}

/** Ouvre la pop-up Élio One (depuis le bandeau accueil ou le widget sidebar). */
export function openElioOnePopup(seed?: ElioOnePopupSeed): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ElioOnePopupSeed | undefined>(ELIO_ONE_POPUP_OPEN_EVENT, { detail: seed }),
  )
}

/** S'abonne aux demandes d'ouverture. Retourne une fonction de désinscription. */
export function subscribeElioOnePopup(
  callback: (seed?: ElioOnePopupSeed) => void,
): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (event: Event) => {
    callback((event as CustomEvent<ElioOnePopupSeed | undefined>).detail)
  }
  window.addEventListener(ELIO_ONE_POPUP_OPEN_EVENT, handler)
  return () => window.removeEventListener(ELIO_ONE_POPUP_OPEN_EVENT, handler)
}
