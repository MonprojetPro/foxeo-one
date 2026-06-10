// [EMAIL:TEMPLATE] Export RGPD prêt au téléchargement (Story 9.5a)
import { baseTemplate, escapeHtml } from './base'

export interface ExportReadyEmailData {
  clientName: string
  /** URL absolue de téléchargement (base client + chemin relatif de la notif) */
  downloadUrl: string
}

export function exportReadyEmailTemplate(data: ExportReadyEmailData): string {
  const body = `
    <p>Bonjour <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p>Votre export de données personnelles est prêt. Conformément au RGPD (article 15),
    il contient l'ensemble des informations que nous détenons à votre sujet
    (profil, documents, échanges, consentements, etc.).</p>
    <p>Pour des raisons de sécurité, le lien de téléchargement
    <strong>expire dans 7 jours</strong>.</p>
  `

  return baseTemplate({
    title: 'Votre export de données est prêt',
    body,
    ctaUrl: data.downloadUrl,
    ctaText: 'Télécharger mes données',
  })
}
