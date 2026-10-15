import { describe, it, expect } from 'vitest'
import { toMeeting } from './to-meeting'
import type { MeetingDB } from '../types/meeting.types'

/**
 * VERROU DU MAILLON OUBLIÉ — T-056.
 *
 * Sur les factures (T-044a), la colonne `last_sent_at` avait été ajoutée,
 * écrite et affichée… mais jamais branchée au LECTEUR. L'écran disait donc
 * « jamais envoyé » pour toujours, et la garde anti-double-envoi ne gardait
 * rien. Ces tests échouent si la trace d'envoi disparaît du mapping.
 */

function db(overrides: Partial<MeetingDB> = {}): MeetingDB {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    client_id: '22222222-2222-2222-2222-222222222222',
    operator_id: '33333333-3333-3333-3333-333333333333',
    title: 'Point',
    description: null,
    scheduled_at: null,
    started_at: null,
    ended_at: null,
    duration_seconds: null,
    meet_space_name: null,
    meet_uri: null,
    status: 'scheduled',
    type: 'standard',
    metadata: {},
    recording_url: null,
    transcript_url: null,
    invite_last_sent_at: null,
    invite_last_sent_to: null,
    invite_sent_count: null,
    created_at: '2026-10-15T10:00:00.000Z',
    updated_at: '2026-10-15T10:00:00.000Z',
    ...overrides,
  }
}

describe('toMeeting — trace d’envoi du lien', () => {
  it('REMONTE la date, le destinataire et le compteur jusqu’a l’ecran', () => {
    const m = toMeeting(
      db({
        invite_last_sent_at: '2026-10-15T13:52:00.000Z',
        invite_last_sent_to: 'client@exemple.fr',
        invite_sent_count: 2,
      })
    )

    expect(m.inviteLastSentAt).toBe('2026-10-15T13:52:00.000Z')
    expect(m.inviteLastSentTo).toBe('client@exemple.fr')
    expect(m.inviteSentCount).toBe(2)
  })

  it('dit « jamais envoye » plutot qu’undefined quand rien n’est parti', () => {
    const m = toMeeting(db())

    expect(m.inviteLastSentAt).toBeNull()
    expect(m.inviteLastSentTo).toBeNull()
    // 0, pas undefined : l'affichage compare ce nombre.
    expect(m.inviteSentCount).toBe(0)
  })

  it('tient debout sur un rendez-vous anterieur a la migration', () => {
    const legacy = db()
    delete (legacy as Partial<MeetingDB>).invite_sent_count
    delete (legacy as Partial<MeetingDB>).invite_last_sent_at

    const m = toMeeting(legacy)

    expect(m.inviteSentCount).toBe(0)
    expect(m.inviteLastSentAt).toBeNull()
  })
})
