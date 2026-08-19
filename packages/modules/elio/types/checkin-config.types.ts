/**
 * Config de la prise de nouvelles proactive d'Élio One (pilotage depuis le Hub).
 *
 * Stockée dans `system_config` sous la clé `elio_one_checkin`, et lue par DEUX
 * consommateurs qui doivent rester d'accord :
 *  • le Hub (ce module) — réglage par MiKL ;
 *  • l'Edge Function `one-project-checkin` (cron quotidien) — qui applique le réglage.
 *
 * ⚠️ Toute évolution de ce schéma doit être répercutée dans l'Edge Function, sinon le cron
 * continue de tourner avec ses défauts sans que rien ne le signale.
 *
 * Fichier NON-'use server' : schémas Zod, types et constantes vivent ici
 * (un `export const` dans un fichier 'use server' casse `next build`
 * — cf. leçon use-server-exports-async-only).
 */
import { z } from 'zod'

/** Clé `system_config` portant la config globale de prise de nouvelles Élio One. */
export const ELIO_CHECKIN_KEY = 'elio_one_checkin'

/** Bornes de fréquence — en dessous de 7 jours, la relance devient du harcèlement. */
export const CHECKIN_MIN_DAYS = 7
export const CHECKIN_MAX_DAYS = 180

export const CheckinConfigSchema = z.object({
  /** Interrupteur maître : false → Élio ne prend jamais de nouvelles de lui-même. */
  enabled: z.boolean(),
  /** Délai sans échange au-delà duquel Élio prend des nouvelles. */
  idleDays: z
    .number()
    .int()
    .min(CHECKIN_MIN_DAYS, `Le délai ne peut pas être inférieur à ${CHECKIN_MIN_DAYS} jours`)
    .max(CHECKIN_MAX_DAYS, `Le délai ne peut pas dépasser ${CHECKIN_MAX_DAYS} jours`),
  /** Délai minimum entre deux mots d'Élio — garde-fou anti-harcèlement. */
  cooldownDays: z
    .number()
    .int()
    .min(CHECKIN_MIN_DAYS, `Le délai ne peut pas être inférieur à ${CHECKIN_MIN_DAYS} jours`)
    .max(CHECKIN_MAX_DAYS, `Le délai ne peut pas dépasser ${CHECKIN_MAX_DAYS} jours`),
})

export type CheckinConfig = z.infer<typeof CheckinConfigSchema>

/** Défauts — alignés sur ceux de l'Edge Function `one-project-checkin`. */
export const DEFAULT_CHECKIN_CONFIG: CheckinConfig = {
  enabled: true,
  idleDays: 14,
  cooldownDays: 14,
}

/**
 * Le stockage `system_config` est en snake_case (partagé avec l'Edge Function Deno, qui
 * lit `idle_days` / `cooldown_days`), alors que le TypeScript du monorepo travaille en
 * camelCase. On transforme donc explicitement à la frontière, dans les deux sens.
 */
export interface CheckinConfigRow {
  enabled: boolean
  idle_days: number
  cooldown_days: number
}

export function toCheckinConfig(row: unknown): CheckinConfig | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Partial<CheckinConfigRow>
  const parsed = CheckinConfigSchema.safeParse({
    enabled: r.enabled,
    idleDays: r.idle_days,
    cooldownDays: r.cooldown_days,
  })
  return parsed.success ? parsed.data : null
}

export function toCheckinConfigRow(config: CheckinConfig): CheckinConfigRow {
  return {
    enabled: config.enabled,
    idle_days: config.idleDays,
    cooldown_days: config.cooldownDays,
  }
}
