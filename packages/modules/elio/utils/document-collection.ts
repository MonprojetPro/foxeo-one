/**
 * Story 8.9b — Task 3
 * State machine de collecte d'informations pour la génération de documents.
 * Gère les questions adaptées au profil de communication, max 2 questions.
 */

import type { CommunicationProfileFR66 } from '../types/elio.types'
import type { DocumentTemplateKey } from '../config/document-templates'

export interface DocumentCollectionData {
  type: DocumentTemplateKey
  beneficiary?: string
  period?: string
  amount?: string
  reason?: string
  events?: string
  /** Type d'export pour export_data (membres, événements, factures) — distinct de `type` (template key) */
  exportType?: string
  data?: string
}

export type DocumentCollectionState = 'initial' | 'collecting' | 'ready'

export interface DocumentCollectionStatus {
  state: DocumentCollectionState
  missingFields: string[]
  nextQuestion: string | null
}

/**
 * Retourne les questions adaptées au profil de communication du client.
 * Max 2 questions par type de document.
 */
export function getDocumentQuestions(
  type: DocumentTemplateKey,
  profile: CommunicationProfileFR66
): string[] {
  const tu = profile.tutoiement

  const questions: Record<DocumentTemplateKey, string[]> = {
    attestation_presence: [
      tu
        ? 'Pour qui dois-je générer cette attestation ?'
        : 'Pour qui dois-je générer cette attestation ?',
      tu
        ? 'Quelle période veux-tu couvrir ? (ex: janvier 2026)'
        : 'Quelle période souhaitez-vous couvrir ? (ex: janvier 2026)',
    ],
    attestation_paiement: [
      tu ? 'Pour qui génères-tu cette attestation ?' : 'Pour qui générez-vous cette attestation ?',
      tu ? 'Quel est le montant concerné ?' : 'Quel est le montant concerné ?',
    ],
    recap_mensuel: [
      tu ? 'Quel mois veux-tu récapituler ?' : 'Quel mois souhaitez-vous récapituler ?',
    ],
    export_data: [
      tu
        ? 'Quel type de données veux-tu exporter ? (membres, événements, factures)'
        : 'Quel type de données souhaitez-vous exporter ? (membres, événements, factures)',
    ],
  }

  return questions[type] ?? []
}

/**
 * Détermine les champs manquants pour générer un document.
 * Retourne le statut de collecte et la prochaine question à poser.
 */
export function getCollectionStatus(
  type: DocumentTemplateKey,
  data: Partial<DocumentCollectionData>,
  profile: CommunicationProfileFR66
): DocumentCollectionStatus {
  const missingFields: string[] = []

  if (type === 'attestation_presence' || type === 'attestation_paiement') {
    if (!data.beneficiary) missingFields.push('beneficiary')
    if (type === 'attestation_paiement' && !data.amount) missingFields.push('amount')
    if (type === 'attestation_presence' && !data.period) missingFields.push('period')
  }

  if (type === 'recap_mensuel' && !data.period) {
    missingFields.push('period')
  }

  if (type === 'export_data' && !data.exportType) {
    missingFields.push('exportType')
  }

  if (missingFields.length === 0) {
    return { state: 'ready', missingFields: [], nextQuestion: null }
  }

  const questions = getDocumentQuestions(type, profile)
  // Max 2 questions — on pose la première question correspondant au premier champ manquant
  const fieldIndex = ['beneficiary', 'period', 'amount', 'exportType'].indexOf(missingFields[0])
  const nextQuestion = questions[Math.min(fieldIndex, questions.length - 1)] ?? questions[0] ?? null

  return {
    state: 'collecting',
    missingFields,
    nextQuestion,
  }
}
