/**
 * Helpers des pièces jointes Aide & Contact (guichet MenuFacile v13).
 *
 * Isolés du composant pour être testables : la règle d'expiration décide à elle
 * seule si MiKL voit une capture d'écran ou un lien mort.
 */

import type { ContactAttachment } from '../types'

/** Seule une image s'affiche en vignette ; le reste (PDF…) devient une ligne. */
export function isImageAttachment(a: ContactAttachment): boolean {
  return a.mime_type.startsWith('image/')
}

/**
 * Taille lisible, ou `null` si le guichet ne l'a pas relevée (`size_bytes` est
 * un champ « souhaité » au contrat, pas garanti) — on n'affiche alors rien
 * plutôt qu'un « 0 o » qui ferait croire à un fichier vide.
 */
export function formatAttachmentSize(bytes?: number): string | null {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

/** Marge avant échéance : une URL sur le point d'expirer est déjà inutilisable. */
export const ATTACHMENT_URL_SAFETY_MS = 30_000

/**
 * Vrai si l'URL signée est expirée ou sur le point de l'être.
 *
 * Une date illisible est traitée comme NON expirée : on laisse le navigateur
 * tenter le chargement, et c'est `onError` qui déclenchera le renouvellement.
 * L'inverse ferait renouveler en boucle sur un guichet au format inattendu.
 */
export function isAttachmentUrlExpired(
  a: ContactAttachment,
  now: number = Date.now(),
): boolean {
  const at = Date.parse(a.url_expires_at)
  if (Number.isNaN(at)) return false
  return at - now < ATTACHMENT_URL_SAFETY_MS
}
