import { describe, it, expect } from 'vitest'
import {
  readTranscriptSyncState,
  shouldAttemptTranscriptSync,
  canSyncMeetingResults,
  transcriptSyncReferenceDate,
  hasExceededGiveUpDelay,
  describeTranscriptSyncState,
  TRANSCRIPT_SYNC_GIVE_UP_HOURS,
} from './transcript-sync-state'

const NOW = Date.parse('2026-10-16T12:00:00.000Z')
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString()

describe('readTranscriptSyncState', () => {
  it('rend un état neutre sur une visio jamais synchronisée', () => {
    expect(readTranscriptSyncState(null)).toMatchObject({
      attempts: 0,
      done: false,
      gaveUpAt: null,
    })
  })

  it('ignore un format d’archive inattendu plutôt que de le propager', () => {
    const state = readTranscriptSyncState({ transcript_sync: { archiveFormat: 'docx' } })
    expect(state.archiveFormat).toBeNull()
  })
})

describe('transcriptSyncReferenceDate', () => {
  it('se rabat sur l’heure prevue quand la fin reelle est inconnue', () => {
    // Cas REEL du 16-10 : MiKL a fait la visio et raccroche ; `ended_at` est
    // reste NULL parce que rien, chez nous, n'apprend que l'appel est fini.
    expect(
      transcriptSyncReferenceDate({ scheduled_at: hoursAgo(2), ended_at: null })
    ).toBe(hoursAgo(2))
  })

  it('prefere la fin reelle quand on la connait', () => {
    expect(
      transcriptSyncReferenceDate({ scheduled_at: hoursAgo(3), ended_at: hoursAgo(1) })
    ).toBe(hoursAgo(1))
  })
})

describe('shouldAttemptTranscriptSync', () => {
  const base = {
    status: 'scheduled',
    scheduled_at: hoursAgo(1),
    ended_at: null as string | null,
    meet_space_name: 'spaces/abc',
    metadata: {} as Record<string, unknown>,
  }

  it('RATTRAPE une visio encore « Planifiee » dont l’heure est passee', () => {
    // Le defaut du 16-10 : le cron filtrait sur status = 'completed', un
    // statut que RIEN n'ecrivait. Il excluait donc exactement les visios a
    // rattraper. Ce test echoue si quelqu'un remet ce filtre.
    expect(shouldAttemptTranscriptSync(base, NOW)).toBe(true)
  })

  it('n’essaie pas avant l’heure du rendez-vous', () => {
    const future = new Date(NOW + 3600_000).toISOString()
    expect(shouldAttemptTranscriptSync({ ...base, scheduled_at: future }, NOW)).toBe(false)
  })

  it('n’essaie jamais sur un rendez-vous annule', () => {
    expect(shouldAttemptTranscriptSync({ ...base, status: 'cancelled' }, NOW)).toBe(false)
  })

  it('réessaie une visio récente jamais aboutie', () => {
    expect(shouldAttemptTranscriptSync({ ...base, ended_at: hoursAgo(1) }, NOW)).toBe(true)
  })

  it('n’essaie jamais une visio sans salle Google Meet', () => {
    expect(shouldAttemptTranscriptSync({ ...base, meet_space_name: null }, NOW)).toBe(false)
  })

  it('s’arrête dès que le compte rendu est déposé — sinon il relancerait 96 fois pour rien', () => {
    expect(
      shouldAttemptTranscriptSync({ ...base, metadata: { transcript_sync: { done: true } } }, NOW)
    ).toBe(false)
  })

  it('s’arrête après un abandon déjà enregistré', () => {
    expect(
      shouldAttemptTranscriptSync(
        { ...base, metadata: { transcript_sync: { gaveUpAt: hoursAgo(2) } } },
        NOW
      )
    ).toBe(false)
  })

  it(`s'arrête au-delà de ${TRANSCRIPT_SYNC_GIVE_UP_HOURS} h après la fin de la visio`, () => {
    expect(
      shouldAttemptTranscriptSync({ ...base, scheduled_at: hoursAgo(25) }, NOW)
    ).toBe(false)
  })

  it('reste actif juste avant le délai d’abandon', () => {
    expect(shouldAttemptTranscriptSync({ ...base, scheduled_at: hoursAgo(23) }, NOW)).toBe(true)
  })
})

describe('canSyncMeetingResults', () => {
  const base = {
    status: 'scheduled',
    scheduledAt: hoursAgo(1),
    endedAt: null as string | null,
    meetSpaceName: 'spaces/abc',
  }

  it('propose le bouton sur une visio « Planifiee » dont l’heure est passee', () => {
    expect(canSyncMeetingResults(base, NOW)).toBe(true)
  })

  it('ne propose rien avant l’heure du rendez-vous', () => {
    expect(
      canSyncMeetingResults({ ...base, scheduledAt: new Date(NOW + 3600_000).toISOString() }, NOW)
    ).toBe(false)
  })

  it('ne propose rien sur un rendez-vous annule', () => {
    expect(canSyncMeetingResults({ ...base, status: 'cancelled' }, NOW)).toBe(false)
  })

  it('ne propose rien sans salle Google Meet', () => {
    expect(canSyncMeetingResults({ ...base, meetSpaceName: null }, NOW)).toBe(false)
  })

  it('reste propose sur une visio terminee, meme ancienne — Google publie parfois apres coup', () => {
    expect(
      canSyncMeetingResults(
        { ...base, status: 'completed', endedAt: hoursAgo(72), scheduledAt: hoursAgo(73) },
        NOW
      )
    ).toBe(true)
  })
})

describe('hasExceededGiveUpDelay', () => {
  it('ne déclare jamais l’abandon sur une visio sans date de fin', () => {
    expect(hasExceededGiveUpDelay(null, NOW)).toBe(false)
  })

  it('ne déclare jamais l’abandon sur une date illisible', () => {
    expect(hasExceededGiveUpDelay('pas-une-date', NOW)).toBe(false)
  })
})

describe('describeTranscriptSyncState', () => {
  it('ne dit rien quand il ne s’est rien passé', () => {
    expect(describeTranscriptSyncState(readTranscriptSyncState(null))).toBeNull()
  })

  it('signale que le dépôt est en texte quand Google a refusé le PDF', () => {
    const state = readTranscriptSyncState({
      transcript_sync: { archivedAt: hoursAgo(1), archiveFormat: 'txt' },
    })
    expect(describeTranscriptSyncState(state)).toContain('texte')
  })

  it('explique l’absence de dépôt quand la visio n’a pas de client', () => {
    const state = readTranscriptSyncState({
      transcript_sync: { transcriptReady: true, archiveSkipped: 'no_client' },
    })
    expect(describeTranscriptSyncState(state)).toContain('aucun client')
  })

  it('annonce l’abandon au lieu de laisser croire que ça tourne encore', () => {
    const state = readTranscriptSyncState({ transcript_sync: { gaveUpAt: hoursAgo(1), attempts: 96 } })
    expect(describeTranscriptSyncState(state)).toContain('Aucune transcription')
  })

  it('dit que la récupération est en cours après une première tentative', () => {
    const state = readTranscriptSyncState({ transcript_sync: { attempts: 3 } })
    expect(describeTranscriptSyncState(state)).toContain('en cours')
  })
})
