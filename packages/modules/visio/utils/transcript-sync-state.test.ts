import { describe, it, expect } from 'vitest'
import {
  readTranscriptSyncState,
  shouldAttemptTranscriptSync,
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

describe('shouldAttemptTranscriptSync', () => {
  const base = {
    ended_at: hoursAgo(1),
    meet_space_name: 'spaces/abc',
    metadata: {} as Record<string, unknown>,
  }

  it('réessaie une visio récente jamais aboutie', () => {
    expect(shouldAttemptTranscriptSync(base, NOW)).toBe(true)
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
      shouldAttemptTranscriptSync({ ...base, ended_at: hoursAgo(25) }, NOW)
    ).toBe(false)
  })

  it('reste actif juste avant le délai d’abandon', () => {
    expect(shouldAttemptTranscriptSync({ ...base, ended_at: hoursAgo(23) }, NOW)).toBe(true)
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
