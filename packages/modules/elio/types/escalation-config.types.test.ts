import { describe, it, expect } from 'vitest'
import {
  EscalationConfigSchema,
  DEFAULT_ESCALATION_CONFIG,
  ESCALATION_HINT_MAX,
  ESCALATION_SENSITIVITIES,
} from './escalation-config.types'

describe('EscalationConfigSchema', () => {
  it('valide la config par défaut (garde anti-typo)', () => {
    expect(EscalationConfigSchema.safeParse(DEFAULT_ESCALATION_CONFIG).success).toBe(true)
  })

  it('a des défauts cohérents (enabled=true, sensitivity=normal, pas de hint)', () => {
    expect(DEFAULT_ESCALATION_CONFIG.enabled).toBe(true)
    expect(DEFAULT_ESCALATION_CONFIG.sensitivity).toBe('normal')
    expect(DEFAULT_ESCALATION_CONFIG.escalationHint).toBeUndefined()
  })

  it('exige un booléen pour enabled', () => {
    const res = EscalationConfigSchema.safeParse({ sensitivity: 'normal' })
    expect(res.success).toBe(false)
  })

  it('rejette un enabled non-booléen', () => {
    const res = EscalationConfigSchema.safeParse({ enabled: 'yes', sensitivity: 'normal' })
    expect(res.success).toBe(false)
  })

  it('accepte les trois sensibilités de l’enum', () => {
    for (const s of ESCALATION_SENSITIVITIES) {
      const res = EscalationConfigSchema.safeParse({ enabled: true, sensitivity: s })
      expect(res.success).toBe(true)
    }
  })

  it('rejette une sensibilité hors enum', () => {
    const res = EscalationConfigSchema.safeParse({ enabled: true, sensitivity: 'medium' })
    expect(res.success).toBe(false)
  })

  it('accepte un escalationHint optionnel', () => {
    const res = EscalationConfigSchema.safeParse({
      enabled: true,
      sensitivity: 'high',
      escalationHint: 'Je transmets à MiKL, il te répond vite.',
    })
    expect(res.success).toBe(true)
  })

  it('rejette un escalationHint trop long', () => {
    const res = EscalationConfigSchema.safeParse({
      enabled: false,
      sensitivity: 'low',
      escalationHint: 'x'.repeat(ESCALATION_HINT_MAX + 1),
    })
    expect(res.success).toBe(false)
  })

  it('accepte un escalationHint pile à la longueur max (trim inclus)', () => {
    const res = EscalationConfigSchema.safeParse({
      enabled: true,
      sensitivity: 'normal',
      escalationHint: 'y'.repeat(ESCALATION_HINT_MAX),
    })
    expect(res.success).toBe(true)
  })
})
