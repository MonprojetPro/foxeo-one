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

/** Ouvre la pop-up Élio One (depuis le bandeau accueil ou le widget sidebar). */
export function openElioOnePopup(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ELIO_ONE_POPUP_OPEN_EVENT))
}

/** S'abonne aux demandes d'ouverture. Retourne une fonction de désinscription. */
export function subscribeElioOnePopup(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(ELIO_ONE_POPUP_OPEN_EVENT, callback)
  return () => window.removeEventListener(ELIO_ONE_POPUP_OPEN_EVENT, callback)
}
