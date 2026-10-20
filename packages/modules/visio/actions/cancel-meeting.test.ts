import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockUpdateSingle = vi.fn()

const mockSelectEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))
const mockUpdateSelect = vi.fn(() => ({ single: mockUpdateSingle }))
// `meetings.update(...).eq(...).select().single()` — chaîne vers mockUpdateSelect.
// `billable_items.update(...).eq(...).eq(...)` (T-059, annulation de la dette)
// — la DEUXIÈME eq est le point final, thenable, résolue par mockBillableEq.
const mockBillableEq = vi.fn(() => Promise.resolve({ error: null }))
const mockUpdateEq = vi.fn(() => ({ select: mockUpdateSelect, eq: mockBillableEq }))
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }))

vi.mock('@monprojetpro/supabase', () => ({
  createServerSupabaseClient: vi.fn(() => ({ from: mockFrom, auth: { getUser: mockGetUser } })),
}))

const MEETING_ID = '11111111-1111-1111-1111-111111111111'

describe('cancelMeeting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  })

  it('refuse un utilisateur non authentifie', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } })

    const { cancelMeeting } = await import('./cancel-meeting')
    expect((await cancelMeeting({ meetingId: MEETING_ID })).error?.code).toBe('UNAUTHORIZED')
  })

  // ON N'EFFACE PAS LE PASSÉ : l'historique des appels est précisément ce que
  // MiKL a demandé.
  it('REFUSE d’annuler un rendez-vous deja termine', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: MEETING_ID, status: 'completed' }, error: null })

    const { cancelMeeting } = await import('./cancel-meeting')
    const r = await cancelMeeting({ meetingId: MEETING_ID })

    expect(r.error?.code).toBe('ALREADY_COMPLETED')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('ne reannule pas un rendez-vous deja annule', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: MEETING_ID, status: 'cancelled' }, error: null })

    const { cancelMeeting } = await import('./cancel-meeting')
    const r = await cancelMeeting({ meetingId: MEETING_ID })

    expect(r.error?.code).toBe('ALREADY_CANCELLED')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('annule un rendez-vous planifie sans le supprimer', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: MEETING_ID, status: 'scheduled' }, error: null })
    mockUpdateSingle.mockResolvedValue({
      data: { id: MEETING_ID, status: 'cancelled', type: 'standard', metadata: {} },
      error: null,
    })

    const { cancelMeeting } = await import('./cancel-meeting')
    const r = await cancelMeeting({ meetingId: MEETING_ID })

    expect(r.error).toBeNull()
    expect(r.data?.status).toBe('cancelled')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }))
  })

  // T-059 — une séance payante annulée AVANT facturation n'est plus une dette.
  it('annule aussi le billable_items lié, s’il est encore pending', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: MEETING_ID, status: 'scheduled' }, error: null })
    mockUpdateSingle.mockResolvedValue({
      data: { id: MEETING_ID, status: 'cancelled', type: 'standard', metadata: {} },
      error: null,
    })

    const { cancelMeeting } = await import('./cancel-meeting')
    await cancelMeeting({ meetingId: MEETING_ID })

    expect(mockFrom).toHaveBeenCalledWith('billable_items')
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' })
    expect(mockBillableEq).toHaveBeenCalledWith('status', 'pending')
  })

  it('remonte NOT_FOUND sur un identifiant inconnu', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { cancelMeeting } = await import('./cancel-meeting')
    expect((await cancelMeeting({ meetingId: MEETING_ID })).error?.code).toBe('NOT_FOUND')
  })
})
