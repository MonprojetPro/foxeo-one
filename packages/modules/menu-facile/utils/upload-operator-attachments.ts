/**
 * Dépôt des pièces jointes de l'opérateur vers le Storage de MenuFacile.
 *
 * Le fichier ne traverse JAMAIS nos Server Actions : le guichet rend une URL
 * signée, et le navigateur envoie directement dessus. C'est ce qui permet
 * d'échapper à la limite de taille des requêtes serveur (1 Mo par défaut côté
 * Next.js, 4,5 Mo chez Vercel) — la même raison qui avait motivé le pattern
 * côté client au signalement (T-017).
 *
 * Les dépendances entrent par paramètres (`deps`) pour que cette logique soit
 * testable sans navigateur ni réseau : c'est elle qui décide si MiKL voit
 * « envoyé » ou « échec », pas le composant.
 */

import { MAX_ATTACHMENTS, rejectFile } from '@monprojetpro/utils'

export interface UploadDeps {
  /** Compresse une image si c'est possible et rentable ; rend l'original sinon. */
  compress: (file: File) => Promise<File>
  /** Demande l'autorisation de dépôt au guichet. */
  createUploadUrl: (input: {
    threadId: string
    fileName: string
    mimeType: string
    sizeBytes: number
  }) => Promise<{ data: { attachment_id: string; upload_url: string } | null; error: { message: string } | null }>
  /** Envoie réellement le fichier sur l'URL signée. */
  put: (url: string, file: File) => Promise<{ ok: boolean; status: number }>
}

export type UploadOutcome =
  | { ok: true; attachmentIds: string[] }
  | { ok: false; message: string; uploadedBeforeFailure: string[] }

/**
 * Dépose les fichiers un par un et rend les identifiants à citer dans la réponse.
 *
 * **Tout ou rien, volontairement** : au premier échec on s'arrête et on rend
 * `ok: false`. L'appelant NE DOIT PAS envoyer la réponse — un message annonçant
 * trois captures et n'en portant qu'une est pire que pas de message du tout.
 *
 * `uploadedBeforeFailure` liste ce qui était déjà parti. Ces fichiers restent
 * dans le Storage sans être cités par aucun message : invisibles pour
 * l'utilisateur, mais ils occupent de la place. Le guichet n'expose aucune
 * route pour les retirer — c'est une limite connue, pas un oubli.
 */
export async function uploadOperatorAttachments(
  threadId: string,
  files: File[],
  deps: UploadDeps,
): Promise<UploadOutcome> {
  if (files.length === 0) return { ok: true, attachmentIds: [] }

  if (files.length > MAX_ATTACHMENTS) {
    return {
      ok: false,
      message: `${MAX_ATTACHMENTS} pièces jointes au maximum par réponse.`,
      uploadedBeforeFailure: [],
    }
  }

  const attachmentIds: string[] = []

  for (const original of files) {
    // Re-validation avant l'envoi : le fichier a pu être accepté par le
    // sélecteur puis remplacé sur le disque. Le guichet refuserait de toute
    // façon, mais en 415/413 — un message clair vaut mieux qu'un code HTTP.
    const rejection = rejectFile(original)
    if (rejection) {
      return { ok: false, message: rejection, uploadedBeforeFailure: attachmentIds }
    }

    // La compression change le type ET le poids : elle doit donc précéder la
    // demande d'URL, sinon on déclarerait au guichet un fichier qui n'est pas
    // celui qu'on envoie (il impose l'extension d'après le mime_type déclaré).
    const file = await deps.compress(original)

    const ticket = await deps.createUploadUrl({
      threadId,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    })

    if (ticket.error || !ticket.data) {
      return {
        ok: false,
        message: ticket.error?.message ?? `Dépôt refusé pour « ${original.name} ».`,
        uploadedBeforeFailure: attachmentIds,
      }
    }

    const sent = await deps.put(ticket.data.upload_url, file)
    if (!sent.ok) {
      return {
        ok: false,
        message: `Échec de l'envoi de « ${original.name} » (HTTP ${sent.status}).`,
        uploadedBeforeFailure: attachmentIds,
      }
    }

    attachmentIds.push(ticket.data.attachment_id)
  }

  return { ok: true, attachmentIds }
}

/**
 * Une réponse a-t-elle de quoi être envoyée ?
 *
 * Depuis le guichet v16, un corps vide est accepté SI une pièce jointe
 * l'accompagne — envoyer une capture seule est un usage normal. Vide des deux
 * côtés reste un refus, côté Hub comme côté guichet.
 */
export function canSendReply(body: string, fileCount: number): boolean {
  return body.trim().length > 0 || fileCount > 0
}
