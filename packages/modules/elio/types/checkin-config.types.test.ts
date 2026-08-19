import { describe, it, expect } from 'vitest'
import {
  toCheckinConfig,
  toCheckinConfigRow,
  DEFAULT_CHECKIN_CONFIG,
  CHECKIN_MIN_DAYS,
} from './checkin-config.types'

describe('config de prise de nouvelles — frontière Hub ↔ Edge Function', () => {
  it('écrit en snake_case, la forme que lit l’Edge Function Deno', () => {
    // Le cron lit `idle_days` / `cooldown_days`. Écrire du camelCase ici ferait
    // silencieusement retomber le cron sur ses défauts, sans aucune erreur visible.
    expect(toCheckinConfigRow({ enabled: true, idleDays: 21, cooldownDays: 30 })).toEqual({
      enabled: true,
      idle_days: 21,
      cooldown_days: 30,
    })
  })

  it('relit ce qu’il a écrit (aller-retour sans perte)', () => {
    const row = toCheckinConfigRow(DEFAULT_CHECKIN_CONFIG)
    expect(toCheckinConfig(row)).toEqual(DEFAULT_CHECKIN_CONFIG)
  })

  it('rejette une fréquence sous le plancher anti-harcèlement', () => {
    expect(
      toCheckinConfig({ enabled: true, idle_days: CHECKIN_MIN_DAYS - 1, cooldown_days: 14 }),
    ).toBeNull()
  })

  it('rejette une valeur camelCase mal écrite en base', () => {
    // Symptôme réel si quelqu'un écrit du camelCase dans system_config : la lecture
    // doit échouer franchement (→ fallback défauts) plutôt que d'inventer des valeurs.
    expect(toCheckinConfig({ enabled: true, idleDays: 14, cooldownDays: 14 })).toBeNull()
  })

  it('rejette une valeur absente ou non-objet', () => {
    expect(toCheckinConfig(null)).toBeNull()
    expect(toCheckinConfig('14')).toBeNull()
  })

  it('rejette un délai non entier', () => {
    expect(toCheckinConfig({ enabled: true, idle_days: 14.5, cooldown_days: 14 })).toBeNull()
  })

  it('accepte enabled=false (Élio ne prend plus de nouvelles)', () => {
    const config = toCheckinConfig({ enabled: false, idle_days: 14, cooldown_days: 14 })
    expect(config?.enabled).toBe(false)
  })
})
