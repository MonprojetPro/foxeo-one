import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdateSingle = vi.fn()

const mockSelectEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({ from: mockFrom, auth: { getUser: mockGetUser } })),
}))

const MEETING_ID = '11111111-1111-1111-1111-111111111111'
const NEW_DATE = '2026-10-22T09:00:00.000Z'

describe('rescheduleMeeting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockUpdateSingle.mockResolvedValue({
      data: { id: MEETING_ID, status: 'scheduled', type: 'standard', metadata: {} },
      error: null,
    })
  })

  // LE POINT CRITIQUE : si on recréait la salle, le lien déjà envoyé au client
  // deviendrait caduc et il arriverait dans une salle vide.
  it('NE TOUCHE PAS au lien de visio — seule la date change', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: MEETING_ID, status: 'scheduled', scheduled_at: '2026-10-15T09:00:00.000Z', metadata: {} },
      error: null,
    })

    const { rescheduleMeeting } = await import('./reschedule-meeting')
    await rescheduleMeeting({ meetingId: MEETING_ID, scheduledAt: NEW_DATE })

    const payload = mockUpdate.mock.calls[0]?.[0] as Record<string, unknown>
    expect(payload.scheduled_at).toBe(NEW_DATE)
    expect(payload).not.toHaveProperty('meet_uri')
    expect(payload).not.toHaveProperty('meet_space_name')
  })

  it('garde la trace de la date d’origine', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: MEETING_ID, status: 'scheduled', scheduled_at: '2026-10-15T09:00:00.000Z', metadata: { source: 'hub' } },
      error: null,
    })

    const { rescheduleMeeting } = await import('./reschedule-meeting')
    await rescheduleMeeting({ meetingId: MEETING_ID, scheduledAt: NEW_DATE })

    const payload = mockUpdate.mock.calls[0]?.[0] as { metadata: Record<string, unknown> }
    expect(payload.metadata.rescheduledFrom).toBe('2026-10-15T09:00:00.000Z')
    // Et on n'écrase pas ce qui était déjà dans metadata.
    expect(payload.metadata.source).toBe('hub')
  })

  it('refuse de deplacer un rendez-vous termine ou annule', async () => {
    const { rescheduleMeeting } = await import('./reschedule-meeting')

    for (const status of ['completed', 'cancelled']) {
      mockUpdate.mockClear()
      mockMaybeSingle.mockResolvedValue({
        data: { id: MEETING_ID, status, scheduled_at: null, metadata: {} },
        error: null,
      })
      const r = await rescheduleMeeting({ meetingId: MEETING_ID, scheduledAt: NEW_DATE })
      expect(r.error?.code).toBe('NOT_RESCHEDULABLE')
      expect(mockUpdate).not.toHaveBeenCalled()
    }
  })

  it('refuse une date mal formee avant toute ecriture', async () => {
    const { rescheduleMeeting } = await import('./reschedule-meeting')
    const r = await rescheduleMeeting({ meetingId: MEETING_ID, scheduledAt: 'demain' })

    expect(r.error?.code).toBe('VALIDATION_ERROR')
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
