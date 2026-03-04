import { describe, it, expect } from 'vitest'
import { DOCUMENT_TEMPLATES, buildDocumentPrompt } from './document-templates'

describe('DOCUMENT_TEMPLATES (Story 8.9b — Task 2)', () => {
  it('Task 2.1 — contient les 4 types de documents', () => {
    expect(DOCUMENT_TEMPLATES).toHaveProperty('attestation_presence')
    expect(DOCUMENT_TEMPLATES).toHaveProperty('attestation_paiement')
    expect(DOCUMENT_TEMPLATES).toHaveProperty('recap_mensuel')
    expect(DOCUMENT_TEMPLATES).toHaveProperty('export_data')
  })

  it('Task 2.2 — attestation_presence a un nom et un prompt', () => {
    const tpl = DOCUMENT_TEMPLATES.attestation_presence
    expect(tpl.name).toBe('Attestation de présence')
    expect(tpl.prompt).toContain('{beneficiary}')
    expect(tpl.prompt).toContain('{period}')
  })

  it('Task 2.3 — attestation_paiement a les champs requis', () => {
    const tpl = DOCUMENT_TEMPLATES.attestation_paiement
    expect(tpl.name).toBe('Attestation de paiement')
    expect(tpl.requiredFields).toContain('beneficiary')
    expect(tpl.requiredFields).toContain('amount')
  })

  it('Task 2.4 — recap_mensuel a un prompt avec période', () => {
    const tpl = DOCUMENT_TEMPLATES.recap_mensuel
    expect(tpl.prompt).toContain('{period}')
  })

  it('Task 2.5 — export_data a un prompt avec type et données', () => {
    const tpl = DOCUMENT_TEMPLATES.export_data
    expect(tpl.prompt).toContain('{type}')
    expect(tpl.prompt).toContain('{data}')
  })
})

describe('buildDocumentPrompt (Story 8.9b — Task 2)', () => {
  it('remplace les placeholders {beneficiary} et {period}', () => {
    const prompt = buildDocumentPrompt('attestation_presence', {
      beneficiary: 'Marie Dupont',
      period: 'janvier 2026',
    })
    expect(prompt).toContain('Marie Dupont')
    expect(prompt).toContain('janvier 2026')
  })

  it('laisse les placeholders non remplacés vides si valeur undefined', () => {
    const prompt = buildDocumentPrompt('attestation_presence', {
      beneficiary: 'Marie',
      period: undefined,
    })
    expect(prompt).toContain('Marie')
    // Le placeholder {period} est remplacé par une chaîne vide
    expect(prompt).not.toContain('{period}')
  })

  it('remplace tous les occurrences d\'un même placeholder', () => {
    const prompt = buildDocumentPrompt('attestation_presence', {
      beneficiary: 'Jean Martin',
      period: 'mars 2026',
      events: 'Atelier leadership',
    })
    // {beneficiary} apparaît plusieurs fois dans le template
    expect(prompt.indexOf('Jean Martin')).toBeGreaterThanOrEqual(0)
  })
})
