import { describe, it, expect } from 'vitest'
import { parseAccountantEmail } from './email-parser'

// ── Tests email-parser (stub) ──────────────────────────────────────────────────

describe('parseAccountantEmail (stub)', () => {
  it("retourne le type 'other' pour n'importe quel email", () => {
    const result = parseAccountantEmail('Justificatif manquant', 'Corps du message')
    expect(result.type).toBe('other')
  })

  it('retourne le sujet comme titre et le snippet comme corps', () => {
    const result = parseAccountantEmail('Demande de justificatif', 'Facture n°2024-01')
    expect(result.title).toBe('Demande de justificatif')
    expect(result.body).toBe('Facture n°2024-01')
  })
})
