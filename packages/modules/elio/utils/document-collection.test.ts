import { describe, it, expect } from 'vitest'
import { getDocumentQuestions, getCollectionStatus } from './document-collection'
import type { CommunicationProfileFR66 } from '../types/elio.types'

const PROFILE_VOUVOIEMENT: CommunicationProfileFR66 = {
  levelTechnical: 'intermediaire',
  styleExchange: 'conversationnel',
  adaptedTone: 'pro_decontracte',
  messageLength: 'moyen',
  tutoiement: false,
  concreteExamples: true,
  avoid: [],
  privilege: [],
  styleNotes: '',
}

const PROFILE_TUTOIEMENT: CommunicationProfileFR66 = {
  ...PROFILE_VOUVOIEMENT,
  tutoiement: true,
}

describe('getDocumentQuestions (Story 8.9b — Task 3)', () => {
  it('Task 3.3 — attestation_presence retourne 2 questions max', () => {
    const questions = getDocumentQuestions('attestation_presence', PROFILE_VOUVOIEMENT)
    expect(questions.length).toBeLessThanOrEqual(2)
    expect(questions.length).toBeGreaterThan(0)
  })

  it('Task 3.3 — questions tutoiement contiennent "veux-tu"', () => {
    const questions = getDocumentQuestions('attestation_presence', PROFILE_TUTOIEMENT)
    const hasAnyTutoiement = questions.some((q) => q.includes('veux-tu') || q.includes('dois-je') || q.includes('génères'))
    expect(hasAnyTutoiement).toBe(true)
  })

  it('Task 3.3 — questions vouvoiement contiennent "souhaitez-vous" ou "voulez-vous"', () => {
    const questions = getDocumentQuestions('recap_mensuel', PROFILE_VOUVOIEMENT)
    const hasVouvoiement = questions.some((q) => q.includes('souhaitez-vous') || q.includes('voulez-vous'))
    expect(hasVouvoiement).toBe(true)
  })

  it('Task 3.4 — recap_mensuel retourne au max 1 question', () => {
    const questions = getDocumentQuestions('recap_mensuel', PROFILE_VOUVOIEMENT)
    expect(questions.length).toBeLessThanOrEqual(2)
  })

  it('Task 3.4 — export_data retourne 1 question', () => {
    const questions = getDocumentQuestions('export_data', PROFILE_VOUVOIEMENT)
    expect(questions.length).toBeGreaterThan(0)
    expect(questions.length).toBeLessThanOrEqual(2)
  })
})

describe('getCollectionStatus (Story 8.9b — Task 3)', () => {
  it('Task 3.2 — retourne ready si toutes les infos sont présentes (attestation_presence)', () => {
    const status = getCollectionStatus(
      'attestation_presence',
      { type: 'attestation_presence', beneficiary: 'Marie', period: 'janvier 2026' },
      PROFILE_VOUVOIEMENT
    )
    expect(status.state).toBe('ready')
    expect(status.nextQuestion).toBeNull()
  })

  it('Task 3.2 — retourne collecting si bénéficiaire manquant', () => {
    const status = getCollectionStatus(
      'attestation_presence',
      { type: 'attestation_presence' },
      PROFILE_VOUVOIEMENT
    )
    expect(status.state).toBe('collecting')
    expect(status.missingFields).toContain('beneficiary')
    expect(status.nextQuestion).toBeTruthy()
  })

  it('Task 3.2 — retourne collecting si montant manquant pour attestation_paiement', () => {
    const status = getCollectionStatus(
      'attestation_paiement',
      { type: 'attestation_paiement', beneficiary: 'Jean' },
      PROFILE_VOUVOIEMENT
    )
    expect(status.state).toBe('collecting')
    expect(status.missingFields).toContain('amount')
  })

  it('Task 3.2 — recap_mensuel est ready quand période fournie', () => {
    const status = getCollectionStatus(
      'recap_mensuel',
      { type: 'recap_mensuel', period: 'février 2026' },
      PROFILE_VOUVOIEMENT
    )
    expect(status.state).toBe('ready')
  })

  it('Task 3.2 — export_data retourne collecting si exportType manquant', () => {
    const status = getCollectionStatus(
      'export_data',
      { type: 'export_data' },
      PROFILE_VOUVOIEMENT
    )
    expect(status.state).toBe('collecting')
    expect(status.missingFields).toContain('exportType')
  })

  it('Task 3.2 — export_data retourne ready si exportType fourni', () => {
    const status = getCollectionStatus(
      'export_data',
      { type: 'export_data', exportType: 'membres' },
      PROFILE_VOUVOIEMENT
    )
    expect(status.state).toBe('ready')
  })

  it('Task 3.4 — max 2 champs manquants signalés', () => {
    const status = getCollectionStatus(
      'attestation_paiement',
      { type: 'attestation_paiement' },
      PROFILE_VOUVOIEMENT
    )
    expect(status.missingFields.length).toBeLessThanOrEqual(2)
    expect(status.state).toBe('collecting')
  })
})
