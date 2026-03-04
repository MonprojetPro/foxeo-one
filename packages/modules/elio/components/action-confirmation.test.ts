import { describe, it, expect } from 'vitest'
import {
  CONFIRMATION_REQUIRED_LABEL,
  DESTRUCTIVE_VERBS,
  isDestructiveAction,
  buildActionDescription,
} from './action-confirmation'

describe('ActionConfirmation (Story 8.9a — Task 4)', () => {
  describe('Task 4.4 — actions destructives', () => {
    it('Task 4.4 — DESTRUCTIVE_VERBS contient delete', () => {
      expect(DESTRUCTIVE_VERBS).toContain('delete')
    })

    it('Task 4.4 — isDestructiveAction retourne true pour delete', () => {
      expect(isDestructiveAction('delete')).toBe(true)
    })

    it('Task 4.4 — isDestructiveAction retourne false pour send', () => {
      expect(isDestructiveAction('send')).toBe(false)
    })

    it('Task 4.4 — isDestructiveAction retourne false pour create', () => {
      expect(isDestructiveAction('create')).toBe(false)
    })
  })

  describe('Task 4.3 — labels et descriptions', () => {
    it('Task 4.3 — CONFIRMATION_REQUIRED_LABEL est défini', () => {
      expect(CONFIRMATION_REQUIRED_LABEL).toBeTruthy()
    })

    it('Task 4.2 — buildActionDescription construit une description lisible pour send', () => {
      const desc = buildActionDescription('send', 'adhesions', 'membres en retard')
      expect(desc).toBeTruthy()
      expect(desc.toLowerCase()).toContain('adh') // Adhésions ou adhesions
    })

    it('Task 4.2 — buildActionDescription construit une description pour create', () => {
      const desc = buildActionDescription('create', 'agenda', 'samedi prochain')
      expect(desc).toBeTruthy()
      expect(desc.toLowerCase()).toContain('agenda')
    })

    it('Task 4.2 — buildActionDescription construit une description pour delete', () => {
      const desc = buildActionDescription('delete', 'adhesions', 'membres inactifs')
      expect(desc).toBeTruthy()
    })
  })
})
