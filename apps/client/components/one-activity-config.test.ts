import { describe, it, expect } from 'vitest'
import { notificationVisual, toolPostVisual } from './one-activity-config'

describe('one-activity-config', () => {
  it('mappe chaque type de notification connu vers un visuel dédié (icône + classes)', () => {
    const knownTypes = [
      'message',
      'validation',
      'alert',
      'system',
      'graduation',
      'payment',
      'tool_update',
      'tool_comment',
      'elio_escalation',
    ]
    for (const type of knownTypes) {
      const v = notificationVisual(type)
      expect(v.Icon).toBeDefined()
      expect(v.iconClass).toMatch(/text-.+ bg-.+\/10/)
    }
  })

  it('retombe sur un visuel neutre pour un type inconnu (jamais de crash)', () => {
    const v = notificationVisual('type_inexistant_xyz')
    expect(v.Icon).toBeDefined()
    expect(v.iconClass).toContain('text-zinc-400')
  })

  it('expose un visuel cohérent pour les posts du Suivi de l’outil', () => {
    const v = toolPostVisual()
    expect(v.Icon).toBeDefined()
    expect(v.iconClass).toContain('emerald')
  })
})
