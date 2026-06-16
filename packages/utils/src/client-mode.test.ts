import { describe, it, expect } from 'vitest'
import { resolveClientMode } from './client-mode'

describe('resolveClientMode', () => {
  // Profil A — Lab actif (non gradué) : Lab dispo, One verrouillé
  const labActif = { dashboardType: 'lab', labModeAvailable: true, oneModeAvailable: false }
  // Profil B/C — Gradué : les deux dispos
  const gradue = { dashboardType: 'one', labModeAvailable: true, oneModeAvailable: true }
  // Profil D — One direct : One dispo, Lab verrouillé
  const oneDirect = { dashboardType: 'one', labModeAvailable: false, oneModeAvailable: true }

  it('Lab actif sans cookie → mode lab par défaut', () => {
    const r = resolveClientMode({ ...labActif, cookieMode: null })
    expect(r.activeMode).toBe('lab')
    expect(r.canSwitch).toBe(true)
    expect(r.oneLocked).toBe(true)
    expect(r.labLocked).toBe(false)
  })

  it('Lab actif + cookie one → reste en lab (One verrouillé, cookie ignoré)', () => {
    const r = resolveClientMode({ ...labActif, cookieMode: 'one' })
    expect(r.activeMode).toBe('lab')
  })

  it('Gradué + cookie lab → bascule en lab (consultation autorisée)', () => {
    const r = resolveClientMode({ ...gradue, cookieMode: 'lab' })
    expect(r.activeMode).toBe('lab')
    expect(r.canSwitch).toBe(true)
    expect(r.labLocked).toBe(false)
    expect(r.oneLocked).toBe(false)
  })

  it('Gradué sans cookie → mode one par défaut', () => {
    const r = resolveClientMode({ ...gradue, cookieMode: null })
    expect(r.activeMode).toBe('one')
  })

  it('One direct → pas de toggle, Lab verrouillé, cookie lab ignoré', () => {
    const r = resolveClientMode({ ...oneDirect, cookieMode: 'lab' })
    expect(r.activeMode).toBe('one')
    expect(r.canSwitch).toBe(false)
    expect(r.labLocked).toBe(true)
    expect(r.oneLocked).toBe(false)
  })

  it('cookie invalide → mode par défaut', () => {
    expect(resolveClientMode({ ...gradue, cookieMode: 'xxx' }).activeMode).toBe('one')
    expect(resolveClientMode({ ...labActif, cookieMode: undefined }).activeMode).toBe('lab')
  })
})
