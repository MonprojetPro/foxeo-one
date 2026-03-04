import { describe, it, expect } from 'vitest'
import { checkModuleActive, buildModuleNotActiveMessage, MODULE_NOT_ACTIVE_MESSAGE } from './check-module-active'

describe('checkModuleActive (Story 8.9a — Task 7)', () => {
  describe('Task 7.3 — vérifier si le module est dans la liste', () => {
    it('Task 7.3 — retourne true si le module est actif', () => {
      expect(checkModuleActive(['adhesions', 'agenda', 'sms'], 'adhesions')).toBe(true)
    })

    it('Task 7.3 — retourne false si le module n\'est pas actif', () => {
      expect(checkModuleActive(['agenda', 'sms'], 'adhesions')).toBe(false)
    })

    it('Task 7.3 — retourne false si la liste est vide', () => {
      expect(checkModuleActive([], 'adhesions')).toBe(false)
    })

    it('Task 7.3 — retourne false si moduleTarget est vide', () => {
      expect(checkModuleActive(['adhesions', 'agenda'], '')).toBe(false)
    })

    it('Task 7.3 — vérifie plusieurs modules', () => {
      expect(checkModuleActive(['agenda', 'sms', 'facturation'], 'sms')).toBe(true)
      expect(checkModuleActive(['agenda', 'sms', 'facturation'], 'adhesions')).toBe(false)
    })
  })

  describe('Task 7.4 — message module non actif', () => {
    it('Task 7.4 — MODULE_NOT_ACTIVE_MESSAGE contient le placeholder {nom}', () => {
      expect(MODULE_NOT_ACTIVE_MESSAGE).toContain('{nom}')
    })

    it('Task 7.4 — MODULE_NOT_ACTIVE_MESSAGE mentionne MiKL', () => {
      expect(MODULE_NOT_ACTIVE_MESSAGE).toContain('MiKL')
    })

    it('CR — buildModuleNotActiveMessage utilise le label lisible (Adhésions, pas adhesions)', () => {
      const msg = buildModuleNotActiveMessage('adhesions')
      expect(msg).toContain('Adhésions')
      expect(msg).not.toContain('adhesions')
    })

    it('CR — buildModuleNotActiveMessage fallback sur le nom brut si module inconnu', () => {
      const msg = buildModuleNotActiveMessage('custom_module')
      expect(msg).toContain('custom_module')
    })
  })
})
