'use server'

import { successResponse, errorResponse, type ActionResponse } from '@monprojetpro/types'
import type { DocumentEmailDraft } from '../types/elio.types'

/**
 * Story 8.9b — Task 8
 * Server Action — Prépare un draft email avec le document en pièce jointe.
 * Génère un lien mailto: que le client ouvre dans son application email.
 *
 * Note : l'envoi direct de pièces jointes via mailto: est limité par les navigateurs.
 * La pièce jointe réelle nécessiterait une intégration email (ex: Resend, SendGrid).
 * Cette implémentation ouvre le client email avec sujet + corps pré-remplis.
 */
export async function sendDocumentEmail(
  documentName: string,
  documentContent: string,
  pdfUrl?: string
): Promise<ActionResponse<DocumentEmailDraft>> {
  if (!documentName || !documentContent) {
    return errorResponse('documentName et documentContent requis', 'VALIDATION_ERROR')
  }

  const subject = encodeURIComponent(`Document : ${documentName}`)

  // Corps de l'email avec le contenu du document + lien de téléchargement si disponible
  const bodyLines = [
    `Bonjour,`,
    ``,
    `Veuillez trouver ci-dessous le document "${documentName}" généré par Élio :`,
    ``,
    `---`,
    documentContent.substring(0, 1000) + (documentContent.length > 1000 ? '\n[...]' : ''),
    `---`,
    ``,
  ]

  if (pdfUrl) {
    bodyLines.push(`Télécharger le document : ${pdfUrl}`, ``)
  }

  bodyLines.push(`Cordialement`)

  const body = encodeURIComponent(bodyLines.join('\n'))
  const mailtoUrl = `mailto:?subject=${subject}&body=${body}`

  return successResponse({
    mailtoUrl,
    subject: `Document : ${documentName}`,
  })
}
