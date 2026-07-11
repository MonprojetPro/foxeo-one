import { describe, it, expect } from 'vitest'
import {
  ElioOnePopupConfigSchema,
  ElioOnePopupOverrideSchema,
  DEFAULT_ONE_POPUP_CONFIG,
  MAX_ONE_POPUP_SUGGESTIONS,
  mergeOnePopupConfig,
  type ElioOnePopupConfig,
} from './one-popup.types'

const BASE: ElioOnePopupConfig = {
  greeting: 'Bonjour global',
  suggestions: ['A', 'B'],
  placeholder: 'Placeholder global',
}

describe('ElioOnePopupConfigSchema', () => {
  it('valide la config par défaut (garde anti-typo)', () => {
    expect(ElioOnePopupConfigSchema.safeParse(DEFAULT_ONE_POPUP_CONFIG).success).toBe(true)
  })

  it('rejette un greeting vide', () => {
    const res = ElioOnePopupConfigSchema.safeParse({ ...BASE, greeting: '   ' })
    expect(res.success).toBe(false)
  })

  it('rejette plus de suggestions que le maximum', () => {
    const tooMany = Array.from({ length: MAX_ONE_POPUP_SUGGESTIONS + 1 }, (_, i) => `s${i}`)
    const res = ElioOnePopupConfigSchema.safeParse({ ...BASE, suggestions: tooMany })
    expect(res.success).toBe(false)
  })

  it('accepte une liste de suggestions vide (opt-out des chips)', () => {
    const res = ElioOnePopupConfigSchema.safeParse({ ...BASE, suggestions: [] })
    expect(res.success).toBe(true)
  })

  it('trim les champs texte', () => {
    const res = ElioOnePopupConfigSchema.safeParse({ ...BASE, greeting: '  Salut  ' })
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.greeting).toBe('Salut')
  })
})

describe('ElioOnePopupOverrideSchema', () => {
  it('accepte un objet vide (aucune surcharge)', () => {
    expect(ElioOnePopupOverrideSchema.safeParse({}).success).toBe(true)
  })

  it('accepte une surcharge partielle (greeting seul)', () => {
    const res = ElioOnePopupOverrideSchema.safeParse({ greeting: 'Coucou client' })
    expect(res.success).toBe(true)
  })
})

describe('mergeOnePopupConfig', () => {
  it('retourne la base quand aucune surcharge', () => {
    expect(mergeOnePopupConfig(BASE, null)).toEqual(BASE)
    expect(mergeOnePopupConfig(BASE, undefined)).toEqual(BASE)
    expect(mergeOnePopupConfig(BASE, {})).toEqual(BASE)
  })

  it('surcharge uniquement le greeting fourni', () => {
    const merged = mergeOnePopupConfig(BASE, { greeting: 'Bonjour client' })
    expect(merged.greeting).toBe('Bonjour client')
    expect(merged.suggestions).toEqual(BASE.suggestions)
    expect(merged.placeholder).toBe(BASE.placeholder)
  })

  it('ignore un greeting de surcharge vide (hérite du global)', () => {
    const merged = mergeOnePopupConfig(BASE, { greeting: '   ' })
    expect(merged.greeting).toBe(BASE.greeting)
  })

  it('remplace les suggestions même par une liste vide (masquer les chips)', () => {
    const merged = mergeOnePopupConfig(BASE, { suggestions: [] })
    expect(merged.suggestions).toEqual([])
  })

  it('remplace les suggestions par la liste personnalisée', () => {
    const merged = mergeOnePopupConfig(BASE, { suggestions: ['X'] })
    expect(merged.suggestions).toEqual(['X'])
  })

  it('surcharge tous les champs à la fois', () => {
    const merged = mergeOnePopupConfig(BASE, {
      greeting: 'G',
      suggestions: ['Y'],
      placeholder: 'P',
    })
    expect(merged).toEqual({ greeting: 'G', suggestions: ['Y'], placeholder: 'P' })
  })

  it('trim le greeting et le placeholder de surcharge', () => {
    const merged = mergeOnePopupConfig(BASE, { greeting: '  G  ', placeholder: '  P  ' })
    expect(merged.greeting).toBe('G')
    expect(merged.placeholder).toBe('P')
  })
})
