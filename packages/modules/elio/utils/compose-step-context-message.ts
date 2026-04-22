/**
 * Story 14.6 — Task 5.1
 * Génère le message d'annonce MiKL affiché au client dans le chat Élio d'une étape.
 *
 * Format text : "MiKL a ajouté des précisions pour cette étape. Il te demande : [contexte]"
 * Format file : "MiKL a consulté le document "[nom]" et il te demande : [contexte extrait]"
 */

export interface StepContextForMessage {
  contextMessage: string
  contentType: 'text' | 'file'
  fileName?: string | null
}

export function composeStepContextMessage(context: StepContextForMessage): string {
  if (context.contentType === 'file' && context.fileName) {
    return `MiKL a consulté le document "${context.fileName}" et il te demande : ${context.contextMessage}`
  }
  return `MiKL a ajouté des précisions pour cette étape. Il te demande : ${context.contextMessage}`
}
