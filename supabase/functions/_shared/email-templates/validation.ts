// [EMAIL:TEMPLATE] Validation / refus de brief
import { baseTemplate, escapeHtml } from './base'

export interface ValidationEmailData {
  clientName: string
  briefTitle: string
  outcome: 'validated' | 'refused'
  comment?: string
  platformUrl: string
}

export function validationEmailTemplate(data: ValidationEmailData): string {
  const isValidated = data.outcome === 'validated'
  const outcomeText = isValidated ? 'validé' : 'refusé'
  const title = `Votre brief a été ${outcomeText}`

  const commentSection = data.comment
    ? `<p style="margin-top:12px;padding:12px;background:#f4f4f5;border-radius:6px;font-style:italic;">"${escapeHtml(data.comment)}"</p>`
    : ''

  const body = `
    <p>Bonjour <strong>${escapeHtml(data.clientName)}</strong>,</p>
    <p>Votre brief <strong>"${escapeHtml(data.briefTitle)}"</strong> a été <strong>${outcomeText}</strong> par votre accompagnateur MonprojetPro.</p>
    ${commentSection}
    ${isValidated ? '<p>Félicitations ! Vous pouvez passer à l\'étape suivante.</p>' : '<p>Pas d\'inquiétude — consultez les retours et soumettez une nouvelle version.</p>'}
  `

  return baseTemplate({
    title,
    body,
    ctaUrl: data.platformUrl,
    ctaText: 'Voir sur MonprojetPro',
  })
}
