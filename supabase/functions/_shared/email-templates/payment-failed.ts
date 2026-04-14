// [EMAIL:TEMPLATE] Échec de paiement (destinataire: client + MiKL)
import { baseTemplate } from './base'

export interface PaymentFailedEmailData {
  recipientName: string
  clientName?: string
  amount: string
  currency: string
  platformUrl: string
  recipientType: 'client' | 'operator'
}

export function paymentFailedEmailTemplate(data: PaymentFailedEmailData): string {
  const isOperator = data.recipientType === 'operator'

  const title = `Échec de paiement${isOperator && data.clientName ? ` — ${data.clientName}` : ''}`

  const body = isOperator
    ? `
      <p>Bonjour <strong>${data.recipientName}</strong>,</p>
      <p>Un <strong>échec de paiement</strong> a été détecté pour votre client <strong>${data.clientName ?? 'inconnu'}</strong>.</p>
      <p>Montant : <strong>${data.amount} ${data.currency}</strong></p>
      <p>Veuillez contacter votre client ou vérifier les détails de facturation.</p>
    `
    : `
      <p>Bonjour <strong>${data.recipientName}</strong>,</p>
      <p>Un <strong>échec</strong> de paiement a été détecté sur votre compte.</p>
      <p>Nous n'avons pas pu traiter votre <strong>paiement</strong> de <strong>${data.amount} ${data.currency}</strong>.</p>
      <p>Veuillez vérifier votre moyen de paiement pour continuer à utiliser MonprojetPro sans interruption.</p>
    `

  return baseTemplate({
    title,
    body,
    ctaUrl: data.platformUrl,
    ctaText: isOperator ? 'Voir les détails' : 'Mettre à jour mon paiement',
  })
}
