/**
 * Coupure nocturne des sessions (décision MiKL du 2026-08-04).
 *
 * Le cockpit se ferme tous les jours à 2 h du matin, heure de Paris : une session
 * ouverte la veille ne survit jamais à la nuit, même si le navigateur est resté
 * allumé. C'est le filet de sécurité derrière le cookie de session — lui seul ne
 * suffit pas, puisque « Continuer là où vous en étiez » (Chrome, Edge) peut
 * restaurer une session au redémarrage.
 *
 * Rien n'est stocké : on compare l'heure de début de session à la dernière
 * occurrence de la coupure. Une session démarrée à 23 h est donc coupée trois
 * heures plus tard, pas vingt-quatre — c'est voulu, la coupure est un horaire,
 * pas une durée.
 */

export const NIGHTLY_CUTOFF_HOUR = 2
export const NIGHTLY_CUTOFF_TIMEZONE = 'Europe/Paris'

type DateParts = { year: number; month: number; day: number; hour: number }

/** Composants calendaires d'un instant, lus dans un fuseau donné. */
function partsInTimeZone(instant: Date, timeZone: string): DateParts {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)

  const get = (type: string) => Number(formatted.find((p) => p.type === type)?.value)

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    // À minuit, `hour12: false` peut rendre 24 au lieu de 0 selon l'environnement.
    hour: get('hour') % 24,
  }
}

/**
 * Décalage du fuseau par rapport à UTC, à cet instant précis (donc heure d'été
 * comprise). Astuce standard : relire l'instant comme s'il était en UTC et
 * mesurer l'écart.
 */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const p = partsInTimeZone(instant, timeZone)
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)
  const minute = Number(formatted.find((x) => x.type === 'minute')?.value)
  const second = Number(formatted.find((x) => x.type === 'second')?.value)

  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, minute, second)
  // On ramène à la seconde : les millisecondes ne traversent pas le formatage.
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/**
 * Dernière occurrence de la coupure, à `now` ou avant.
 *
 * Note sur les changements d'heure : la France bascule un dimanche à 2 h ou 3 h du
 * matin. Deux nuits par an, la coupure peut donc tomber une heure plus tôt ou plus
 * tard que prévu. Sans conséquence — l'exigence est « pas de session qui traverse
 * la nuit », pas une précision à la minute.
 */
export function lastNightlyCutoff(
  now: Date,
  cutoffHour: number = NIGHTLY_CUTOFF_HOUR,
  timeZone: string = NIGHTLY_CUTOFF_TIMEZONE
): Date {
  const local = partsInTimeZone(now, timeZone)

  // Avant l'heure de coupure, la dernière occurrence est celle de la veille.
  const dayShift = local.hour < cutoffHour ? -1 : 0
  const localMidnightUtc = Date.UTC(local.year, local.month - 1, local.day + dayShift, cutoffHour)

  return new Date(localMidnightUtc - timeZoneOffsetMs(now, timeZone))
}

/**
 * La session a-t-elle traversé une coupure depuis son ouverture ?
 *
 * @param sessionStartedAt moment de l'authentification initiale (le plus ancien
 *   horodatage des méthodes d'authentification — il ne bouge pas quand le jeton
 *   se rafraîchit, contrairement à `iat`).
 */
export function hasCrossedNightlyCutoff(
  sessionStartedAt: Date,
  now: Date = new Date(),
  cutoffHour: number = NIGHTLY_CUTOFF_HOUR,
  timeZone: string = NIGHTLY_CUTOFF_TIMEZONE
): boolean {
  return sessionStartedAt.getTime() < lastNightlyCutoff(now, cutoffHour, timeZone).getTime()
}
