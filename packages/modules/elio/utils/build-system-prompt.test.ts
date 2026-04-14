import { describe, it, expect } from 'vitest'
import { buildElioSystemPrompt } from './build-system-prompt'
import type { CommunicationProfile } from '../types/communication-profile.types'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseProfile: CommunicationProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  clientId: '00000000-0000-0000-0000-000000000002',
  preferredTone: 'friendly',
  preferredLength: 'balanced',
  interactionStyle: 'collaborative',
  contextPreferences: {},
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const mockStep = {
  stepNumber: 2,
  title: 'Étude de marché',
  description: 'Analyser le marché cible et les concurrents.',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildElioSystemPrompt', () => {
  it('generates a system prompt that contains Élio identity', () => {
    const prompt = buildElioSystemPrompt(baseProfile)
    expect(prompt).toContain('Élio')
    expect(prompt).toContain('MonprojetPro Lab')
  })

  it('includes tone instruction for friendly profile', () => {
    const prompt = buildElioSystemPrompt(baseProfile)
    expect(prompt).toContain('chaleureux')
  })

  it('includes tone instruction for formal profile', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, preferredTone: 'formal' })
    expect(prompt).toContain('professionnel')
  })

  it('includes tone instruction for technical profile', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, preferredTone: 'technical' })
    expect(prompt).toContain('technique')
  })

  it('includes tone instruction for casual profile', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, preferredTone: 'casual' })
    expect(prompt).toContain('décontracté')
  })

  it('includes length instruction for concise profile', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, preferredLength: 'concise' })
    expect(prompt).toContain('concise')
  })

  it('includes length instruction for detailed profile', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, preferredLength: 'detailed' })
    expect(prompt).toContain('détaillées')
  })

  it('includes length instruction for balanced profile', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, preferredLength: 'balanced' })
    expect(prompt).toContain('Équilibrez')
  })

  it('includes style instruction for directive profile', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, interactionStyle: 'directive' })
    expect(prompt).toContain('recommandations directes')
  })

  it('includes style instruction for explorative profile', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, interactionStyle: 'explorative' })
    expect(prompt).toContain('explorer davantage')
  })

  it('includes style instruction for collaborative profile', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, interactionStyle: 'collaborative' })
    expect(prompt).toContain('co-décision')
  })

  it('includes examples context instruction when examples=true', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, contextPreferences: { examples: true } })
    expect(prompt).toContain('exemples concrets')
  })

  it('includes theory context instruction when theory=true', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, contextPreferences: { theory: true } })
    expect(prompt).toContain('théoriques')
  })

  it('includes mixed context instruction when neither examples nor theory', () => {
    const prompt = buildElioSystemPrompt({ ...baseProfile, contextPreferences: {} })
    expect(prompt).toContain('Mélangez')
  })

  it('does NOT include step context when no step provided', () => {
    const prompt = buildElioSystemPrompt(baseProfile)
    expect(prompt).not.toContain('étape')
  })

  it('includes step context when step is provided', () => {
    const prompt = buildElioSystemPrompt(baseProfile, mockStep)
    expect(prompt).toContain('étape 2')
    expect(prompt).toContain('Étude de marché')
  })

  it('includes step description when step is provided', () => {
    const prompt = buildElioSystemPrompt(baseProfile, mockStep)
    expect(prompt).toContain('Analyser le marché cible')
  })
})
