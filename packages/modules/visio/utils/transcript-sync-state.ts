/**
 * Lecture de l'état du rattrapage de transcription — fonctions PURES.
 *
 * L'état vit dans `meetings.metadata.transcript_sync`. Il est lu à deux
 * endroits qui doivent dire LA MÊME CHOSE : le cron (faut-il réessayer ?) et
 * l'écran (qu'est-ce que MiKL voit ?). Deux lectures séparées finiraient par
 * diverger — un cron qui a abandonné pendant que l'écran affiche « en cours »
 * est exactement le genre de mensonge silencieux qu'on paie six mois plus tard.
 */

/** Au-delà de ce délai après la fin de la visio, on cesse de réessayer. */
export const TRANSCRIPT_SYNC_GIVE_UP_HOURS = 24

export interface TranscriptSyncState {
  attempts: number
  lastAttemptAt: string | null
  lastReason: string | null
  transcriptReady: boolean
  archivedAt: string | null
  archiveFormat: 'pdf' | 'txt' | null
  archiveSkipped: string | null
  gaveUpAt: string | null
  done: boolean
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function readTranscriptSyncState(
  metadata: Record<string, unknown> | null | undefined
): TranscriptSyncState {
  const raw = (metadata?.transcript_sync ?? {}) as Record<string, unknown>
  const format = asString(raw.archiveFormat)
  return {
    attempts: typeof raw.attempts === 'number' ? raw.attempts : 0,
    lastAttemptAt: asString(raw.lastAttemptAt),
    lastReason: asString(raw.lastReason),
    transcriptReady: raw.transcriptReady === true,
    archivedAt: asString(raw.archivedAt),
    archiveFormat: format === 'pdf' || format === 'txt' ? format : null,
    archiveSkipped: asString(raw.archiveSkipped),
    gaveUpAt: asString(raw.gaveUpAt),
    done: raw.done === true,
  }
}

/** Visio, vue par la mécanique de rattrapage. */
export interface SyncCandidateMeeting {
  status: string
  scheduled_at: string | null
  ended_at: string | null
  meet_space_name: string | null
  metadata: Record<string, unknown> | null
}

/**
 * Date de référence du rattrapage : la fin réelle si on la connaît, sinon
 * l'heure prévue.
 *
 * 🔑 POURQUOI LE REPLI SUR `scheduled_at` EST INDISPENSABLE. Raccrocher dans
 * Google Meet n'écrit rien chez nous : une visio bel et bien tenue garde
 * `ended_at` à NULL et le statut « Planifié » jusqu'à ce que la synchro
 * récupère l'horaire réel chez Google. Se fier au seul `ended_at` revenait
 * donc à ne JAMAIS rattraper la première synchro — exactement ce que MiKL a
 * constaté le 16-10.
 */
export function transcriptSyncReferenceDate(meeting: {
  scheduled_at: string | null
  ended_at: string | null
}): string | null {
  return meeting.ended_at ?? meeting.scheduled_at
}

/**
 * Le cron doit-il encore tenter quelque chose sur cette visio ?
 * `nowMs` est passé en paramètre : une fonction qui lit l'heure elle-même ne
 * se teste qu'avec des faux timers, et on finit par ne pas la tester.
 */
export function shouldAttemptTranscriptSync(
  meeting: SyncCandidateMeeting,
  nowMs: number
): boolean {
  if (!meeting.meet_space_name) return false
  // Un rendez-vous annulé n'a pas eu lieu : il n'y a rien à récupérer.
  if (meeting.status === 'cancelled') return false

  const reference = transcriptSyncReferenceDate(meeting)
  if (!reference) return false
  // Pas encore l'heure : interroger Google ne rendrait rien, et ferait courir
  // le délai d'abandon avant même que la visio existe.
  const referenceMs = Date.parse(reference)
  if (Number.isNaN(referenceMs) || referenceMs > nowMs) return false

  const state = readTranscriptSyncState(meeting.metadata)
  if (state.done || state.gaveUpAt) return false
  return !hasExceededGiveUpDelay(reference, nowMs)
}

/**
 * Faut-il proposer « Récupérer maintenant » sur cette visio ?
 *
 * Volontairement PLUS LARGE que la règle du cron : MiKL doit pouvoir relancer
 * une visio déjà aboutie (Google publie parfois une transcription après coup)
 * ou abandonnée depuis plus de 24 h. Le bouton ne sert à rien que dans deux
 * cas : rendez-vous annulé, ou heure pas encore passée.
 */
export function canSyncMeetingResults(
  meeting: { status: string; scheduledAt: string | null; endedAt: string | null; meetSpaceName: string | null },
  nowMs: number
): boolean {
  if (!meeting.meetSpaceName) return false
  if (meeting.status === 'cancelled') return false
  if (meeting.status === 'completed') return true

  const reference = meeting.endedAt ?? meeting.scheduledAt
  if (!reference) return false
  const referenceMs = Date.parse(reference)
  return !Number.isNaN(referenceMs) && referenceMs <= nowMs
}

/** La visio est-elle trop ancienne pour qu'on espère encore quelque chose ? */
export function hasExceededGiveUpDelay(endedAt: string | null, nowMs: number): boolean {
  if (!endedAt) return false
  const ended = new Date(endedAt).getTime()
  if (Number.isNaN(ended)) return false
  return nowMs - ended > TRANSCRIPT_SYNC_GIVE_UP_HOURS * 60 * 60 * 1000
}

/** Phrase affichée à MiKL — une seule formulation, pour un seul état. */
export function describeTranscriptSyncState(state: TranscriptSyncState): string | null {
  if (state.archivedAt) {
    return state.archiveFormat === 'txt'
      ? 'Compte rendu déposé dans le dossier client (texte — export PDF refusé par Google)'
      : 'Compte rendu déposé dans le dossier client'
  }
  if (state.archiveSkipped === 'no_client') {
    return "Transcription récupérée, mais cette visio n'est rattachée à aucun client — rien à déposer"
  }
  if (state.gaveUpAt) {
    return `Aucune transcription reçue de Google après ${TRANSCRIPT_SYNC_GIVE_UP_HOURS} h — relance manuelle possible`
  }
  if (state.attempts > 0) {
    return 'Transcription en attente chez Google — récupération automatique en cours'
  }
  return null
}
