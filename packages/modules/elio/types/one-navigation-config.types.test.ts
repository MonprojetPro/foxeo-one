import { describe, it, expect } from 'vitest'
import {
  OneNavigationConfigSchema,
  DEFAULT_ONE_NAVIGATION_CONFIG,
  ELIO_ONE_NAVIGATION_KEY,
  EXTRA_NAVIGATION_NOTE_MAX,
} from './one-navigation-config.types'

describe('one-navigation-config.types', () => {
  it('expose la bonne clé system_config', () => {
    expect(ELIO_ONE_NAVIGATION_KEY).toBe('elio_one_navigation')
  })

  it('valide la config par défaut', () => {
    const parsed = OneNavigationConfigSchema.safeParse(DEFAULT_ONE_NAVIGATION_CONFIG)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.disabledRoutes).toEqual([])
      expect(parsed.data.extraNavigationNote).toBe('')
    }
  })

  it('applique les défauts sur un objet vide', () => {
    const parsed = OneNavigationConfigSchema.safeParse({})
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data).toEqual({ disabledRoutes: [], extraNavigationNote: '' })
    }
  })

  it('accepte un tableau disabledRoutes vide', () => {
    const parsed = OneNavigationConfigSchema.safeParse({
      disabledRoutes: [],
      extraNavigationNote: '',
    })
    expect(parsed.success).toBe(true)
  })

  it('accepte des chaînes dans disabledRoutes', () => {
    const parsed = OneNavigationConfigSchema.safeParse({
      disabledRoutes: ['facturation', 'visio'],
      extraNavigationNote: 'Oriente vers le suivi.',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.disabledRoutes).toEqual(['facturation', 'visio'])
      expect(parsed.data.extraNavigationNote).toBe('Oriente vers le suivi.')
    }
  })

  it('rejette une entrée disabledRoutes vide (chaîne vide)', () => {
    const parsed = OneNavigationConfigSchema.safeParse({
      disabledRoutes: [''],
    })
    expect(parsed.success).toBe(false)
  })

  it('rejette une extraNavigationNote trop longue', () => {
    const parsed = OneNavigationConfigSchema.safeParse({
      disabledRoutes: [],
      extraNavigationNote: 'x'.repeat(EXTRA_NAVIGATION_NOTE_MAX + 1),
    })
    expect(parsed.success).toBe(false)
  })

  it('accepte une extraNavigationNote à la limite exacte', () => {
    const parsed = OneNavigationConfigSchema.safeParse({
      disabledRoutes: [],
      extraNavigationNote: 'x'.repeat(EXTRA_NAVIGATION_NOTE_MAX),
    })
    expect(parsed.success).toBe(true)
  })

  it('trim la consigne de navigation', () => {
    const parsed = OneNavigationConfigSchema.safeParse({
      disabledRoutes: [],
      extraNavigationNote: '  consigne  ',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.extraNavigationNote).toBe('consigne')
    }
  })
})
