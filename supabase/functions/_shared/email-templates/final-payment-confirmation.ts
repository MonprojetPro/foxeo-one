// [EMAIL:TEMPLATE] Story 13.4 — Confirmation paiement final 70%
import { baseTemplate, escapeHtml } from './base.ts'

export interface FinalPaymentConfirmationEmailData {
  clientName: string
}

export function finalPaymentConfirmationEmailTemplate(
  data: FinalPaymentConfirmationEmailData
): string {
  const body = `
    <p>Bonjour <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p>✅ Nous confirmons la reception de votre paiement final.</p>
    <p>Votre projet est maintenant entierement livre et paye. Merci pour votre confiance !</p>
    <p style="color:#6b7280;font-size:14px;">
      Vous pouvez continuer a utiliser votre espace One comme d habitude. Si vous avez la moindre question, Elio reste a votre disposition.
    </p>
  `

  return baseTemplate({
    title: 'Projet livré et payé en intégralité',
    body,
  })
}
